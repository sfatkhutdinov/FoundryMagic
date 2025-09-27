/**
 * @fileoverview Contract tests for Character Importer
 * Tests the character import interface defined in contracts/importers.contract.js
 * These tests define the expected behavior and must pass before implementation.
 */

import CharacterImporter from '../../src/importers/CharacterImporter.js';

describe('Character Importer Contract', () => {
    let characterImporter;
    let mockAuthService;
    let mockCacheManager;

    beforeEach(() => {
        mockAuthService = {
            getToken: jest.fn(),
            validateToken: jest.fn(),
            hasPremiumAccess: jest.fn()
        };

        mockCacheManager = {
            getCharacter: jest.fn(),
            setCharacter: jest.fn()
        };

        characterImporter = new CharacterImporter(mockAuthService, mockCacheManager);
        global.fetch.mockClear();
    });

    describe('Character Data Retrieval', () => {
        test('should fetch character data from D&D Beyond API', async () => {
            const characterId = '12345';
            const mockCharacterData = {
                id: characterId,
                name: 'Aragorn',
                level: 5,
                race: 'Human',
                classes: [{ name: 'Ranger', level: 5 }],
                hitPoints: { current: 45, max: 45 },
                abilities: {
                    strength: { score: 16, modifier: 3 },
                    dexterity: { score: 14, modifier: 2 }
                }
            };

            mockAuthService.getToken.mockReturnValue('cobalt_2_validtoken123');
            mockAuthService.validateToken.mockResolvedValue(true);
            mockCacheManager.getCharacter.mockResolvedValue(null); // Not in cache

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockCharacterData
            });

            const result = await characterImporter.fetchCharacter(characterId);

            expect(result).toEqual(mockCharacterData);
            expect(global.fetch).toHaveBeenCalledWith(
                `https://character-service.dndbeyond.com/character/v5/character/${characterId}`,
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer cobalt_2_validtoken123'
                    })
                })
            );
        });

        test('should use cached character data when available', async () => {
            const characterId = '12345';
            const cachedCharacter = {
                id: characterId,
                name: 'Cached Character',
                level: 3
            };

            mockCacheManager.getCharacter.mockResolvedValue(cachedCharacter);

            const result = await characterImporter.fetchCharacter(characterId);

            expect(result).toEqual(cachedCharacter);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(mockCacheManager.getCharacter).toHaveBeenCalledWith(characterId);
        });

        test('should handle authentication failures', async () => {
            const characterId = '12345';

            mockAuthService.getToken.mockReturnValue(null);

            await expect(characterImporter.fetchCharacter(characterId))
                .rejects.toThrow('Authentication required');
        });

        test('should handle API errors gracefully', async () => {
            const characterId = '12345';

            mockAuthService.getToken.mockReturnValue('cobalt_2_validtoken123');
            mockAuthService.validateToken.mockResolvedValue(true);
            mockCacheManager.getCharacter.mockResolvedValue(null);

            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            await expect(characterImporter.fetchCharacter(characterId))
                .rejects.toThrow('Character not found');
        });
    });

    describe('Data Transformation', () => {
        test('should transform D&D Beyond character to Foundry format', async () => {
            const ddbCharacter = {
                id: '12345',
                name: 'Test Character',
                race: { fullName: 'Hill Dwarf' },
                classes: [
                    { definition: { name: 'Fighter' }, level: 3 },
                    { definition: { name: 'Rogue' }, level: 2 }
                ],
                stats: [
                    { id: 1, value: 16 }, // Strength
                    { id: 2, value: 14 }, // Dexterity
                    { id: 3, value: 15 }, // Constitution
                    { id: 4, value: 10 }, // Intelligence
                    { id: 5, value: 12 }, // Wisdom
                    { id: 6, value: 8 }   // Charisma
                ],
                baseHitPoints: 28,
                hitPointInfo: { current: 28, maximum: 28 },
                background: { definition: { name: 'Soldier' } }
            };

            const expectedFoundryData = {
                name: 'Test Character',
                type: 'character',
                system: {
                    details: {
                        race: 'Hill Dwarf',
                        class: 'Fighter 3, Rogue 2',
                        level: { value: 5 },
                        background: 'Soldier',
                        xp: { value: 0 }
                    },
                    abilities: {
                        str: { value: 16, mod: 3 },
                        dex: { value: 14, mod: 2 },
                        con: { value: 15, mod: 2 },
                        int: { value: 10, mod: 0 },
                        wis: { value: 12, mod: 1 },
                        cha: { value: 8, mod: -1 }
                    },
                    attributes: {
                        hp: { value: 28, max: 28 }
                    }
                }
            };

            const result = characterImporter.transformToFoundryFormat(ddbCharacter);

            expect(result.name).toBe(expectedFoundryData.name);
            expect(result.type).toBe(expectedFoundryData.type);
            expect(result.system.details.race).toBe(expectedFoundryData.system.details.race);
            expect(result.system.abilities.str.value).toBe(expectedFoundryData.system.abilities.str.value);
        });

        test('should handle missing optional character data', async () => {
            const minimalDdbCharacter = {
                id: '12345',
                name: 'Minimal Character',
                stats: [
                    { id: 1, value: 10 }, { id: 2, value: 10 }, { id: 3, value: 10 },
                    { id: 4, value: 10 }, { id: 5, value: 10 }, { id: 6, value: 10 }
                ]
            };

            const result = characterImporter.transformToFoundryFormat(minimalDdbCharacter);

            expect(result.name).toBe('Minimal Character');
            expect(result.system.details.race).toBe('');
            expect(result.system.details.class).toBe('');
            expect(result.system.abilities.str.value).toBe(10);
        });
    });

    describe('Foundry Integration', () => {
        test('should create new actor in Foundry', async () => {
            const characterData = {
                name: 'New Character',
                type: 'character',
                system: { details: { level: { value: 1 } } }
            };

            const mockActor = {
                id: 'actor-123',
                name: 'New Character',
                update: jest.fn()
            };

            // Mock Foundry's Actor.create method
            global.CONFIG.Actor = {
                documentClass: class Actor {
                    static async create(data) {
                        return mockActor;
                    }
                }
            };

            const result = await characterImporter.createFoundryActor(characterData);

            expect(result).toBe(mockActor);
        });

        test('should update existing actor in Foundry', async () => {
            const characterData = {
                name: 'Updated Character',
                system: { details: { level: { value: 2 } } }
            };

            const existingActor = {
                id: 'actor-123',
                name: 'Old Name',
                update: jest.fn().mockResolvedValue(true)
            };

            const result = await characterImporter.updateFoundryActor(existingActor, characterData);

            expect(existingActor.update).toHaveBeenCalledWith(characterData);
            expect(result).toBe(true);
        });

        test('should handle actor creation failures', async () => {
            const characterData = {
                name: 'Failed Character',
                type: 'character'
            };

            global.CONFIG.Actor = {
                documentClass: class Actor {
                    static async create(data) {
                        throw new Error('Creation failed');
                    }
                }
            };

            await expect(characterImporter.createFoundryActor(characterData))
                .rejects.toThrow('Failed to create actor');
        });
    });

    describe('Equipment and Inventory', () => {
        test('should import character equipment', async () => {
            const ddbCharacter = {
                id: '12345',
                inventory: [
                    {
                        definition: {
                            name: 'Longsword',
                            type: 'Weapon',
                            damage: { diceString: '1d8' },
                            properties: [{ name: 'Versatile' }]
                        },
                        equipped: true,
                        quantity: 1
                    },
                    {
                        definition: {
                            name: 'Leather Armor',
                            type: 'Armor',
                            armorClass: 11
                        },
                        equipped: true,
                        quantity: 1
                    }
                ]
            };

            const items = characterImporter.extractEquipment(ddbCharacter);

            expect(items).toHaveLength(2);
            expect(items[0].name).toBe('Longsword');
            expect(items[0].system.equipped).toBe(true);
            expect(items[1].name).toBe('Leather Armor');
        });

        test('should handle empty inventory gracefully', async () => {
            const ddbCharacter = {
                id: '12345',
                inventory: []
            };

            const items = characterImporter.extractEquipment(ddbCharacter);

            expect(items).toHaveLength(0);
        });
    });

    describe('Spells and Features', () => {
        test('should import character spells', async () => {
            const ddbCharacter = {
                id: '12345',
                spells: {
                    class: [
                        {
                            definition: {
                                name: 'Magic Missile',
                                level: 1,
                                school: 'Evocation',
                                description: 'You create three glowing darts...'
                            },
                            prepared: true,
                            alwaysPrepared: false
                        }
                    ]
                }
            };

            const spells = characterImporter.extractSpells(ddbCharacter);

            expect(spells).toHaveLength(1);
            expect(spells[0].name).toBe('Magic Missile');
            expect(spells[0].system.prepared).toBe(true);
            expect(spells[0].system.level).toBe(1);
        });

        test('should import class features', async () => {
            const ddbCharacter = {
                id: '12345',
                classes: [
                    {
                        definition: { name: 'Fighter' },
                        level: 2,
                        classFeatures: [
                            {
                                definition: {
                                    name: 'Fighting Style',
                                    description: 'Choose a fighting style...'
                                }
                            },
                            {
                                definition: {
                                    name: 'Action Surge',
                                    description: 'You can push yourself beyond normal limits...'
                                }
                            }
                        ]
                    }
                ]
            };

            const features = characterImporter.extractFeatures(ddbCharacter);

            expect(features).toHaveLength(2);
            expect(features[0].name).toBe('Fighting Style');
            expect(features[1].name).toBe('Action Surge');
        });
    });

    describe('Premium Content Access', () => {
        test('should require premium access for premium characters', async () => {
            const characterId = '12345';

            mockAuthService.getToken.mockReturnValue('cobalt_2_validtoken123');
            mockAuthService.validateToken.mockResolvedValue(true);
            mockAuthService.hasPremiumAccess.mockResolvedValue(false);
            mockCacheManager.getCharacter.mockResolvedValue(null);

            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: async () => ({ error: 'Premium content requires subscription' })
            });

            await expect(characterImporter.fetchCharacter(characterId))
                .rejects.toThrow('Premium subscription required');
        });

        test('should allow premium users to access all content', async () => {
            const characterId = '12345';
            const premiumCharacter = {
                id: characterId,
                name: 'Premium Character',
                race: { fullName: 'Dragonborn' }, // Premium race
                classes: [{ definition: { name: 'Paladin' }, level: 5 }]
            };

            mockAuthService.getToken.mockReturnValue('cobalt_2_premiumtoken123');
            mockAuthService.validateToken.mockResolvedValue(true);
            mockAuthService.hasPremiumAccess.mockResolvedValue(true);
            mockCacheManager.getCharacter.mockResolvedValue(null);

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => premiumCharacter
            });

            const result = await characterImporter.fetchCharacter(characterId);

            expect(result).toEqual(premiumCharacter);
        });
    });

    describe('Error Recovery', () => {
        test('should retry failed requests with exponential backoff', async () => {
            const characterId = '12345';

            mockAuthService.getToken.mockReturnValue('cobalt_2_validtoken123');
            mockAuthService.validateToken.mockResolvedValue(true);
            mockCacheManager.getCharacter.mockResolvedValue(null);

            // Mock network failure followed by success
            global.fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: characterId, name: 'Recovered Character' })
                });

            const result = await characterImporter.fetchCharacter(characterId);

            expect(result.name).toBe('Recovered Character');
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        test('should fail after maximum retry attempts', async () => {
            const characterId = '12345';

            mockAuthService.getToken.mockReturnValue('cobalt_2_validtoken123');
            mockAuthService.validateToken.mockResolvedValue(true);
            mockCacheManager.getCharacter.mockResolvedValue(null);

            global.fetch.mockRejectedValue(new Error('Persistent network error'));

            await expect(characterImporter.fetchCharacter(characterId))
                .rejects.toThrow('Maximum retry attempts exceeded');
        });
    });
});