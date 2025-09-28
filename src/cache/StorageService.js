/**
 * @fileoverview Storage Service for IndexedDB operations
 * Provides low-level storage abstraction for the cache manager
 */

export default class StorageService {
    constructor(dbName = 'foundrymagic-storage', dbVersion = 1) {
        this._dbName = dbName;
        this._dbVersion = dbVersion;
        this._db = null;
        this._isInitialized = false;
    }

    /**
     * Initialize the storage service
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this._isInitialized) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this._dbName, this._dbVersion);

            request.onerror = () => {
                reject(new Error(`Failed to open IndexedDB: ${request.error}`));
            };

            request.onsuccess = () => {
                this._db = request.result;
                this._isInitialized = true;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create main object store for key-value storage
                if (!db.objectStoreNames.contains('keyvalue')) {
                    const store = db.createObjectStore('keyvalue', { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }

                // Create metadata store for tracking
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };

            request.onblocked = () => {
                reject(new Error('IndexedDB open blocked'));
            };
        });
    }

    /**
     * Store data with key
     * @param {string} key - Storage key
     * @param {Object} data - Data to store
     * @returns {Promise<void>}
     */
    async store(key, data) {
        this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction(['keyvalue'], 'readwrite');
            const store = transaction.objectStore('keyvalue');

            const item = {
                key,
                data,
                timestamp: new Date().toISOString()
            };

            const request = store.put(item);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Failed to store ${key}: ${request.error}`));
        });
    }

    /**
     * Retrieve data by key
     * @param {string} key - Storage key
     * @returns {Promise<Object|null>} Stored data or null
     */
    async retrieve(key) {
        this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction(['keyvalue'], 'readonly');
            const store = transaction.objectStore('keyvalue');
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.data : null);
            };
            request.onerror = () => reject(new Error(`Failed to retrieve ${key}: ${request.error}`));
        });
    }

    /**
     * Check if key exists
     * @param {string} key - Storage key
     * @returns {Promise<boolean>} Existence status
     */
    async exists(key) {
        this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction(['keyvalue'], 'readonly');
            const store = transaction.objectStore('keyvalue');
            const request = store.getKey(key);

            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => reject(new Error(`Failed to check existence of ${key}: ${request.error}`));
        });
    }

    /**
     * Remove data by key
     * @param {string} key - Storage key
     * @returns {Promise<boolean>} Success status
     */
    async remove(key) {
        this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction(['keyvalue'], 'readwrite');
            const store = transaction.objectStore('keyvalue');
            const request = store.delete(key);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(new Error(`Failed to remove ${key}: ${request.error}`));
        });
    }

    /**
     * Get all keys matching pattern
     * @param {string} pattern - Pattern to match (optional)
     * @returns {Promise<Array>} Array of keys
     */
    async getKeys(pattern = null) {
        this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction(['keyvalue'], 'readonly');
            const store = transaction.objectStore('keyvalue');
            const request = store.getAllKeys();

            request.onsuccess = () => {
                let keys = request.result;

                if (pattern) {
                    // Simple pattern matching (could be enhanced with regex)
                    keys = keys.filter(key => key.includes(pattern));
                }

                resolve(keys);
            };
            request.onerror = () => reject(new Error(`Failed to get keys: ${request.error}`));
        });
    }

    /**
     * Clear all stored data
     * @returns {Promise<void>}
     */
    async clear() {
        this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction(['keyvalue'], 'readwrite');
            const store = transaction.objectStore('keyvalue');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Failed to clear storage: ${request.error}`));
        });
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage stats
     */
    async getStats() {
        this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction(['keyvalue'], 'readonly');
            const store = transaction.objectStore('keyvalue');
            const request = store.getAll();

            request.onsuccess = () => {
                const items = request.result;
                const stats = {
                    itemCount: items.length,
                    totalSize: 0,
                    types: {}
                };

                items.forEach(item => {
                    const size = this._calculateSize(item);
                    stats.totalSize += size;

                    const type = item.data?.type || 'unknown';
                    stats.types[type] = (stats.types[type] || 0) + 1;
                });

                resolve(stats);
            };
            request.onerror = () => reject(new Error(`Failed to get stats: ${request.error}`));
        });
    }

    /**
     * Store metadata
     * @param {string} key - Metadata key
     * @param {Object} data - Metadata to store
     * @returns {Promise<void>}
     */
    async storeMetadata(key, data) {
        this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');

            const item = {
                key,
                data,
                timestamp: new Date().toISOString()
            };

            const request = store.put(item);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Failed to store metadata ${key}: ${request.error}`));
        });
    }

    /**
     * Retrieve metadata
     * @param {string} key - Metadata key
     * @returns {Promise<Object|null>} Metadata or null
     */
    async retrieveMetadata(key) {
        this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.data : null);
            };
            request.onerror = () => reject(new Error(`Failed to retrieve metadata ${key}: ${request.error}`));
        });
    }

    /**
     * Batch store multiple items
     * @param {Array} items - Array of {key, data} objects
     * @returns {Promise<Array>} Results array
     */
    async batchStore(items) {
        this._ensureInitialized();

        const results = [];

        for (const item of items) {
            try {
                await this.store(item.key, item.data);
                results.push({ key: item.key, success: true });
            } catch (error) {
                results.push({ key: item.key, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Batch retrieve multiple items
     * @param {Array} keys - Array of keys to retrieve
     * @returns {Promise<Array>} Results array
     */
    async batchRetrieve(keys) {
        const results = [];

        for (const key of keys) {
            try {
                const data = await this.retrieve(key);
                results.push({ key, success: true, data });
            } catch (error) {
                results.push({ key, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Close database connection
     */
    close() {
        if (this._db) {
            this._db.close();
            this._db = null;
            this._isInitialized = false;
        }
    }

    /**
     * Delete entire database
     * @returns {Promise<void>}
     */
    async deleteDatabase() {
        this.close();

        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this._dbName);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Failed to delete database: ${request.error}`));
            request.onblocked = () => reject(new Error('Database deletion blocked'));
        });
    }

    /**
     * Ensure service is initialized
     * @private
     */
    _ensureInitialized() {
        if (!this._isInitialized) {
            throw new Error('StorageService not initialized. Call initialize() first.');
        }
    }

    /**
     * Calculate approximate size of stored item
     * @private
     * @param {Object} item - Item to measure
     * @returns {number} Size in bytes
     */
    _calculateSize(item) {
        try {
            return JSON.stringify(item).length * 2; // UTF-16 approximation
        } catch (error) {
            return 0;
        }
    }

    /**
     * Check if IndexedDB is supported
     * @returns {boolean} Support status
     */
    static isSupported() {
        return typeof indexedDB !== 'undefined';
    }

    /**
     * Get estimated storage quota
     * @returns {Promise<Object>} Quota information
     */
    async getStorageEstimate() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            return await navigator.storage.estimate();
        }

        return {
            quota: null,
            usage: null,
            available: null
        };
    }
}