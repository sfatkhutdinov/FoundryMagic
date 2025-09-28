/**
 * @fileoverview D&D Beyond to Foundry data transformers for FoundryMagic
 * @description Transforms D&D Beyond API data into Foundry VTT compatible formats
 * for characters, monsters, spells, items, and other game content.
 */

import { ErrorHandler } from './ErrorHandler.js';
import { notificationService, NOTIFICATION_TYPES } from './NotificationService.js';

/**
 * Content types that can be transformed
 * @enum {string}
 */
export const CONTENT_TYPES = {
    CHARACTER: 'character',
    MONSTER: 'monster',
    SPELL: 'spell',
    ITEM: 'item',
    FEAT: 'feat',
    CLASS: 'class',
    RACE: 'race',
    BACKGROUND: 'background'
};

/**
 * Transformation result status
 * @enum {string}
 */
export const TRANSFORM_STATUS = {
    SUCCESS: 'success',
    PARTIAL: 'partial',
    FAILED: 'failed',
    SKIPPED: 'skipped'
};

/**
 * D&D Beyond to Foundry data transformer
 * Handles conversion of D&D Beyond content to Foundry VTT format
 * with support for different content types and transformation pipelines.
 */
export class DataTransformer {
    /**
     * Creates a new DataTransformer instance
     */
    constructor() {
        this._transformers = new Map();
        this._validationRules = new Map();
        this._transformationStats = {
            total: 0,
            successful: 0,
            partial: 0,
            failed: 0,
            skipped: 0
        };

        this._initializeTransformers();
        this._initializeValidationRules();
    }

    /**
     * Transform D&D Beyond data to Foundry format
     * @param {Object} sourceData - D&D Beyond source data
     * @param {string} contentType - Type of content being transformed
     * @param {Object} options - Transformation options
     * @param {boolean} options.validate - Whether to validate input/output
     * @param {boolean} options.strict - Whether to fail on validation errors
     * @param {Object} options.context - Additional context for transformation
     * @returns {Promise<Object>} Transformation result
     */
    async transform(sourceData, contentType, options = {}) {
        try {
            this._transformationStats.total++;

            // Validate input if requested
            if (options.validate) {
                const validationResult = this._validateInput(sourceData, contentType);
                if (!validationResult.valid) {
                    if (options.strict) {
                        throw new Error(`Input validation failed: ${validationResult.errors.join(', ')}`);
                    }
                    notificationService.notify(
                        NOTIFICATION_TYPES.WARNING,
                        `Input validation warnings for ${contentType}: ${validationResult.errors.join(', ')}`
                    );
                }
            }

            // Get transformer for content type
            const transformer = this._transformers.get(contentType);
            if (!transformer) {
                throw new Error(`No transformer available for content type: ${contentType}`);
            }

            // Apply transformation
            const result = await transformer(sourceData, options);

            // Validate output if requested
            if (options.validate && result.data) {
                const outputValidation = this._validateOutput(result.data, contentType);
                if (!outputValidation.valid) {
                    result.status = TRANSFORM_STATUS.PARTIAL;
                    result.warnings = outputValidation.errors;
                    this._transformationStats.partial++;
                } else {
                    result.status = TRANSFORM_STATUS.SUCCESS;
                    this._transformationStats.successful++;
                }
            } else {
                result.status = TRANSFORM_STATUS.SUCCESS;
                this._transformationStats.successful++;
            }

            return result;

        } catch (error) {
            this._transformationStats.failed++;
            ErrorHandler.handleError(error, 'DataTransformer.transform', {
                contentType,
                sourceDataKeys: Object.keys(sourceData || {})
            });

            return {
                status: TRANSFORM_STATUS.FAILED,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Transform multiple items in batch
     * @param {Array} items - Array of source data items
     * @param {string} contentType - Type of content being transformed
     * @param {Object} options - Batch transformation options
     * @returns {Promise<Array>} Array of transformation results
     */
    async transformBatch(items, contentType, options = {}) {
        const { concurrency = 3, onProgress } = options;
        const results = [];

        // Process in batches to control concurrency
        for (let i = 0; i < items.length; i += concurrency) {
            const batch = items.slice(i, i + concurrency);
            const batchPromises = batch.map(item =>
                this.transform(item, contentType, options)
            );

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Report progress
            if (onProgress) {
                onProgress(results.length, items.length);
            }
        }

        return results;
    }

    /**
     * Get transformation statistics
     * @returns {Object} Transformation statistics
     */
    getStats() {
        return { ...this._transformationStats };
    }

    /**
     * Reset transformation statistics
     */
    resetStats() {
        this._transformationStats = {
            total: 0,
            successful: 0,
            partial: 0,
            failed: 0,
            skipped: 0
        };
    }

    /**
     * Register a custom transformer for a content type
     * @param {string} contentType - Content type to register for
     * @param {Function} transformer - Transformer function
     */
    registerTransformer(contentType, transformer) {
        this._transformers.set(contentType, transformer);
    }

    /**
     * Initialize built-in transformers
     * @private
     */
    _initializeTransformers() {
        // Character transformer
        this._transformers.set(CONTENT_TYPES.CHARACTER, this._transformCharacter.bind(this));

        // Monster transformer
        this._transformers.set(CONTENT_TYPES.MONSTER, this._transformMonster.bind(this));

        // Spell transformer
        this._transformers.set(CONTENT_TYPES.SPELL, this._transformSpell.bind(this));

        // Item transformer
        this._transformers.set(CONTENT_TYPES.ITEM, this._transformItem.bind(this));

        // Feat transformer
        this._transformers.set(CONTENT_TYPES.FEAT, this._transformFeat.bind(this));

        // Class transformer
        this._transformers.set(CONTENT_TYPES.CLASS, this._transformClass.bind(this));

        // Race transformer
        this._transformers.set(CONTENT_TYPES.RACE, this._transformRace.bind(this));

        // Background transformer
        this._transformers.set(CONTENT_TYPES.BACKGROUND, this._transformBackground.bind(this));
    }

    /**
     * Transform character data
     * @param {Object} sourceData - D&D Beyond character data
     * @param {Object} options - Transformation options
     * @returns {Promise<Object>} Transformed character data
     * @private
     */
    async _transformCharacter(sourceData, options) {
        const character = {
            name: sourceData.name,
            type: 'character',
            data: {},
            flags: {
                'foundry-magic': {
                    source: 'dndbeyond',
                    sourceId: sourceData.id
                }
            }
        };

        // Basic character data
        character.data = {
            abilities: this._transformAbilities(sourceData.stats),
            attributes: {
                hp: {
                    value: sourceData.hitPoints?.current || sourceData.hitPoints?.maximum || 0,
                    max: sourceData.hitPoints?.maximum || 0,
                    temp: sourceData.hitPoints?.temporary || 0
                },
                ac: {
                    value: sourceData.armorClass || 10
                },
                speed: {
                    value: sourceData.speed?.walking || 30,
                    special: sourceData.speed?.special || ''
                },
                initiative: {
                    mod: sourceData.initiative?.modifier || 0
                }
            },
            details: {
                level: sourceData.level || 1,
                race: sourceData.race?.name || '',
                background: sourceData.background?.name || '',
                alignment: sourceData.alignment || '',
                experience: {
                    value: sourceData.experience || 0
                }
            },
            traits: {
                size: this._mapSize(sourceData.size),
                languages: {
                    value: sourceData.languages?.map(l => l.name) || []
                },
                di: {
                    value: sourceData.damageImmunities?.map(i => i.name.toLowerCase()) || []
                },
                dr: {
                    value: sourceData.damageResistances?.map(r => r.name.toLowerCase()) || []
                },
                dv: {
                    value: sourceData.damageVulnerabilities?.map(v => v.name.toLowerCase()) || []
                },
                ci: {
                    value: sourceData.conditionImmunities?.map(c => c.name.toLowerCase()) || []
                }
            },
            currency: this._transformCurrency(sourceData.currency),
            skills: this._transformSkills(sourceData.skills),
            spells: await this._transformCharacterSpells(sourceData.spells)
        };

        // Add classes
        if (sourceData.classes) {
            character.data.classes = sourceData.classes.map(cls => ({
                name: cls.name,
                level: cls.level,
                subclass: cls.subclass?.name || ''
            }));
        }

        // Add equipment
        if (sourceData.equipment) {
            character.items = await this.transformBatch(
                sourceData.equipment,
                CONTENT_TYPES.ITEM,
                { validate: false }
            ).then(results => results.filter(r => r.status === TRANSFORM_STATUS.SUCCESS).map(r => r.data));
        }

        return { data: character };
    }

    /**
     * Transform monster data
     * @param {Object} sourceData - D&D Beyond monster data
     * @param {Object} options - Transformation options
     * @returns {Promise<Object>} Transformed monster data
     * @private
     */
    async _transformMonster(sourceData, options) {
        const monster = {
            name: sourceData.name,
            type: 'npc',
            data: {},
            flags: {
                'foundry-magic': {
                    source: 'dndbeyond',
                    sourceId: sourceData.id
                }
            }
        };

        monster.data = {
            abilities: this._transformAbilities(sourceData.stats),
            attributes: {
                hp: {
                    value: sourceData.hitPoints?.average || sourceData.hitPoints?.maximum || 0,
                    max: sourceData.hitPoints?.maximum || 0,
                    formula: sourceData.hitPoints?.formula || ''
                },
                ac: {
                    value: sourceData.armorClass || 10,
                    type: sourceData.armorClass?.type || ''
                },
                speed: {
                    value: sourceData.speed?.walking || 30,
                    burrow: sourceData.speed?.burrow || 0,
                    climb: sourceData.speed?.climb || 0,
                    fly: sourceData.speed?.fly || 0,
                    swim: sourceData.speed?.swim || 0
                }
            },
            details: {
                type: {
                    value: sourceData.type || '',
                    subtype: sourceData.subtype || ''
                },
                alignment: sourceData.alignment || '',
                cr: sourceData.challengeRating || 0,
                xp: {
                    value: sourceData.experiencePoints || 0
                }
            },
            traits: {
                size: this._mapSize(sourceData.size),
                languages: {
                    value: sourceData.languages?.map(l => l.name) || []
                },
                senses: {
                    value: sourceData.senses?.map(s => s.name) || []
                }
            }
        };

        // Add actions
        if (sourceData.actions) {
            monster.items = monster.items || [];
            sourceData.actions.forEach(action => {
                monster.items.push({
                    name: action.name,
                    type: 'feat',
                    data: {
                        description: {
                            value: action.description || ''
                        },
                        activation: {
                            type: action.activation?.type || 'action',
                            cost: action.activation?.cost || 1
                        },
                        attackBonus: action.attackBonus || 0,
                        damage: action.damage ? {
                            parts: [[action.damage.dice, action.damage.type]]
                        } : {}
                    }
                });
            });
        }

        return { data: monster };
    }

    /**
     * Transform spell data
     * @param {Object} sourceData - D&D Beyond spell data
     * @param {Object} options - Transformation options
     * @returns {Promise<Object>} Transformed spell data
     * @private
     */
    async _transformSpell(sourceData, options) {
        const spell = {
            name: sourceData.name,
            type: 'spell',
            data: {},
            flags: {
                'foundry-magic': {
                    source: 'dndbeyond',
                    sourceId: sourceData.id
                }
            }
        };

        spell.data = {
            description: {
                value: sourceData.description || ''
            },
            level: sourceData.level || 0,
            school: sourceData.school?.name?.toLowerCase() || '',
            components: {
                vocal: sourceData.components?.includes('verbal') || false,
                somatic: sourceData.components?.includes('somatic') || false,
                material: sourceData.components?.includes('material') || false,
                value: sourceData.materialComponent || ''
            },
            materials: {
                value: sourceData.materialComponent || ''
            },
            ritual: sourceData.ritual || false,
            concentration: sourceData.concentration || false,
            castingTime: {
                value: sourceData.castingTime || '',
                type: sourceData.castingTime?.includes('reaction') ? 'reaction' :
                    sourceData.castingTime?.includes('bonus') ? 'bonus' :
                        sourceData.castingTime?.includes('action') ? 'action' : 'timed'
            },
            duration: {
                value: sourceData.duration || '',
                units: this._parseDurationUnits(sourceData.duration)
            },
            range: {
                value: sourceData.range || '',
                long: sourceData.range?.long || null,
                units: this._parseRangeUnits(sourceData.range)
            },
            target: {
                value: sourceData.target || '',
                type: sourceData.target?.type || ''
            },
            damage: sourceData.damage ? {
                parts: sourceData.damage.parts || [],
                versatile: sourceData.damage.versatile || ''
            } : {},
            scaling: sourceData.scaling || {}
        };

        return { data: spell };
    }

    /**
     * Transform item data
     * @param {Object} sourceData - D&D Beyond item data
     * @param {Object} options - Transformation options
     * @returns {Promise<Object>} Transformed item data
     * @private
     */
    async _transformItem(sourceData, options) {
        const item = {
            name: sourceData.name,
            type: this._mapItemType(sourceData.type),
            data: {},
            flags: {
                'foundry-magic': {
                    source: 'dndbeyond',
                    sourceId: sourceData.id
                }
            }
        };

        item.data = {
            description: {
                value: sourceData.description || ''
            },
            weight: sourceData.weight || 0,
            quantity: sourceData.quantity || 1,
            price: sourceData.cost || 0,
            rarity: sourceData.rarity || '',
            identified: true
        };

        // Add armor data for armor items
        if (sourceData.type === 'armor') {
            item.data.armor = {
                value: sourceData.armorClass || 0,
                type: sourceData.armorType || '',
                dex: sourceData.maxDexBonus || null
            };
        }

        // Add weapon data for weapon items
        if (sourceData.type === 'weapon') {
            item.data.weaponType = sourceData.weaponType || '';
            item.data.damage = sourceData.damage ? {
                parts: [[sourceData.damage.dice, sourceData.damage.type]]
            } : {};
            item.data.attackBonus = sourceData.attackBonus || 0;
        }

        return { data: item };
    }

    /**
     * Transform feat data
     * @param {Object} sourceData - D&D Beyond feat data
     * @param {Object} options - Transformation options
     * @returns {Promise<Object>} Transformed feat data
     * @private
     */
    async _transformFeat(sourceData, options) {
        const feat = {
            name: sourceData.name,
            type: 'feat',
            data: {
                description: {
                    value: sourceData.description || ''
                },
                requirements: sourceData.prerequisites || '',
                type: {
                    value: 'feat'
                }
            },
            flags: {
                'foundry-magic': {
                    source: 'dndbeyond',
                    sourceId: sourceData.id
                }
            }
        };

        return { data: feat };
    }

    /**
     * Transform class data
     * @param {Object} sourceData - D&D Beyond class data
     * @param {Object} options - Transformation options
     * @returns {Promise<Object>} Transformed class data
     * @private
     */
    async _transformClass(sourceData, options) {
        const classItem = {
            name: sourceData.name,
            type: 'class',
            data: {
                description: {
                    value: sourceData.description || ''
                },
                levels: sourceData.levels || 20,
                hitDie: sourceData.hitDie || 'd8',
                saves: sourceData.savingThrows || []
            },
            flags: {
                'foundry-magic': {
                    source: 'dndbeyond',
                    sourceId: sourceData.id
                }
            }
        };

        return { data: classItem };
    }

    /**
     * Transform race data
     * @param {Object} sourceData - D&D Beyond race data
     * @param {Object} options - Transformation options
     * @returns {Promise<Object>} Transformed race data
     * @private
     */
    async _transformRace(sourceData, options) {
        const race = {
            name: sourceData.name,
            type: 'race',
            data: {
                description: {
                    value: sourceData.description || ''
                },
                ability: sourceData.abilityBonuses || [],
                size: this._mapSize(sourceData.size),
                speed: sourceData.speed || 30,
                languages: sourceData.languages || []
            },
            flags: {
                'foundry-magic': {
                    source: 'dndbeyond',
                    sourceId: sourceData.id
                }
            }
        };

        return { data: race };
    }

    /**
     * Transform background data
     * @param {Object} sourceData - D&D Beyond background data
     * @param {Object} options - Transformation options
     * @returns {Promise<Object>} Transformed background data
     * @private
     */
    async _transformBackground(sourceData, options) {
        const background = {
            name: sourceData.name,
            type: 'background',
            data: {
                description: {
                    value: sourceData.description || ''
                },
                skillProficiencies: sourceData.skillProficiencies || [],
                toolProficiencies: sourceData.toolProficiencies || [],
                languages: sourceData.languages || [],
                equipment: sourceData.equipment || [],
                feature: sourceData.feature || ''
            },
            flags: {
                'foundry-magic': {
                    source: 'dndbeyond',
                    sourceId: sourceData.id
                }
            }
        };

        return { data: background };
    }

    /**
     * Transform ability scores
     * @param {Object} stats - D&D Beyond stats object
     * @returns {Object} Foundry ability scores
     * @private
     */
    _transformAbilities(stats) {
        if (!stats) return {};

        return {
            str: { value: stats.strength || 10, mod: Math.floor((stats.strength - 10) / 2) },
            dex: { value: stats.dexterity || 10, mod: Math.floor((stats.dexterity - 10) / 2) },
            con: { value: stats.constitution || 10, mod: Math.floor((stats.constitution - 10) / 2) },
            int: { value: stats.intelligence || 10, mod: Math.floor((stats.intelligence - 10) / 2) },
            wis: { value: stats.wisdom || 10, mod: Math.floor((stats.wisdom - 10) / 2) },
            cha: { value: stats.charisma || 10, mod: Math.floor((stats.charisma - 10) / 2) }
        };
    }

    /**
     * Transform currency
     * @param {Object} currency - D&D Beyond currency object
     * @returns {Object} Foundry currency
     * @private
     */
    _transformCurrency(currency) {
        return {
            pp: currency?.platinum || 0,
            gp: currency?.gold || 0,
            ep: currency?.electrum || 0,
            sp: currency?.silver || 0,
            cp: currency?.copper || 0
        };
    }

    /**
     * Transform skills
     * @param {Array} skills - D&D Beyond skills array
     * @returns {Object} Foundry skills
     * @private
     */
    _transformSkills(skills) {
        if (!skills) return {};

        const skillMap = {};
        skills.forEach(skill => {
            skillMap[skill.name.toLowerCase()] = {
                value: skill.proficiency || 0,
                mod: skill.modifier || 0
            };
        });

        return skillMap;
    }

    /**
     * Transform character spells
     * @param {Array} spells - D&D Beyond spells array
     * @returns {Promise<Object>} Foundry spellbook
     * @private
     */
    async _transformCharacterSpells(spells) {
        if (!spells) return {};

        const spellbook = {};

        // Group spells by level
        for (const spell of spells) {
            const level = spell.level || 0;
            if (!spellbook[level]) {
                spellbook[level] = { value: 0, max: 0, override: null };
            }
            spellbook[level].value++;
        }

        return spellbook;
    }

    /**
     * Map D&D Beyond size to Foundry size
     * @param {string} size - D&D Beyond size
     * @returns {string} Foundry size
     * @private
     */
    _mapSize(size) {
        const sizeMap = {
            'tiny': 'tiny',
            'small': 'sm',
            'medium': 'med',
            'large': 'lg',
            'huge': 'huge',
            'gargantuan': 'grg'
        };

        return sizeMap[size?.toLowerCase()] || 'med';
    }

    /**
     * Map D&D Beyond item type to Foundry item type
     * @param {string} type - D&D Beyond item type
     * @returns {string} Foundry item type
     * @private
     */
    _mapItemType(type) {
        const typeMap = {
            'weapon': 'weapon',
            'armor': 'armor',
            'shield': 'armor',
            'tool': 'tool',
            'consumable': 'consumable',
            'loot': 'loot',
            'equipment': 'equipment'
        };

        return typeMap[type?.toLowerCase()] || 'loot';
    }

    /**
     * Parse duration units from string
     * @param {string} duration - Duration string
     * @returns {string} Duration units
     * @private
     */
    _parseDurationUnits(duration) {
        if (!duration) return '';

        const lower = duration.toLowerCase();
        if (lower.includes('instantaneous')) return 'inst';
        if (lower.includes('concentration')) return 'conc';
        if (lower.includes('hour')) return 'hour';
        if (lower.includes('minute')) return 'minute';
        if (lower.includes('round')) return 'round';
        if (lower.includes('day')) return 'day';

        return '';
    }

    /**
     * Parse range units from string
     * @param {string} range - Range string
     * @returns {string} Range units
     * @private
     */
    _parseRangeUnits(range) {
        if (!range) return '';

        const lower = range.toLowerCase();
        if (lower.includes('self')) return 'self';
        if (lower.includes('touch')) return 'touch';
        if (lower.includes('sight')) return 'sight';
        if (lower.includes('mile')) return 'mile';
        if (lower.includes('feet') || lower.includes('ft')) return 'ft';

        return '';
    }

    /**
     * Initialize validation rules
     * @private
     */
    _initializeValidationRules() {
        // Basic validation rules for each content type
        this._validationRules.set(CONTENT_TYPES.CHARACTER, {
            required: ['name', 'stats'],
            optional: ['hitPoints', 'armorClass', 'level']
        });

        this._validationRules.set(CONTENT_TYPES.MONSTER, {
            required: ['name', 'stats', 'hitPoints'],
            optional: ['armorClass', 'speed', 'type']
        });

        this._validationRules.set(CONTENT_TYPES.SPELL, {
            required: ['name', 'level', 'school'],
            optional: ['description', 'castingTime', 'range']
        });

        this._validationRules.set(CONTENT_TYPES.ITEM, {
            required: ['name'],
            optional: ['description', 'weight', 'cost']
        });
    }

    /**
     * Validate input data
     * @param {Object} data - Input data to validate
     * @param {string} contentType - Content type
     * @returns {Object} Validation result
     * @private
     */
    _validateInput(data, contentType) {
        const rules = this._validationRules.get(contentType);
        if (!rules) {
            return { valid: true, errors: [] };
        }

        const errors = [];

        // Check required fields
        rules.required.forEach(field => {
            if (!data[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate output data
     * @param {Object} data - Output data to validate
     * @param {string} contentType - Content type
     * @returns {Object} Validation result
     * @private
     */
    _validateOutput(data, contentType) {
        const errors = [];

        // Basic structure validation
        if (!data.name) {
            errors.push('Missing name field');
        }

        if (!data.type) {
            errors.push('Missing type field');
        }

        if (!data.data) {
            errors.push('Missing data field');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// Export singleton instance
export const dataTransformer = new DataTransformer();