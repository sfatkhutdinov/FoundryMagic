/**
 * @fileoverview Authentication Service for D&D Beyond API integration
 * Handles cobalt token management and validation
 */

export default class AuthenticationService {
    constructor() {
        this._token = null;
        this._isInitialized = false;
    }

    /**
     * Initialize the authentication service
     */
    async initialize() {
        // Load token from Foundry settings if available
        if (game?.settings) {
            this._token = game.settings.get('foundrymagic', 'ddbToken') || null;
        }
        this._isInitialized = true;
    }

    /**
     * Set the D&D Beyond cobalt token
     * @param {string} token - Cobalt token in format cobalt_2_xxxxx
     * @throws {Error} If token format is invalid
     */
    setToken(token) {
        if (!this._validateTokenFormat(token)) {
            throw new Error('Invalid token format');
        }

        this._token = token;

        // Persist to Foundry settings
        if (game?.settings) {
            game.settings.set('foundrymagic', 'ddbToken', token);
        }
    }

    /**
     * Get the current D&D Beyond token
     * @returns {string|null} Current token or null if not set
     */
    getToken() {
        if (game?.settings && !this._token) {
            this._token = game.settings.get('foundrymagic', 'ddbToken') || null;
        }
        return this._token;
    }

    /**
     * Clear the stored token
     */
    clearToken() {
        this._token = null;

        if (game?.settings) {
            game.settings.set('foundrymagic', 'ddbToken', null);
        }
    }

    /**
     * Validate token format
     * @private
     * @param {string} token - Token to validate
     * @returns {boolean} True if valid format
     */
    _validateTokenFormat(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }

        // Cobalt v2 token format: cobalt_2_[50+ character string]
        const cobaltV2Pattern = /^cobalt_2_[a-zA-Z0-9]{50,}$/;
        return cobaltV2Pattern.test(token);
    }

    /**
     * Validate token against D&D Beyond API
     * @returns {Promise<boolean>} True if token is valid
     */
    async validateToken() {
        const token = this.getToken();
        if (!token) {
            return false;
        }

        try {
            const response = await fetch('https://www.dndbeyond.com/api/user/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                // Token expired or invalid, clear it
                this.clearToken();
                return false;
            }

            return response.ok;
        } catch (error) {
            console.warn('Token validation failed:', error);
            return false;
        }
    }

    /**
     * Get user profile from D&D Beyond
     * @returns {Promise<Object|null>} User profile data or null if failed
     */
    async getUserProfile() {
        const token = this.getToken();
        if (!token) {
            return null;
        }

        try {
            const response = await fetch('https://www.dndbeyond.com/api/user/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.warn('Failed to fetch user profile:', error);
            return null;
        }
    }

    /**
     * Check if user has premium access
     * @returns {Promise<boolean>} True if user has premium subscription
     */
    async hasPremiumAccess() {
        const profile = await this.getUserProfile();
        if (!profile || !profile.subscription) {
            return false;
        }

        // Check for premium subscription tiers
        const premiumTiers = ['hero', 'master', 'grandmaster'];
        return premiumTiers.includes(profile.subscription.tier);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this._token = null;
        this._isInitialized = false;
    }
}