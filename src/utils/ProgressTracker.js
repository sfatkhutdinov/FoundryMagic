/**
 * @fileoverview Progress tracking and status management for FoundryMagic
 * @description Provides comprehensive progress tracking for long-running operations,
 * status management, estimated completion times, and integration with notifications.
 */

import { ErrorHandler } from './ErrorHandler.js';
import { notificationService, NOTIFICATION_TYPES } from './NotificationService.js';

/**
 * Progress status types
 * @enum {string}
 */
export const PROGRESS_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

/**
 * Progress operation types
 * @enum {string}
 */
export const OPERATION_TYPES = {
    IMPORT: 'import',
    EXPORT: 'export',
    SYNC: 'sync',
    TRANSFORM: 'transform',
    VALIDATE: 'validate',
    BATCH_PROCESS: 'batch_process'
};

/**
 * Progress tracking and status management service
 * Tracks progress of long-running operations with estimated completion times,
 * status updates, and comprehensive reporting.
 */
export class ProgressTracker {
    /**
     * Creates a new ProgressTracker instance
     */
    constructor() {
        this._activeOperations = new Map();
        this._completedOperations = new Map();
        this._operationHistory = [];
        this._maxHistorySize = 50;

        this._settings = {
            enableProgressNotifications: true,
            progressUpdateInterval: 1000, // 1 second
            estimatedTimeWindow: 10, // Use last 10 operations for estimates
            enableDetailedLogging: false
        };

        this._initializeSettings();
        this._startProgressUpdates();
    }

    /**
     * Start tracking a new operation
     * @param {string} operationId - Unique operation identifier
     * @param {string} operationType - Type of operation
     * @param {Object} options - Operation options
     * @param {string} options.description - Human-readable description
     * @param {number} options.totalItems - Total number of items to process
     * @param {boolean} options.showProgress - Whether to show progress notifications
     * @param {Function} options.onProgress - Progress callback function
     * @param {Function} options.onComplete - Completion callback function
     * @param {Function} options.onError - Error callback function
     * @returns {string} Operation ID
     */
    startOperation(operationId, operationType, options = {}) {
        try {
            const operation = {
                id: operationId,
                type: operationType,
                status: PROGRESS_STATUS.RUNNING,
                description: options.description || `${operationType} operation`,
                totalItems: options.totalItems || 0,
                processedItems: 0,
                currentItem: null,
                startTime: Date.now(),
                endTime: null,
                estimatedEndTime: null,
                progress: 0,
                speed: 0, // items per second
                timeRemaining: null,
                errors: [],
                warnings: [],
                metadata: {},
                options: { ...options },
                progressHistory: []
            };

            // Calculate initial estimates
            this._updateEstimates(operation);

            this._activeOperations.set(operationId, operation);

            // Notify about operation start
            if (options.showProgress !== false && this._settings.enableProgressNotifications) {
                notificationService.notify(
                    NOTIFICATION_TYPES.INFO,
                    `Started ${operation.description}`,
                    { duration: 3000 }
                );
            }

            if (this._settings.enableDetailedLogging) {
                console.log(`[ProgressTracker] Started operation: ${operationId} (${operationType})`);
            }

            return operationId;

        } catch (error) {
            ErrorHandler.handleError(error, 'ProgressTracker.startOperation', {
                operationId,
                operationType,
                options
            });
            return null;
        }
    }

    /**
     * Update progress for an operation
     * @param {string} operationId - Operation identifier
     * @param {Object} update - Progress update
     * @param {number} update.processedItems - Number of items processed
     * @param {string} update.currentItem - Current item being processed
     * @param {number} update.progress - Progress percentage (0-100)
     * @param {string} update.message - Progress message
     * @param {Object} update.metadata - Additional metadata
     */
    updateProgress(operationId, update = {}) {
        const operation = this._activeOperations.get(operationId);
        if (!operation || operation.status !== PROGRESS_STATUS.RUNNING) {
            return;
        }

        try {
            const now = Date.now();
            const previousProcessed = operation.processedItems;

            // Update operation data
            if (update.processedItems !== undefined) {
                operation.processedItems = update.processedItems;
            }
            if (update.currentItem !== undefined) {
                operation.currentItem = update.currentItem;
            }
            if (update.progress !== undefined) {
                operation.progress = Math.max(0, Math.min(100, update.progress));
            } else if (operation.totalItems > 0) {
                operation.progress = (operation.processedItems / operation.totalItems) * 100;
            }
            if (update.message) {
                operation.description = update.message;
            }
            if (update.metadata) {
                Object.assign(operation.metadata, update.metadata);
            }

            // Record progress history for speed calculation
            operation.progressHistory.push({
                timestamp: now,
                processedItems: operation.processedItems
            });

            // Keep only recent history
            if (operation.progressHistory.length > 20) {
                operation.progressHistory.shift();
            }

            // Update estimates
            this._updateEstimates(operation);

            // Call progress callback
            if (operation.options.onProgress) {
                operation.options.onProgress(operation);
            }

            if (this._settings.enableDetailedLogging) {
                console.log(`[ProgressTracker] Updated ${operationId}: ${operation.progress.toFixed(1)}%`);
            }

        } catch (error) {
            ErrorHandler.handleError(error, 'ProgressTracker.updateProgress', {
                operationId,
                update
            });
        }
    }

    /**
     * Add error to operation
     * @param {string} operationId - Operation identifier
     * @param {Error|string} error - Error that occurred
     * @param {Object} context - Error context
     */
    addError(operationId, error, context = {}) {
        const operation = this._activeOperations.get(operationId);
        if (!operation) return;

        const errorEntry = {
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : error,
            context,
            stack: error instanceof Error ? error.stack : undefined
        };

        operation.errors.push(errorEntry);

        // Notify about error
        notificationService.notify(
            NOTIFICATION_TYPES.WARNING,
            `Error in ${operation.description}: ${errorEntry.error}`,
            { duration: 5000 }
        );
    }

    /**
     * Add warning to operation
     * @param {string} operationId - Operation identifier
     * @param {string} warning - Warning message
     * @param {Object} context - Warning context
     */
    addWarning(operationId, warning, context = {}) {
        const operation = this._activeOperations.get(operationId);
        if (!operation) return;

        const warningEntry = {
            timestamp: Date.now(),
            warning,
            context
        };

        operation.warnings.push(warningEntry);
    }

    /**
     * Complete an operation
     * @param {string} operationId - Operation identifier
     * @param {Object} result - Operation result
     */
    completeOperation(operationId, result = {}) {
        const operation = this._activeOperations.get(operationId);
        if (!operation) return;

        try {
            operation.status = PROGRESS_STATUS.COMPLETED;
            operation.endTime = Date.now();
            operation.progress = 100;
            operation.result = result;

            // Calculate final statistics
            const duration = operation.endTime - operation.startTime;
            operation.metadata.finalDuration = duration;
            operation.metadata.averageSpeed = operation.processedItems / (duration / 1000);

            // Move to completed operations
            this._activeOperations.delete(operationId);
            this._completedOperations.set(operationId, operation);
            this._addToHistory(operation);

            // Notify about completion
            if (operation.options.showProgress !== false && this._settings.enableProgressNotifications) {
                const message = `Completed ${operation.description} (${operation.processedItems} items in ${(duration / 1000).toFixed(1)}s)`;
                notificationService.notify(NOTIFICATION_TYPES.SUCCESS, message, { duration: 5000 });
            }

            // Call completion callback
            if (operation.options.onComplete) {
                operation.options.onComplete(operation);
            }

            if (this._settings.enableDetailedLogging) {
                console.log(`[ProgressTracker] Completed operation: ${operationId}`);
            }

        } catch (error) {
            ErrorHandler.handleError(error, 'ProgressTracker.completeOperation', {
                operationId,
                result
            });
        }
    }

    /**
     * Fail an operation
     * @param {string} operationId - Operation identifier
     * @param {Error|string} error - Error that caused failure
     */
    failOperation(operationId, error) {
        const operation = this._activeOperations.get(operationId);
        if (!operation) return;

        try {
            operation.status = PROGRESS_STATUS.FAILED;
            operation.endTime = Date.now();
            operation.finalError = error instanceof Error ? error.message : error;

            // Move to completed operations
            this._activeOperations.delete(operationId);
            this._completedOperations.set(operationId, operation);
            this._addToHistory(operation);

            // Notify about failure
            notificationService.notify(
                NOTIFICATION_TYPES.ERROR,
                `Failed ${operation.description}: ${operation.finalError}`,
                { duration: 10000 }
            );

            // Call error callback
            if (operation.options.onError) {
                operation.options.onError(operation, error);
            }

            if (this._settings.enableDetailedLogging) {
                console.error(`[ProgressTracker] Failed operation: ${operationId}`, error);
            }

        } catch (err) {
            ErrorHandler.handleError(err, 'ProgressTracker.failOperation', {
                operationId,
                error
            });
        }
    }

    /**
     * Cancel an operation
     * @param {string} operationId - Operation identifier
     */
    cancelOperation(operationId) {
        const operation = this._activeOperations.get(operationId);
        if (!operation) return;

        try {
            operation.status = PROGRESS_STATUS.CANCELLED;
            operation.endTime = Date.now();

            // Move to completed operations
            this._activeOperations.delete(operationId);
            this._completedOperations.set(operationId, operation);
            this._addToHistory(operation);

            // Notify about cancellation
            notificationService.notify(
                NOTIFICATION_TYPES.WARNING,
                `Cancelled ${operation.description}`,
                { duration: 3000 }
            );

            if (this._settings.enableDetailedLogging) {
                console.log(`[ProgressTracker] Cancelled operation: ${operationId}`);
            }

        } catch (error) {
            ErrorHandler.handleError(error, 'ProgressTracker.cancelOperation', {
                operationId
            });
        }
    }

    /**
     * Get operation status
     * @param {string} operationId - Operation identifier
     * @returns {Object|null} Operation status or null if not found
     */
    getOperationStatus(operationId) {
        return this._activeOperations.get(operationId) ||
            this._completedOperations.get(operationId) || null;
    }

    /**
     * Get all active operations
     * @returns {Array} Array of active operations
     */
    getActiveOperations() {
        return Array.from(this._activeOperations.values());
    }

    /**
     * Get operation statistics
     * @param {string} operationType - Optional operation type filter
     * @returns {Object} Operation statistics
     */
    getOperationStats(operationType = null) {
        const stats = {
            active: this._activeOperations.size,
            completed: this._completedOperations.size,
            totalProcessed: 0,
            averageDuration: 0,
            successRate: 0,
            byType: {}
        };

        let totalDuration = 0;
        let completedCount = 0;
        let successfulCount = 0;

        // Count active operations
        for (const operation of this._activeOperations.values()) {
            stats.totalProcessed += operation.processedItems;
            if (!stats.byType[operation.type]) {
                stats.byType[operation.type] = { active: 0, completed: 0 };
            }
            stats.byType[operation.type].active++;
        }

        // Count completed operations
        for (const operation of this._completedOperations.values()) {
            if (operationType && operation.type !== operationType) continue;

            stats.totalProcessed += operation.processedItems;
            completedCount++;

            if (operation.endTime && operation.startTime) {
                totalDuration += operation.endTime - operation.startTime;
            }

            if (operation.status === PROGRESS_STATUS.COMPLETED) {
                successfulCount++;
            }

            if (!stats.byType[operation.type]) {
                stats.byType[operation.type] = { active: 0, completed: 0 };
            }
            stats.byType[operation.type].completed++;
        }

        if (completedCount > 0) {
            stats.averageDuration = totalDuration / completedCount;
            stats.successRate = (successfulCount / completedCount) * 100;
        }

        return stats;
    }

    /**
     * Get estimated completion time for an operation
     * @param {string} operationId - Operation identifier
     * @returns {Object} Time estimates
     */
    getEstimatedTime(operationId) {
        const operation = this._activeOperations.get(operationId);
        if (!operation) return null;

        return {
            estimatedEndTime: operation.estimatedEndTime,
            timeRemaining: operation.timeRemaining,
            speed: operation.speed,
            progress: operation.progress
        };
    }

    /**
     * Update progress tracker settings
     * @param {Object} settings - New settings
     */
    updateSettings(settings) {
        this._settings = { ...this._settings, ...settings };
        game.settings.set('foundry-magic', 'progressSettings', this._settings);
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return { ...this._settings };
    }

    /**
     * Initialize settings from Foundry config
     * @private
     */
    _initializeSettings() {
        game.settings.register('foundry-magic', 'progressSettings', {
            name: 'Progress Tracking Settings',
            hint: 'Configure progress tracking and notifications',
            scope: 'client',
            config: true,
            type: Object,
            default: this._settings,
            onChange: (value) => {
                this._settings = { ...this._settings, ...value };
            }
        });

        const savedSettings = game.settings.get('foundry-magic', 'progressSettings');
        if (savedSettings) {
            this._settings = { ...this._settings, ...savedSettings };
        }
    }

    /**
     * Start periodic progress updates
     * @private
     */
    _startProgressUpdates() {
        setInterval(() => {
            this._updateAllProgress();
        }, this._settings.progressUpdateInterval);
    }

    /**
     * Update estimates for an operation
     * @param {Object} operation - Operation object
     * @private
     */
    _updateEstimates(operation) {
        const now = Date.now();
        const elapsed = now - operation.startTime;

        if (operation.progressHistory.length >= 2) {
            // Calculate speed based on recent progress
            const recent = operation.progressHistory.slice(-5);
            const timeDiff = recent[recent.length - 1].timestamp - recent[0].timestamp;
            const itemsDiff = recent[recent.length - 1].processedItems - recent[0].processedItems;

            if (timeDiff > 0) {
                operation.speed = (itemsDiff / timeDiff) * 1000; // items per second
            }
        }

        // Estimate time remaining
        if (operation.speed > 0 && operation.totalItems > operation.processedItems) {
            const remainingItems = operation.totalItems - operation.processedItems;
            operation.timeRemaining = remainingItems / operation.speed;
            operation.estimatedEndTime = now + (operation.timeRemaining * 1000);
        }
    }

    /**
     * Update progress for all active operations
     * @private
     */
    _updateAllProgress() {
        for (const operation of this._activeOperations.values()) {
            // Update estimates
            this._updateEstimates(operation);

            // Send progress notifications for long-running operations
            if (operation.options.showProgress !== false &&
                this._settings.enableProgressNotifications &&
                operation.progress > 0 &&
                operation.progress < 100) {

                const message = this._formatProgressMessage(operation);
                notificationService.notify(NOTIFICATION_TYPES.INFO, message, {
                    duration: 2000,
                    permanent: false
                });
            }
        }
    }

    /**
     * Format progress message for notifications
     * @param {Object} operation - Operation object
     * @returns {string} Formatted progress message
     * @private
     */
    _formatProgressMessage(operation) {
        let message = `${operation.description}: ${operation.progress.toFixed(1)}%`;

        if (operation.processedItems > 0 && operation.totalItems > 0) {
            message += ` (${operation.processedItems}/${operation.totalItems})`;
        }

        if (operation.timeRemaining && operation.timeRemaining < 3600) { // Less than 1 hour
            const minutes = Math.floor(operation.timeRemaining / 60);
            const seconds = Math.floor(operation.timeRemaining % 60);
            message += ` - ${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
        }

        if (operation.currentItem) {
            message += ` - ${operation.currentItem}`;
        }

        return message;
    }

    /**
     * Add operation to history
     * @param {Object} operation - Operation to add
     * @private
     */
    _addToHistory(operation) {
        this._operationHistory.push({
            id: operation.id,
            type: operation.type,
            status: operation.status,
            startTime: operation.startTime,
            endTime: operation.endTime,
            duration: operation.endTime - operation.startTime,
            processedItems: operation.processedItems,
            totalItems: operation.totalItems,
            errors: operation.errors.length,
            warnings: operation.warnings.length
        });

        // Maintain history size
        if (this._operationHistory.length > this._maxHistorySize) {
            this._operationHistory.shift();
        }
    }

    /**
     * Get operation history
     * @param {Object} filter - Filter options
     * @param {string} filter.type - Operation type filter
     * @param {string} filter.status - Status filter
     * @param {number} filter.limit - Maximum results
     * @returns {Array} Operation history
     */
    getOperationHistory(filter = {}) {
        let history = [...this._operationHistory];

        if (filter.type) {
            history = history.filter(op => op.type === filter.type);
        }

        if (filter.status) {
            history = history.filter(op => op.status === filter.status);
        }

        if (filter.limit) {
            history = history.slice(-filter.limit);
        }

        return history;
    }

    /**
     * Clear completed operations older than specified time
     * @param {number} maxAge - Maximum age in milliseconds
     */
    cleanupCompletedOperations(maxAge = 3600000) { // 1 hour default
        const cutoff = Date.now() - maxAge;
        const toDelete = [];

        for (const [id, operation] of this._completedOperations) {
            if (operation.endTime && operation.endTime < cutoff) {
                toDelete.push(id);
            }
        }

        toDelete.forEach(id => this._completedOperations.delete(id));
    }
}

// Export singleton instance
export const progressTracker = new ProgressTracker();