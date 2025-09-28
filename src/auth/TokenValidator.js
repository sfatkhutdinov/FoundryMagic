/**
 * @fileoverview Token Validator for D&D Beyond API token validation
 * Provides detailed token validation and user permission checking
 */

export default class TokenValidator {
    constructor(authService) {
        this._authService = authService;
        this._validationCache = new Map();
        this._cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Validate token and get detailed validation result
     * @param {string} token - Token to validate (optional, uses stored if not provided)
     * @returns {Promise<Object>} Validation result
     */
    async validateTokenDetailed(token = null) {
        const tokenToValidate = token || this._authService.getToken();

        if (!tokenToValidate) {
            return {
                valid: false,
                reason: 'No token provided',
                details: null
            };
        }

        // Check cache first
        const cached = this._getCachedValidation(tokenToValidate);
        if (cached) {
            return cached;
        }

        try {
            // Test token with user profile endpoint
            const profileResponse = await fetch('https://www.dndbeyond.com/api/user/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenToValidate}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!profileResponse.ok) {
                const errorDetails = await this._parseErrorResponse(profileResponse);
                this._cacheValidation(tokenToValidate, {
                    valid: false,
                    reason: errorDetails.reason,
                    details: errorDetails
                });
                return {
                    valid: false,
                    reason: errorDetails.reason,
                    details: errorDetails
                };
            }

            const profile = await profileResponse.json();

            // Test token with content access
            const contentAccess = await this._testContentAccess(tokenToValidate);

            const result = {
                valid: true,
                reason: 'Token is valid',
                details: {
                    userId: profile.id,
                    username: profile.username,
                    email: profile.email,
                    subscription: profile.subscription,
                    contentAccess,
                    validatedAt: new Date().toISOString()
                }
            };

            this._cacheValidation(tokenToValidate, result);
            return result;

        } catch (error) {
            this._cacheValidation(tokenToValidate, {
                valid: false,
                reason: 'Network error during validation',
                details: { error: error.message }
            });
            return {
                valid: false,
                reason: 'Network error during validation',
                details: { error: error.message }
            };
        }
    }

    /**
     * Check if user has access to specific content types
     * @param {string} token - Token to check
     * @returns {Promise<Object>} Access permissions
     */
    async checkContentPermissions(token = null) {
        const tokenToCheck = token || this._authService.getToken();

        if (!tokenToCheck) {
            return {
                characters: false,
                adventures: false,
                content: false
            };
        }

        try {
            // Test character access
            const characterAccess = await this._testEndpointAccess(
                tokenToCheck,
                'https://www.dndbeyond.com/api/characters/list'
            );

            // Test adventure access
            const adventureAccess = await this._testEndpointAccess(
                tokenToCheck,
                'https://www.dndbeyond.com/api/adventures'
            );

            // Test content access (monsters, spells, items)
            const contentAccess = await this._testEndpointAccess(
                tokenToCheck,
                'https://www.dndbeyond.com/api/monsters'
            );

            return {
                characters: characterAccess,
                adventures: adventureAccess,
                content: contentAccess
            };

        } catch (error) {
            console.warn('Permission check failed:', error);
            return {
                characters: false,
                adventures: false,
                content: false
            };
        }
    }

    /**
     * Get token expiration information
     * @param {string} token - Token to check
     * @returns {Promise<Object>} Expiration info
     */
    async getTokenExpiration(token = null) {
        const tokenToCheck = token || this._authService.getToken();

        if (!tokenToCheck) {
            return { expired: true, expiresAt: null };
        }

        try {
            // D&D Beyond tokens don't have explicit expiration in response
            // We can check if token still works
            const isValid = await this._authService.validateToken();

            if (isValid) {
                // Assume token is valid for at least 24 hours if it works
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
                return {
                    expired: false,
                    expiresAt: expiresAt.toISOString()
                };
            } else {
                return {
                    expired: true,
                    expiresAt: null
                };
            }

        } catch (error) {
            return {
                expired: true,
                expiresAt: null,
                error: error.message
            };
        }
    }

    /**
     * Test access to specific endpoint
     * @private
     * @param {string} token - Token to use
     * @param {string} url - Endpoint URL
     * @returns {Promise<boolean>} True if access granted
     */
    async _testEndpointAccess(token, url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.status !== 401 && response.status !== 403;
        } catch (error) {
            return false;
        }
    }

    /**
     * Test general content access
     * @private
     * @param {string} token - Token to use
     * @returns {Promise<boolean>} True if content access available
     */
    async _testContentAccess(token) {
        const endpoints = [
            'https://www.dndbeyond.com/api/monsters',
            'https://www.dndbeyond.com/api/spells',
            'https://www.dndbeyond.com/api/magic-items'
        ];

        for (const endpoint of endpoints) {
            if (await this._testEndpointAccess(token, endpoint)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Parse error response from API
     * @private
     * @param {Response} response - Fetch response
     * @returns {Promise<Object>} Parsed error details
     */
    async _parseErrorResponse(response) {
        try {
            const errorData = await response.json();
            return {
                status: response.status,
                reason: errorData.message || `HTTP ${response.status}`,
                details: errorData
            };
        } catch {
            return {
                status: response.status,
                reason: `HTTP ${response.status}`,
                details: null
            };
        }
    }

    /**
     * Get cached validation result
     * @private
     * @param {string} token - Token to check
     * @returns {Object|null} Cached result or null
     */
    _getCachedValidation(token) {
        const cached = this._validationCache.get(token);
        if (cached && (Date.now() - cached.timestamp) < this._cacheTimeout) {
            return cached.result;
        }

        // Remove expired cache entry
        if (cached) {
            this._validationCache.delete(token);
        }

        return null;
    }

    /**
     * Cache validation result
     * @private
     * @param {string} token - Token
     * @param {Object} result - Validation result
     */
    _cacheValidation(token, result) {
        this._validationCache.set(token, {
            result,
            timestamp: Date.now()
        });
    }

    /**
     * Clear validation cache
     */
    clearCache() {
        this._validationCache.clear();
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.clearCache();
    }
}