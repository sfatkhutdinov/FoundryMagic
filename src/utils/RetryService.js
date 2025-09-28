/**
 * @fileoverview Import recovery and retry mechanisms for FoundryMagic
 * @description Provides robust retry logic with exponential backoff, circuit breaker patterns,
 * and recovery strategies for failed import operations.
 */

import { ErrorHandler } from './ErrorHandler.js';
import { notificationService, NOTIFICATION_TYPES } from './NotificationService.js';

/**
 * Retry strategies for different types of operations
 * @enum {string}
 */
export const RETRY_STRATEGIES = {
    EXPONENTIAL_BACKOFF: 'exponential_backoff',
    LINEAR_BACKOFF: 'linear_backoff',
    FIXED_DELAY: 'fixed_delay',
    IMMEDIATE: 'immediate'
};

/**
 * Circuit breaker states
 * @enum {string}
 */
export const CIRCUIT_STATES = {
    CLOSED: 'closed',
    OPEN: 'open',
    HALF_OPEN: 'half_open'
};

/**
 * Recovery actions for different failure types
 * @enum {string}
 */
export const RECOVERY_ACTIONS = {
    RETRY: 'retry',
    SKIP: 'skip',
    FAIL: 'fail',
    RECONNECT: 'reconnect',
    REFRESH_TOKEN: 'refresh_token',
    REDUCE_BATCH_SIZE: 'reduce_batch_size'
};

/**
 * Import recovery and retry service
 * Implements sophisticated retry mechanisms with circuit breaker patterns
 * and adaptive recovery strategies.
 */
export class RetryService {
    /**
     * Creates a new RetryService instance
     */
    constructor() {
        this._defaultConfig = {
            maxRetries: 3,
            baseDelay: 1000, // 1 second
            maxDelay: 30000, // 30 seconds
            backoffMultiplier: 2,
            jitter: true,
            strategy: RETRY_STRATEGIES.EXPONENTIAL_BACKOFF
        };

        this._circuitBreakers = new Map();
        this._retryHistory = new Map();
        this._activeRetries = new Map();

        this._initializeSettings();
    }

    /**
     * Initialize retry settings from Foundry config
     * @private
     */
    _initializeSettings() {
        game.settings.register('foundry-magic', 'retrySettings', {
            name: 'Retry Configuration',
            hint: 'Configure retry behavior for failed operations',
            scope: 'world',
            config: true,
            type: Object,
            default: this._defaultConfig,
            onChange: (value) => {
                this._defaultConfig = { ...this._defaultConfig, ...value };
            }
        });

        const savedSettings = game.settings.get('foundry-magic', 'retrySettings');
        if (savedSettings) {
            this._defaultConfig = { ...this._defaultConfig, ...savedSettings };
        }
    }

    /**
     * Execute an operation with retry logic
     * @param {Function} operation - Async operation to execute
     * @param {Object} options - Retry options
     * @param {string} options.operationId - Unique identifier for the operation
     * @param {Object} options.config - Retry configuration override
     * @param {Function} options.onRetry - Callback for retry attempts
     * @param {Function} options.onFailure - Callback for final failure
     * @param {Function} options.shouldRetry - Function to determine if retry should happen
     * @returns {Promise} Operation result
     */
    async executeWithRetry(operation, options = {}) {
        const {
            operationId = this._generateId(),
            config = {},
            onRetry,
            onFailure,
            shouldRetry = this._defaultShouldRetry.bind(this)
        } = options;

        const retryConfig = { ...this._defaultConfig, ...config };
        const circuitKey = this._getCircuitKey(operationId);

        // Check circuit breaker
        if (this._isCircuitOpen(circuitKey)) {
            throw new Error(`Circuit breaker is open for operation: ${operationId}`);
        }

        let lastError;
        let attempt = 0;

        this._activeRetries.set(operationId, {
            startTime: Date.now(),
            attempts: 0,
            config: retryConfig
        });

        try {
            while (attempt <= retryConfig.maxRetries) {
                try {
                    const result = await operation();

                    // Success - record success for circuit breaker
                    this._recordSuccess(circuitKey);
                    this._cleanupRetry(operationId);

                    return result;

                } catch (error) {
                    lastError = error;
                    attempt++;

                    // Record failure for circuit breaker
                    this._recordFailure(circuitKey);

                    // Check if we should retry
                    if (attempt > retryConfig.maxRetries || !shouldRetry(error, attempt)) {
                        break;
                    }

                    // Calculate delay
                    const delay = this._calculateDelay(attempt, retryConfig);

                    // Notify about retry
                    notificationService.notify(
                        NOTIFICATION_TYPES.WARNING,
                        `Operation failed, retrying in ${Math.round(delay / 1000)}s... (${attempt}/${retryConfig.maxRetries})`,
                        { duration: 2000 }
                    );

                    // Call retry callback
                    if (onRetry) {
                        await onRetry(error, attempt, delay);
                    }

                    // Wait before retry
                    await this._delay(delay);

                    // Update active retry info
                    const retryInfo = this._activeRetries.get(operationId);
                    if (retryInfo) {
                        retryInfo.attempts = attempt;
                    }
                }
            }

            // All retries exhausted
            throw lastError;

        } catch (finalError) {
            // Handle final failure
            this._handleFinalFailure(operationId, finalError, onFailure);
            throw finalError;

        } finally {
            this._cleanupRetry(operationId);
        }
    }

    /**
     * Execute operation with circuit breaker protection
     * @param {string} operationId - Operation identifier
     * @param {Function} operation - Operation to execute
     * @param {Object} options - Circuit breaker options
     * @returns {Promise} Operation result
     */
    async executeWithCircuitBreaker(operationId, operation, options = {}) {
        const circuitKey = this._getCircuitKey(operationId);
        const circuitBreaker = this._getCircuitBreaker(circuitKey);

        if (circuitBreaker.state === CIRCUIT_STATES.OPEN) {
            // Check if we should attempt half-open
            if (this._shouldAttemptHalfOpen(circuitBreaker)) {
                circuitBreaker.state = CIRCUIT_STATES.HALF_OPEN;
            } else {
                throw new Error(`Circuit breaker is open for: ${operationId}`);
            }
        }

        try {
            const result = await operation();
            this._recordSuccess(circuitKey);
            return result;
        } catch (error) {
            this._recordFailure(circuitKey);
            throw error;
        }
    }

    /**
     * Execute operation with recovery strategies
     * @param {Function} operation - Operation to execute
     * @param {Array} recoveryStrategies - Array of recovery strategy functions
     * @param {Object} options - Recovery options
     * @returns {Promise} Operation result
     */
    async executeWithRecovery(operation, recoveryStrategies = [], options = {}) {
        const { maxRecoveryAttempts = 2 } = options;

        let lastError;
        let attempt = 0;

        while (attempt <= maxRecoveryAttempts) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (attempt >= maxRecoveryAttempts) {
                    break;
                }

                // Try recovery strategies
                const recoveryAction = await this._attemptRecovery(error, recoveryStrategies, attempt);

                if (!recoveryAction || recoveryAction === RECOVERY_ACTIONS.FAIL) {
                    break;
                }

                attempt++;
            }
        }

        throw lastError;
    }

    /**
     * Create a retry policy for specific operation types
     * @param {string} operationType - Type of operation (e.g., 'api_call', 'file_import')
     * @param {Object} config - Retry configuration
     * @returns {Object} Retry policy
     */
    createRetryPolicy(operationType, config = {}) {
        const baseConfig = this._getBaseConfigForType(operationType);
        return {
            ...baseConfig,
            ...config,
            operationType
        };
    }

    /**
     * Get retry statistics
     * @param {string} operationId - Optional operation ID filter
     * @returns {Object} Retry statistics
     */
    getRetryStats(operationId = null) {
        const stats = {
            totalRetries: 0,
            successfulRetries: 0,
            failedRetries: 0,
            averageAttempts: 0,
            circuitBreakers: {}
        };

        let retryCount = 0;
        let totalAttempts = 0;

        this._retryHistory.forEach((history, id) => {
            if (!operationId || id === operationId) {
                stats.totalRetries++;
                totalAttempts += history.attempts;
                retryCount++;

                if (history.success) {
                    stats.successfulRetries++;
                } else {
                    stats.failedRetries++;
                }
            }
        });

        if (retryCount > 0) {
            stats.averageAttempts = totalAttempts / retryCount;
        }

        // Circuit breaker stats
        this._circuitBreakers.forEach((breaker, key) => {
            stats.circuitBreakers[key] = {
                state: breaker.state,
                failures: breaker.failures,
                lastFailureTime: breaker.lastFailureTime,
                successes: breaker.successes
            };
        });

        return stats;
    }

    /**
     * Reset circuit breaker for an operation
     * @param {string} operationId - Operation identifier
     */
    resetCircuitBreaker(operationId) {
        const circuitKey = this._getCircuitKey(operationId);
        this._circuitBreakers.delete(circuitKey);
    }

    /**
     * Clear retry history
     * @param {string} operationId - Optional operation ID to clear
     */
    clearRetryHistory(operationId = null) {
        if (operationId) {
            this._retryHistory.delete(operationId);
        } else {
            this._retryHistory.clear();
        }
    }

    /**
     * Update retry settings
     * @param {Object} settings - New settings
     */
    updateSettings(settings) {
        this._defaultConfig = { ...this._defaultConfig, ...settings };
        game.settings.set('foundry-magic', 'retrySettings', this._defaultConfig);
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return { ...this._defaultConfig };
    }

    /**
     * Calculate delay for retry attempt
     * @param {number} attempt - Current attempt number
     * @param {Object} config - Retry configuration
     * @returns {number} Delay in milliseconds
     * @private
     */
    _calculateDelay(attempt, config) {
        let delay;

        switch (config.strategy) {
            case RETRY_STRATEGIES.LINEAR_BACKOFF:
                delay = config.baseDelay * attempt;
                break;
            case RETRY_STRATEGIES.FIXED_DELAY:
                delay = config.baseDelay;
                break;
            case RETRY_STRATEGIES.IMMEDIATE:
                delay = 0;
                break;
            case RETRY_STRATEGIES.EXPONENTIAL_BACKOFF:
            default:
                delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
                break;
        }

        // Apply maximum delay
        delay = Math.min(delay, config.maxDelay);

        // Add jitter if enabled
        if (config.jitter) {
            delay = delay * (0.5 + Math.random() * 0.5);
        }

        return Math.round(delay);
    }

    /**
     * Default function to determine if retry should happen
     * @param {Error} error - The error that occurred
     * @param {number} attempt - Current attempt number
     * @returns {boolean} Whether to retry
     * @private
     */
    _defaultShouldRetry(error, attempt) {
        // Don't retry certain types of errors
        const nonRetryableErrors = [
            'AuthenticationError',
            'AuthorizationError',
            'ValidationError',
            'NotFoundError'
        ];

        if (nonRetryableErrors.some(type => error.name?.includes(type))) {
            return false;
        }

        // Retry network and timeout errors
        const retryableErrors = [
            'NetworkError',
            'TimeoutError',
            'ServerError',
            'RateLimitError'
        ];

        return retryableErrors.some(type => error.name?.includes(type));
    }

    /**
     * Attempt recovery using provided strategies
     * @param {Error} error - The error that occurred
     * @param {Array} strategies - Recovery strategy functions
     * @param {number} attempt - Current recovery attempt
     * @returns {string} Recovery action taken
     * @private
     */
    async _attemptRecovery(error, strategies, attempt) {
        for (const strategy of strategies) {
            try {
                const action = await strategy(error, attempt);
                if (action && action !== RECOVERY_ACTIONS.FAIL) {
                    notificationService.notify(
                        NOTIFICATION_TYPES.INFO,
                        `Attempting recovery: ${action}`,
                        { duration: 2000 }
                    );
                    return action;
                }
            } catch (strategyError) {
                ErrorHandler.handleError(strategyError, 'RetryService._attemptRecovery', {
                    error: error.message,
                    attempt
                });
            }
        }

        return RECOVERY_ACTIONS.FAIL;
    }

    /**
     * Handle final failure of operation
     * @param {string} operationId - Operation identifier
     * @param {Error} error - Final error
     * @param {Function} onFailure - Failure callback
     * @private
     */
    _handleFinalFailure(operationId, error, onFailure) {
        // Record failure in history
        const retryInfo = this._activeRetries.get(operationId);
        if (retryInfo) {
            this._retryHistory.set(operationId, {
                ...retryInfo,
                endTime: Date.now(),
                success: false,
                finalError: error.message,
                attempts: retryInfo.attempts
            });
        }

        // Notify about failure
        notificationService.notify(
            NOTIFICATION_TYPES.ERROR,
            `Operation failed after ${retryInfo?.attempts || 0} retries: ${error.message}`
        );

        // Call failure callback
        if (onFailure) {
            onFailure(error);
        }

        // Log error
        ErrorHandler.handleError(error, 'RetryService._handleFinalFailure', {
            operationId,
            attempts: retryInfo?.attempts || 0
        });
    }

    /**
     * Get circuit breaker for key
     * @param {string} key - Circuit breaker key
     * @returns {Object} Circuit breaker object
     * @private
     */
    _getCircuitBreaker(key) {
        if (!this._circuitBreakers.has(key)) {
            this._circuitBreakers.set(key, {
                state: CIRCUIT_STATES.CLOSED,
                failures: 0,
                successes: 0,
                lastFailureTime: null,
                nextAttemptTime: null
            });
        }
        return this._circuitBreakers.get(key);
    }

    /**
     * Check if circuit breaker is open
     * @param {string} key - Circuit breaker key
     * @returns {boolean} Whether circuit is open
     * @private
     */
    _isCircuitOpen(key) {
        const breaker = this._getCircuitBreaker(key);
        return breaker.state === CIRCUIT_STATES.OPEN;
    }

    /**
     * Check if we should attempt half-open state
     * @param {Object} breaker - Circuit breaker object
     * @returns {boolean} Whether to attempt half-open
     * @private
     */
    _shouldAttemptHalfOpen(breaker) {
        if (!breaker.nextAttemptTime) return false;
        return Date.now() >= breaker.nextAttemptTime;
    }

    /**
     * Record success for circuit breaker
     * @param {string} key - Circuit breaker key
     * @private
     */
    _recordSuccess(key) {
        const breaker = this._getCircuitBreaker(key);

        breaker.successes++;
        breaker.failures = 0;

        if (breaker.state === CIRCUIT_STATES.HALF_OPEN) {
            breaker.state = CIRCUIT_STATES.CLOSED;
            breaker.nextAttemptTime = null;
        }
    }

    /**
     * Record failure for circuit breaker
     * @param {string} key - Circuit breaker key
     * @private
     */
    _recordFailure(key) {
        const breaker = this._getCircuitBreaker(key);

        breaker.failures++;
        breaker.lastFailureTime = Date.now();

        // Open circuit after 5 failures
        if (breaker.failures >= 5) {
            breaker.state = CIRCUIT_STATES.OPEN;
            breaker.nextAttemptTime = Date.now() + 60000; // Try again in 1 minute
        }
    }

    /**
     * Get base configuration for operation type
     * @param {string} operationType - Type of operation
     * @returns {Object} Base configuration
     * @private
     */
    _getBaseConfigForType(operationType) {
        const configs = {
            api_call: {
                maxRetries: 3,
                baseDelay: 1000,
                strategy: RETRY_STRATEGIES.EXPONENTIAL_BACKOFF
            },
            file_import: {
                maxRetries: 2,
                baseDelay: 2000,
                strategy: RETRY_STRATEGIES.LINEAR_BACKOFF
            },
            batch_operation: {
                maxRetries: 1,
                baseDelay: 5000,
                strategy: RETRY_STRATEGIES.FIXED_DELAY
            }
        };

        return configs[operationType] || this._defaultConfig;
    }

    /**
     * Get circuit breaker key for operation
     * @param {string} operationId - Operation identifier
     * @returns {string} Circuit key
     * @private
     */
    _getCircuitKey(operationId) {
        // Group similar operations together for circuit breaking
        return operationId.split('_')[0]; // Use prefix as circuit key
    }

    /**
     * Clean up retry tracking
     * @param {string} operationId - Operation identifier
     * @private
     */
    _cleanupRetry(operationId) {
        this._activeRetries.delete(operationId);
    }

    /**
     * Delay execution for specified milliseconds
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate unique operation ID
     * @returns {string} Unique ID
     * @private
     */
    _generateId() {
        return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export singleton instance
export const retryService = new RetryService();