/**
 * @fileoverview Monster model for D&D Beyond creature stat blocks
 */

export default class Monster {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.type = data.type || '';
        this.size = data.size || '';
        this.hitPoints = data.hitPoints || { average: 10, dice: '1d8' };
        this.armorClass = data.armorClass || { value: 10, type: 'natural armor' };
        this.speed = data.speed || { walk: 30 };
        this.abilities = data.abilities || {
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10
        };
        this.skills = data.skills || {};
        this.actions = data.actions || [];
        this.traits = data.traits || [];
        this.challengeRating = data.challengeRating || 0;
        this.state = data.state || 'referenced';
    }

    /**
     * Validate monster data
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];

        // Required fields
        if (!this.name) errors.push('Name is required');
        if (!this.type) errors.push('Type is required');
        if (!this.size) errors.push('Size is required');

        // Size validation
        const validSizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
        if (!validSizes.includes(this.size.toLowerCase())) {
            errors.push('Size must be one of: ' + validSizes.join(', '));
        }

        // Hit points validation
        if (this.hitPoints.average < 1) {
            errors.push('Hit points average must be at least 1');
        }

        // Armor class validation
        if (this.armorClass.value < 0) {
            errors.push('Armor class cannot be negative');
        }

        // Ability scores validation
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        for (const ability of abilities) {
            if (this.abilities[ability] < 1 || this.abilities[ability] > 30) {
                errors.push(`${ability.toUpperCase()} must be between 1 and 30`);
            }
        }

        // Challenge rating validation
        if (this.challengeRating < 0 || this.challengeRating > 30) {
            errors.push('Challenge rating must be between 0 and 30');
        }

        // Actions validation
        for (const action of this.actions) {
            if (!action.name) {
                errors.push('Actions must have a name');
            }
        }

        // Traits validation
        for (const trait of this.traits) {
            if (!trait.name) {
                errors.push('Traits must have a name');
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
            'referenced': ['downloaded'],
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
     * Get monster summary
     * @returns {Object} Summary data
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            size: this.size,
            hitPoints: this.hitPoints.average,
            armorClass: this.armorClass.value,
            challengeRating: this.challengeRating,
            state: this.state
        };
    }

    /**
     * Calculate ability modifier
     * @param {number} score - Ability score
     * @returns {number} Modifier
     */
    getAbilityModifier(ability) {
        return Math.floor((this.abilities[ability] - 10) / 2);
    }

    /**
     * Get all ability modifiers
     * @returns {Object} Modifiers for all abilities
     */
    getAbilityModifiers() {
        const modifiers = {};
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

        for (const ability of abilities) {
            modifiers[ability] = this.getAbilityModifier(ability);
        }

        return modifiers;
    }

    /**
     * Calculate proficiency bonus based on CR
     * @returns {number} Proficiency bonus
     */
    getProficiencyBonus() {
        if (this.challengeRating < 5) return 2;
        if (this.challengeRating < 9) return 3;
        if (this.challengeRating < 13) return 4;
        if (this.challengeRating < 17) return 5;
        if (this.challengeRating < 21) return 6;
        if (this.challengeRating < 25) return 7;
        if (this.challengeRating < 29) return 8;
        return 9;
    }

    /**
     * Get XP value for CR
     * @returns {number} XP value
     */
    getXPValue() {
        const crTable = {
            0: 10, 0.125: 25, 0.25: 50, 0.5: 100,
            1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800,
            6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900,
            11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000,
            16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000,
            21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000,
            26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000
        };

        return crTable[this.challengeRating] || 0;
    }

    /**
     * Check if monster is valid for given party level
     * @param {number} partyLevel - Average party level
     * @returns {string} Difficulty assessment
     */
    getDifficultyForParty(partyLevel) {
        const cr = this.challengeRating;
        const level = partyLevel;

        if (cr <= level - 3) return 'easy';
        if (cr <= level - 1) return 'medium';
        if (cr <= level + 1) return 'hard';
        if (cr <= level + 3) return 'deadly';
        return 'impossible';
    }
}