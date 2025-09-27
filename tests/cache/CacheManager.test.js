/**
 * @fileoverview Contract tests for Cache Manager
 * Tests the cache interface defined in contracts/cache.contract.js
 * These tests define the expected behavior and must pass before implementation.
 */

import CacheManager from '../../src/cache/CacheManager.js';

describe('Cache Manager Contract', () => {
    let cacheManager;

    beforeEach(async () => {
        // Mock IndexedDB operations
        const mockDB = {
            transaction: jest.fn(() => ({
                objectStore: jest.fn(() => ({
                    get: jest.fn(),
                    put: jest.fn(),
                    delete: jest.fn(),
                    clear: jest.fn(),
                    count: jest.fn()
                }))
            })),
            close: jest.fn()
        };

        global.indexedDB.open = jest.fn(() => ({
            onsuccess: null,
            onerror: null,
            onupgradeneeded: null,
            result: mockDB
        }));

        cacheManager = new CacheManager();
        await cacheManager.initialize();
    });

    afterEach(async () => {
        if (cacheManager) {
            await cacheManager.clear();
        }
    });

    describe('Initialization', () => {
        test('should initialize IndexedDB connection', async () => {
            expect(cacheManager.isInitialized()).toBe(true);
            expect(global.indexedDB.open).toHaveBeenCalledWith('foundrymagic-cache', 1);
        });

        test('should handle initialization failures gracefully', async () => {
            global.indexedDB.open = jest.fn(() => {
                throw new Error('IndexedDB not supported');
            });

            const newCacheManager = new CacheManager();
            await expect(newCacheManager.initialize()).rejects.toThrow();
        });
    });

    describe('Data Storage', () => {
        test('should store character data with TTL', async () => {
            const characterData = {
                id: '12345',
                name: 'Test Character',
                level: 5,
                class: 'Fighter'
            };
            const ttlMs = 3600000; // 1 hour

            await cacheManager.setCharacter('12345', characterData, ttlMs);

            const stored = await cacheManager.getCharacter('12345');
            expect(stored).toEqual(characterData);
        });

        test('should store spell data with metadata', async () => {
            const spellData = {
                id: 'fireball',
                name: 'Fireball',
                level: 3,
                school: 'evocation',
                description: 'A bright streak flashes...'
            };

            await cacheManager.setSpell('fireball', spellData);

            const stored = await cacheManager.getSpell('fireball');
            expect(stored).toEqual(spellData);
        });

        test('should store monster data with combat stats', async () => {
            const monsterData = {
                id: 'goblin',
                name: 'Goblin',
                cr: 0.25,
                hp: 7,
                ac: 15,
                stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }
            };

            await cacheManager.setMonster('goblin', monsterData);

            const stored = await cacheManager.getMonster('goblin');
            expect(stored).toEqual(monsterData);
        });

        test('should store item data with properties', async () => {
            const itemData = {
                id: 'longsword',
                name: 'Longsword',
                type: 'weapon',
                rarity: 'common',
                damage: '1d8',
                properties: ['versatile']
            };

            await cacheManager.setItem('longsword', itemData);

            const stored = await cacheManager.getItem('longsword');
            expect(stored).toEqual(itemData);
        });
    });

    describe('Data Retrieval', () => {
        test('should return null for non-existent entries', async () => {
            const nonExistent = await cacheManager.getCharacter('non-existent');
            expect(nonExistent).toBeNull();
        });

        test('should respect TTL expiration', async () => {
            const characterData = { id: '123', name: 'Expired Character' };
            const shortTTL = 10; // 10ms

            await cacheManager.setCharacter('123', characterData, shortTTL);

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 20));

            const expired = await cacheManager.getCharacter('123');
            expect(expired).toBeNull();
        });

        test('should retrieve multiple items by type', async () => {
            const spell1 = { id: 'spell1', name: 'Magic Missile' };
            const spell2 = { id: 'spell2', name: 'Shield' };

            await cacheManager.setSpell('spell1', spell1);
            await cacheManager.setSpell('spell2', spell2);

            const allSpells = await cacheManager.getAllSpells();
            expect(allSpells).toHaveLength(2);
            expect(allSpells).toContainEqual(spell1);
            expect(allSpells).toContainEqual(spell2);
        });
    });

    describe('Cache Management', () => {
        test('should enforce storage limits', async () => {
            // Fill cache to near limit
            const largeData = 'x'.repeat(1024 * 1024); // 1MB

            for (let i = 0; i < 500; i++) {
                await cacheManager.setCharacter(`char-${i}`, {
                    id: `char-${i}`,
                    data: largeData
                });
            }

            // Should trigger cleanup when approaching 500MB limit
            const cacheSize = await cacheManager.getCacheSize();
            expect(cacheSize).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
        });

        test('should implement LRU eviction policy', async () => {
            // Set cache size limit very low for testing
            cacheManager.setMaxSize(1024); // 1KB limit

            const item1 = { id: '1', data: 'x'.repeat(300) };
            const item2 = { id: '2', data: 'x'.repeat(300) };
            const item3 = { id: '3', data: 'x'.repeat(300) };
            const item4 = { id: '4', data: 'x'.repeat(300) };

            await cacheManager.setCharacter('1', item1);
            await cacheManager.setCharacter('2', item2);
            await cacheManager.setCharacter('3', item3);

            // Access item1 to make it recently used
            await cacheManager.getCharacter('1');

            // Add item4, should evict item2 (least recently used)
            await cacheManager.setCharacter('4', item4);

            expect(await cacheManager.getCharacter('1')).not.toBeNull();
            expect(await cacheManager.getCharacter('2')).toBeNull(); // Evicted
            expect(await cacheManager.getCharacter('3')).not.toBeNull();
            expect(await cacheManager.getCharacter('4')).not.toBeNull();
        });

        test('should support selective cache clearing', async () => {
            await cacheManager.setCharacter('char1', { id: 'char1' });
            await cacheManager.setSpell('spell1', { id: 'spell1' });
            await cacheManager.setMonster('monster1', { id: 'monster1' });

            await cacheManager.clearCharacters();

            expect(await cacheManager.getCharacter('char1')).toBeNull();
            expect(await cacheManager.getSpell('spell1')).not.toBeNull();
            expect(await cacheManager.getMonster('monster1')).not.toBeNull();
        });

        test('should support complete cache clearing', async () => {
            await cacheManager.setCharacter('char1', { id: 'char1' });
            await cacheManager.setSpell('spell1', { id: 'spell1' });
            await cacheManager.setMonster('monster1', { id: 'monster1' });

            await cacheManager.clear();

            expect(await cacheManager.getCharacter('char1')).toBeNull();
            expect(await cacheManager.getSpell('spell1')).toBeNull();
            expect(await cacheManager.getMonster('monster1')).toBeNull();
        });
    });

    describe('Cache Statistics', () => {
        test('should track cache hit/miss ratios', async () => {
            await cacheManager.setCharacter('test', { id: 'test' });

            // Hit
            await cacheManager.getCharacter('test');
            // Miss
            await cacheManager.getCharacter('non-existent');

            const stats = await cacheManager.getStatistics();
            expect(stats.hits).toBe(1);
            expect(stats.misses).toBe(1);
            expect(stats.hitRatio).toBe(0.5);
        });

        test('should report accurate cache size', async () => {
            const initialSize = await cacheManager.getCacheSize();

            const testData = { id: 'test', data: 'x'.repeat(1000) };
            await cacheManager.setCharacter('test', testData);

            const newSize = await cacheManager.getCacheSize();
            expect(newSize).toBeGreaterThan(initialSize);
        });

        test('should count entries by type', async () => {
            await cacheManager.setCharacter('char1', { id: 'char1' });
            await cacheManager.setCharacter('char2', { id: 'char2' });
            await cacheManager.setSpell('spell1', { id: 'spell1' });

            const stats = await cacheManager.getStatistics();
            expect(stats.characterCount).toBe(2);
            expect(stats.spellCount).toBe(1);
            expect(stats.monsterCount).toBe(0);
            expect(stats.itemCount).toBe(0);
        });
    });

    describe('Error Handling', () => {
        test('should handle IndexedDB transaction failures', async () => {
            // Mock a transaction failure
            const mockStore = {
                get: jest.fn(() => {
                    throw new Error('Transaction failed');
                })
            };

            cacheManager._getStore = jest.fn(() => mockStore);

            const result = await cacheManager.getCharacter('test');
            expect(result).toBeNull();
        });

        test('should handle quota exceeded errors', async () => {
            // Mock quota exceeded error
            const mockStore = {
                put: jest.fn(() => {
                    const error = new Error('Quota exceeded');
                    error.name = 'QuotaExceededError';
                    throw error;
                })
            };

            cacheManager._getStore = jest.fn(() => mockStore);

            await expect(cacheManager.setCharacter('test', { large: 'data' }))
                .rejects.toThrow('Storage quota exceeded');
        });

        test('should handle corrupted cache data', async () => {
            // Mock corrupted data
            const mockStore = {
                get: jest.fn(() => ({
                    result: 'corrupted-non-json-data'
                }))
            };

            cacheManager._getStore = jest.fn(() => mockStore);

            const result = await cacheManager.getCharacter('test');
            expect(result).toBeNull();
        });
    });
});