/**
 * @fileoverview Adventure model for D&D Beyond adventure modules
 */

export default class Adventure {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || '';
        this.description = data.description || '';
        this.scenes = data.scenes || [];
        this.journals = data.journals || [];
        this.encounters = data.encounters || [];
        this.handouts = data.handouts || [];
        this.metadata = data.metadata || {};
        this.state = data.state || 'discovered';
    }

    /**
     * Validate adventure data
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];

        // Required fields
        if (!this.title) errors.push('Title is required');
        if (!this.description) errors.push('Description is required');

        // Scenes validation
        for (const scene of this.scenes) {
            if (!scene.name) {
                errors.push('Scenes must have a name');
            }
            if (!scene.mapImage && !scene.description) {
                errors.push('Scenes must have either a map image or description');
            }
        }

        // Journals validation
        for (const journal of this.journals) {
            if (!journal.title) {
                errors.push('Journals must have a title');
            }
        }

        // Encounters validation
        for (const encounter of this.encounters) {
            if (!encounter.name) {
                errors.push('Encounters must have a name');
            }
            if (!encounter.monsters || encounter.monsters.length === 0) {
                errors.push('Encounters must have at least one monster');
            }
        }

        // Handouts validation
        for (const handout of this.handouts) {
            if (!handout.title) {
                errors.push('Handouts must have a title');
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
            'processed': ['imported'],
            'imported': ['active'],
            'active': ['active'] // Can stay active
        };

        if (validTransitions[this.state]?.includes(newState)) {
            this.state = newState;
            return true;
        }

        return false;
    }

    /**
     * Get adventure summary
     * @returns {Object} Summary data
     */
    getSummary() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            sceneCount: this.scenes.length,
            journalCount: this.journals.length,
            encounterCount: this.encounters.length,
            handoutCount: this.handouts.length,
            state: this.state
        };
    }

    /**
     * Get scenes with enhanced data
     * @returns {Array} Scenes with enhancement info
     */
    getEnhancedScenes() {
        return this.scenes.map(scene => ({
            ...scene,
            hasWalls: !!(scene.walls && scene.walls.length > 0),
            hasLighting: !!(scene.lighting && scene.lighting.length > 0),
            tokenCount: scene.tokens ? scene.tokens.length : 0
        }));
    }

    /**
     * Get all monsters used in encounters
     * @returns {Array} Unique monster IDs
     */
    getMonsterIds() {
        const monsterIds = new Set();

        for (const encounter of this.encounters) {
            if (encounter.monsters) {
                for (const monster of encounter.monsters) {
                    if (monster.id) {
                        monsterIds.add(monster.id);
                    }
                }
            }
        }

        return Array.from(monsterIds);
    }

    /**
     * Calculate adventure difficulty rating
     * @returns {string} Difficulty level
     */
    getDifficultyRating() {
        const totalMonsters = this.encounters.reduce((sum, encounter) => {
            return sum + (encounter.monsters ? encounter.monsters.length : 0);
        }, 0);

        if (totalMonsters <= 5) return 'Easy';
        if (totalMonsters <= 10) return 'Medium';
        if (totalMonsters <= 15) return 'Hard';
        return 'Deadly';
    }
}