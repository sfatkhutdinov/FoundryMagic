/**
 * @fileoverview Spell model for D&D Beyond magic spells
 */

export default class Spell {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.level = data.level || 0;
        this.school = data.school || '';
        this.castingTime = data.castingTime || '';
        this.range = data.range || '';
        this.components = data.components || { verbal: false, somatic: false, material: false };
        this.duration = data.duration || '';
        this.description = data.description || '';
        this.damage = data.damage || null;
        this.savingThrow = data.savingThrow || null;
        this.state = data.state || 'discovered';
    }

    /**
     * Validate spell data
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];

        // Required fields
        if (!this.name) errors.push('Name is required');
        if (!this.description) errors.push('Description is required');

        // Level validation
        if (this.level < 0 || this.level > 9) {
            errors.push('Spell level must be between 0 and 9');
        }

        // School validation
        const validSchools = [
            'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
            'Evocation', 'Illusion', 'Necromancy', 'Transmutation'
        ];
        if (this.school && !validSchools.includes(this.school)) {
            errors.push('School must be one of: ' + validSchools.join(', '));
        }

        // Casting time validation
        if (!this.castingTime) {
            errors.push('Casting time is required');
        }

        // Range validation
        if (!this.range) {
            errors.push('Range is required');
        }

        // Duration validation
        if (!this.duration) {
            errors.push('Duration is required');
        }

        // Damage validation (if present)
        if (this.damage) {
            if (!this.damage.dice) {
                errors.push('Damage must include dice formula');
            }
            if (this.damage.type && !this.isValidDamageType(this.damage.type)) {
                errors.push('Invalid damage type');
            }
        }

        // Saving throw validation (if present)
        if (this.savingThrow && !this.isValidAbility(this.savingThrow)) {
            errors.push('Invalid saving throw ability');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Transition to next state
     * @param {string} newState - Target state
     * @returns {boolean} Success of transition
     */
    transitionTo(newState) {
        const validTransitions = {
            'discovered': ['downloaded'],
            'downloaded': ['processed'],
            'processed': ['available'],
            'available': ['available'] // Can stay available
        };

        if (validTransitions[this.state]?.includes(newState)) {
            this.state = newState;
            return true;
        }

        return false;
    }

    /**
     * Get spell summary
     * @returns {Object} Summary data
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            level: this.level,
            school: this.school,
            castingTime: this.castingTime,
            range: this.range,
            duration: this.duration,
            state: this.state
        };
    }

    /**
     * Check if spell is ritual
     * @returns {boolean} True if ritual spell
     */
    isRitual() {
        return this.description.toLowerCase().includes('ritual');
    }

    /**
     * Check if spell requires concentration
     * @returns {boolean} True if concentration required
     */
    requiresConcentration() {
        return this.duration.toLowerCase().includes('concentration');
    }

    /**
     * Get spell slot level (same as spell level for most)
     * @returns {number} Slot level required
     */
    getSlotLevel() {
        return this.level;
    }

    /**
     * Check if spell can be cast at higher level
     * @returns {boolean} True if upcastable
     */
    canUpcast() {
        return this.level > 0 && this.description.toLowerCase().includes('higher level');
    }

    /**
     * Get material components description
     * @returns {string} Components description
     */
    getComponentsDescription() {
        const components = [];

        if (this.components.verbal) components.push('V');
        if (this.components.somatic) components.push('S');
        if (this.components.material) {
            components.push('M');
            if (this.components.materialDescription) {
                components.push(`(${this.components.materialDescription})`);
            }
        }

        return components.join(', ');
    }

    /**
     * Check if valid damage type
     * @param {string} type - Damage type
     * @returns {boolean} True if valid
     */
    isValidDamageType(type) {
        const validTypes = [
            'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
            'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing',
            'thunder'
        ];
        return validTypes.includes(type.toLowerCase());
    }

    /**
     * Check if valid ability
     * @param {string} ability - Ability name
     * @returns {boolean} True if valid
     */
    isValidAbility(ability) {
        const validAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        return validAbilities.includes(ability.toLowerCase());
    }

    /**
     * Get spell difficulty class for given caster level
     * @param {number} casterLevel - Caster level
     * @param {number} spellcastingModifier - Spellcasting ability modifier
     * @returns {number} Spell save DC
     */
    getSaveDC(casterLevel, spellcastingModifier) {
        const proficiencyBonus = Math.ceil(casterLevel / 4) + 1;
        return 8 + proficiencyBonus + spellcastingModifier;
    }

    /**
     * Get spell attack modifier for given caster level
     * @param {number} casterLevel - Caster level
     * @param {number} spellcastingModifier - Spellcasting ability modifier
     * @returns {number} Spell attack modifier
     */
    getAttackModifier(casterLevel, spellcastingModifier) {
        const proficiencyBonus = Math.ceil(casterLevel / 4) + 1;
        return proficiencyBonus + spellcastingModifier;
    }
}