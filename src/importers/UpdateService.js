/**
 * @fileoverview Content Update Service for D&D Beyond integration
 * Handles version tracking and updating imported content when source changes
 */

export default class UpdateService {
    constructor(authService, cacheManager) {
        this._authService = authService;
        this._cacheManager = cacheManager;
        this._updateChecks = new Map();
    }

    /**
     * Initialize the update service
     */
    async initialize() {
        // Load update tracking data
        this._loadUpdateTracking();
    }

    /**
     * Check for content updates
     * @param {Array} contentIds - Content IDs to check
     * @param {string} contentType - Type of content
     * @returns {Promise<Object>} Update check results
     */
    async checkForUpdates(contentIds, contentType) {
        const token = this._authService.getToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const updates = {
            available: [],
            unchanged: [],
            errors: []
        };

        for (const contentId of contentIds) {
            try {
                const currentVersion = await this._getCurrentVersion(contentId, contentType);
                const localVersion = this._getLocalVersion(contentId, contentType);

                if (!localVersion || currentVersion !== localVersion) {
                    updates.available.push({
                        id: contentId,
                        type: contentType,
                        currentVersion,
                        localVersion
                    });
                } else {
                    updates.unchanged.push({
                        id: contentId,
                        type: contentType,
                        version: currentVersion
                    });
                }
            } catch (error) {
                updates.errors.push({
                    id: contentId,
                    type: contentType,
                    error: error.message
                });
            }
        }

        return updates;
    }

    /**
     * Update content
     * @param {Array} updates - Updates to apply
     * @returns {Promise<Object>} Update results
     */
    async updateContent(updates) {
        const results = {
            successful: [],
            failed: [],
            skipped: []
        };

        for (const update of updates) {
            try {
                const result = await this._performUpdate(update);
                results.successful.push(result);
                this._updateLocalVersion(update.id, update.type, update.currentVersion);
            } catch (error) {
                results.failed.push({
                    id: update.id,
                    type: update.type,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Get current version from D&D Beyond
     * @private
     * @param {string} contentId - Content ID
     * @param {string} contentType - Content type
     * @returns {Promise<string>} Version string
     */
    async _getCurrentVersion(contentId, contentType) {
        const token = this._authService.getToken();
        const endpoint = this._getEndpointForType(contentType, contentId);

        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch ${contentType} ${contentId}`);
        }

        const data = await response.json();
        return data.lastModified || data.updatedAt || data.version || 'unknown';
    }

    /**
     * Get local version
     * @private
     * @param {string} contentId - Content ID
     * @param {string} contentType - Content type
     * @returns {string|null} Local version or null
     */
    _getLocalVersion(contentId, contentType) {
        const tracking = this._updateChecks.get(`${contentType}-${contentId}`);
        return tracking ? tracking.version : null;
    }

    /**
     * Update local version
     * @private
     * @param {string} contentId - Content ID
     * @param {string} contentType - Content type
     * @param {string} version - New version
     */
    _updateLocalVersion(contentId, contentType, version) {
        const key = `${contentType}-${contentId}`;
        this._updateChecks.set(key, {
            id: contentId,
            type: contentType,
            version,
            lastChecked: new Date().toISOString()
        });
        this._saveUpdateTracking();
    }

    /**
     * Perform update
     * @private
     * @param {Object} update - Update info
     * @returns {Promise<Object>} Update result
     */
    async _performUpdate(update) {
        // Re-import the content with updated data
        // This would delegate to the appropriate importer

        const result = {
            id: update.id,
            type: update.type,
            action: 'updated',
            previousVersion: update.localVersion,
            newVersion: update.currentVersion
        };

        // Placeholder - actual implementation would:
        // 1. Fetch updated data
        // 2. Transform to Foundry format
        // 3. Update existing compendium entry
        // 4. Handle conflicts if necessary

        return result;
    }

    /**
     * Get API endpoint for content type
     * @private
     * @param {string} contentType - Content type
     * @param {string} contentId - Content ID
     * @returns {string} API endpoint
     */
    _getEndpointForType(contentType, contentId) {
        const baseUrl = 'https://www.dndbeyond.com/api';

        switch (contentType) {
            case 'characters':
                return `${baseUrl}/characters/${contentId}`;
            case 'monsters':
                return `${baseUrl}/monsters/${contentId}`;
            case 'spells':
                return `${baseUrl}/spells/${contentId}`;
            case 'items':
                return `${baseUrl}/magic-items/${contentId}`;
            case 'adventures':
                return `${baseUrl}/adventures/${contentId}`;
            default:
                throw new Error(`Unknown content type: ${contentType}`);
        }
    }

    /**
     * Load update tracking data
     * @private
     */
    _loadUpdateTracking() {
        try {
            if (game?.settings) {
                const stored = game.settings.get('foundrymagic', 'updateTracking');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    this._updateChecks = new Map(Object.entries(parsed));
                }
            }
        } catch (error) {
            console.warn('Failed to load update tracking:', error);
        }
    }

    /**
     * Save update tracking data
     * @private
     */
    _saveUpdateTracking() {
        try {
            if (game?.settings) {
                const data = Object.fromEntries(this._updateChecks);
                game.settings.set('foundrymagic', 'updateTracking', JSON.stringify(data));
            }
        } catch (error) {
            console.warn('Failed to save update tracking:', error);
        }
    }

    /**
     * Get update statistics
     * @returns {Object} Statistics
     */
    getUpdateStats() {
        const stats = {
            totalTracked: this._updateChecks.size,
            byType: {},
            lastChecked: null
        };

        for (const [key, tracking] of this._updateChecks) {
            const type = tracking.type;
            stats.byType[type] = (stats.byType[type] || 0) + 1;

            if (!stats.lastChecked || tracking.lastChecked > stats.lastChecked) {
                stats.lastChecked = tracking.lastChecked;
            }
        }

        return stats;
    }

    /**
     * Clear update tracking
     */
    clearTracking() {
        this._updateChecks.clear();
        this._saveUpdateTracking();
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this._updateChecks.clear();
    }
}