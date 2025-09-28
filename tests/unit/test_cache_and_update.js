/**
 * Unit Tests for Cache Management and Update Service
 * @fileoverview Tests for cache management and content update functionality
 */

import CacheManager from '../../src/cache/CacheManager.js';
import UpdateService from '../../src/importers/UpdateService.js';

// Mock IndexedDB
const mockIndexedDB = {
    open: jest.fn(),
    deleteDatabase: jest.fn()
};

global.indexedDB = mockIndexedDB;

// Mock Foundry VTT globals
global.game = {
    settings: {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue(true)
    }
};

describe('CacheManager', () => {
    let cacheManager;
    let mockDB;
    let mockTransaction;
    let mockStore;

    beforeEach(() => {
        cacheManager = new CacheManager();
        
        mockStore = {
            get: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            getAll: jest.fn(),
            clear: jest.fn()
        };

        mockTransaction = {
            objectStore: jest.fn().mockReturnValue(mockStore)
        };

        mockDB = {
            transaction: jest.fn().mockReturnValue(mockTransaction),
            close: jest.fn()
        };

        // Mock successful DB connection
        mockIndexedDB.open.mockReturnValue({
            onsuccess: null,
            onerror: null,
            onupgradeneeded: null,
            result: mockDB
        });

        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('should initialize with correct default values', () => {
            expect(cacheManager._dbName).toBe('FoundryMagicCache');
            expect(cacheManager._dbVersion).toBe(1);
            expect(cacheManager._maxSize).toBe(500 * 1024 * 1024); // 500MB
        });
    });

    describe('initialize', () => {
        test('should open database connection', async () => {
            const openRequest = {
                onsuccess: null,
                onerror: null,
                onupgradeneeded: null
            };

            mockIndexedDB.open.mockReturnValue(openRequest);

            const initPromise = cacheManager.initialize();

            // Simulate successful database open
            openRequest.result = mockDB;
            openRequest.onsuccess({ target: { result: mockDB } });

            await initPromise;

            expect(mockIndexedDB.open).toHaveBeenCalledWith('FoundryMagicCache', 1);
            expect(cacheManager._db).toBe(mockDB);
        });

        test('should handle database initialization error', async () => {
            const openRequest = {
                onsuccess: null,
                onerror: null,
                onupgradeneeded: null
            };

            mockIndexedDB.open.mockReturnValue(openRequest);

            const initPromise = cacheManager.initialize();

            // Simulate database error
            openRequest.onerror({ target: { error: new Error('DB Error') } });

            await expect(initPromise).rejects.toThrow('DB Error');
        });
    });

    describe('setCharacter', () => {
        beforeEach(async () => {
            // Initialize cache manager
            cacheManager._db = mockDB;
        });

        test('should store character data', async () => {
            const characterId = 'char123';
            const characterData = { name: 'Test Character', level: 5 };

            mockStore.put.mockImplementation((value) => ({
                onsuccess: null,
                onerror: null
            }));

            const setPromise = cacheManager.setCharacter(characterId, characterData);

            // Simulate successful put operation
            const putRequest = mockStore.put.mock.results[0].value;
            putRequest.onsuccess({ target: { result: characterId } });

            await setPromise;

            expect(mockDB.transaction).toHaveBeenCalledWith(['characters'], 'readwrite');
            expect(mockStore.put).toHaveBeenCalledWith({
                id: characterId,
                data: characterData,
                timestamp: expect.any(Number),
                size: expect.any(Number)
            });
        });
    });

    describe('getCharacter', () => {
        beforeEach(() => {
            cacheManager._db = mockDB;
        });

        test('should retrieve character data', async () => {
            const characterId = 'char123';
            const cachedData = {
                id: characterId,
                data: { name: 'Test Character' },
                timestamp: Date.now(),
                size: 1000
            };

            mockStore.get.mockImplementation(() => ({
                onsuccess: null,
                onerror: null
            }));

            const getPromise = cacheManager.getCharacter(characterId);

            // Simulate successful get operation
            const getRequest = mockStore.get.mock.results[0].value;
            getRequest.result = cachedData;
            getRequest.onsuccess({ target: { result: cachedData } });

            const result = await getPromise;

            expect(result).toEqual({ name: 'Test Character' });
            expect(mockStore.get).toHaveBeenCalledWith(characterId);
        });

        test('should return null for missing character', async () => {
            const characterId = 'missing123';

            mockStore.get.mockImplementation(() => ({
                onsuccess: null,
                onerror: null
            }));

            const getPromise = cacheManager.getCharacter(characterId);

            // Simulate not found
            const getRequest = mockStore.get.mock.results[0].value;
            getRequest.result = undefined;
            getRequest.onsuccess({ target: { result: undefined } });

            const result = await getPromise;

            expect(result).toBeNull();
        });
    });

    describe('getCurrentSize', () => {
        beforeEach(() => {
            cacheManager._db = mockDB;
        });

        test('should calculate total cache size', async () => {
            const mockData = [
                { size: 1000 },
                { size: 2000 },
                { size: 3000 }
            ];

            mockStore.getAll.mockImplementation(() => ({
                onsuccess: null,
                onerror: null
            }));

            const sizePromise = cacheManager.getCurrentSize();

            // Mock store results for all object stores
            const requests = [];
            ['characters', 'adventures', 'monsters', 'spells', 'items'].forEach(() => {
                const request = { onsuccess: null, onerror: null };
                requests.push(request);
                mockStore.getAll.mockReturnValueOnce(request);
            });

            // Simulate successful getAll operations
            requests.forEach(request => {
                request.result = mockData;
                request.onsuccess({ target: { result: mockData } });
            });

            const totalSize = await sizePromise;

            expect(totalSize).toBe(30000); // 6000 * 5 stores
        });
    });

    describe('cleanup', () => {
        beforeEach(() => {
            cacheManager._db = mockDB;
        });

        test('should cleanup old entries when cache is full', async () => {
            // Mock cache being over limit
            jest.spyOn(cacheManager, 'getCurrentSize').mockResolvedValue(cacheManager._maxSize + 1000);

            const oldEntries = [
                { id: 'old1', timestamp: Date.now() - 100000, size: 500 },
                { id: 'old2', timestamp: Date.now() - 200000, size: 600 }
            ];

            mockStore.getAll.mockImplementation(() => ({
                onsuccess: null,
                onerror: null
            }));

            mockStore.delete.mockImplementation(() => ({
                onsuccess: null,
                onerror: null
            }));

            const cleanupPromise = cacheManager.cleanup();

            // Simulate getAll returning old entries
            const getAllRequest = mockStore.getAll.mock.results[0].value;
            getAllRequest.result = oldEntries;
            getAllRequest.onsuccess({ target: { result: oldEntries } });

            // Simulate successful delete operations
            const deleteRequests = [];
            oldEntries.forEach(() => {
                const request = { onsuccess: null, onerror: null };
                deleteRequests.push(request);
                mockStore.delete.mockReturnValueOnce(request);
            });

            deleteRequests.forEach(request => {
                request.onsuccess({ target: { result: true } });
            });

            await cleanupPromise;

            expect(mockStore.delete).toHaveBeenCalledTimes(2);
        });
    });
});

describe('UpdateService', () => {
    let updateService;
    let mockCacheManager;
    let mockAuthService;

    beforeEach(() => {
        mockCacheManager = {
            getCharacter: jest.fn(),
            setCharacter: jest.fn()
        };

        mockAuthService = {
            getToken: jest.fn().mockReturnValue('valid-token'),
            validateToken: jest.fn().mockResolvedValue(true)
        };

        updateService = new UpdateService(mockAuthService, mockCacheManager);

        // Mock fetch
        global.fetch = jest.fn();
    });

    describe('checkForUpdates', () => {
        test('should detect updated content', async () => {
            const contentIds = ['char1', 'char2'];
            
            // Mock cached versions
            mockCacheManager.getCharacter.mockImplementation(id => {
                if (id === 'char1') return Promise.resolve({ version: '1.0' });
                if (id === 'char2') return Promise.resolve({ version: '1.0' });
                return Promise.resolve(null);
            });

            // Mock API response with newer versions
            global.fetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    char1: { version: '2.0', lastModified: '2023-12-01' },
                    char2: { version: '1.0', lastModified: '2023-11-01' }
                })
            });

            const updates = await updateService.checkForUpdates('character', contentIds);

            expect(updates).toEqual([
                { id: 'char1', hasUpdate: true, currentVersion: '1.0', latestVersion: '2.0' }
            ]);
        });

        test('should handle API errors gracefully', async () => {
            const contentIds = ['char1'];

            global.fetch.mockResolvedValue({
                ok: false,
                status: 500
            });

            await expect(updateService.checkForUpdates('character', contentIds))
                .rejects
                .toThrow('Failed to check for updates');
        });
    });

    describe('updateContent', () => {
        test('should update content with new version', async () => {
            const contentId = 'char1';
            const contentType = 'character';

            // Mock API response with updated content
            const updatedData = {
                id: contentId,
                name: 'Updated Character',
                version: '2.0'
            };

            global.fetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(updatedData)
            });

            const result = await updateService.updateContent(contentType, contentId);

            expect(result).toEqual(updatedData);
            expect(mockCacheManager.setCharacter).toHaveBeenCalledWith(contentId, updatedData);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(contentId),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer valid-token'
                    })
                })
            );
        });
    });

    describe('scheduleUpdate', () => {
        test('should schedule periodic updates', () => {
            const contentType = 'character';
            const contentIds = ['char1', 'char2'];
            const intervalHours = 24;

            const timerId = updateService.scheduleUpdate(contentType, contentIds, intervalHours);

            expect(timerId).toBeDefined();
            expect(typeof timerId).toBe('object'); // setTimeout returns an object in Node.js

            // Cleanup
            updateService.cancelScheduledUpdate(timerId);
        });
    });

    describe('getUpdateHistory', () => {
        test('should return update history for content', () => {
            // Add some history
            updateService._updateHistory.set('char1', [
                { timestamp: Date.now() - 1000, version: '1.0', success: true },
                { timestamp: Date.now(), version: '2.0', success: true }
            ]);

            const history = updateService.getUpdateHistory('char1');

            expect(history).toHaveLength(2);
            expect(history[1].version).toBe('2.0');
        });

        test('should return empty array for unknown content', () => {
            const history = updateService.getUpdateHistory('unknown');
            expect(history).toEqual([]);
        });
    });
});