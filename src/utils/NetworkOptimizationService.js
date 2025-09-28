/**
 * @fileoverview Network Request Optimization Service
 * Handles request batching, caching headers, and response time optimization
 */

import { chunkArray } from './SharedUtils.js';

export default class NetworkOptimizationService {
    constructor() {
        // Network optimization settings (T066)
        this._batchSize = 10; // Max requests to batch together
        this._batchTimeout = 1000; // Max time to wait for batching (1 second)
        this._responseTimeTarget = 3000; // Target response time (3 seconds)
        this._requestQueue = [];
        this._batchTimer = null;
        this._responseTimeStats = {
            average: 0,
            samples: [],
            maxSamples: 100
        };
        
        // Request caching
        this._requestCache = new Map();
        this._cacheHeaders = {
            'Cache-Control': 'max-age=300, must-revalidate', // 5 minutes
            'If-None-Match': '*',
            'If-Modified-Since': new Date().toUTCString()
        };
    }

    /**
     * Initialize the network optimization service
     */
    async initialize() {
        // Set up periodic cache cleanup
        setInterval(() => {
            this._cleanupCache();
        }, 60000); // Every minute
    }

    /**
     * Optimized fetch with batching and caching (T066)
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Optimized response
     */
    async optimizedFetch(url, options = {}) {
        const startTime = Date.now();
        
        // Check cache first
        const cacheKey = this._getCacheKey(url, options);
        const cached = this._requestCache.get(cacheKey);
        
        if (cached && !this._isCacheExpired(cached)) {
            this._recordResponseTime(Date.now() - startTime);
            return cached.response.clone();
        }

        // Add caching headers
        const optimizedOptions = {
            ...options,
            headers: {
                ...options.headers,
                ...this._cacheHeaders
            }
        };

        try {
            // Perform request with timeout
            const response = await this._fetchWithTimeout(url, optimizedOptions);
            
            // Cache successful responses
            if (response.ok) {
                this._cacheResponse(cacheKey, response);
            }
            
            const responseTime = Date.now() - startTime;
            this._recordResponseTime(responseTime);
            
            // Warn if response time exceeds target
            if (responseTime > this._responseTimeTarget) {
                console.warn(`Slow response detected: ${responseTime}ms for ${url}`);
            }
            
            return response;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._recordResponseTime(responseTime);
            throw error;
        }
    }

    /**
     * Batch multiple requests together (T066)
     * @param {Array} requests - Array of request objects {url, options}
     * @returns {Promise<Array>} Array of responses
     */
    async batchRequests(requests) {
        if (requests.length === 0) return [];
        
        // Split into chunks for batching
        const chunks = chunkArray(requests, this._batchSize);
        const results = [];
        
        for (const chunk of chunks) {
            const chunkPromises = chunk.map(req => 
                this.optimizedFetch(req.url, req.options).catch(error => ({ error }))
            );
            
            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
            
            // Small delay between chunks to prevent overwhelming the server
            if (chunks.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }

    /**
     * Queue request for batching
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<Response>} Response promise
     */
    queueRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            this._requestQueue.push({
                url,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            });

            // Start batch timer if not already running
            if (!this._batchTimer) {
                this._batchTimer = setTimeout(() => {
                    this._processBatch();
                }, this._batchTimeout);
            }

            // Process immediately if batch is full
            if (this._requestQueue.length >= this._batchSize) {
                clearTimeout(this._batchTimer);
                this._batchTimer = null;
                this._processBatch();
            }
        });
    }

    /**
     * Process queued requests as a batch
     * @private
     */
    async _processBatch() {
        if (this._requestQueue.length === 0) return;
        
        const batch = this._requestQueue.splice(0, this._batchSize);
        this._batchTimer = null;
        
        // Process batch requests
        const promises = batch.map(async (req) => {
            try {
                const response = await this.optimizedFetch(req.url, req.options);
                req.resolve(response);
            } catch (error) {
                req.reject(error);
            }
        });
        
        await Promise.all(promises);
        
        // Schedule next batch if more requests are queued
        if (this._requestQueue.length > 0) {
            this._batchTimer = setTimeout(() => {
                this._processBatch();
            }, this._batchTimeout);
        }
    }

    /**
     * Fetch with timeout protection
     * @private
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<Response>} Response
     */
    async _fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this._responseTimeTarget * 2);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout: ${url}`);
            }
            throw error;
        }
    }

    /**
     * Generate cache key for request
     * @private
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {string} Cache key
     */
    _getCacheKey(url, options) {
        const method = options.method || 'GET';
        const headers = JSON.stringify(options.headers || {});
        return `${method}:${url}:${headers}`;
    }

    /**
     * Cache response
     * @private
     * @param {string} key - Cache key
     * @param {Response} response - Response to cache
     */
    _cacheResponse(key, response) {
        this._requestCache.set(key, {
            response: response.clone(),
            timestamp: Date.now(),
            ttl: 300000 // 5 minutes
        });
    }

    /**
     * Check if cached response is expired
     * @private
     * @param {Object} cached - Cached entry
     * @returns {boolean} True if expired
     */
    _isCacheExpired(cached) {
        return Date.now() - cached.timestamp > cached.ttl;
    }

    /**
     * Clean up expired cache entries
     * @private
     */
    _cleanupCache() {
        for (const [key, cached] of this._requestCache.entries()) {
            if (this._isCacheExpired(cached)) {
                this._requestCache.delete(key);
            }
        }
    }

    /**
     * Record response time for statistics
     * @private
     * @param {number} responseTime - Response time in milliseconds
     */
    _recordResponseTime(responseTime) {
        this._responseTimeStats.samples.push(responseTime);
        
        // Keep only the last N samples
        if (this._responseTimeStats.samples.length > this._responseTimeStats.maxSamples) {
            this._responseTimeStats.samples.shift();
        }
        
        // Update average
        const sum = this._responseTimeStats.samples.reduce((a, b) => a + b, 0);
        this._responseTimeStats.average = sum / this._responseTimeStats.samples.length;
    }



    /**
     * Get network performance statistics
     * @returns {Object} Performance statistics
     */
    getPerformanceStats() {
        return {
            responseTime: {
                average: this._responseTimeStats.average,
                target: this._responseTimeTarget,
                samples: this._responseTimeStats.samples.length
            },
            cache: {
                size: this._requestCache.size,
                hitRate: this._calculateCacheHitRate()
            },
            batching: {
                queueSize: this._requestQueue.length,
                batchSize: this._batchSize
            }
        };
    }

    /**
     * Calculate cache hit rate
     * @private
     * @returns {number} Hit rate percentage
     */
    _calculateCacheHitRate() {
        // This would need more sophisticated tracking in a real implementation
        return 0; // Placeholder
    }

    /**
     * Update optimization settings
     * @param {Object} settings - New settings
     */
    updateSettings(settings) {
        if (settings.batchSize && settings.batchSize > 0) {
            this._batchSize = Math.min(settings.batchSize, 20);
        }
        if (settings.responseTimeTarget && settings.responseTimeTarget > 0) {
            this._responseTimeTarget = settings.responseTimeTarget;
        }
        if (settings.batchTimeout && settings.batchTimeout > 0) {
            this._batchTimeout = settings.batchTimeout;
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this._batchTimer) {
            clearTimeout(this._batchTimer);
            this._batchTimer = null;
        }
        
        this._requestQueue.length = 0;
        this._requestCache.clear();
    }
}