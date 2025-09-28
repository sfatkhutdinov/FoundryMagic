/**
 * Unit Tests for Data Transformers
 * @fileoverview Tests for D&D Beyond to Foundry VTT data transformation utilities
 */

import DataTransformer from '../../src/utils/DataTransformer.js';

describe('DataTransformer', () => {
    let transformer;

    beforeEach(() => {
        transformer = new DataTransformer();
    });

    describe('transformCharacter', () => {
        test('should transform D&D Beyond character to Foundry format', () => {
            const ddbCharacter = {
                name: 'Test Character',
                race: {
                    fullName: 'Hill Dwarf'
                },
                classes: [
                    {
                        definition: { name: 'Fighter' },
                        level: 5
                    }
                ],
                stats: [
                    { id: 1, value: 16 }, // STR
                    { id: 2, value: 14 }, // DEX
                    { id: 3, value: 15 }, // CON
                    { id: 4, value: 10 }, // INT
                    { id: 5, value: 12 }, // WIS
                    { id: 6, value: 8 }   // CHA
                ],
                baseHitPoints: 42,
                hitPointInfo: {
                    current: 38,
                    maximum: 42
                }
            };

            const result = transformer.transformCharacter(ddbCharacter);

            expect(result).toEqual({
                name: 'Test Character',
                type: 'character',
                system: {
                    details: {
                        race: 'Hill Dwarf',
                        class: 'Fighter 5',
                        level: { value: 5 },
                        background: '',
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
                        hp: {
                            value: 38,
                            max: 42
                        }
                    }
                }
            });
        });

        test('should handle multiclass characters', () => {
            const ddbCharacter = {
                name: 'Multiclass Character',
                classes: [
                    {
                        definition: { name: 'Fighter' },
                        level: 3
                    },
                    {
                        definition: { name: 'Rogue' },
                        level: 2
                    }
                ],
                stats: []
            };

            const result = transformer.transformCharacter(ddbCharacter);

            expect(result.system.details.class).toBe('Fighter 3, Rogue 2');
            expect(result.system.details.level.value).toBe(5);
        });

        test('should handle missing data gracefully', () => {
            const ddbCharacter = {
                name: 'Minimal Character'
            };

            const result = transformer.transformCharacter(ddbCharacter);

            expect(result.name).toBe('Minimal Character');
            expect(result.system.details.race).toBe('');
            expect(result.system.details.class).toBe('');
            expect(result.system.details.level.value).toBe(1);
        });
    });

    describe('transformMonster', () => {
        test('should transform D&D Beyond monster to Foundry format', () => {
            const ddbMonster = {
                name: 'Goblin',
                type: 'humanoid',
                size: 'Small',
                hitPoints: {
                    current: 7,
                    maximum: 7,
                    hitDice: '2d6'
                },
                armorClass: [
                    { value: 15, type: 'Leather Armor, Shield' }
                ],
                speed: {
                    walk: 30
                },
                stats: [
                    { id: 1, value: 8 },  // STR
                    { id: 2, value: 14 }, // DEX
                    { id: 3, value: 10 }, // CON
                    { id: 4, value: 10 }, // INT
                    { id: 5, value: 8 },  // WIS
                    { id: 6, value: 8 }   // CHA
                ],
                challengeRating: 0.25,
                actions: [
                    {
                        name: 'Scimitar',
                        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.'
                    }
                ]
            };

            const result = transformer.transformMonster(ddbMonster);

            expect(result).toEqual({
                name: 'Goblin',
                type: 'npc',
                system: {
                    details: {
                        type: {
                            value: 'humanoid',
                            subtype: ''
                        },
                        cr: 0.25,
                        xp: { value: 50 }
                    },
                    traits: {
                        size: 'sm'
                    },
                    attributes: {
                        hp: {
                            value: 7,
                            max: 7,
                            formula: '2d6'
                        },
                        ac: {
                            flat: 15,
                            calc: 'default'
                        },
                        movement: {
                            walk: 30
                        }
                    },
                    abilities: {
                        str: { value: 8, mod: -1 },
                        dex: { value: 14, mod: 2 },
                        con: { value: 10, mod: 0 },
                        int: { value: 10, mod: 0 },
                        wis: { value: 8, mod: -1 },
                        cha: { value: 8, mod: -1 }
                    }
                }
            });
        });

        test('should handle different size categories', () => {
            const testCases = [
                { input: 'Tiny', expected: 'tiny' },
                { input: 'Small', expected: 'sm' },
                { input: 'Medium', expected: 'med' },
                { input: 'Large', expected: 'lg' },
                { input: 'Huge', expected: 'huge' },
                { input: 'Gargantuan', expected: 'grg' }
            ];

            testCases.forEach(({ input, expected }) => {
                const ddbMonster = {
                    name: 'Test Monster',
                    size: input
                };

                const result = transformer.transformMonster(ddbMonster);
                expect(result.system.traits.size).toBe(expected);
            });
        });
    });

    describe('transformSpell', () => {
        test('should transform D&D Beyond spell to Foundry format', () => {
            const ddbSpell = {
                name: 'Fireball',
                level: 3,
                school: {
                    name: 'Evocation'
                },
                castingTime: '1 action',
                range: {
                    origin: 'ranged',
                    value: 150,
                    units: 'feet'
                },
                duration: {
                    type: 'instantaneous'
                },
                components: {
                    verbal: true,
                    somatic: true,
                    material: true,
                    materialDescription: 'a tiny ball of bat guano and sulfur'
                },
                description: 'A bright streak flashes from your pointing finger...',
                damage: {
                    parts: [['8d6', 'fire']],
                    versatile: '',
                    value: ''
                },
                save: {
                    ability: 'dex',
                    dc: null,
                    scaling: 'spell'
                }
            };

            const result = transformer.transformSpell(ddbSpell);

            expect(result).toEqual({
                name: 'Fireball',
                type: 'spell',
                system: {
                    description: {
                        value: 'A bright streak flashes from your pointing finger...'
                    },
                    level: 3,
                    school: 'evo',
                    components: {
                        vocal: true,
                        somatic: true,
                        material: true,
                        value: 'a tiny ball of bat guano and sulfur'
                    },
                    duration: {
                        value: null,
                        units: 'inst'
                    },
                    range: {
                        value: 150,
                        long: null,
                        units: 'ft'
                    },
                    target: {
                        value: null,
                        width: null,
                        units: '',
                        type: ''
                    },
                    activation: {
                        type: 'action',
                        cost: 1
                    },
                    damage: {
                        parts: [['8d6', 'fire']],
                        versatile: ''
                    },
                    save: {
                        ability: 'dex',
                        dc: null,
                        scaling: 'spell'
                    }
                }
            });
        });

        test('should convert school names to abbreviations', () => {
            const testCases = [
                { input: 'Abjuration', expected: 'abj' },
                { input: 'Conjuration', expected: 'con' },
                { input: 'Divination', expected: 'div' },
                { input: 'Enchantment', expected: 'enc' },
                { input: 'Evocation', expected: 'evo' },
                { input: 'Illusion', expected: 'ill' },
                { input: 'Necromancy', expected: 'nec' },
                { input: 'Transmutation', expected: 'trs' }
            ];

            testCases.forEach(({ input, expected }) => {
                const ddbSpell = {
                    name: 'Test Spell',
                    school: { name: input }
                };

                const result = transformer.transformSpell(ddbSpell);
                expect(result.system.school).toBe(expected);
            });
        });
    });

    describe('transformItem', () => {
        test('should transform D&D Beyond item to Foundry format', () => {
            const ddbItem = {
                definition: {
                    name: 'Longsword',
                    type: 'Weapon',
                    rarity: 'Common',
                    weight: 3,
                    cost: {
                        quantity: 15,
                        unit: 'gp'
                    },
                    description: 'A versatile martial weapon',
                    damage: {
                        diceCount: 1,
                        diceValue: 8,
                        diceMultiplier: null,
                        fixedValue: null,
                        diceString: '1d8'
                    },
                    properties: [
                        {
                            name: 'Versatile',
                            description: 'This weapon can be used with one or two hands.'
                        }
                    ]
                },
                equipped: true,
                quantity: 1
            };

            const result = transformer.transformItem(ddbItem);

            expect(result).toEqual({
                name: 'Longsword',
                type: 'weapon',
                system: {
                    description: {
                        value: 'A versatile martial weapon'
                    },
                    quantity: 1,
                    weight: 3,
                    price: {
                        value: 15,
                        denomination: 'gp'
                    },
                    rarity: 'common',
                    equipped: true,
                    proficient: 1,
                    damage: {
                        parts: [['1d8[slashing] + @mod', 'slashing']],
                        versatile: '1d10[slashing] + @mod'
                    },
                    weaponType: 'martialM',
                    properties: {
                        ver: true,
                        mgc: false
                    }
                }
            });
        });

        test('should handle armor items', () => {
            const ddbArmor = {
                definition: {
                    name: 'Chain Mail',
                    type: 'Armor',
                    rarity: 'Common',
                    armorClass: 16,
                    armorTypeId: 3, // Heavy armor
                    stealthDisadvantage: true
                },
                equipped: true,
                quantity: 1
            };

            const result = transformer.transformItem(ddbArmor);

            expect(result.type).toBe('equipment');
            expect(result.system.armor.value).toBe(16);
            expect(result.system.stealth).toBe(true); // disadvantage
        });
    });

    describe('utility methods', () => {
        describe('calculateAbilityModifier', () => {
            test('should calculate ability modifiers correctly', () => {
                expect(transformer.calculateAbilityModifier(10)).toBe(0);
                expect(transformer.calculateAbilityModifier(8)).toBe(-1);
                expect(transformer.calculateAbilityModifier(16)).toBe(3);
                expect(transformer.calculateAbilityModifier(20)).toBe(5);
                expect(transformer.calculateAbilityModifier(1)).toBe(-5);
            });
        });

        describe('convertSize', () => {
            test('should convert size strings to abbreviations', () => {
                expect(transformer.convertSize('Tiny')).toBe('tiny');
                expect(transformer.convertSize('Small')).toBe('sm');
                expect(transformer.convertSize('Medium')).toBe('med');
                expect(transformer.convertSize('Large')).toBe('lg');
                expect(transformer.convertSize('Huge')).toBe('huge');
                expect(transformer.convertSize('Gargantuan')).toBe('grg');
                expect(transformer.convertSize('Unknown')).toBe('med'); // default
            });
        });

        describe('convertSchool', () => {
            test('should convert school names to abbreviations', () => {
                expect(transformer.convertSchool('Abjuration')).toBe('abj');
                expect(transformer.convertSchool('Conjuration')).toBe('con');
                expect(transformer.convertSchool('Unknown')).toBe('evo'); // default
            });
        });

        describe('extractChallengeRating', () => {
            test('should convert CR to XP values', () => {
                expect(transformer.extractChallengeRating(0)).toBe({ cr: 0, xp: 10 });
                expect(transformer.extractChallengeRating(0.125)).toBe({ cr: 0.125, xp: 25 });
                expect(transformer.extractChallengeRating(0.25)).toBe({ cr: 0.25, xp: 50 });
                expect(transformer.extractChallengeRating(1)).toBe({ cr: 1, xp: 200 });
                expect(transformer.extractChallengeRating(30)).toBe({ cr: 30, xp: 155000 });
            });
        });
    });
});