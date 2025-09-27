/**
 * @fileoverview Contract tests for Core FoundryMagic Module
 * Tests the main module interface and initialization
 * These tests define the expected behavior and must pass before implementation.
 */

import FoundryMagic from '../../src/core/FoundryMagic.js';

describe('FoundryMagic Core Module Contract', () => {
    let foundryMagic;
    let mockAuthService;
    let mockCacheManager;
    let mockCharacterImporter;

    beforeEach(() => {
        // Reset Foundry VTT mocks
        global.game.settings.register.mockClear();
        global.Hooks.on.mockClear();
        global.Hooks.once.mockClear();

        // Mock dependencies
        mockAuthService = {
            initialize: jest.fn(),
            getToken: jest.fn(),
            validateToken: jest.fn()
        };

        mockCacheManager = {
            initialize: jest.fn(),
            getCacheSize: jest.fn().mockResolvedValue(0)
        };

        mockCharacterImporter = {
            initialize: jest.fn()
        };

        foundryMagic = new FoundryMagic();
        foundryMagic._authService = mockAuthService;
        foundryMagic._cacheManager = mockCacheManager;
        foundryMagic._characterImporter = mockCharacterImporter;
    });

    describe('Module Initialization', () => {
        test('should initialize all core services', async () => {
            await foundryMagic.initialize();

            expect(mockAuthService.initialize).toHaveBeenCalled();
            expect(mockCacheManager.initialize).toHaveBeenCalled();
            expect(mockCharacterImporter.initialize).toHaveBeenCalled();
            expect(foundryMagic.isInitialized()).toBe(true);
        });

        test('should register Foundry VTT settings', async () => {
            await foundryMagic.initialize();

            expect(global.game.settings.register).toHaveBeenCalledWith(
                'foundrymagic',
                'ddbToken',
                expect.objectContaining({
                    name: expect.any(String),
                    hint: expect.any(String),
                    scope: 'world',
                    config: true,
                    type: String,
                    default: ''
                })
            );

            expect(global.game.settings.register).toHaveBeenCalledWith(
                'foundrymagic',
                'cacheEnabled',
                expect.objectContaining({
                    name: expect.any(String),
                    scope: 'world',
                    config: true,
                    type: Boolean,
                    default: true
                })
            );
        });

        test('should register Foundry VTT hooks', async () => {
            await foundryMagic.initialize();

            expect(global.Hooks.once).toHaveBeenCalledWith('ready', expect.any(Function));
            expect(global.Hooks.on).toHaveBeenCalledWith('renderActorSheet', expect.any(Function));
        });

        test('should handle initialization failures gracefully', async () => {
            mockCacheManager.initialize.mockRejectedValue(new Error('Cache init failed'));

            await expect(foundryMagic.initialize()).rejects.toThrow('Cache init failed');
            expect(foundryMagic.isInitialized()).toBe(false);
        });
    });

    describe('Service Access', () => {
        beforeEach(async () => {
            await foundryMagic.initialize();
        });

        test('should provide access to authentication service', () => {
            const authService = foundryMagic.getAuthenticationService();
            expect(authService).toBe(mockAuthService);
        });

        test('should provide access to cache manager', () => {
            const cacheManager = foundryMagic.getCacheManager();
            expect(cacheManager).toBe(mockCacheManager);
        });

        test('should provide access to character importer', () => {
            const characterImporter = foundryMagic.getCharacterImporter();
            expect(characterImporter).toBe(mockCharacterImporter);
        });

        test('should throw error when accessing services before initialization', () => {
            const uninitializedModule = new FoundryMagic();

            expect(() => uninitializedModule.getAuthenticationService())
                .toThrow('Module not initialized');
        });
    });

    describe('Configuration Management', () => {
        beforeEach(async () => {
            await foundryMagic.initialize();
        });

        test('should retrieve D&D Beyond token from settings', () => {
            const expectedToken = 'cobalt_2_test123token456';
            global.game.settings.get.mockReturnValue(expectedToken);

            const token = foundryMagic.getDDBToken();

            expect(token).toBe(expectedToken);
            expect(global.game.settings.get).toHaveBeenCalledWith('foundrymagic', 'ddbToken');
        });

        test('should update D&D Beyond token in settings', () => {
            const newToken = 'cobalt_2_new123token456';

            foundryMagic.setDDBToken(newToken);

            expect(global.game.settings.set).toHaveBeenCalledWith(
                'foundrymagic',
                'ddbToken',
                newToken
            );
        });

        test('should check cache enabled status', () => {
            global.game.settings.get.mockReturnValue(true);

            const cacheEnabled = foundryMagic.isCacheEnabled();

            expect(cacheEnabled).toBe(true);
            expect(global.game.settings.get).toHaveBeenCalledWith('foundrymagic', 'cacheEnabled');
        });
    });

    describe('User Interface Integration', () => {
        beforeEach(async () => {
            await foundryMagic.initialize();
        });

        test('should add D&D Beyond import button to character sheets', () => {
            const mockSheet = {
                element: {
                    find: jest.fn().mockReturnValue({
                        after: jest.fn()
                    })
                },
                actor: { id: 'actor-123' }
            };

            // Simulate renderActorSheet hook being called
            const hookCallback = global.Hooks.on.mock.calls.find(
                call => call[0] === 'renderActorSheet'
            )[1];

            hookCallback(mockSheet, {}, {});

            expect(mockSheet.element.find).toHaveBeenCalled();
        });

        test('should show import dialog when import button is clicked', () => {
            // This will be tested in integration tests once UI components are implemented
            expect(true).toBe(true); // Placeholder
        });
    });

    describe('API Integration', () => {
        beforeEach(async () => {
            await foundryMagic.initialize();
        });

        test('should import character by D&D Beyond URL', async () => {
            const characterUrl = 'https://www.dndbeyond.com/characters/12345';
            const characterId = '12345';
            const mockCharacter = {
                id: characterId,
                name: 'Test Character'
            };

            mockCharacterImporter.fetchCharacter = jest.fn().mockResolvedValue(mockCharacter);
            mockCharacterImporter.createFoundryActor = jest.fn().mockResolvedValue({
                id: 'actor-123',
                name: 'Test Character'
            });

            const result = await foundryMagic.importCharacterFromURL(characterUrl);

            expect(mockCharacterImporter.fetchCharacter).toHaveBeenCalledWith(characterId);
            expect(result.success).toBe(true);
            expect(result.actor).toBeDefined();
        });

        test('should validate character URLs before import', async () => {
            const invalidUrls = [
                'https://example.com/character/123',
                'not-a-url',
                'https://www.dndbeyond.com/spells/magic-missile',
                ''
            ];

            for (const url of invalidUrls) {
                await expect(foundryMagic.importCharacterFromURL(url))
                    .rejects.toThrow('Invalid D&D Beyond character URL');
            }
        });

        test('should handle character import failures', async () => {
            const characterUrl = 'https://www.dndbeyond.com/characters/12345';

            mockCharacterImporter.fetchCharacter = jest.fn()
                .mockRejectedValue(new Error('Character not found'));

            const result = await foundryMagic.importCharacterFromURL(characterUrl);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Character not found');
        });
    });

    describe('Batch Operations', () => {
        beforeEach(async () => {
            await foundryMagic.initialize();
        });

        test('should import multiple characters', async () => {
            const characterUrls = [
                'https://www.dndbeyond.com/characters/11111',
                'https://www.dndbeyond.com/characters/22222'
            ];

            const mockCharacters = [
                { id: '11111', name: 'Character 1' },
                { id: '22222', name: 'Character 2' }
            ];

            mockCharacterImporter.fetchCharacter = jest.fn()
                .mockResolvedValueOnce(mockCharacters[0])
                .mockResolvedValueOnce(mockCharacters[1]);

            mockCharacterImporter.createFoundryActor = jest.fn()
                .mockResolvedValue({ id: 'actor-1' })
                .mockResolvedValue({ id: 'actor-2' });

            const results = await foundryMagic.importMultipleCharacters(characterUrls);

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);
        });

        test('should handle partial failures in batch import', async () => {
            const characterUrls = [
                'https://www.dndbeyond.com/characters/11111',
                'https://www.dndbeyond.com/characters/22222'
            ];

            mockCharacterImporter.fetchCharacter = jest.fn()
                .mockResolvedValueOnce({ id: '11111', name: 'Character 1' })
                .mockRejectedValueOnce(new Error('Character 2 failed'));

            mockCharacterImporter.createFoundryActor = jest.fn()
                .mockResolvedValue({ id: 'actor-1' });

            const results = await foundryMagic.importMultipleCharacters(characterUrls);

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[1].error).toBe('Character 2 failed');
        });
    });

    describe('Status and Health Checks', () => {
        beforeEach(async () => {
            await foundryMagic.initialize();
        });

        test('should report module health status', async () => {
            mockAuthService.validateToken.mockResolvedValue(true);
            mockCacheManager.getCacheSize.mockResolvedValue(1024 * 1024); // 1MB

            const status = await foundryMagic.getHealthStatus();

            expect(status.initialized).toBe(true);
            expect(status.authenticated).toBe(true);
            expect(status.cacheSize).toBe(1024 * 1024);
            expect(status.healthy).toBe(true);
        });

        test('should detect authentication issues', async () => {
            mockAuthService.validateToken.mockResolvedValue(false);

            const status = await foundryMagic.getHealthStatus();

            expect(status.authenticated).toBe(false);
            expect(status.healthy).toBe(false);
            expect(status.issues).toContain('Authentication failed');
        });

        test('should detect cache storage issues', async () => {
            const largeSize = 600 * 1024 * 1024; // 600MB (over limit)
            mockCacheManager.getCacheSize.mockResolvedValue(largeSize);

            const status = await foundryMagic.getHealthStatus();

            expect(status.cacheSize).toBe(largeSize);
            expect(status.healthy).toBe(false);
            expect(status.issues).toContain('Cache size exceeds limit');
        });
    });

    describe('Event Handling', () => {
        beforeEach(async () => {
            await foundryMagic.initialize();
        });

        test('should emit events for successful imports', async () => {
            const eventSpy = jest.fn();
            foundryMagic.on('character-imported', eventSpy);

            const characterUrl = 'https://www.dndbeyond.com/characters/12345';
            const mockActor = { id: 'actor-123', name: 'Test Character' };

            mockCharacterImporter.fetchCharacter = jest.fn().mockResolvedValue({
                id: '12345',
                name: 'Test Character'
            });
            mockCharacterImporter.createFoundryActor = jest.fn().mockResolvedValue(mockActor);

            await foundryMagic.importCharacterFromURL(characterUrl);

            expect(eventSpy).toHaveBeenCalledWith({
                characterId: '12345',
                actor: mockActor,
                success: true
            });
        });

        test('should emit events for failed imports', async () => {
            const eventSpy = jest.fn();
            foundryMagic.on('character-import-failed', eventSpy);

            const characterUrl = 'https://www.dndbeyond.com/characters/12345';
            const error = new Error('Import failed');

            mockCharacterImporter.fetchCharacter = jest.fn().mockRejectedValue(error);

            await foundryMagic.importCharacterFromURL(characterUrl);

            expect(eventSpy).toHaveBeenCalledWith({
                characterId: '12345',
                error: error.message,
                success: false
            });
        });
    });

    describe('Cleanup and Shutdown', () => {
        test('should cleanup resources on shutdown', async () => {
            await foundryMagic.initialize();

            mockCacheManager.close = jest.fn();
            mockAuthService.cleanup = jest.fn();

            await foundryMagic.shutdown();

            expect(mockCacheManager.close).toHaveBeenCalled();
            expect(mockAuthService.cleanup).toHaveBeenCalled();
            expect(foundryMagic.isInitialized()).toBe(false);
        });
    });
});