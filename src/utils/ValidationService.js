/**
 * @fileoverview Content validation service for FoundryMagic
 * @description Validates transformed content against Foundry VTT schemas and requirements,
 * providing detailed error reporting and validation rules for different content types.
 */

import { ErrorHandler } from './ErrorHandler.js';
import { notificationService, NOTIFICATION_TYPES } from './NotificationService.js';

/**
 * Validation severity levels
 * @enum {string}
 */
export const VALIDATION_SEVERITY = {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

/**
 * Validation result status
 * @enum {string}
 */
export const VALIDATION_STATUS = {
    VALID: 'valid',
    INVALID: 'invalid',
    WARNING: 'warning'
};

/**
 * Content validation service
 * Validates Foundry VTT content against schemas and requirements
 * with comprehensive error reporting and validation rules.
 */
export class ValidationService {
    /**
     * Creates a new ValidationService instance
     */
    constructor() {
        this._validationRules = new Map();
        this._schemaCache = new Map();
        this._validationStats = {
            total: 0,
            valid: 0,
            invalid: 0,
            warnings: 0
        };

        this._initializeValidationRules();
        this._initializeSchemas();
    }

    /**
     * Validate content against Foundry VTT requirements
     * @param {Object} content - Content to validate
     * @param {string} contentType - Type of content (character, spell, etc.)
     * @param {Object} options - Validation options
     * @param {boolean} options.strict - Whether to treat warnings as errors
     * @param {boolean} options.detailed - Whether to include detailed error messages
     * @param {Array} options.skipRules - Rules to skip during validation
     * @returns {Object} Validation result
     */
    validate(content, contentType, options = {}) {
        try {
            this._validationStats.total++;

            const result = {
                status: VALIDATION_STATUS.VALID,
                errors: [],
                warnings: [],
                info: [],
                contentType,
                validatedAt: Date.now()
            };

            // Get validation rules for content type
            const rules = this._validationRules.get(contentType);
            if (!rules) {
                result.errors.push({
                    field: 'contentType',
                    message: `No validation rules defined for content type: ${contentType}`,
                    severity: VALIDATION_SEVERITY.ERROR
                });
                result.status = VALIDATION_STATUS.INVALID;
                this._validationStats.invalid++;
                return result;
            }

            // Apply validation rules
            rules.forEach(rule => {
                if (options.skipRules?.includes(rule.name)) return;

                const ruleResult = rule.validate(content, options);
                if (ruleResult) {
                    result[ruleResult.severity + 's'].push({
                        field: ruleResult.field,
                        message: ruleResult.message,
                        severity: ruleResult.severity,
                        rule: rule.name,
                        value: ruleResult.value
                    });
                }
            });

            // Determine overall status
            if (result.errors.length > 0) {
                result.status = VALIDATION_STATUS.INVALID;
                this._validationStats.invalid++;
            } else if (result.warnings.length > 0) {
                result.status = options.strict ? VALIDATION_STATUS.INVALID : VALIDATION_STATUS.WARNING;
                this._validationStats.warnings++;
            } else {
                this._validationStats.valid++;
            }

            return result;

        } catch (error) {
            ErrorHandler.handleError(error, 'ValidationService.validate', {
                contentType,
                contentKeys: Object.keys(content || {})
            });

            return {
                status: VALIDATION_STATUS.INVALID,
                errors: [{
                    field: 'validation',
                    message: `Validation failed with error: ${error.message}`,
                    severity: VALIDATION_SEVERITY.ERROR
                }],
                warnings: [],
                info: [],
                contentType
            };
        }
    }

    /**
     * Validate multiple content items in batch
     * @param {Array} items - Array of content items to validate
     * @param {string} contentType - Type of content
     * @param {Object} options - Batch validation options
     * @returns {Array} Array of validation results
     */
    validateBatch(items, contentType, options = {}) {
        return items.map(item => this.validate(item, contentType, options));
    }

    /**
     * Get validation summary for batch results
     * @param {Array} results - Array of validation results
     * @returns {Object} Validation summary
     */
    getValidationSummary(results) {
        const summary = {
            total: results.length,
            valid: 0,
            invalid: 0,
            warnings: 0,
            errors: 0,
            warningsByField: {},
            errorsByField: {}
        };

        results.forEach(result => {
            switch (result.status) {
                case VALIDATION_STATUS.VALID:
                    summary.valid++;
                    break;
                case VALIDATION_STATUS.INVALID:
                    summary.invalid++;
                    break;
                case VALIDATION_STATUS.WARNING:
                    summary.warnings++;
                    break;
            }

            // Count errors and warnings by field
            result.errors.forEach(error => {
                summary.errors++;
                summary.errorsByField[error.field] = (summary.errorsByField[error.field] || 0) + 1;
            });

            result.warnings.forEach(warning => {
                summary.warnings++;
                summary.warningsByField[warning.field] = (summary.warningsByField[warning.field] || 0) + 1;
            });
        });

        return summary;
    }

    /**
     * Get validation statistics
     * @returns {Object} Validation statistics
     */
    getStats() {
        return { ...this._validationStats };
    }

    /**
     * Reset validation statistics
     */
    resetStats() {
        this._validationStats = {
            total: 0,
            valid: 0,
            invalid: 0,
            warnings: 0
        };
    }

    /**
     * Register custom validation rule
     * @param {string} contentType - Content type to register rule for
     * @param {Object} rule - Validation rule object
     * @param {string} rule.name - Rule name
     * @param {Function} rule.validate - Validation function
     */
    registerRule(contentType, rule) {
        if (!this._validationRules.has(contentType)) {
            this._validationRules.set(contentType, []);
        }

        this._validationRules.get(contentType).push(rule);
    }

    /**
     * Initialize validation rules for different content types
     * @private
     */
    _initializeValidationRules() {
        // Character validation rules
        this._validationRules.set('character', [
            this._createRequiredFieldRule('name', 'name'),
            this._createRequiredFieldRule('type', 'type'),
            this._createRequiredFieldRule('data', 'data'),
            this._createAbilityScoresRule(),
            this._createHitPointsRule(),
            this._createLevelRule(),
            this._createCurrencyRule(),
            this._createSkillsRule()
        ]);

        // NPC/Monster validation rules
        this._validationRules.set('npc', [
            this._createRequiredFieldRule('name', 'name'),
            this._createRequiredFieldRule('type', 'type'),
            this._createRequiredFieldRule('data', 'data'),
            this._createAbilityScoresRule(),
            this._createHitPointsRule(),
            this._createChallengeRatingRule(),
            this._createSizeRule(),
            this._createSpeedRule()
        ]);

        // Spell validation rules
        this._validationRules.set('spell', [
            this._createRequiredFieldRule('name', 'name'),
            this._createRequiredFieldRule('type', 'type'),
            this._createRequiredFieldRule('data', 'data'),
            this._createSpellLevelRule(),
            this._createSpellSchoolRule(),
            this._createSpellComponentsRule(),
            this._createSpellCastingTimeRule(),
            this._createSpellRangeRule(),
            this._createSpellDurationRule()
        ]);

        // Item validation rules
        this._validationRules.set('item', [
            this._createRequiredFieldRule('name', 'name'),
            this._createRequiredFieldRule('type', 'type'),
            this._createRequiredFieldRule('data', 'data'),
            this._createItemWeightRule(),
            this._createItemPriceRule(),
            this._createItemRarityRule()
        ]);

        // Weapon validation rules
        this._validationRules.set('weapon', [
            ...this._validationRules.get('item'),
            this._createWeaponTypeRule(),
            this._createWeaponDamageRule(),
            this._createWeaponAttackBonusRule()
        ]);

        // Armor validation rules
        this._validationRules.set('armor', [
            ...this._validationRules.get('item'),
            this._createArmorClassRule(),
            this._createArmorTypeRule(),
            this._createArmorDexBonusRule()
        ]);

        // Feat validation rules
        this._validationRules.set('feat', [
            this._createRequiredFieldRule('name', 'name'),
            this._createRequiredFieldRule('type', 'type'),
            this._createRequiredFieldRule('data', 'data'),
            this._createFeatRequirementsRule()
        ]);

        // Class validation rules
        this._validationRules.set('class', [
            this._createRequiredFieldRule('name', 'name'),
            this._createRequiredFieldRule('type', 'type'),
            this._createRequiredFieldRule('data', 'data'),
            this._createClassHitDieRule(),
            this._createClassLevelsRule(),
            this._createClassSavingThrowsRule()
        ]);

        // Race validation rules
        this._validationRules.set('race', [
            this._createRequiredFieldRule('name', 'name'),
            this._createRequiredFieldRule('type', 'type'),
            this._createRequiredFieldRule('data', 'data'),
            this._createRaceSizeRule(),
            this._createRaceSpeedRule(),
            this._createRaceAbilityBonusesRule()
        ]);

        // Background validation rules
        this._validationRules.set('background', [
            this._createRequiredFieldRule('name', 'name'),
            this._createRequiredFieldRule('type', 'type'),
            this._createRequiredFieldRule('data', 'data'),
            this._createBackgroundProficienciesRule()
        ]);
    }

    /**
     * Initialize Foundry VTT schemas for validation
     * @private
     */
    _initializeSchemas() {
        // Cache commonly used schema patterns
        this._schemaCache.set('abilityScore', {
            min: 1,
            max: 30,
            type: 'number'
        });

        this._schemaCache.set('hitPoints', {
            min: 0,
            max: 1000,
            type: 'number'
        });

        this._schemaCache.set('level', {
            min: 1,
            max: 20,
            type: 'number'
        });

        this._schemaCache.set('challengeRating', {
            min: 0,
            max: 30,
            type: 'number'
        });
    }

    /**
     * Create a required field validation rule
     * @param {string} fieldName - Name of the field to check
     * @param {string} displayName - Display name for error messages
     * @returns {Object} Validation rule
     * @private
     */
    _createRequiredFieldRule(fieldName, displayName) {
        return {
            name: `required_${fieldName}`,
            validate: (content) => {
                const value = this._getNestedValue(content, fieldName);
                if (value === undefined || value === null || value === '') {
                    return {
                        field: fieldName,
                        message: `${displayName} is required`,
                        severity: VALIDATION_SEVERITY.ERROR,
                        value
                    };
                }
                return null;
            }
        };
    }

    /**
     * Create ability scores validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createAbilityScoresRule() {
        return {
            name: 'ability_scores',
            validate: (content) => {
                const abilities = content.data?.abilities;
                if (!abilities) {
                    return {
                        field: 'data.abilities',
                        message: 'Ability scores are required',
                        severity: VALIDATION_SEVERITY.ERROR
                    };
                }

                const requiredAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
                const schema = this._schemaCache.get('abilityScore');

                for (const ability of requiredAbilities) {
                    const score = abilities[ability]?.value;
                    if (typeof score !== 'number' || score < schema.min || score > schema.max) {
                        return {
                            field: `data.abilities.${ability}`,
                            message: `${ability.toUpperCase()} score must be between ${schema.min} and ${schema.max}`,
                            severity: VALIDATION_SEVERITY.ERROR,
                            value: score
                        };
                    }
                }

                return null;
            }
        };
    }

    /**
     * Create hit points validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createHitPointsRule() {
        return {
            name: 'hit_points',
            validate: (content) => {
                const hp = content.data?.attributes?.hp;
                if (!hp) {
                    return {
                        field: 'data.attributes.hp',
                        message: 'Hit points are required',
                        severity: VALIDATION_SEVERITY.ERROR
                    };
                }

                const maxHp = hp.max;
                const schema = this._schemaCache.get('hitPoints');

                if (typeof maxHp !== 'number' || maxHp < schema.min || maxHp > schema.max) {
                    return {
                        field: 'data.attributes.hp.max',
                        message: `Maximum hit points must be between ${schema.min} and ${schema.max}`,
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: maxHp
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create level validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createLevelRule() {
        return {
            name: 'level',
            validate: (content) => {
                const level = content.data?.details?.level;
                const schema = this._schemaCache.get('level');

                if (level !== undefined && (typeof level !== 'number' || level < schema.min || level > schema.max)) {
                    return {
                        field: 'data.details.level',
                        message: `Level must be between ${schema.min} and ${schema.max}`,
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: level
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create currency validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createCurrencyRule() {
        return {
            name: 'currency',
            validate: (content) => {
                const currency = content.data?.currency;
                if (!currency) return null;

                const currencies = ['pp', 'gp', 'ep', 'sp', 'cp'];

                for (const curr of currencies) {
                    const amount = currency[curr];
                    if (amount !== undefined && (typeof amount !== 'number' || amount < 0)) {
                        return {
                            field: `data.currency.${curr}`,
                            message: `${curr.toUpperCase()} must be a non-negative number`,
                            severity: VALIDATION_SEVERITY.ERROR,
                            value: amount
                        };
                    }
                }

                return null;
            }
        };
    }

    /**
     * Create skills validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createSkillsRule() {
        return {
            name: 'skills',
            validate: (content) => {
                const skills = content.data?.skills;
                if (!skills) return null;

                for (const [skillName, skillData] of Object.entries(skills)) {
                    if (skillData.value !== undefined && (typeof skillData.value !== 'number' || skillData.value < 0 || skillData.value > 2)) {
                        return {
                            field: `data.skills.${skillName}`,
                            message: 'Skill proficiency must be 0, 1, or 2',
                            severity: VALIDATION_SEVERITY.ERROR,
                            value: skillData.value
                        };
                    }
                }

                return null;
            }
        };
    }

    /**
     * Create challenge rating validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createChallengeRatingRule() {
        return {
            name: 'challenge_rating',
            validate: (content) => {
                const cr = content.data?.details?.cr;
                const schema = this._schemaCache.get('challengeRating');

                if (cr !== undefined && (typeof cr !== 'number' || cr < schema.min || cr > schema.max)) {
                    return {
                        field: 'data.details.cr',
                        message: `Challenge rating must be between ${schema.min} and ${schema.max}`,
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: cr
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create size validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createSizeRule() {
        return {
            name: 'size',
            validate: (content) => {
                const size = content.data?.traits?.size;
                const validSizes = ['tiny', 'sm', 'med', 'lg', 'huge', 'grg'];

                if (size && !validSizes.includes(size)) {
                    return {
                        field: 'data.traits.size',
                        message: `Size must be one of: ${validSizes.join(', ')}`,
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: size
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create speed validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createSpeedRule() {
        return {
            name: 'speed',
            validate: (content) => {
                const speed = content.data?.attributes?.speed?.value;

                if (speed !== undefined && (typeof speed !== 'number' || speed < 0 || speed > 200)) {
                    return {
                        field: 'data.attributes.speed.value',
                        message: 'Speed must be between 0 and 200 feet',
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: speed
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create spell level validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createSpellLevelRule() {
        return {
            name: 'spell_level',
            validate: (content) => {
                const level = content.data?.level;

                if (level !== undefined && (typeof level !== 'number' || level < 0 || level > 9)) {
                    return {
                        field: 'data.level',
                        message: 'Spell level must be between 0 and 9',
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: level
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create spell school validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createSpellSchoolRule() {
        return {
            name: 'spell_school',
            validate: (content) => {
                const school = content.data?.school;
                const validSchools = ['abj', 'con', 'div', 'enc', 'evo', 'ill', 'nec', 'trs'];

                if (school && !validSchools.includes(school)) {
                    return {
                        field: 'data.school',
                        message: `Spell school must be one of: ${validSchools.join(', ')}`,
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: school
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create spell components validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createSpellComponentsRule() {
        return {
            name: 'spell_components',
            validate: (content) => {
                const components = content.data?.components;

                if (components) {
                    const validKeys = ['vocal', 'somatic', 'material', 'value'];
                    const invalidKeys = Object.keys(components).filter(key => !validKeys.includes(key));

                    if (invalidKeys.length > 0) {
                        return {
                            field: 'data.components',
                            message: `Invalid component keys: ${invalidKeys.join(', ')}`,
                            severity: VALIDATION_SEVERITY.ERROR,
                            value: invalidKeys
                        };
                    }
                }

                return null;
            }
        };
    }

    /**
     * Create spell casting time validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createSpellCastingTimeRule() {
        return {
            name: 'spell_casting_time',
            validate: (content) => {
                const castingTime = content.data?.castingTime;

                if (castingTime) {
                    const validTypes = ['action', 'bonus', 'reaction', 'minute', 'hour', 'special'];

                    if (castingTime.type && !validTypes.includes(castingTime.type)) {
                        return {
                            field: 'data.castingTime.type',
                            message: `Casting time type must be one of: ${validTypes.join(', ')}`,
                            severity: VALIDATION_SEVERITY.ERROR,
                            value: castingTime.type
                        };
                    }
                }

                return null;
            }
        };
    }

    /**
     * Create spell range validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createSpellRangeRule() {
        return {
            name: 'spell_range',
            validate: (content) => {
                const range = content.data?.range;

                if (range) {
                    const validUnits = ['self', 'touch', 'ft', 'mile', 'spec', 'any'];

                    if (range.units && !validUnits.includes(range.units)) {
                        return {
                            field: 'data.range.units',
                            message: `Range units must be one of: ${validUnits.join(', ')}`,
                            severity: VALIDATION_SEVERITY.ERROR,
                            value: range.units
                        };
                    }
                }

                return null;
            }
        };
    }

    /**
     * Create spell duration validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createSpellDurationRule() {
        return {
            name: 'spell_duration',
            validate: (content) => {
                const duration = content.data?.duration;

                if (duration) {
                    const validUnits = ['inst', 'perm', 'disp', 'round', 'turn', 'minute', 'hour', 'day', 'month', 'year', 'spec'];

                    if (duration.units && !validUnits.includes(duration.units)) {
                        return {
                            field: 'data.duration.units',
                            message: `Duration units must be one of: ${validUnits.join(', ')}`,
                            severity: VALIDATION_SEVERITY.ERROR,
                            value: duration.units
                        };
                    }
                }

                return null;
            }
        };
    }

    /**
     * Create item weight validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createItemWeightRule() {
        return {
            name: 'item_weight',
            validate: (content) => {
                const weight = content.data?.weight;

                if (weight !== undefined && (typeof weight !== 'number' || weight < 0)) {
                    return {
                        field: 'data.weight',
                        message: 'Weight must be a non-negative number',
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: weight
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create item price validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createItemPriceRule() {
        return {
            name: 'item_price',
            validate: (content) => {
                const price = content.data?.price;

                if (price !== undefined && (typeof price !== 'number' || price < 0)) {
                    return {
                        field: 'data.price',
                        message: 'Price must be a non-negative number',
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: price
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create item rarity validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createItemRarityRule() {
        return {
            name: 'item_rarity',
            validate: (content) => {
                const rarity = content.data?.rarity;
                const validRarities = ['', 'common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];

                if (rarity && !validRarities.includes(rarity.toLowerCase())) {
                    return {
                        field: 'data.rarity',
                        message: `Rarity must be one of: ${validRarities.join(', ')}`,
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: rarity
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create weapon type validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createWeaponTypeRule() {
        return {
            name: 'weapon_type',
            validate: (content) => {
                const weaponType = content.data?.weaponType;
                const validTypes = ['simpleM', 'simpleR', 'martialM', 'martialR', 'natural', 'improv', 'siege'];

                if (weaponType && !validTypes.includes(weaponType)) {
                    return {
                        field: 'data.weaponType',
                        message: `Weapon type must be one of: ${validTypes.join(', ')}`,
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: weaponType
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create weapon damage validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createWeaponDamageRule() {
        return {
            name: 'weapon_damage',
            validate: (content) => {
                const damage = content.data?.damage;

                if (damage && damage.parts) {
                    for (const [index, part] of damage.parts.entries()) {
                        if (!Array.isArray(part) || part.length !== 2) {
                            return {
                                field: `data.damage.parts[${index}]`,
                                message: 'Damage part must be an array of [formula, type]',
                                severity: VALIDATION_SEVERITY.ERROR,
                                value: part
                            };
                        }
                    }
                }

                return null;
            }
        };
    }

    /**
     * Create weapon attack bonus validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createWeaponAttackBonusRule() {
        return {
            name: 'weapon_attack_bonus',
            validate: (content) => {
                const attackBonus = content.data?.attackBonus;

                if (attackBonus !== undefined && typeof attackBonus !== 'number') {
                    return {
                        field: 'data.attackBonus',
                        message: 'Attack bonus must be a number',
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: attackBonus
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create armor class validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createArmorClassRule() {
        return {
            name: 'armor_class',
            validate: (content) => {
                const ac = content.data?.armor?.value;

                if (ac !== undefined && (typeof ac !== 'number' || ac < 0 || ac > 25)) {
                    return {
                        field: 'data.armor.value',
                        message: 'Armor class must be between 0 and 25',
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: ac
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create armor type validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createArmorTypeRule() {
        return {
            name: 'armor_type',
            validate: (content) => {
                const armorType = content.data?.armor?.type;
                const validTypes = ['light', 'medium', 'heavy', 'bonus', 'natural', 'shield'];

                if (armorType && !validTypes.includes(armorType)) {
                    return {
                        field: 'data.armor.type',
                        message: `Armor type must be one of: ${validTypes.join(', ')}`,
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: armorType
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create armor dex bonus validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createArmorDexBonusRule() {
        return {
            name: 'armor_dex_bonus',
            validate: (content) => {
                const dex = content.data?.armor?.dex;

                if (dex !== undefined && dex !== null && (typeof dex !== 'number' || dex < 0 || dex > 10)) {
                    return {
                        field: 'data.armor.dex',
                        message: 'Max dexterity bonus must be between 0 and 10',
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: dex
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create feat requirements validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createFeatRequirementsRule() {
        return {
            name: 'feat_requirements',
            validate: (content) => {
                const requirements = content.data?.requirements;

                if (requirements !== undefined && typeof requirements !== 'string') {
                    return {
                        field: 'data.requirements',
                        message: 'Requirements must be a string',
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: requirements
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create class hit die validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createClassHitDieRule() {
        return {
            name: 'class_hit_die',
            validate: (content) => {
                const hitDie = content.data?.hitDie;
                const validDice = ['d4', 'd6', 'd8', 'd10', 'd12'];

                if (hitDie && !validDice.includes(hitDie)) {
                    return {
                        field: 'data.hitDie',
                        message: `Hit die must be one of: ${validDice.join(', ')}`,
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: hitDie
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create class levels validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createClassLevelsRule() {
        return {
            name: 'class_levels',
            validate: (content) => {
                const levels = content.data?.levels;

                if (levels !== undefined && (typeof levels !== 'number' || levels < 1 || levels > 20)) {
                    return {
                        field: 'data.levels',
                        message: 'Class levels must be between 1 and 20',
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: levels
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create class saving throws validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createClassSavingThrowsRule() {
        return {
            name: 'class_saving_throws',
            validate: (content) => {
                const saves = content.data?.saves;

                if (saves) {
                    const validAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

                    for (const save of saves) {
                        if (!validAbilities.includes(save)) {
                            return {
                                field: 'data.saves',
                                message: `Saving throw must be one of: ${validAbilities.join(', ')}`,
                                severity: VALIDATION_SEVERITY.ERROR,
                                value: save
                            };
                        }
                    }
                }

                return null;
            }
        };
    }

    /**
     * Create race size validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createRaceSizeRule() {
        return {
            name: 'race_size',
            validate: (content) => {
                const size = content.data?.size;
                const validSizes = ['tiny', 'sm', 'med', 'lg', 'huge', 'grg'];

                if (size && !validSizes.includes(size)) {
                    return {
                        field: 'data.size',
                        message: `Size must be one of: ${validSizes.join(', ')}`,
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: size
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create race speed validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createRaceSpeedRule() {
        return {
            name: 'race_speed',
            validate: (content) => {
                const speed = content.data?.speed;

                if (speed !== undefined && (typeof speed !== 'number' || speed < 0 || speed > 200)) {
                    return {
                        field: 'data.speed',
                        message: 'Speed must be between 0 and 200 feet',
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: speed
                    };
                }

                return null;
            }
        };
    }

    /**
     * Create race ability bonuses validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createRaceAbilityBonusesRule() {
        return {
            name: 'race_ability_bonuses',
            validate: (content) => {
                const ability = content.data?.ability;

                if (ability) {
                    const validAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

                    for (const bonus of ability) {
                        if (!validAbilities.includes(bonus.ability?.toLowerCase())) {
                            return {
                                field: 'data.ability',
                                message: `Ability must be one of: ${validAbilities.join(', ')}`,
                                severity: VALIDATION_SEVERITY.ERROR,
                                value: bonus.ability
                            };
                        }

                        if (typeof bonus.value !== 'number' || bonus.value < -5 || bonus.value > 5) {
                            return {
                                field: 'data.ability',
                                message: 'Ability bonus must be between -5 and 5',
                                severity: VALIDATION_SEVERITY.ERROR,
                                value: bonus.value
                            };
                        }
                    }
                }

                return null;
            }
        };
    }

    /**
     * Create background proficiencies validation rule
     * @returns {Object} Validation rule
     * @private
     */
    _createBackgroundProficienciesRule() {
        return {
            name: 'background_proficiencies',
            validate: (content) => {
                const skillProficiencies = content.data?.skillProficiencies;
                const toolProficiencies = content.data?.toolProficiencies;

                if (skillProficiencies && !Array.isArray(skillProficiencies)) {
                    return {
                        field: 'data.skillProficiencies',
                        message: 'Skill proficiencies must be an array',
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: skillProficiencies
                    };
                }

                if (toolProficiencies && !Array.isArray(toolProficiencies)) {
                    return {
                        field: 'data.toolProficiencies',
                        message: 'Tool proficiencies must be an array',
                        severity: VALIDATION_SEVERITY.ERROR,
                        value: toolProficiencies
                    };
                }

                return null;
            }
        };
    }

    /**
     * Get nested value from object using dot notation
     * @param {Object} obj - Object to get value from
     * @param {string} path - Dot notation path
     * @returns {*} Value at path
     * @private
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
}

// Export singleton instance
export const validationService = new ValidationService();