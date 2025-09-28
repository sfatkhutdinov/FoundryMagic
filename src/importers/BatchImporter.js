/**
 * @fileoverview Batch Importer for D&D Beyond integration
 * Handles batch importing of multiple content items with progress tracking
 */

import { chunkArray, generateId } from '../utils/SharedUtils.js';

export default class BatchImporter {
    constructor(authService, cacheManager, contentService) {
        this._authService = authService;
        this._cacheManager = cacheManager;
        this._contentService = contentService;
        this._maxConcurrent = 5; // Max concurrent imports
        this._activeImports = new Map();
        
        // Performance optimization settings (T064)
        this._chunkSize = 50; // Max 50 items per batch
        this._maxImportTimeMs = 5 * 60 * 1000; // 5 minutes max for adventures
        this._memoryThreshold = 200 * 1024 * 1024; // 200MB memory limit
        this._gcInterval = null;
        
        // Memory monitoring
        this._memoryStats = {
            peak: 0,
            current: 0,
            gcCount: 0
        };
    }

    /**
     * Initialize the batch importer
     * Sets up memory monitoring and garbage collection
     */
    async initialize() {
        // Start memory monitoring and automatic garbage collection (T065)
        this._startMemoryMonitoring();
        this._startPeriodicGC();
    }

    /**
     * Start batch import with performance optimizations
     * @param {Object} params - Batch import parameters
     * @returns {Promise<Object>} Batch import handle
     */
    async startBatchImport(params) {
        const { items, options = {} } = params;
        
        // Performance optimization: enforce chunking limit (T064)
        if (items.length > this._chunkSize) {
            throw new Error(`Batch size (${items.length}) exceeds maximum allowed (${this._chunkSize})`);
        }
        
        const batchId = generateId('batch');

        const batchHandle = {
            batchId,
            status: 'queued',
            startTime: Date.now(),
            progress: {
                total: items.length,
                completed: 0,
                failed: 0
            },
            items: items.map(item => ({
                id: item.id,
                type: item.type,
                status: 'pending'
            })),
            performanceMetrics: {
                startTime: Date.now(),
                memoryAtStart: this._getCurrentMemoryUsage()
            }
        };

        this._activeImports.set(batchId, batchHandle);

        // Start processing in background with timeout
        this._processBatchWithTimeout(batchId, items, options);

        return batchHandle;
    }

    /**
     * Get batch import status
     * @param {string} batchId - Batch ID
     * @returns {Promise<Object>} Status
     */
    async getBatchStatus(batchId) {
        const batch = this._activeImports.get(batchId);
        if (!batch) {
            throw new Error('Batch not found');
        }

        return {
            batchId,
            status: batch.status,
            progress: batch.progress,
            items: batch.items,
            errors: batch.errors || []
        };
    }

    /**
     * Cancel batch import
     * @param {string} batchId - Batch ID
     * @returns {Promise<boolean>} Success
     */
    async cancelBatch(batchId) {
        const batch = this._activeImports.get(batchId);
        if (!batch) {
            return false;
        }

        batch.status = 'cancelled';
        this._activeImports.delete(batchId);
        return true;
    }

    /**
     * Process batch import
     * @private
     * @param {string} batchId - Batch ID
     * @param {Array} items - Items to import
     * @param {Object} options - Import options
     */
    async _processBatch(batchId, items, options) {
        const batch = this._activeImports.get(batchId);
        if (!batch) return;

        batch.status = 'in_progress';
        batch.errors = [];

        // Process items in chunks to limit concurrency
        const chunks = chunkArray(items, this._maxConcurrent);

        for (const chunk of chunks) {
            if (batch.status === 'cancelled') break;

            const promises = chunk.map(item =>
                this._importItem(batch, item, options)
            );

            await Promise.allSettled(promises);
        }

        if (batch.status !== 'cancelled') {
            batch.status = batch.progress.failed > 0 ? 'completed_with_errors' : 'completed';
        }

        // Clean up after some time
        setTimeout(() => {
            this._activeImports.delete(batchId);
        }, 300000); // 5 minutes
    }

    /**
     * Import single item
     * @private
     * @param {Object} batch - Batch object
     * @param {Object} item - Item to import
     * @param {Object} options - Import options
     */
    async _importItem(batch, item, options) {
        const itemStatus = batch.items.find(i => i.id === item.id);
        if (!itemStatus) return;

        try {
            itemStatus.status = 'processing';

            // Use appropriate importer based on type
            let result;
            switch (item.type) {
                case 'monsters':
                    result = await this._importMonster(item, options);
                    break;
                case 'spells':
                    result = await this._importSpell(item, options);
                    break;
                case 'items':
                    result = await this._importEquipmentItem(item, options);
                    break;
                default:
                    throw new Error(`Unsupported item type: ${item.type}`);
            }

            itemStatus.status = 'completed';
            itemStatus.result = result;
            batch.progress.completed++;

        } catch (error) {
            itemStatus.status = 'failed';
            itemStatus.error = error.message;
            batch.progress.failed++;
            batch.errors.push({
                itemId: item.id,
                error: error.message
            });
        }
    }

    /**
     * Import monster
     * @private
     * @param {Object} item - Monster item
     * @param {Object} options - Options
     * @returns {Promise<Object>} Result
     */
    async _importMonster(item, options) {
        // Placeholder - would use MonsterImporter
        return {
            foundryId: `Actor.monster.${item.id}`,
            compendium: item.targetCompendium
        };
    }

    /**
     * Import spell
     * @private
     * @param {Object} item - Spell item
     * @param {Object} options - Options
     * @returns {Promise<Object>} Result
     */
    async _importSpell(item, options) {
        // Placeholder - would use SpellImporter
        return {
            foundryId: `Item.spell.${item.id}`,
            compendium: item.targetCompendium
        };
    }

    /**
     * Import equipment item
     * @private
     * @param {Object} item - Item
     * @param {Object} options - Options
     * @returns {Promise<Object>} Result
     */
    async _importEquipmentItem(item, options) {
        // Placeholder - would use ItemImporter
        return {
            foundryId: `Item.equipment.${item.id}`,
            compendium: item.targetCompendium
        };
    }



    /**
     * Get active batches
     * @returns {Array} Active batch IDs
     */
    getActiveBatches() {
        return Array.from(this._activeImports.keys());
    }

    /**
     * Process batch with timeout protection (T064)
     * @private
     */
    async _processBatchWithTimeout(batchId, items, options) {
        const batch = this._activeImports.get(batchId);
        if (!batch) return;

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Import timeout exceeded (5 minutes)'));
            }, this._maxImportTimeMs);
        });

        try {
            await Promise.race([
                this._processBatch(batchId, items, options),
                timeoutPromise
            ]);
        } catch (error) {
            if (batch) {
                batch.status = 'failed';
                batch.error = error.message;
            }
        }
    }

    /**
     * Start memory monitoring (T065)
     * @private
     */
    _startMemoryMonitoring() {
        if (typeof performance !== 'undefined' && performance.memory) {
            setInterval(() => {
                const memInfo = performance.memory;
                this._memoryStats.current = memInfo.usedJSHeapSize;
                this._memoryStats.peak = Math.max(this._memoryStats.peak, this._memoryStats.current);
                
                // Trigger GC if memory usage is high
                if (this._memoryStats.current > this._memoryThreshold) {
                    this._forceGarbageCollection();
                }
            }, 5000); // Check every 5 seconds
        }
    }

    /**
     * Start periodic garbage collection (T065)
     * @private
     */
    _startPeriodicGC() {
        this._gcInterval = setInterval(() => {
            this._forceGarbageCollection();
        }, 30000); // Every 30 seconds
    }

    /**
     * Force garbage collection if available (T065)
     * @private
     */
    _forceGarbageCollection() {
        if (typeof global !== 'undefined' && global.gc) {
            global.gc();
            this._memoryStats.gcCount++;
        } else if (typeof window !== 'undefined' && window.gc) {
            window.gc();
            this._memoryStats.gcCount++;
        }
        
        // Also clear any cached references
        this._clearTemporaryCache();
    }

    /**
     * Clear temporary cache to free memory (T065)
     * @private
     */
    _clearTemporaryCache() {
        // Clear completed batches older than 5 minutes
        const fiveMinutesAgo = Date.now() - 300000;
        
        for (const [batchId, batch] of this._activeImports.entries()) {
            if (batch.status === 'completed' && batch.startTime < fiveMinutesAgo) {
                this._activeImports.delete(batchId);
            }
        }
    }

    /**
     * Get current memory usage (T065)
     * @private
     * @returns {number} Memory usage in bytes
     */
    _getCurrentMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        return {
            memory: this._memoryStats,
            activeBatches: this._activeImports.size,
            settings: {
                chunkSize: this._chunkSize,
                maxConcurrent: this._maxConcurrent,
                memoryThreshold: this._memoryThreshold
            }
        };
    }

    /**
     * Update performance settings (T064, T065)
     * @param {Object} settings - New settings
     */
    updatePerformanceSettings(settings) {
        if (settings.chunkSize && settings.chunkSize <= 50) {
            this._chunkSize = settings.chunkSize;
        }
        if (settings.maxConcurrent && settings.maxConcurrent <= 10) {
            this._maxConcurrent = settings.maxConcurrent;
        }
        if (settings.memoryThreshold) {
            this._memoryThreshold = settings.memoryThreshold;
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Cancel all active batches
        for (const batchId of this._activeImports.keys()) {
            this.cancelBatch(batchId);
        }
        
        // Stop monitoring intervals
        if (this._gcInterval) {
            clearInterval(this._gcInterval);
            this._gcInterval = null;
        }
        
        // Final garbage collection
        this._forceGarbageCollection();
    }
}