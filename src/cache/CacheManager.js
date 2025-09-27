/**
 * @fileoverview Cache Manager for FoundryMagic
 * Handles IndexedDB storage with TTL, LRU eviction, and size limits
 */

export default class CacheManager {
    constructor() {
        this._db = null;
        this._dbName = 'foundrymagic-cache';
        this._dbVersion = 1;
        this._maxSize = 500 * 1024 * 1024; // 500MB default
        this._isInitialized = false;
        this._stats = {
            hits: 0,
            misses: 0
        };
    }

    /**
     * Initialize the cache manager and IndexedDB connection
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this._dbName, this._dbVersion);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = () => {
                this._db = request.result;
                this._isInitialized = true;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores for different data types
                if (!db.objectStoreNames.contains('characters')) {
                    const characterStore = db.createObjectStore('characters', { keyPath: 'id' });
                    characterStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                }

                if (!db.objectStoreNames.contains('spells')) {
                    const spellStore = db.createObjectStore('spells', { keyPath: 'id' });
                    spellStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                }

                if (!db.objectStoreNames.contains('monsters')) {
                    const monsterStore = db.createObjectStore('monsters', { keyPath: 'id' });
                    monsterStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                }

                if (!db.objectStoreNames.contains('items')) {
                    const itemStore = db.createObjectStore('items', { keyPath: 'id' });
                    itemStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                }
            };
        });
    }

    /**
     * Check if cache manager is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this._isInitialized;
    }

    /**
     * Set maximum cache size
     * @param {number} sizeBytes - Maximum size in bytes
     */
    setMaxSize(sizeBytes) {
        this._maxSize = sizeBytes;
    }

    /**
     * Store character data with TTL
     * @param {string} id - Character ID
     * @param {Object} data - Character data
     * @param {number} ttlMs - Time to live in milliseconds
     */
    async setCharacter(id, data, ttlMs = 3600000) {
        await this._setData('characters', id, data, ttlMs);
    }

    /**
     * Retrieve character data
     * @param {string} id - Character ID
     * @returns {Promise<Object|null>}
     */
    async getCharacter(id) {
        return await this._getData('characters', id);
    }

    /**
     * Store spell data
     * @param {string} id - Spell ID
     * @param {Object} data - Spell data
     * @param {number} ttlMs - Time to live in milliseconds
     */
    async setSpell(id, data, ttlMs = 86400000) {
        await this._setData('spells', id, data, ttlMs);
    }

    /**
     * Retrieve spell data
     * @param {string} id - Spell ID
     * @returns {Promise<Object|null>}
     */
    async getSpell(id) {
        return await this._getData('spells', id);
    }

    /**
     * Store monster data
     * @param {string} id - Monster ID
     * @param {Object} data - Monster data
     * @param {number} ttlMs - Time to live in milliseconds
     */
    async setMonster(id, data, ttlMs = 86400000) {
        await this._setData('monsters', id, data, ttlMs);
    }

    /**
     * Retrieve monster data
     * @param {string} id - Monster ID
     * @returns {Promise<Object|null>}
     */
    async getMonster(id) {
        return await this._getData('monsters', id);
    }

    /**
     * Store item data
     * @param {string} id - Item ID
     * @param {Object} data - Item data
     * @param {number} ttlMs - Time to live in milliseconds
     */
    async setItem(id, data, ttlMs = 86400000) {
        await this._setData('items', id, data, ttlMs);
    }

    /**
     * Retrieve item data
     * @param {string} id - Item ID
     * @returns {Promise<Object|null>}
     */
    async getItem(id) {
        return await this._getData('items', id);
    }

    /**
     * Get all spells from cache
     * @returns {Promise<Array>}
     */
    async getAllSpells() {
        return await this._getAllData('spells');
    }

    /**
     * Generic data storage with TTL and size management
     * @private
     */
    async _setData(storeName, id, data, ttlMs) {
        if (!this._isInitialized) {
            throw new Error('Cache not initialized');
        }

        const now = Date.now();
        const expiresAt = now + ttlMs;

        const cacheEntry = {
            id,
            data,
            expiresAt,
            lastAccessed: now,
            size: this._calculateSize(data)
        };

        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            transaction.onerror = () => {
                reject(new Error('Transaction failed'));
            };

            transaction.oncomplete = async () => {
                // Check cache size and perform cleanup if necessary
                await this._enforceSizeLimit();
                resolve();
            };

            try {
                store.put(cacheEntry);
            } catch (error) {
                if (error.name === 'QuotaExceededError') {
                    reject(new Error('Storage quota exceeded'));
                } else {
                    reject(error);
                }
            }
        });
    }

    /**
     * Generic data retrieval with TTL checking
     * @private
     */
    async _getData(storeName, id) {
        if (!this._isInitialized) {
            return null;
        }

        return new Promise((resolve) => {
            const transaction = this._db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                const result = request.result;

                if (!result) {
                    this._stats.misses++;
                    resolve(null);
                    return;
                }

                // Check TTL expiration
                if (Date.now() > result.expiresAt) {
                    this._stats.misses++;
                    // Delete expired entry
                    this._deleteData(storeName, id);
                    resolve(null);
                    return;
                }

                // Update last accessed time for LRU
                result.lastAccessed = Date.now();
                const updateTransaction = this._db.transaction([storeName], 'readwrite');
                const updateStore = updateTransaction.objectStore(storeName);
                updateStore.put(result);

                this._stats.hits++;
                resolve(result.data);
            };

            request.onerror = () => {
                this._stats.misses++;
                resolve(null);
            };
        });
    }

    /**
     * Get all data from a store
     * @private
     */
    async _getAllData(storeName) {
        if (!this._isInitialized) {
            return [];
        }

        return new Promise((resolve) => {
            const transaction = this._db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                const results = request.result || [];
                const now = Date.now();

                // Filter out expired entries and extract data
                const validData = results
                    .filter(entry => now <= entry.expiresAt)
                    .map(entry => entry.data);

                resolve(validData);
            };

            request.onerror = () => {
                resolve([]);
            };
        });
    }

    /**
     * Delete data from store
     * @private
     */
    async _deleteData(storeName, id) {
        if (!this._isInitialized) {
            return;
        }

        const transaction = this._db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        store.delete(id);
    }

    /**
     * Calculate approximate size of data
     * @private
     */
    _calculateSize(data) {
        return JSON.stringify(data).length * 2; // Approximate UTF-16 size
    }

    /**
     * Enforce cache size limits using LRU eviction
     * @private
     */
    async _enforceSizeLimit() {
        const currentSize = await this.getCacheSize();

        if (currentSize > this._maxSize) {
            const storeNames = ['characters', 'spells', 'monsters', 'items'];

            // Get all entries sorted by last accessed time (LRU)
            const allEntries = [];

            for (const storeName of storeNames) {
                const transaction = this._db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const index = store.index('lastAccessed');
                const request = index.getAll();

                await new Promise((resolve) => {
                    request.onsuccess = () => {
                        request.result.forEach(entry => {
                            allEntries.push({ ...entry, storeName });
                        });
                        resolve();
                    };
                });
            }

            // Sort by last accessed (oldest first)
            allEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);

            // Remove oldest entries until under size limit
            let sizeToRemove = currentSize - this._maxSize;
            for (const entry of allEntries) {
                if (sizeToRemove <= 0) break;

                await this._deleteData(entry.storeName, entry.id);
                sizeToRemove -= entry.size;
            }
        }
    }

    /**
     * Get current cache size in bytes
     * @returns {Promise<number>}
     */
    async getCacheSize() {
        if (!this._isInitialized) {
            return 0;
        }

        const storeNames = ['characters', 'spells', 'monsters', 'items'];
        let totalSize = 0;

        for (const storeName of storeNames) {
            const transaction = this._db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            await new Promise((resolve) => {
                request.onsuccess = () => {
                    const results = request.result || [];
                    results.forEach(entry => {
                        totalSize += entry.size || this._calculateSize(entry.data);
                    });
                    resolve();
                };
                request.onerror = resolve;
            });
        }

        return totalSize;
    }

    /**
     * Clear all cached characters
     */
    async clearCharacters() {
        await this._clearStore('characters');
    }

    /**
     * Clear entire cache
     */
    async clear() {
        const storeNames = ['characters', 'spells', 'monsters', 'items'];
        for (const storeName of storeNames) {
            await this._clearStore(storeName);
        }
        this._stats = { hits: 0, misses: 0 };
    }

    /**
     * Clear a specific object store
     * @private
     */
    async _clearStore(storeName) {
        if (!this._isInitialized) {
            return;
        }

        return new Promise((resolve) => {
            const transaction = this._db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = resolve;
            request.onerror = resolve;
        });
    }

    /**
     * Get cache statistics
     * @returns {Promise<Object>}
     */
    async getStatistics() {
        const storeNames = ['characters', 'spells', 'monsters', 'items'];
        const counts = {};

        for (const storeName of storeNames) {
            const transaction = this._db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            await new Promise((resolve) => {
                request.onsuccess = () => {
                    counts[`${storeName.slice(0, -1)}Count`] = request.result;
                    resolve();
                };
                request.onerror = () => {
                    counts[`${storeName.slice(0, -1)}Count`] = 0;
                    resolve();
                };
            });
        }

        const totalRequests = this._stats.hits + this._stats.misses;
        const hitRatio = totalRequests > 0 ? this._stats.hits / totalRequests : 0;

        return {
            ...this._stats,
            hitRatio,
            ...counts
        };
    }

    /**
     * Close the database connection
     */
    close() {
        if (this._db) {
            this._db.close();
            this._db = null;
        }
        this._isInitialized = false;
    }
}