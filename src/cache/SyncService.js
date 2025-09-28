/**
 * @fileoverview Content Synchronization Service
 * Handles synchronization of cached content with D&D Beyond
 */

export default class SyncService {
    constructor(authService, cacheManager, updateService) {
        this._authService = authService;
        this._cacheManager = cacheManager;
        this._updateService = updateService;
        this._syncInProgress = false;
        this._syncQueue = [];
        this._syncStats = {
            lastSync: null,
            totalSynced: 0,
            errors: 0
        };
    }

    /**
     * Initialize the sync service
     */
    async initialize() {
        await this._loadSyncStats();
    }

    /**
     * Synchronize content for given types
     * @param {Array} contentTypes - Types of content to sync
     * @param {Object} options - Sync options
     * @returns {Promise<Object>} Sync results
     */
    async synchronize(contentTypes = ['characters', 'monsters', 'spells', 'items'], options = {}) {
        if (this._syncInProgress) {
            throw new Error('Sync already in progress');
        }

        this._syncInProgress = true;

        try {
            const results = {
                synced: [],
                skipped: [],
                errors: [],
                stats: {}
            };

            for (const contentType of contentTypes) {
                const typeResults = await this._syncContentType(contentType, options);
                results.synced.push(...typeResults.synced);
                results.skipped.push(...typeResults.skipped);
                results.errors.push(...typeResults.errors);
                results.stats[contentType] = typeResults.stats;
            }

            this._syncStats.lastSync = new Date().toISOString();
            this._syncStats.totalSynced += results.synced.length;
            this._syncStats.errors += results.errors.length;

            await this._saveSyncStats();

            return results;
        } finally {
            this._syncInProgress = false;
        }
    }

    /**
     * Check sync status
     * @returns {Object} Sync status
     */
    getSyncStatus() {
        return {
            inProgress: this._syncInProgress,
            queueLength: this._syncQueue.length,
            stats: { ...this._syncStats }
        };
    }

    /**
     * Queue content for sync
     * @param {string} contentType - Type of content
     * @param {string} contentId - Content ID
     */
    queueForSync(contentType, contentId) {
        const key = `${contentType}-${contentId}`;
        if (!this._syncQueue.includes(key)) {
            this._syncQueue.push(key);
        }
    }

    /**
     * Process sync queue
     * @returns {Promise<Object>} Queue processing results
     */
    async processQueue() {
        if (this._syncInProgress) {
            throw new Error('Sync already in progress');
        }

        const queuedItems = [...this._syncQueue];
        this._syncQueue = [];

        if (queuedItems.length === 0) {
            return { processed: 0, results: [] };
        }

        // Group by content type
        const grouped = {};
        queuedItems.forEach(key => {
            const [type, id] = key.split('-', 2);
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(id);
        });

        // Sync each type
        const results = [];
        for (const [type, ids] of Object.entries(grouped)) {
            const typeResults = await this._syncContentType(type, { specificIds: ids });
            results.push(...typeResults.synced, ...typeResults.errors);
        }

        return {
            processed: queuedItems.length,
            results
        };
    }

    /**
     * Sync specific content type
     * @private
     * @param {string} contentType - Content type
     * @param {Object} options - Sync options
     * @returns {Promise<Object>} Sync results for type
     */
    async _syncContentType(contentType, options = {}) {
        const results = {
            synced: [],
            skipped: [],
            errors: [],
            stats: {
                checked: 0,
                updated: 0,
                skipped: 0,
                errors: 0
            }
        };

        try {
            // Get cached content IDs for this type
            const cacheKeys = await this._cacheManager.getKeys(`${contentType}-`);
            const cachedIds = cacheKeys.map(key => key.replace(`${contentType}-`, ''));

            let idsToCheck = cachedIds;
            if (options.specificIds) {
                idsToCheck = options.specificIds.filter(id => cachedIds.includes(id));
            }

            if (idsToCheck.length === 0) {
                return results;
            }

            // Check for updates
            const updateResults = await this._updateService.checkForUpdates(
                idsToCheck.map(id => ({ id, type: contentType })),
                contentType
            );

            results.stats.checked = idsToCheck.length;

            // Process available updates
            if (updateResults.available.length > 0) {
                const updateResults2 = await this._updateService.updateContent(
                    updateResults.available.map(update => ({
                        id: update.id,
                        type: update.type,
                        currentVersion: update.currentVersion,
                        localVersion: update.localVersion
                    }))
                );

                results.synced.push(...updateResults2.successful.map(r => ({
                    id: r.id,
                    type: r.type,
                    action: 'updated'
                })));

                results.errors.push(...updateResults2.failed.map(r => ({
                    id: r.id,
                    type: r.type,
                    error: r.error
                })));

                results.stats.updated = updateResults2.successful.length;
                results.stats.errors = updateResults2.failed.length;
            }

            // Mark unchanged as skipped
            results.skipped.push(...updateResults.unchanged.map(item => ({
                id: item.id,
                type: item.type,
                reason: 'unchanged'
            })));

            results.stats.skipped = updateResults.unchanged.length;

        } catch (error) {
            results.errors.push({
                type: contentType,
                error: error.message
            });
            results.stats.errors++;
        }

        return results;
    }

    /**
     * Force refresh of content
     * @param {string} contentType - Content type
     * @param {Array} contentIds - Specific content IDs
     * @returns {Promise<Object>} Refresh results
     */
    async forceRefresh(contentType, contentIds = null) {
        // This would force re-download of content regardless of version
        // Implementation would depend on the importer services

        const results = {
            refreshed: [],
            errors: []
        };

        // Placeholder - actual implementation would:
        // 1. Get content IDs (all or specified)
        // 2. Call appropriate importer to re-fetch
        // 3. Update cache with fresh data

        return results;
    }

    /**
     * Get sync conflicts (if any)
     * @returns {Promise<Array>} Array of conflicts
     */
    async getConflicts() {
        // Check for content that has local modifications
        // This would require tracking local changes vs remote versions

        return []; // Placeholder
    }

    /**
     * Resolve sync conflict
     * @param {string} contentId - Content ID
     * @param {string} resolution - 'local' or 'remote'
     * @returns {Promise<boolean>} Success status
     */
    async resolveConflict(contentId, resolution) {
        // Implementation would handle conflict resolution
        // For now, just mark as resolved

        return true;
    }

    /**
     * Schedule automatic sync
     * @param {number} intervalMs - Sync interval in milliseconds
     */
    scheduleAutoSync(intervalMs = 3600000) { // Default 1 hour
        if (this._autoSyncTimer) {
            clearInterval(this._autoSyncTimer);
        }

        this._autoSyncTimer = setInterval(async () => {
            try {
                if (!this._syncInProgress) {
                    await this.synchronize();
                }
            } catch (error) {
                console.error('Auto sync failed:', error);
            }
        }, intervalMs);
    }

    /**
     * Stop automatic sync
     */
    stopAutoSync() {
        if (this._autoSyncTimer) {
            clearInterval(this._autoSyncTimer);
            this._autoSyncTimer = null;
        }
    }

    /**
     * Get sync history
     * @param {number} limit - Maximum number of entries
     * @returns {Promise<Array>} Sync history
     */
    async getSyncHistory(limit = 10) {
        try {
            // Load from stored history
            const history = await this._cacheManager.retrieve('sync-history') || [];
            return history.slice(-limit);
        } catch (error) {
            console.error('Failed to get sync history:', error);
            return [];
        }
    }

    /**
     * Clear sync history
     */
    async clearSyncHistory() {
        try {
            await this._cacheManager.remove('sync-history');
        } catch (error) {
            console.error('Failed to clear sync history:', error);
        }
    }

    /**
     * Load sync statistics
     * @private
     */
    async _loadSyncStats() {
        try {
            if (game?.settings) {
                const stored = game.settings.get('foundrymagic', 'syncStats');
                if (stored) {
                    this._syncStats = { ...this._syncStats, ...JSON.parse(stored) };
                }
            }
        } catch (error) {
            console.warn('Failed to load sync stats:', error);
        }
    }

    /**
     * Save sync statistics
     * @private
     */
    async _saveSyncStats() {
        try {
            if (game?.settings) {
                game.settings.set('foundrymagic', 'syncStats', JSON.stringify(this._syncStats));
            }
        } catch (error) {
            console.warn('Failed to save sync stats:', error);
        }
    }

    /**
     * Record sync event in history
     * @private
     * @param {Object} event - Sync event data
     */
    async _recordSyncEvent(event) {
        try {
            const history = await this.getSyncHistory(100); // Get last 100
            history.push({
                timestamp: new Date().toISOString(),
                ...event
            });

            await this._cacheManager.store('sync-history', history);
        } catch (error) {
            console.error('Failed to record sync event:', error);
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopAutoSync();
        this._syncQueue = [];
    }
}