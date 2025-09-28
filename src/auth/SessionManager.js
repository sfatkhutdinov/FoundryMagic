/**
 * @fileoverview Session Manager for authentication state persistence
 * Handles session lifecycle, expiration, and automatic renewal
 */

export default class SessionManager {
    constructor(authService) {
        this._authService = authService;
        this._sessionData = null;
        this._isInitialized = false;
        this._renewalTimer = null;
    }

    /**
     * Initialize the session manager
     */
    async initialize() {
        // Load session from storage
        this._loadSession();

        // Check if current session is valid
        if (this._sessionData) {
            const isValid = await this._validateSession();
            if (!isValid) {
                this._clearSession();
            } else {
                this._scheduleRenewal();
            }
        }

        this._isInitialized = true;
    }

    /**
     * Start a new session
     * @param {Object} authResult - Authentication result
     */
    async startSession(authResult) {
        this._sessionData = {
            userId: authResult.userId,
            expiresAt: authResult.expiresAt,
            permissions: authResult.permissions,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        this._saveSession();
        this._scheduleRenewal();
    }

    /**
     * Get current session info
     * @returns {Object|null} Session data or null
     */
    getSessionInfo() {
        if (!this._sessionData) return null;

        // Update last activity
        this._sessionData.lastActivity = new Date().toISOString();
        this._saveSession();

        return {
            userId: this._sessionData.userId,
            expiresAt: this._sessionData.expiresAt,
            permissions: this._sessionData.permissions,
            createdAt: this._sessionData.createdAt,
            lastActivity: this._sessionData.lastActivity
        };
    }

    /**
     * Check if session is active
     * @returns {boolean} True if active
     */
    isSessionActive() {
        if (!this._sessionData) return false;

        const now = new Date();
        const expiresAt = new Date(this._sessionData.expiresAt);

        return now < expiresAt;
    }

    /**
     * Refresh the current session
     * @returns {Promise<boolean>} True if refreshed successfully
     */
    async refreshSession() {
        if (!this._sessionData) return false;

        try {
            // Attempt to refresh via auth service
            const refreshResult = await this._authService.refreshSession();

            if (refreshResult?.refreshed) {
                this._sessionData.expiresAt = refreshResult.expiresAt;
                this._sessionData.lastActivity = new Date().toISOString();
                this._saveSession();
                this._scheduleRenewal();
                return true;
            }

            return false;
        } catch (error) {
            console.warn('Session refresh failed:', error);
            this.endSession();
            return false;
        }
    }

    /**
     * End the current session
     */
    endSession() {
        this._clearSession();
        if (this._renewalTimer) {
            clearTimeout(this._renewalTimer);
            this._renewalTimer = null;
        }
    }

    /**
     * Get time until session expires
     * @returns {number} Minutes until expiration, or -1 if no session
     */
    getMinutesUntilExpiration() {
        if (!this._sessionData) return -1;

        const now = new Date();
        const expiresAt = new Date(this._sessionData.expiresAt);
        const diffMs = expiresAt - now;

        return Math.max(0, Math.floor(diffMs / (1000 * 60)));
    }

    /**
     * Check if session needs refresh soon
     * @param {number} thresholdMinutes - Minutes before expiration to consider needing refresh
     * @returns {boolean} True if needs refresh
     */
    needsRefresh(thresholdMinutes = 30) {
        return this.getMinutesUntilExpiration() <= thresholdMinutes;
    }

    /**
     * Load session from storage
     * @private
     */
    _loadSession() {
        try {
            if (game?.settings) {
                const stored = game.settings.get('foundrymagic', 'sessionData');
                if (stored) {
                    this._sessionData = JSON.parse(stored);
                }
            }
        } catch (error) {
            console.warn('Failed to load session data:', error);
            this._sessionData = null;
        }
    }

    /**
     * Save session to storage
     * @private
     */
    _saveSession() {
        try {
            if (game?.settings && this._sessionData) {
                game.settings.set('foundrymagic', 'sessionData', JSON.stringify(this._sessionData));
            }
        } catch (error) {
            console.warn('Failed to save session data:', error);
        }
    }

    /**
     * Clear session data
     * @private
     */
    _clearSession() {
        this._sessionData = null;
        try {
            if (game?.settings) {
                game.settings.set('foundrymagic', 'sessionData', null);
            }
        } catch (error) {
            console.warn('Failed to clear session data:', error);
        }
    }

    /**
     * Validate current session
     * @private
     * @returns {Promise<boolean>} True if valid
     */
    async _validateSession() {
        if (!this._sessionData) return false;

        // Check expiration
        if (!this.isSessionActive()) return false;

        // Validate token
        return await this._authService.validateToken();
    }

    /**
     * Schedule automatic session renewal
     * @private
     */
    _scheduleRenewal() {
        if (this._renewalTimer) {
            clearTimeout(this._renewalTimer);
        }

        const minutesUntilExpiration = this.getMinutesUntilExpiration();
        if (minutesUntilExpiration > 30) {
            // Schedule renewal 30 minutes before expiration
            const renewalDelay = (minutesUntilExpiration - 30) * 60 * 1000;
            this._renewalTimer = setTimeout(async () => {
                await this.refreshSession();
            }, renewalDelay);
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this._renewalTimer) {
            clearTimeout(this._renewalTimer);
            this._renewalTimer = null;
        }
        this._clearSession();
        this._isInitialized = false;
    }
}