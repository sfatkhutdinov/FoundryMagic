/**
 * @fileoverview Character model for D&D Beyond character data
 */

export default class Character {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.level = data.level || 1;
        this.class = data.class || '';
        this.race = data.race || '';
        this.stats = data.stats || {
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10
        };
        this.hitPoints = data.hitPoints || { current: 10, max: 10 };
        this.armorClass = data.armorClass || { value: 10, sources: [] };
        this.equipment = data.equipment || [];
        this.spells = data.spells || [];
        this.features = data.features || [];
        this.background = data.background || '';
        this.state = data.state || 'draft';
    }

    /**
     * Validate character data
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];

        // Required fields
        if (!this.name) errors.push('Name is required');
        if (!this.class) errors.push('Class is required');
        if (!this.race) errors.push('Race is required');

        // Level validation
        if (this.level < 1 || this.level > 20) {
            errors.push('Level must be between 1 and 20');
        }

        // Ability scores validation
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        for (const ability of abilities) {
            if (this.stats[ability] < 3 || this.stats[ability] > 20) {
                errors.push(`${ability.toUpperCase()} must be between 3 and 20`);
            }
        }

        // Hit points validation
        if (this.hitPoints.max < 1) {
            errors.push('Maximum hit points must be at least 1');
        }
        if (this.hitPoints.current < 0 || this.hitPoints.current > this.hitPoints.max) {
            errors.push('Current hit points must be between 0 and maximum');
        }

        // Armor class validation
        if (this.armorClass.value < 0) {
            errors.push('Armor class cannot be negative');
        }

        // Equipment validation (basic)
        for (const item of this.equipment) {
            if (!item.name) {
                errors.push('Equipment items must have a name');
            }
        }

        // Spells validation (basic)
        for (const spell of this.spells) {
            if (!spell.name) {
                errors.push('Spells must have a name');
            }
            if (spell.level < 0 || spell.level > 9) {
                errors.push('Spell level must be between 0 and 9');
            }
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
            'draft': ['validated'],
            'validated': ['imported'],
            'imported': ['synced'],
            'synced': ['synced'] // Can stay synced
        };

        if (validTransitions[this.state]?.includes(newState)) {
            this.state = newState;
            return true;
        }

        return false;
    }

    /**
     * Get character summary
     * @returns {Object} Summary data
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            level: this.level,
            class: this.class,
            race: this.race,
            hitPoints: this.hitPoints,
            armorClass: this.armorClass.value,
            state: this.state
        };
    }

    /**
     * Calculate ability modifier
     * @param {number} score - Ability score
     * @returns {number} Modifier
     */
    static calculateModifier(score) {
        return Math.floor((score - 10) / 2);
    }

    /**
     * Get proficiency bonus for level
     * @param {number} level - Character level
     * @returns {number} Proficiency bonus
     */
    static getProficiencyBonus(level) {
        return Math.ceil(level / 4) + 1;
    }
}