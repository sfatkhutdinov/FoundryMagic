/**
 * @fileoverview Authentication Service for D&D Beyond API integration
 * Handles cobalt token management and validation
 */

import { validateCobaltTokenFormat, createDDBHeaders, DDB_ENDPOINTS, enhancedFetch } from '../utils/SharedUtils.js';

export default class AuthenticationService {
    constructor() {
        this._token = null;
        this._isInitialized = false;
        this._sessionData = null;
        this._refreshTimer = null;
    }

    /**
     * Authenticate with D&D Beyond using cobalt token (Contract API method)
     * @param {Object} options - Authentication options
     * @param {string} options.cobaltToken - Raw D&D Beyond cobalt token
     * @param {string} options.userId - D&D Beyond account identifier
     * @returns {Promise<AuthenticationResult>}
     * @throws {InvalidTokenError|NetworkFailureError|PermissionDeniedError}
     */
    async authenticate({ cobaltToken, userId }) {
        // Check permissions - only DMs can authenticate
        if (!game.user.isGM) {
            const error = new Error('Only DMs can authenticate with D&D Beyond');
            error.name = 'PermissionDeniedError';
            throw error;
        }

        // Validate token format
        if (!validateCobaltTokenFormat(cobaltToken)) {
            const error = new Error('Invalid cobalt token format');
            error.name = 'InvalidTokenError';
            throw error;
        }

        try {
            // Step 1: Exchange cobalt session token for Bearer token
            console.log('🔐 Exchanging cobalt session for Bearer token...');
            const authResponse = await enhancedFetch(DDB_ENDPOINTS.AUTH_SERVICE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `CobaltSession=${cobaltToken}`
                }
            });

            if (authResponse.status === 401) {
                const error = new Error('Invalid or expired cobalt token');
                error.name = 'InvalidTokenError';
                throw error;
            }

            if (!authResponse.ok) {
                const error = new Error(`Authentication service error: ${authResponse.status} ${authResponse.statusText}`);
                error.name = 'NetworkFailureError';
                throw error;
            }

            const authData = await authResponse.json();

            if (!authData.token) {
                const error = new Error('No bearer token received from authentication service');
                error.name = 'InvalidTokenError';
                throw error;
            }

            // Step 2: Store both tokens
            this._cobaltToken = cobaltToken;
            this._bearerToken = authData.token;

            console.log('✅ Bearer token obtained successfully');

            // Step 3: Test the bearer token with a simple API call
            console.log('🧪 Testing Bearer token with character service...');
            const testResponse = await enhancedFetch(DDB_ENDPOINTS.CHARACTER_TEST, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this._bearerToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (testResponse.status === 401) {
                const error = new Error('Bearer token not accepted by character service');
                error.name = 'InvalidTokenError';
                throw error;
            }

            // Set up session data
            const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // 6 hours (Bearer tokens are shorter-lived)

            this._sessionData = {
                valid: true,
                expiresAt,
                userId: userId || 'authenticated-user',
                permissions: ['characters', 'adventures', 'content'],
                bearerToken: this._bearerToken,
                cobaltToken: this._cobaltToken
            };

            // Persist session data
            if (game?.settings) {
                await game.settings.set('foundrymagic', 'sessionData', this._sessionData);
            }

            // Emit authentication event
            if (game.socket) {
                game.socket.emit('foundrymagic.auth.validated', {
                    userId: this._sessionData.userId,
                    expiresAt: this._sessionData.expiresAt
                });
            }

            // Set up auto-refresh timer (refresh 1 hour before expiry) 
            this._scheduleRefresh();

            console.log('🎉 Authentication completed successfully');

            return {
                success: true,
                userId: this._sessionData.userId,
                expiresAt: this._sessionData.expiresAt,
                sessionDuration: '6 hours',
                permissions: this._sessionData.permissions
            };

        } catch (error) {
            console.error('❌ Authentication failed:', error.message);

            if (error.name === 'InvalidTokenError' || error.name === 'PermissionDeniedError') {
                throw error;
            }

            const networkError = new Error(`Network failure during authentication: ${error.message}`);
            networkError.name = 'NetworkFailureError';
            throw networkError;
        }
    }

    /**
     * Get Bearer token for API calls
     * @returns {string|null} Bearer token or null if not authenticated
     */
    getBearerToken() {
        return this._bearerToken || null;
    }

    /**
     * Get Cobalt session token
     * @returns {string|null} Cobalt token or null if not authenticated  
     */
    getCobaltToken() {
        return this._cobaltToken || null;
    }

    /**
     * Refresh the active session (Contract API method)
     * @returns {Promise<RefreshResult>}
     * @throws {NoActiveSessionError|RefreshFailedError}
     */
    async refreshSession() {
        if (!this._token || !this._sessionData) {
            const error = new Error('No active session to refresh');
            error.name = 'NoActiveSessionError';
            throw error;
        }

        try {
            // Validate current token is still good
            const response = await enhancedFetch(DDB_ENDPOINTS.USER_PROFILE, {
                method: 'GET',
                headers: createDDBHeaders(this._token)
            });

            if (!response.ok) {
                const error = new Error('Token refresh failed - invalid token');
                error.name = 'RefreshFailedError';
                throw error;
            }

            // Update expiry time
            const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            this._sessionData.expiresAt = newExpiresAt;

            // Persist updated session
            if (game?.settings) {
                await game.settings.set('foundrymagic', 'sessionData', this._sessionData);
            }

            // Emit refresh event
            if (game.socket) {
                game.socket.emit('foundrymagic.auth.refreshed', {
                    expiresAt: newExpiresAt
                });
            }

            // Reschedule next refresh
            this._scheduleRefresh();

            return {
                refreshed: true,
                expiresAt: newExpiresAt
            };

        } catch (error) {
            if (error.name === 'RefreshFailedError') {
                throw error;
            }

            const refreshError = new Error(`Session refresh failed: ${error.message}`);
            refreshError.name = 'RefreshFailedError';
            throw refreshError;
        }
    }

    /**
     * Get current session status
     * @returns {Object|null} Session data or null if no active session
     */
    getSession() {
        return this._sessionData ? { ...this._sessionData } : null;
    }

    /**
     * Schedule automatic token refresh
     * @private
     */
    _scheduleRefresh() {
        if (this._refreshTimer) {
            clearTimeout(this._refreshTimer);
        }

        if (this._sessionData?.expiresAt) {
            const expiryTime = new Date(this._sessionData.expiresAt).getTime();
            const refreshTime = expiryTime - (60 * 60 * 1000); // 1 hour before expiry
            const timeUntilRefresh = refreshTime - Date.now();

            if (timeUntilRefresh > 0) {
                this._refreshTimer = setTimeout(async () => {
                    try {
                        await this.refreshSession();
                    } catch (error) {
                        console.warn('Automatic session refresh failed:', error);
                        // Clear session on refresh failure
                        this._sessionData = null;
                        this._token = null;
                    }
                }, timeUntilRefresh);
            }
        }
    }

    /**
     * Set the D&D Beyond cobalt token
     * @param {string} token - Cobalt token in format cobalt_2_xxxxx
     * @throws {Error} If token format is invalid
     */
    setToken(token) {
        if (!validateCobaltTokenFormat(token)) {
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
     * Clear the stored token and session
     */
    clearToken() {
        this._token = null;
        this._sessionData = null;

        if (this._refreshTimer) {
            clearTimeout(this._refreshTimer);
            this._refreshTimer = null;
        }

        if (game?.settings) {
            game.settings.set('foundrymagic', 'ddbToken', null);
            game.settings.set('foundrymagic', 'sessionData', null);
        }
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
            const response = await enhancedFetch(DDB_ENDPOINTS.USER_PROFILE, {
                method: 'GET',
                headers: createDDBHeaders(token)
            });

            return response.ok;
        } catch (error) {
            console.warn('Token validation failed:', error);
            if (error.name === 'AuthenticationError') {
                // Token expired or invalid, clear it
                this.clearToken();
            }
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
            const response = await enhancedFetch(DDB_ENDPOINTS.USER_PROFILE, {
                method: 'GET',
                headers: createDDBHeaders(token)
            });

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
     * Initialize the authentication service
     */
    async initialize() {
        // Load token and session data from Foundry settings if available
        if (game?.settings) {
            this._token = game.settings.get('foundrymagic', 'ddbToken') || null;
            this._sessionData = game.settings.get('foundrymagic', 'sessionData') || null;

            // Check if session is still valid
            if (this._sessionData && this._sessionData.expiresAt) {
                const expiryTime = new Date(this._sessionData.expiresAt).getTime();
                if (Date.now() >= expiryTime) {
                    // Session expired, clear it
                    this._sessionData = null;
                    this._token = null;
                    await game.settings.set('foundrymagic', 'ddbToken', null);
                    await game.settings.set('foundrymagic', 'sessionData', null);
                } else {
                    // Schedule refresh for valid session
                    this._scheduleRefresh();
                }
            }
        }
        this._isInitialized = true;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this._refreshTimer) {
            clearTimeout(this._refreshTimer);
            this._refreshTimer = null;
        }
        this._token = null;
        this._sessionData = null;
        this._isInitialized = false;
    }
}