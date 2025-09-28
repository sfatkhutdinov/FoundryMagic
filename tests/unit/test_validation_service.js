/**
 * Unit Tests for Validation Service
 * @fileoverview Tests for content validation functionality
 */

import ValidationService from '../../src/utils/ValidationService.js';

describe('ValidationService', () => {
    let validator;

    beforeEach(() => {
        validator = new ValidationService();
    });

    describe('validateCharacter', () => {
        test('should validate complete character data', () => {
            const characterData = {
                name: 'Test Character',
                system: {
                    details: {
                        level: { value: 5 },
                        race: 'Human',
                        class: 'Fighter'
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
            };

            const result = validator.validateCharacter(characterData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
            expect(result.warnings).toEqual([]);
        });

        test('should reject character with missing name', () => {
            const characterData = {
                system: {
                    details: { level: { value: 5 } },
                    abilities: {},
                    attributes: {}
                }
            };

            const result = validator.validateCharacter(characterData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Character name is required');
        });

        test('should reject character with invalid level', () => {
            const characterData = {
                name: 'Test Character',
                system: {
                    details: { level: { value: 25 } }, // Invalid level
                    abilities: {},
                    attributes: {}
                }
            };

            const result = validator.validateCharacter(characterData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Character level must be between 1 and 20');
        });

        test('should reject character with invalid ability scores', () => {
            const characterData = {
                name: 'Test Character',
                system: {
                    details: { level: { value: 5 } },
                    abilities: {
                        str: { value: 25 }, // Invalid ability score
                        dex: { value: 2 }   // Invalid ability score
                    },
                    attributes: {}
                }
            };

            const result = validator.validateCharacter(characterData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('STR ability score (25) is outside valid range (1-20)');
            expect(result.errors).toContain('DEX ability score (2) is outside valid range (3-20)');
        });

        test('should generate warnings for unusual but valid data', () => {
            const characterData = {
                name: 'Test Character',
                system: {
                    details: {
                        level: { value: 20 }, // Max level
                        race: 'Human',
                        class: 'Fighter'
                    },
                    abilities: {
                        str: { value: 20 }, // Max ability score
                        dex: { value: 3 }   // Min ability score
                    },
                    attributes: {
                        hp: { value: 1, max: 300 } // Very high HP
                    }
                }
            };

            const result = validator.validateCharacter(characterData);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Character has maximum level (20)');
            expect(result.warnings).toContain('DEX ability score (3) is very low');
            expect(result.warnings).toContain('Character has very high HP (300) for their level');
        });
    });

    describe('validateMonster', () => {
        test('should validate complete monster data', () => {
            const monsterData = {
                name: 'Goblin',
                system: {
                    details: {
                        cr: 0.25,
                        type: { value: 'humanoid' }
                    },
                    traits: {
                        size: 'sm'
                    },
                    attributes: {
                        hp: { value: 7, max: 7 },
                        ac: { flat: 15 }
                    },
                    abilities: {
                        str: { value: 8 },
                        dex: { value: 14 },
                        con: { value: 10 },
                        int: { value: 10 },
                        wis: { value: 8 },
                        cha: { value: 8 }
                    }
                }
            };

            const result = validator.validateMonster(monsterData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should reject monster with invalid CR', () => {
            const monsterData = {
                name: 'Invalid Monster',
                system: {
                    details: {
                        cr: 35, // Invalid CR
                        type: { value: 'humanoid' }
                    }
                }
            };

            const result = validator.validateMonster(monsterData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Challenge Rating (35) is outside valid range (0-30)');
        });

        test('should reject monster with missing name', () => {
            const monsterData = {
                system: {
                    details: { cr: 1 }
                }
            };

            const result = validator.validateMonster(monsterData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Monster name is required');
        });
    });

    describe('validateSpell', () => {
        test('should validate complete spell data', () => {
            const spellData = {
                name: 'Fireball',
                system: {
                    level: 3,
                    school: 'evo',
                    description: { value: 'A bright streak flashes...' }
                }
            };

            const result = validator.validateSpell(spellData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should reject spell with invalid level', () => {
            const spellData = {
                name: 'Invalid Spell',
                system: {
                    level: 10, // Invalid spell level
                    school: 'evo'
                }
            };

            const result = validator.validateSpell(spellData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Spell level (10) is outside valid range (0-9)');
        });

        test('should reject spell with missing description', () => {
            const spellData = {
                name: 'Incomplete Spell',
                system: {
                    level: 3,
                    school: 'evo'
                }
            };

            const result = validator.validateSpell(spellData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Spell description is required');
        });
    });

    describe('validateItem', () => {
        test('should validate complete item data', () => {
            const itemData = {
                name: 'Longsword',
                system: {
                    quantity: 1,
                    weight: 3,
                    price: { value: 15, denomination: 'gp' },
                    rarity: 'common'
                }
            };

            const result = validator.validateItem(itemData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should reject item with negative quantity', () => {
            const itemData = {
                name: 'Invalid Item',
                system: {
                    quantity: -1 // Invalid quantity
                }
            };

            const result = validator.validateItem(itemData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Item quantity cannot be negative');
        });

        test('should reject item with negative weight', () => {
            const itemData = {
                name: 'Invalid Item',
                system: {
                    quantity: 1,
                    weight: -5 // Invalid weight
                }
            };

            const result = validator.validateItem(itemData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Item weight cannot be negative');
        });
    });

    describe('validateAdventure', () => {
        test('should validate complete adventure data', () => {
            const adventureData = {
                title: 'Test Adventure',
                description: 'A thrilling adventure',
                scenes: [
                    {
                        name: 'Test Scene',
                        gridSize: { width: 20, height: 20 }
                    }
                ]
            };

            const result = validator.validateAdventure(adventureData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should reject adventure without title', () => {
            const adventureData = {
                description: 'A thrilling adventure'
            };

            const result = validator.validateAdventure(adventureData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Adventure title is required');
        });

        test('should validate scenes within adventure', () => {
            const adventureData = {
                title: 'Test Adventure',
                description: 'A thrilling adventure',
                scenes: [
                    {
                        // Missing name
                        gridSize: { width: -5, height: 20 } // Invalid grid size
                    }
                ]
            };

            const result = validator.validateAdventure(adventureData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Scene name is required');
            expect(result.errors).toContain('Scene grid width must be positive');
        });
    });

    describe('utility methods', () => {
        describe('isValidAbilityScore', () => {
            test('should validate ability scores correctly', () => {
                expect(validator.isValidAbilityScore(1)).toBe(true);
                expect(validator.isValidAbilityScore(10)).toBe(true);
                expect(validator.isValidAbilityScore(20)).toBe(true);
                expect(validator.isValidAbilityScore(0)).toBe(false);
                expect(validator.isValidAbilityScore(21)).toBe(false);
                expect(validator.isValidAbilityScore(-5)).toBe(false);
            });
        });

        describe('isValidCharacterLevel', () => {
            test('should validate character levels correctly', () => {
                expect(validator.isValidCharacterLevel(1)).toBe(true);
                expect(validator.isValidCharacterLevel(10)).toBe(true);
                expect(validator.isValidCharacterLevel(20)).toBe(true);
                expect(validator.isValidCharacterLevel(0)).toBe(false);
                expect(validator.isValidCharacterLevel(21)).toBe(false);
                expect(validator.isValidCharacterLevel(-1)).toBe(false);
            });
        });

        describe('isValidSpellLevel', () => {
            test('should validate spell levels correctly', () => {
                expect(validator.isValidSpellLevel(0)).toBe(true); // Cantrips
                expect(validator.isValidSpellLevel(5)).toBe(true);
                expect(validator.isValidSpellLevel(9)).toBe(true);
                expect(validator.isValidSpellLevel(-1)).toBe(false);
                expect(validator.isValidSpellLevel(10)).toBe(false);
            });
        });

        describe('isValidChallengeRating', () => {
            test('should validate challenge ratings correctly', () => {
                expect(validator.isValidChallengeRating(0)).toBe(true);
                expect(validator.isValidChallengeRating(0.125)).toBe(true);
                expect(validator.isValidChallengeRating(0.25)).toBe(true);
                expect(validator.isValidChallengeRating(0.5)).toBe(true);
                expect(validator.isValidChallengeRating(1)).toBe(true);
                expect(validator.isValidChallengeRating(30)).toBe(true);
                expect(validator.isValidChallengeRating(-1)).toBe(false);
                expect(validator.isValidChallengeRating(31)).toBe(false);
                expect(validator.isValidChallengeRating(0.3)).toBe(false); // Invalid fractional CR
            });
        });

        describe('isValidRarity', () => {
            test('should validate item rarities correctly', () => {
                const validRarities = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];

                validRarities.forEach(rarity => {
                    expect(validator.isValidRarity(rarity)).toBe(true);
                });

                expect(validator.isValidRarity('invalid')).toBe(false);
                expect(validator.isValidRarity('')).toBe(false);
            });
        });
    });

    describe('batch validation', () => {
        test('should validate multiple items at once', () => {
            const items = [
                {
                    name: 'Valid Character',
                    type: 'character',
                    data: {
                        name: 'Test Character',
                        system: {
                            details: { level: { value: 5 } },
                            abilities: {},
                            attributes: {}
                        }
                    }
                },
                {
                    name: 'Invalid Character',
                    type: 'character',
                    data: {
                        system: {
                            details: { level: { value: 25 } }, // Invalid
                            abilities: {},
                            attributes: {}
                        }
                    }
                }
            ];

            const results = validator.validateBatch(items);

            expect(results).toHaveLength(2);
            expect(results[0].isValid).toBe(true);
            expect(results[1].isValid).toBe(false);
            expect(results[1].errors).toContain('Character name is required');
            expect(results[1].errors).toContain('Character level must be between 1 and 20');
        });
    });
});