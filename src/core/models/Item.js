/**
 * @fileoverview Item model for D&D Beyond equipment and magic items
 */

export default class Item {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.type = data.type || '';
        this.rarity = data.rarity || 'common';
        this.weight = data.weight || 0;
        this.cost = data.cost || { gp: 0 };
        this.properties = data.properties || [];
        this.damage = data.damage || null;
        this.armorClass = data.armorClass || null;
        this.description = data.description || '';
        this.attunement = data.attunement || false;
        this.state = data.state || 'discovered';
    }

    /**
     * Validate item data
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];

        // Required fields
        if (!this.name) errors.push('Name is required');
        if (!this.type) errors.push('Type is required');
        if (!this.description) errors.push('Description is required');

        // Rarity validation
        const validRarities = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];
        if (!validRarities.includes(this.rarity.toLowerCase())) {
            errors.push('Rarity must be one of: ' + validRarities.join(', '));
        }

        // Weight validation
        if (this.weight < 0) {
            errors.push('Weight cannot be negative');
        }

        // Cost validation
        if (this.cost.gp < 0) {
            errors.push('Cost cannot be negative');
        }

        // Type-specific validation
        if (this.type.toLowerCase() === 'weapon' && !this.damage) {
            errors.push('Weapons must have damage information');
        }

        if (this.type.toLowerCase() === 'armor' && !this.armorClass) {
            errors.push('Armor must have armor class information');
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

        // Armor class validation (if present)
        if (this.armorClass) {
            if (this.armorClass.value < 0) {
                errors.push('Armor class cannot be negative');
            }
            if (this.armorClass.dexBonus !== undefined && this.armorClass.dexBonus < 0) {
                errors.push('Dexterity bonus cannot be negative');
            }
        }

        // Properties validation
        for (const property of this.properties) {
            if (!property.name) {
                errors.push('Item properties must have a name');
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
     * Get item summary
     * @returns {Object} Summary data
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            rarity: this.rarity,
            weight: this.weight,
            cost: this.cost,
            attunement: this.attunement,
            state: this.state
        };
    }

    /**
     * Check if item is magical
     * @returns {boolean} True if magical
     */
    isMagical() {
        return this.rarity !== 'common' || this.attunement || this.description.toLowerCase().includes('magic');
    }

    /**
     * Check if item is weapon
     * @returns {boolean} True if weapon
     */
    isWeapon() {
        return this.type.toLowerCase() === 'weapon';
    }

    /**
     * Check if item is armor
     * @returns {boolean} True if armor
     */
    isArmor() {
        return this.type.toLowerCase() === 'armor';
    }

    /**
     * Get total weight including quantity
     * @param {number} quantity - Number of items
     * @returns {number} Total weight
     */
    getTotalWeight(quantity = 1) {
        return this.weight * quantity;
    }

    /**
     * Get total cost for quantity
     * @param {number} quantity - Number of items
     * @returns {Object} Total cost
     */
    getTotalCost(quantity = 1) {
        return {
            gp: this.cost.gp * quantity
        };
    }

    /**
     * Get armor class bonus (for armor items)
     * @param {number} dexModifier - Character dexterity modifier
     * @returns {number} AC bonus
     */
    getACBonus(dexModifier = 0) {
        if (!this.isArmor() || !this.armorClass) return 0;

        let bonus = this.armorClass.value;

        if (this.armorClass.dexBonus !== undefined) {
            bonus += Math.min(dexModifier, this.armorClass.dexBonus);
        }

        return bonus;
    }

    /**
     * Get weapon damage
     * @returns {Object|null} Damage info or null
     */
    getWeaponDamage() {
        if (!this.isWeapon() || !this.damage) return null;

        return {
            dice: this.damage.dice,
            type: this.damage.type,
            versatile: this.damage.versatile || null
        };
    }

    /**
     * Check if item requires attunement
     * @returns {boolean} True if attunement required
     */
    requiresAttunement() {
        return this.attunement === true;
    }

    /**
     * Get item properties as string
     * @returns {string} Comma-separated properties
     */
    getPropertiesString() {
        return this.properties.map(p => p.name).join(', ');
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
     * Get item category for organization
     * @returns {string} Category
     */
    getCategory() {
        const type = this.type.toLowerCase();

        if (type.includes('weapon')) return 'weapons';
        if (type.includes('armor')) return 'armor';
        if (type.includes('tool')) return 'tools';
        if (this.isMagical()) return 'magic-items';

        return 'equipment';
    }
}