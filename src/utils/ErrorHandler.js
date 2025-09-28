/**
 * @fileoverview Comprehensive Error Handling System
 * Provides centralized error handling, logging, and recovery mechanisms
 */

export default class ErrorHandler {
    constructor(foundryMagic) {
        this._foundryMagic = foundryMagic;
        this._errorLog = [];
        this._maxLogSize = 1000;
        this._errorCounts = new Map();
        this._recoveryStrategies = new Map();
        this._isInitialized = false;
    }

    /**
     * Initialize the error handler
     */
    async initialize() {
        if (this._isInitialized) return;

        console.log('FoundryMagic | Initializing error handler...');

        // Load error log from storage
        await this._loadErrorLog();

        // Set up global error handlers
        this._setupGlobalHandlers();

        // Register recovery strategies
        this._registerRecoveryStrategies();

        this._isInitialized = true;
        console.log('FoundryMagic | Error handler initialized');
    }

    /**
     * Handle an error with context
     * @param {Error} error - The error object
     * @param {Object} context - Context information
     * @returns {Promise<Object>} Error handling result
     */
    async handleError(error, context = {}) {
        const errorEntry = {
            id: this._generateErrorId(),
            timestamp: new Date().toISOString(),
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            context: {
                user: game.user?.id,
                scene: canvas?.scene?.id,
                module: 'foundrymagic',
                operation: context.operation || 'unknown',
                ...context
            },
            severity: this._determineSeverity(error, context),
            handled: false,
            recovered: false
        };

        // Log the error
        await this._logError(errorEntry);

        // Update error counts
        this._updateErrorCounts(errorEntry);

        // Attempt recovery
        const recoveryResult = await this._attemptRecovery(errorEntry);

        // Notify user if necessary
        await this._notifyUser(errorEntry, recoveryResult);

        // Emit error event
        this._emitErrorEvent(errorEntry, recoveryResult);

        return {
            errorId: errorEntry.id,
            handled: true,
            recovered: recoveryResult.success,
            userNotified: this._shouldNotifyUser(errorEntry),
            recoveryAction: recoveryResult.action
        };
    }

    /**
     * Handle async operation with error handling
     * @param {Function} operation - Async operation to execute
     * @param {Object} context - Context information
     * @returns {Promise<any>} Operation result
     */
    async handleAsync(operation, context = {}) {
        try {
            return await operation();
        } catch (error) {
            const result = await this.handleError(error, context);

            if (result.recovered) {
                // Try operation again with recovery
                try {
                    return await operation();
                } catch (retryError) {
                    await this.handleError(retryError, { ...context, retry: true });
                    throw retryError;
                }
            }

            throw error;
        }
    }

    /**
     * Generate unique error ID
     * @private
     * @returns {string} Error ID
     */
    _generateErrorId() {
        return `fm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Determine error severity
     * @private
     * @param {Error} error - Error object
     * @param {Object} context - Context
     * @returns {string} Severity level
     */
    _determineSeverity(error, context) {
        // Network errors
        if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
            return 'medium';
        }

        // Authentication errors
        if (error.message.includes('auth') || error.message.includes('token')) {
            return 'high';
        }

        // Data corruption or critical errors
        if (error.name === 'TypeError' || error.name === 'ReferenceError') {
            return 'high';
        }

        // API errors
        if (error.message.includes('API') || error.status >= 500) {
            return 'medium';
        }

        // Validation errors
        if (error.message.includes('validation') || error.message.includes('invalid')) {
            return 'low';
        }

        return 'medium';
    }

    /**
     * Log error to storage
     * @private
     * @param {Object} errorEntry - Error entry
     */
    async _logError(errorEntry) {
        this._errorLog.push(errorEntry);

        // Maintain max log size
        if (this._errorLog.length > this._maxLogSize) {
            this._errorLog = this._errorLog.slice(-this._maxLogSize);
        }

        // Save to storage
        await this._saveErrorLog();
    }

    /**
     * Update error counts for statistics
     * @private
     * @param {Object} errorEntry - Error entry
     */
    _updateErrorCounts(errorEntry) {
        const key = `${errorEntry.error.name}:${errorEntry.context.operation}`;
        const current = this._errorCounts.get(key) || 0;
        this._errorCounts.set(key, current + 1);
    }

    /**
     * Attempt error recovery
     * @private
     * @param {Object} errorEntry - Error entry
     * @returns {Promise<Object>} Recovery result
     */
    async _attemptRecovery(errorEntry) {
        const strategy = this._recoveryStrategies.get(errorEntry.error.name) ||
            this._recoveryStrategies.get('default');

        if (!strategy) {
            return { success: false, action: 'none' };
        }

        try {
            const result = await strategy(errorEntry);
            errorEntry.recovered = result.success;
            return result;
        } catch (recoveryError) {
            console.error('FoundryMagic | Recovery failed:', recoveryError);
            return { success: false, action: 'failed', error: recoveryError.message };
        }
    }

    /**
     * Register recovery strategies
     * @private
     */
    _registerRecoveryStrategies() {
        // Network error recovery
        this._recoveryStrategies.set('NetworkError', async (errorEntry) => {
            // Wait and retry for network errors
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true, action: 'retry' };
        });

        // Authentication error recovery
        this._recoveryStrategies.set('AuthenticationError', async (errorEntry) => {
            // Clear invalid token
            if (this._foundryMagic.authService) {
                await this._foundryMagic.authService.clearToken();
            }
            return { success: false, action: 're-auth-required' };
        });

        // API rate limit recovery
        this._recoveryStrategies.set('RateLimitError', async (errorEntry) => {
            // Wait longer for rate limits
            await new Promise(resolve => setTimeout(resolve, 5000));
            return { success: true, action: 'retry-delayed' };
        });

        // Default recovery
        this._recoveryStrategies.set('default', async (errorEntry) => {
            // Log and continue for unknown errors
            return { success: false, action: 'logged' };
        });
    }

    /**
     * Notify user about error
     * @private
     * @param {Object} errorEntry - Error entry
     * @param {Object} recoveryResult - Recovery result
     */
    async _notifyUser(errorEntry, recoveryResult) {
        if (!this._shouldNotifyUser(errorEntry)) return;

        const message = this._formatUserMessage(errorEntry, recoveryResult);

        switch (errorEntry.severity) {
            case 'high':
                ui.notifications.error(message);
                break;
            case 'medium':
                ui.notifications.warn(message);
                break;
            case 'low':
                ui.notifications.info(message);
                break;
        }
    }

    /**
     * Check if user should be notified
     * @private
     * @param {Object} errorEntry - Error entry
     * @returns {boolean} Should notify
     */
    _shouldNotifyUser(errorEntry) {
        // Always notify for high severity
        if (errorEntry.severity === 'high') return true;

        // Notify for medium severity if not recovered
        if (errorEntry.severity === 'medium' && !errorEntry.recovered) return true;

        // Don't notify for low severity or recovered errors
        return false;
    }

    /**
     * Format user-friendly error message
     * @private
     * @param {Object} errorEntry - Error entry
     * @param {Object} recoveryResult - Recovery result
     * @returns {string} Formatted message
     */
    _formatUserMessage(errorEntry, recoveryResult) {
        const operation = errorEntry.context.operation;
        const errorType = errorEntry.error.name;

        let message = `FoundryMagic encountered an error during ${operation}`;

        if (recoveryResult.success) {
            message += ' but recovered automatically.';
        } else {
            message += '. Please check the console for details.';
        }

        // Add specific guidance
        switch (errorType) {
            case 'AuthenticationError':
                message += ' Please re-authenticate with D&D Beyond.';
                break;
            case 'NetworkError':
                message += ' Please check your internet connection.';
                break;
            case 'RateLimitError':
                message += ' D&D Beyond API rate limit exceeded. Please wait a moment.';
                break;
        }

        return message;
    }

    /**
     * Emit error event
     * @private
     * @param {Object} errorEntry - Error entry
     * @param {Object} recoveryResult - Recovery result
     */
    _emitErrorEvent(errorEntry, recoveryResult) {
        const event = new CustomEvent('foundrymagic:error', {
            detail: {
                error: errorEntry,
                recovery: recoveryResult
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Set up global error handlers
     * @private
     */
    _setupGlobalHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', async (event) => {
            const error = event.reason instanceof Error ? event.reason :
                new Error(event.reason || 'Unhandled promise rejection');

            await this.handleError(error, {
                operation: 'unhandled-promise',
                source: 'global'
            });
        });

        // Handle global errors
        window.addEventListener('error', async (event) => {
            await this.handleError(event.error || new Error(event.message), {
                operation: 'global-error',
                source: 'global',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getStatistics() {
        const stats = {
            totalErrors: this._errorLog.length,
            errorsByType: {},
            errorsByOperation: {},
            errorsBySeverity: { high: 0, medium: 0, low: 0 },
            recentErrors: this._errorLog.slice(-10),
            topErrors: []
        };

        // Count by type and operation
        this._errorLog.forEach(entry => {
            const type = entry.error.name;
            const operation = entry.context.operation;
            const severity = entry.severity;

            stats.errorsByType[type] = (stats.errorsByType[type] || 0) + 1;
            stats.errorsByOperation[operation] = (stats.errorsByOperation[operation] || 0) + 1;
            stats.errorsBySeverity[severity]++;
        });

        // Get top errors
        stats.topErrors = Object.entries(stats.errorsByType)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }));

        return stats;
    }

    /**
     * Get error log
     * @param {Object} filters - Filter options
     * @returns {Array} Filtered error log
     */
    getErrorLog(filters = {}) {
        let filtered = [...this._errorLog];

        if (filters.severity) {
            filtered = filtered.filter(entry => entry.severity === filters.severity);
        }

        if (filters.operation) {
            filtered = filtered.filter(entry => entry.context.operation === filters.operation);
        }

        if (filters.since) {
            const sinceDate = new Date(filters.since);
            filtered = filtered.filter(entry => new Date(entry.timestamp) >= sinceDate);
        }

        if (filters.limit) {
            filtered = filtered.slice(-filters.limit);
        }

        return filtered.reverse(); // Most recent first
    }

    /**
     * Clear error log
     */
    async clearErrorLog() {
        this._errorLog = [];
        this._errorCounts.clear();
        await this._saveErrorLog();
    }

    /**
     * Export error log
     * @returns {string} JSON string of error log
     */
    exportErrorLog() {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            version: '1.0.0',
            errors: this._errorLog
        }, null, 2);
    }

    /**
     * Load error log from storage
     * @private
     */
    async _loadErrorLog() {
        try {
            if (game?.settings) {
                const stored = game.settings.get('foundrymagic', 'errorLog');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    this._errorLog = Array.isArray(parsed) ? parsed : [];
                }
            }
        } catch (error) {
            console.warn('FoundryMagic | Failed to load error log:', error);
            this._errorLog = [];
        }
    }

    /**
     * Save error log to storage
     * @private
     */
    async _saveErrorLog() {
        try {
            if (game?.settings) {
                // Keep only essential data for storage
                const compactLog = this._errorLog.map(entry => ({
                    id: entry.id,
                    timestamp: entry.timestamp,
                    error: {
                        name: entry.error.name,
                        message: entry.error.message
                    },
                    context: {
                        operation: entry.context.operation
                    },
                    severity: entry.severity,
                    recovered: entry.recovered
                }));

                game.settings.set('foundrymagic', 'errorLog', JSON.stringify(compactLog));
            }
        } catch (error) {
            console.warn('FoundryMagic | Failed to save error log:', error);
        }
    }

    /**
     * Create error boundary for UI components
     * @param {Function} component - Component function
     * @param {Object} fallbackProps - Fallback properties
     * @returns {Function} Wrapped component
     */
    createErrorBoundary(component, fallbackProps = {}) {
        return async (...args) => {
            try {
                return await component(...args);
            } catch (error) {
                await this.handleError(error, {
                    operation: 'ui-component',
                    component: component.name
                });

                // Return fallback
                return fallbackProps;
            }
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this._errorLog = [];
        this._errorCounts.clear();
        this._recoveryStrategies.clear();
        console.log('FoundryMagic | Error handler cleaned up');
    }
}