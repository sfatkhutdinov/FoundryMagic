/**
 * @fileoverview Compendium model for organized collections of imported content
 */

export default class Compendium {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.type = data.type || '';
        this.folder = data.folder || '';
        this.source = data.source || '';
        this.lastSync = data.lastSync || null;
        this.itemCount = data.itemCount || 0;
        this.state = data.state || 'created';
    }

    /**
     * Validate compendium data
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];

        // Required fields
        if (!this.name) errors.push('Name is required');
        if (!this.type) errors.push('Type is required');

        // Type validation
        const validTypes = ['characters', 'monsters', 'spells', 'items', 'scenes', 'journals'];
        if (!validTypes.includes(this.type.toLowerCase())) {
            errors.push('Type must be one of: ' + validTypes.join(', '));
        }

        // Name validation (Foundry compendium naming rules)
        if (this.name.length > 50) {
            errors.push('Name cannot exceed 50 characters');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(this.name)) {
            errors.push('Name can only contain letters, numbers, hyphens, and underscores');
        }

        // Item count validation
        if (this.itemCount < 0) {
            errors.push('Item count cannot be negative');
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
            'created': ['populated'],
            'populated': ['synchronized'],
            'synchronized': ['active'],
            'active': ['active'] // Can stay active
        };

        if (validTransitions[this.state]?.includes(newState)) {
            this.state = newState;
            return true;
        }

        return false;
    }

    /**
     * Get compendium summary
     * @returns {Object} Summary data
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            folder: this.folder,
            source: this.source,
            itemCount: this.itemCount,
            lastSync: this.lastSync,
            state: this.state
        };
    }

    /**
     * Update item count
     * @param {number} count - New count
     */
    updateItemCount(count) {
        this.itemCount = Math.max(0, count);
        this.lastSync = new Date().toISOString();
    }

    /**
     * Increment item count
     * @param {number} amount - Amount to add (default 1)
     */
    incrementItemCount(amount = 1) {
        this.itemCount += amount;
        this.lastSync = new Date().toISOString();
    }

    /**
     * Get full Foundry compendium path
     * @returns {string} Compendium path
     */
    getCompendiumPath() {
        return `foundrymagic.${this.type}`;
    }

    /**
     * Check if compendium is empty
     * @returns {boolean} True if empty
     */
    isEmpty() {
        return this.itemCount === 0;
    }

    /**
     * Check if compendium needs sync
     * @param {number} hours - Hours since last sync to consider stale
     * @returns {boolean} True if needs sync
     */
    needsSync(hours = 24) {
        if (!this.lastSync) return true;

        const lastSyncTime = new Date(this.lastSync);
        const now = new Date();
        const hoursSinceSync = (now - lastSyncTime) / (1000 * 60 * 60);

        return hoursSinceSync > hours;
    }

    /**
     * Get compendium size category
     * @returns {string} Size category
     */
    getSizeCategory() {
        if (this.itemCount < 10) return 'Small';
        if (this.itemCount < 50) return 'Medium';
        if (this.itemCount < 100) return 'Large';
        return 'Huge';
    }

    /**
     * Get organization info
     * @returns {Object} Organization data
     */
    getOrganizationInfo() {
        return {
            folder: this.folder,
            type: this.type,
            source: this.source,
            sizeCategory: this.getSizeCategory(),
            isOrganized: !!this.folder
        };
    }

    /**
     * Mark as synchronized
     */
    markSynchronized() {
        this.lastSync = new Date().toISOString();
        this.transitionTo('synchronized');
    }

    /**
     * Check if compendium is from D&D Beyond
     * @returns {boolean} True if DDB source
     */
    isFromDDB() {
        return this.source.toLowerCase().includes('d&d beyond') ||
            this.source.toLowerCase().includes('ddb');
    }

    /**
     * Get display name with metadata
     * @returns {string} Formatted name
     */
    getDisplayName() {
        let display = this.name;

        if (this.source) {
            display += ` (${this.source})`;
        }

        if (this.itemCount > 0) {
            display += ` [${this.itemCount}]`;
        }

        return display;
    }

    /**
     * Get compendium stats
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            totalItems: this.itemCount,
            sizeCategory: this.getSizeCategory(),
            lastSync: this.lastSync,
            daysSinceSync: this.lastSync ?
                Math.floor((new Date() - new Date(this.lastSync)) / (1000 * 60 * 60 * 24)) :
                null,
            isActive: this.state === 'active',
            needsSync: this.needsSync()
        };
    }

    /**
     * Reset compendium
     */
    reset() {
        this.itemCount = 0;
        this.lastSync = null;
        this.transitionTo('created');
    }
}