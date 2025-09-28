/**
 * @fileoverview D&D 5e System Compatibility Layer
 * Ensures compatibility with the dnd5e system for Foundry VTT
 */

export default class DnD5eCompat {
    constructor(foundryMagic) {
        this._foundryMagic = foundryMagic;
        this._dnd5eVersion = null;
        this._compatibilityMode = null;
    }

    /**
     * Initialize the compatibility layer
     */
    async initialize() {
        console.log('FoundryMagic | Initializing D&D 5e compatibility layer...');

        // Check if dnd5e system is active
        if (!game.system.id === 'dnd5e') {
            console.warn('FoundryMagic | D&D 5e system not detected. Some features may not work correctly.');
            return;
        }

        // Get dnd5e version
        this._dnd5eVersion = game.system.version;
        console.log(`FoundryMagic | Detected D&D 5e system version: ${this._dnd5eVersion}`);

        // Determine compatibility mode
        this._compatibilityMode = this._determineCompatibilityMode();

        // Register compatibility hooks
        this._registerCompatibilityHooks();

        // Set up data transformations
        this._setupDataTransformations();

        console.log('FoundryMagic | D&D 5e compatibility layer initialized');
    }

    /**
     * Determine compatibility mode based on dnd5e version
     * @private
     * @returns {string} Compatibility mode
     */
    _determineCompatibilityMode() {
        const version = this._dnd5eVersion;

        if (version.startsWith('2.')) {
            return 'v2';
        } else if (version.startsWith('1.')) {
            return 'v1';
        } else {
            console.warn(`FoundryMagic | Unknown D&D 5e version: ${version}. Using legacy mode.`);
            return 'legacy';
        }
    }

    /**
     * Register compatibility hooks
     * @private
     */
    _registerCompatibilityHooks() {
        // Hook into dnd5e system events
        Hooks.on('dnd5e.preCreateItem', this._onPreCreateItem.bind(this));
        Hooks.on('dnd5e.preCreateActor', this._onPreCreateActor.bind(this));
        Hooks.on('dnd5e.preCreateActiveEffect', this._onPreCreateActiveEffect.bind(this));

        // Hook into item/actor updates for compatibility
        Hooks.on('updateItem', this._onUpdateItem.bind(this));
        Hooks.on('updateActor', this._onUpdateActor.bind(this));
    }

    /**
     * Set up data transformations for dnd5e compatibility
     * @private
     */
    _setupDataTransformations() {
        // Set up transformation functions based on compatibility mode
        this._itemTransform = this._getItemTransformFunction();
        this._actorTransform = this._getActorTransformFunction();
        this._effectTransform = this._getEffectTransformFunction();
    }

    /**
     * Transform D&D Beyond data to dnd5e compatible format
     * @param {Object} data - Raw D&D Beyond data
     * @param {string} type - Data type (character, monster, spell, item)
     * @returns {Object} Transformed data
     */
    transformForDnD5e(data, type) {
        switch (type) {
            case 'character':
                return this._transformCharacter(data);
            case 'monster':
                return this._transformMonster(data);
            case 'spell':
                return this._transformSpell(data);
            case 'item':
                return this._transformItem(data);
            case 'adventure':
                return this._transformAdventure(data);
            default:
                console.warn(`FoundryMagic | Unknown data type for transformation: ${type}`);
                return data;
        }
    }

    /**
     * Transform character data
     * @private
     * @param {Object} data - Character data
     * @returns {Object} Transformed character data
     */
    _transformCharacter(data) {
        const transformed = { ...data };

        // Apply dnd5e-specific transformations
        if (this._compatibilityMode === 'v2') {
            transformed.system = this._transformCharacterV2(data);
        } else {
            transformed.data = this._transformCharacterV1(data);
        }

        // Ensure proper type
        transformed.type = 'character';

        return transformed;
    }

    /**
     * Transform character data for dnd5e v2
     * @private
     * @param {Object} data - Character data
     * @returns {Object} Transformed system data
     */
    _transformCharacterV2(data) {
        return {
            abilities: this._transformAbilities(data.abilities),
            attributes: {
                ac: { value: data.ac || 10 },
                hp: {
                    value: data.hitPoints?.current || 0,
                    max: data.hitPoints?.maximum || 0,
                    temp: data.hitPoints?.temporary || 0
                },
                speed: this._transformSpeed(data.speed),
                initiative: { bonus: data.initiative?.bonus || 0 }
            },
            details: {
                level: data.level || 1,
                race: data.race?.name || '',
                background: data.background?.name || '',
                alignment: data.alignment || '',
                xp: { value: data.experience || 0 }
            },
            traits: this._transformTraits(data.traits),
            currency: this._transformCurrency(data.currency),
            skills: this._transformSkills(data.skills),
            spells: this._transformSpellcasting(data.spellcasting),
            bonuses: {},
            resources: this._transformResources(data.resources)
        };
    }

    /**
     * Transform character data for dnd5e v1
     * @private
     * @param {Object} data - Character data
     * @returns {Object} Transformed data
     */
    _transformCharacterV1(data) {
        return {
            abilities: this._transformAbilities(data.abilities),
            attributes: {
                ac: { value: data.ac || 10 },
                hp: {
                    value: data.hitPoints?.current || 0,
                    max: data.hitPoints?.maximum || 0,
                    temp: data.hitPoints?.temporary || 0
                },
                speed: data.speed || 30,
                initiative: { bonus: data.initiative?.bonus || 0 }
            },
            details: {
                level: data.level || 1,
                race: data.race?.name || '',
                background: data.background?.name || '',
                alignment: data.alignment || '',
                xp: { value: data.experience || 0 }
            },
            traits: this._transformTraits(data.traits),
            currency: this._transformCurrency(data.currency),
            skills: this._transformSkills(data.skills),
            spells: this._transformSpellcasting(data.spellcasting),
            bonuses: {},
            resources: this._transformResources(data.resources)
        };
    }

    /**
     * Transform monster data
     * @private
     * @param {Object} data - Monster data
     * @returns {Object} Transformed monster data
     */
    _transformMonster(data) {
        const transformed = { ...data };

        if (this._compatibilityMode === 'v2') {
            transformed.system = {
                abilities: this._transformAbilities(data.abilities),
                attributes: {
                    ac: { value: data.ac || 10 },
                    hp: {
                        value: data.hitPoints?.current || 0,
                        max: data.hitPoints?.maximum || 0
                    },
                    speed: this._transformSpeed(data.speed)
                },
                details: {
                    type: { value: data.type || 'custom', subtype: data.subtype || '' },
                    cr: data.challengeRating || 0,
                    xp: { value: data.experiencePoints || 0 }
                },
                traits: this._transformTraits(data.traits),
                currency: { gp: data.treasure?.gold || 0 }
            };
        } else {
            transformed.data = {
                abilities: this._transformAbilities(data.abilities),
                attributes: {
                    ac: { value: data.ac || 10 },
                    hp: {
                        value: data.hitPoints?.current || 0,
                        max: data.hitPoints?.maximum || 0
                    },
                    speed: data.speed || 30
                },
                details: {
                    type: data.type || 'custom',
                    cr: data.challengeRating || 0,
                    xp: { value: data.experiencePoints || 0 }
                },
                traits: this._transformTraits(data.traits),
                currency: { gp: data.treasure?.gold || 0 }
            };
        }

        transformed.type = 'npc';
        return transformed;
    }

    /**
     * Transform spell data
     * @private
     * @param {Object} data - Spell data
     * @returns {Object} Transformed spell data
     */
    _transformSpell(data) {
        const transformed = { ...data };

        if (this._compatibilityMode === 'v2') {
            transformed.system = {
                description: { value: data.description || '' },
                activation: {
                    type: data.activation?.type || 'action',
                    cost: data.activation?.cost || 1
                },
                duration: {
                    value: data.duration?.value || '',
                    units: data.duration?.units || ''
                },
                target: {
                    value: data.target?.value || null,
                    units: data.target?.units || '',
                    type: data.target?.type || ''
                },
                range: {
                    value: data.range?.value || null,
                    units: data.range?.units || ''
                },
                uses: {
                    value: data.uses?.value || 0,
                    max: data.uses?.maximum || 0,
                    per: data.uses?.per || ''
                },
                consume: data.consume || {},
                ability: data.ability || '',
                attackBonus: data.attackBonus || 0,
                chatFlavor: data.chatFlavor || '',
                critical: data.critical || null,
                damage: this._transformSpellDamage(data.damage),
                formula: data.formula || '',
                save: data.save || {},
                level: data.level || 0,
                school: data.school || '',
                components: this._transformComponents(data.components),
                materials: { value: data.materials?.value || '' },
                scaling: data.scaling || {}
            };
        } else {
            transformed.data = {
                description: { value: data.description || '' },
                activation: data.activation || 'action',
                duration: data.duration || {},
                target: data.target || {},
                range: data.range || {},
                uses: data.uses || {},
                consume: data.consume || {},
                ability: data.ability || '',
                attackBonus: data.attackBonus || 0,
                chatFlavor: data.chatFlavor || '',
                critical: data.critical || null,
                damage: this._transformSpellDamage(data.damage),
                formula: data.formula || '',
                save: data.save || {},
                level: data.level || 0,
                school: data.school || '',
                components: this._transformComponents(data.components),
                materials: { value: data.materials?.value || '' },
                scaling: data.scaling || {}
            };
        }

        transformed.type = 'spell';
        return transformed;
    }

    /**
     * Transform item data
     * @private
     * @param {Object} data - Item data
     * @returns {Object} Transformed item data
     */
    _transformItem(data) {
        const transformed = { ...data };

        if (this._compatibilityMode === 'v2') {
            transformed.system = {
                description: { value: data.description || '' },
                weight: data.weight || 0,
                price: this._transformPrice(data.price),
                rarity: data.rarity || '',
                identified: data.identified !== false,
                attunement: data.attunement || 0,
                equipped: data.equipped || false,
                proficiency: data.proficiency || '',
                activation: data.activation || {},
                duration: data.duration || {},
                target: data.target || {},
                range: data.range || {},
                uses: data.uses || {},
                consume: data.consume || {},
                ability: data.ability || '',
                actionType: data.actionType || '',
                attackBonus: data.attackBonus || 0,
                chatFlavor: data.chatFlavor || '',
                critical: data.critical || null,
                damage: data.damage || {},
                formula: data.formula || '',
                save: data.save || {},
                armor: data.armor || {},
                hp: data.hp || {},
                properties: data.properties || {},
                proficient: data.proficient || false
            };
        } else {
            transformed.data = {
                description: { value: data.description || '' },
                weight: data.weight || 0,
                price: data.price || 0,
                rarity: data.rarity || '',
                identified: data.identified !== false,
                attunement: data.attunement || 0,
                equipped: data.equipped || false,
                proficiency: data.proficiency || '',
                activation: data.activation || {},
                duration: data.duration || {},
                target: data.target || {},
                range: data.range || {},
                uses: data.uses || {},
                consume: data.consume || {},
                ability: data.ability || '',
                actionType: data.actionType || '',
                attackBonus: data.attackBonus || 0,
                chatFlavor: data.chatFlavor || '',
                critical: data.critical || null,
                damage: data.damage || {},
                formula: data.formula || '',
                save: data.save || {},
                armor: data.armor || {},
                hp: data.hp || {},
                properties: data.properties || {},
                proficient: data.proficient || false
            };
        }

        transformed.type = this._determineItemType(data);
        return transformed;
    }

    /**
     * Transform adventure data
     * @private
     * @param {Object} data - Adventure data
     * @returns {Object} Transformed adventure data
     */
    _transformAdventure(data) {
        // Adventures are primarily handled at the scene/jounal level
        // This is a placeholder for adventure-level transformations
        return data;
    }

    /**
     * Transform abilities
     * @private
     * @param {Object} abilities - Abilities data
     * @returns {Object} Transformed abilities
     */
    _transformAbilities(abilities = {}) {
        const transformed = {};

        ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ability => {
            const data = abilities[ability] || {};
            transformed[ability] = {
                value: data.score || 10,
                proficient: data.proficiency || 0,
                mod: data.modifier || 0,
                save: data.save || 0,
                saveBonus: data.saveBonus || 0
            };
        });

        return transformed;
    }

    /**
     * Transform speed
     * @private
     * @param {Object|string} speed - Speed data
     * @returns {Object} Transformed speed
     */
    _transformSpeed(speed) {
        if (typeof speed === 'string') {
            return { value: parseInt(speed) || 30, units: 'ft' };
        }

        return {
            value: speed?.value || 30,
            units: speed?.units || 'ft'
        };
    }

    /**
     * Transform traits
     * @private
     * @param {Object} traits - Traits data
     * @returns {Object} Transformed traits
     */
    _transformTraits(traits = {}) {
        return {
            size: traits.size || 'med',
            di: { value: traits.damageImmunities || [] },
            dr: { value: traits.damageResistances || [] },
            dv: { value: traits.damageVulnerabilities || [] },
            ci: { value: traits.conditionImmunities || [] },
            languages: { value: traits.languages || [] }
        };
    }

    /**
     * Transform currency
     * @private
     * @param {Object} currency - Currency data
     * @returns {Object} Transformed currency
     */
    _transformCurrency(currency = {}) {
        return {
            pp: currency.pp || 0,
            gp: currency.gp || 0,
            ep: currency.ep || 0,
            sp: currency.sp || 0,
            cp: currency.cp || 0
        };
    }

    /**
     * Transform skills
     * @private
     * @param {Object} skills - Skills data
     * @returns {Object} Transformed skills
     */
    _transformSkills(skills = {}) {
        const transformed = {};

        Object.entries(skills).forEach(([skill, data]) => {
            transformed[skill] = {
                value: data.proficiency || 0,
                ability: data.ability || 'int',
                bonuses: { check: data.bonus || 0 },
                mod: data.modifier || 0
            };
        });

        return transformed;
    }

    /**
     * Transform spellcasting
     * @private
     * @param {Object} spellcasting - Spellcasting data
     * @returns {Object} Transformed spellcasting
     */
    _transformSpellcasting(spellcasting = {}) {
        return spellcasting; // Placeholder - complex transformation needed
    }

    /**
     * Transform resources
     * @private
     * @param {Object} resources - Resources data
     * @returns {Object} Transformed resources
     */
    _transformResources(resources = {}) {
        return resources; // Placeholder
    }

    /**
     * Transform spell damage
     * @private
     * @param {Object} damage - Damage data
     * @returns {Object} Transformed damage
     */
    _transformSpellDamage(damage = {}) {
        return {
            parts: damage.parts || [],
            versatile: damage.versatile || ''
        };
    }

    /**
     * Transform components
     * @private
     * @param {Object} components - Components data
     * @returns {Object} Transformed components
     */
    _transformComponents(components = {}) {
        return {
            vocal: components.vocal || false,
            somatic: components.somatic || false,
            material: components.material || false,
            ritual: components.ritual || false,
            concentration: components.concentration || false
        };
    }

    /**
     * Transform price
     * @private
     * @param {Object|string|number} price - Price data
     * @returns {Object} Transformed price
     */
    _transformPrice(price) {
        if (typeof price === 'number') {
            return { value: price, denomination: 'gp' };
        }

        if (typeof price === 'string') {
            const match = price.match(/(\d+)\s*(\w+)/);
            if (match) {
                return { value: parseInt(match[1]), denomination: match[2] };
            }
            return { value: parseInt(price) || 0, denomination: 'gp' };
        }

        return {
            value: price?.value || 0,
            denomination: price?.denomination || 'gp'
        };
    }

    /**
     * Determine item type
     * @private
     * @param {Object} data - Item data
     * @returns {string} Item type
     */
    _determineItemType(data) {
        // Logic to determine item type based on properties
        if (data.weapon) return 'weapon';
        if (data.armor) return 'armor';
        if (data.consumable) return 'consumable';
        if (data.tool) return 'tool';
        if (data.loot) return 'loot';
        if (data.feature) return 'feat';
        if (data.backpack) return 'backpack';

        return 'equipment'; // Default
    }

    /**
     * Hook: Pre-create item
     * @private
     * @param {Item} item - Item being created
     * @param {Object} data - Item data
     * @param {Object} options - Creation options
     * @param {string} userId - User ID
     */
    _onPreCreateItem(item, data, options, userId) {
        // Apply any final transformations or validations
        console.log('FoundryMagic | Pre-creating item:', item.name);
    }

    /**
     * Hook: Pre-create actor
     * @private
     * @param {Actor} actor - Actor being created
     * @param {Object} data - Actor data
     * @param {Object} options - Creation options
     * @param {string} userId - User ID
     */
    _onPreCreateActor(actor, data, options, userId) {
        // Apply any final transformations or validations
        console.log('FoundryMagic | Pre-creating actor:', actor.name);
    }

    /**
     * Hook: Pre-create active effect
     * @private
     * @param {ActiveEffect} effect - Effect being created
     * @param {Object} data - Effect data
     * @param {Object} options - Creation options
     * @param {string} userId - User ID
     */
    _onPreCreateActiveEffect(effect, data, options, userId) {
        // Apply any final transformations or validations
        console.log('FoundryMagic | Pre-creating effect:', effect.label);
    }

    /**
     * Hook: Update item
     * @private
     * @param {Item} item - Updated item
     * @param {Object} data - Update data
     * @param {Object} options - Update options
     * @param {string} userId - User ID
     */
    _onUpdateItem(item, data, options, userId) {
        // Handle compatibility for item updates
    }

    /**
     * Hook: Update actor
     * @private
     * @param {Actor} actor - Updated actor
     * @param {Object} data - Update data
     * @param {Object} options - Update options
     * @param {string} userId - User ID
     */
    _onUpdateActor(actor, data, options, userId) {
        // Handle compatibility for actor updates
    }

    /**
     * Get compatibility mode
     * @returns {string} Compatibility mode
     */
    getCompatibilityMode() {
        return this._compatibilityMode;
    }

    /**
     * Check if dnd5e system is compatible
     * @returns {boolean} Is compatible
     */
    isCompatible() {
        return game.system.id === 'dnd5e' && this._compatibilityMode !== null;
    }

    /**
     * Get dnd5e version
     * @returns {string} Version string
     */
    getDnD5eVersion() {
        return this._dnd5eVersion;
    }

    /**
     * Validate data against dnd5e schema
     * @param {Object} data - Data to validate
     * @param {string} type - Data type
     * @returns {Object} Validation result
     */
    validateData(data, type) {
        // Placeholder for schema validation
        return {
            valid: true,
            errors: [],
            warnings: []
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('FoundryMagic | Cleaning up D&D 5e compatibility layer');
    }
}