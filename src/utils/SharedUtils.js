/**
 * @fileoverview Shared Utilities for FoundryMagic
 * Common functions used across multiple modules to reduce code duplication
 */

/**
 * Chunk an array into smaller arrays of specified size
 * @param {Array} array - Array to chunk
 * @param {number} size - Size of each chunk
 * @returns {Array<Array>} Array of chunks
 */
export function chunkArray(array, size) {
    if (!Array.isArray(array) || size <= 0) {
        return [];
    }

    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Validate D&D Beyond cobalt token format
 * @param {string} token - Token to validate
 * @returns {boolean} True if valid format
 */
export function validateCobaltTokenFormat(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }

    // JWT/JWE format (starts with eyJ and has 2+ parts separated by dots)
    const jwtPattern = /^eyJ[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]*){1,}$/;

    // Cobalt v2 token format: cobalt_2_[50+ character string]
    const cobaltV2Pattern = /^cobalt_2_[a-zA-Z0-9]{50,}$/;

    return jwtPattern.test(token) || cobaltV2Pattern.test(token);
}

/**
 * Create standardized D&D Beyond API headers
 * @param {string} token - Token (cobalt for cookie auth, bearer for API calls)
 * @param {Object} additionalHeaders - Additional headers to include
 * @param {string} authType - 'cookie' for cobalt session, 'bearer' for API calls
 * @returns {Object} Headers object
 */
export function createDDBHeaders(token, additionalHeaders = {}, authType = 'auto') {
    // Auto-detect token type if not specified
    if (authType === 'auto') {
        authType = token && token.startsWith('eyJ') ? 'cookie' : 'bearer';
    }

    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'FoundryMagic/1.0.0',
        ...additionalHeaders
    };

    if (authType === 'cookie') {
        // Use as cookie for cobalt session tokens (authentication step)
        headers['Cookie'] = `CobaltSession=${token}`;
    } else {
        // Use as bearer token for API calls
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}/**
 * Common D&D Beyond API endpoints - Updated based on real implementations
 */
export const DDB_ENDPOINTS = {
    // Authentication service for exchanging cobalt session for Bearer token
    AUTH_SERVICE: 'https://auth-service.dndbeyond.com/v1/cobalt-token',

    // Character service endpoints
    CHARACTER_BASE: 'https://character-service.dndbeyond.com/character/v5',
    CHARACTER: (id) => `https://character-service.dndbeyond.com/character/v5/character/${id}?includeCustomItems=true`,
    CHARACTER_TEST: `https://character-service.dndbeyond.com/character/v5/game-data/items?sharingSetting=2&take=1`,

    // Spell endpoints
    SPELLS: (classId, level, campaignId = null) => {
        const campaign = campaignId ? `&campaignId=${campaignId}` : '';
        return `https://character-service.dndbeyond.com/character/v5/game-data/spells?classId=${classId}&classLevel=${level}&sharingSetting=2${campaign}`;
    },

    // Item endpoints  
    ITEMS: (campaignId = null) => {
        const campaign = campaignId ? `&campaignId=${campaignId}` : '';
        return `https://character-service.dndbeyond.com/character/v5/game-data/items?sharingSetting=2${campaign}`;
    },

    // Monster service endpoints
    MONSTER_BASE: 'https://monster-service.dndbeyond.com/v1/Monster',
    MONSTERS: (skip = 0, take = 20, search = '') => {
        return `https://monster-service.dndbeyond.com/v1/Monster?search=${encodeURIComponent(search)}&skip=${skip}&take=${take}`;
    },
    MONSTER_IDS: (ids) => {
        const idParams = ids.map(id => `ids=${id}`).join('&');
        return `https://monster-service.dndbeyond.com/v1/Monster?${idParams}`;
    },

    // Class and race options
    CLASS_OPTIONS: `https://character-service.dndbeyond.com/character/v5/game-data/class-feature/collection`,
    RACIAL_TRAITS: `https://character-service.dndbeyond.com/character/v5/game-data/racial-trait/collection`,

    // Campaign endpoints
    CAMPAIGNS: 'https://www.dndbeyond.com/api/campaign/stt/user-campaigns',
    CONFIG: 'https://www.dndbeyond.com/api/config/json'
};

/**
 * Enhanced fetch with standard error handling and retry logic
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} retryOptions - Retry configuration
 * @returns {Promise<Response>} Response
 */
export async function enhancedFetch(url, options = {}, retryOptions = {}) {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        maxDelay = 10000,
        backoffFactor = 2
    } = retryOptions;

    let lastError;
    let delay = baseDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                // Handle specific HTTP errors
                if (response.status === 401) {
                    throw new AuthenticationError('Invalid or expired token');
                } else if (response.status === 403) {
                    throw new PermissionError('Access forbidden - check subscription');
                } else if (response.status === 404) {
                    throw new NotFoundError('Resource not found');
                } else if (response.status === 429) {
                    // Rate limit - wait longer before retry
                    delay = Math.min(delay * 3, maxDelay);
                    throw new RateLimitError('Rate limit exceeded');
                } else if (response.status >= 500) {
                    throw new ServerError(`Server error: ${response.status}`);
                }

                throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;

        } catch (error) {
            lastError = error;

            // Don't retry on certain errors
            if (error instanceof AuthenticationError ||
                error instanceof PermissionError ||
                error instanceof NotFoundError) {
                throw error;
            }

            // Don't retry on last attempt
            if (attempt === maxRetries) {
                break;
            }

            // Wait before retry with exponential backoff
            await sleep(delay);
            delay = Math.min(delay * backoffFactor, maxDelay);
        }
    }

    throw new Error(`Request failed after ${maxRetries + 1} attempts: ${lastError.message}`);
}

/**
 * Calculate ability modifier from ability score
 * @param {number} score - Ability score (1-30)
 * @returns {number} Ability modifier
 */
export function calculateAbilityModifier(score) {
    return Math.floor((score - 10) / 2);
}

/**
 * Convert D&D Beyond size to Foundry size abbreviation
 * @param {string} size - D&D Beyond size (e.g., "Small", "Medium")
 * @returns {string} Foundry size abbreviation
 */
export function convertSizeToFoundry(size) {
    const sizeMap = {
        'Tiny': 'tiny',
        'Small': 'sm',
        'Medium': 'med',
        'Large': 'lg',
        'Huge': 'huge',
        'Gargantuan': 'grg'
    };
    return sizeMap[size] || 'med';
}

/**
 * Convert spell school name to Foundry abbreviation
 * @param {string} school - Full school name
 * @returns {string} School abbreviation
 */
export function convertSpellSchool(school) {
    const schoolMap = {
        'Abjuration': 'abj',
        'Conjuration': 'con',
        'Divination': 'div',
        'Enchantment': 'enc',
        'Evocation': 'evo',
        'Illusion': 'ill',
        'Necromancy': 'nec',
        'Transmutation': 'trs'
    };
    return schoolMap[school] || 'evo';
}

/**
 * Convert challenge rating to XP value
 * @param {number} cr - Challenge rating
 * @returns {Object} CR and XP values
 */
export function convertCRToXP(cr) {
    const crXpMap = {
        0: 10,
        0.125: 25,
        0.25: 50,
        0.5: 100,
        1: 200,
        2: 450,
        3: 700,
        4: 1100,
        5: 1800,
        6: 2300,
        7: 2900,
        8: 3900,
        9: 5000,
        10: 5900,
        11: 7200,
        12: 8400,
        13: 10000,
        14: 11500,
        15: 13000,
        16: 15000,
        17: 18000,
        18: 20000,
        19: 22000,
        20: 25000,
        21: 33000,
        22: 41000,
        23: 50000,
        24: 62000,
        25: 75000,
        26: 90000,
        27: 105000,
        28: 120000,
        29: 135000,
        30: 155000
    };

    return {
        cr: cr,
        xp: crXpMap[cr] || 10
    };
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }

    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
}

/**
 * Generate a unique ID
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}-${timestamp}-${randomPart}` : `${timestamp}-${randomPart}`;
}

/**
 * Format bytes as human readable string
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Custom error classes
export class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class PermissionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PermissionError';
    }
}

export class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class RateLimitError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RateLimitError';
    }
}

export class ServerError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ServerError';
    }
}

export class NetworkError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NetworkError';
    }
}

export class ValidationError extends Error {
    constructor(message, details = []) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
    }
}