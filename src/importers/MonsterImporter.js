/**
 * @fileoverview Monster Importer for D&D Beyond integration
 * Handles fetching, transforming, and importing monster stat blocks
 */

export default class MonsterImporter {
    constructor(authService, cacheManager) {
        this._authService = authService;
        this._cacheManager = cacheManager;
        this._maxRetries = 3;
        this._retryDelay = 1000;
    }

    /**
     * Initialize the monster importer
     */
    async initialize() {
        // Initialization logic if needed
    }

    /**
     * List available monsters
     * @param {Object} filters - Search filters
     * @returns {Promise<Object>} Monster list with pagination
     */
    async listAvailableMonsters(filters = {}) {
        const token = this._authService.getToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const cacheKey = `monsters-${JSON.stringify(filters)}`;
        const cached = await this._cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }

        const queryParams = new URLSearchParams();
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.challengeRating) queryParams.append('cr', filters.challengeRating);
        if (filters.type) queryParams.append('type', filters.type);
        if (filters.environment) queryParams.append('environment', filters.environment);

        const url = `https://www.dndbeyond.com/api/monsters?${queryParams.toString()}`;

        const monsters = await this._fetchWithRetry(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        await this._cacheManager.set(cacheKey, monsters);
        return monsters;
    }

    /**
     * Import monster
     * @param {Object} params - Import parameters
     * @returns {Promise<Object>} Import result
     */
    async importMonster(params) {
        const { monsterId, targetCompendium } = params;

        try {
            const monsterData = await this.fetchMonster(monsterId);
            const foundryMonster = this.transformMonster(monsterData);

            // Import to compendium (placeholder)
            const result = await this._importToCompendium(foundryMonster, targetCompendium);

            return {
                importId: `mon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                status: 'completed',
                monster: {
                    id: monsterId,
                    name: foundryMonster.name,
                    foundryId: result.id
                }
            };

        } catch (error) {
            return {
                importId: `mon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Fetch monster data
     * @param {string} monsterId - Monster ID
     * @returns {Promise<Object>} Monster data
     */
    async fetchMonster(monsterId) {
        const token = this._authService.getToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const cached = await this._cacheManager.getMonster(monsterId);
        if (cached) {
            return cached;
        }

        const monsterData = await this._fetchWithRetry(
            `https://www.dndbeyond.com/api/monsters/${monsterId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        await this._cacheManager.setMonster(monsterId, monsterData);
        return monsterData;
    }

    /**
     * Transform D&D Beyond monster to Foundry format
     * @param {Object} ddbMonster - D&D Beyond monster data
     * @returns {Object} Foundry monster data
     */
    transformMonster(ddbMonster) {
        return {
            id: ddbMonster.id,
            name: ddbMonster.name,
            type: ddbMonster.type,
            size: ddbMonster.size,
            hitPoints: {
                average: ddbMonster.hitPoints.average,
                dice: ddbMonster.hitPoints.dice
            },
            armorClass: {
                value: ddbMonster.armorClass,
                type: ddbMonster.armorClassType || 'natural armor'
            },
            speed: ddbMonster.speed,
            abilities: ddbMonster.abilities,
            skills: ddbMonster.skills || {},
            actions: ddbMonster.actions.map(action => this._transformAction(action)),
            traits: ddbMonster.traits ? ddbMonster.traits.map(trait => this._transformTrait(trait)) : [],
            challengeRating: ddbMonster.challengeRating,
            xp: this._calculateXP(ddbMonster.challengeRating)
        };
    }

    /**
     * Transform action
     * @private
     * @param {Object} action - D&D Beyond action
     * @returns {Object} Foundry action
     */
    _transformAction(action) {
        return {
            name: action.name,
            description: action.description,
            attackBonus: action.attackBonus,
            damage: action.damage ? {
                dice: action.damage.dice,
                type: action.damage.type
            } : null
        };
    }

    /**
     * Transform trait
     * @private
     * @param {Object} trait - D&D Beyond trait
     * @returns {Object} Foundry trait
     */
    _transformTrait(trait) {
        return {
            name: trait.name,
            description: trait.description
        };
    }

    /**
     * Calculate XP from CR
     * @private
     * @param {number} cr - Challenge rating
     * @returns {number} XP value
     */
    _calculateXP(cr) {
        const xpTable = {
            0: 10, 0.125: 25, 0.25: 50, 0.5: 100,
            1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800,
            6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900,
            11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000,
            16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000,
            21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000,
            26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000
        };

        return xpTable[cr] || 0;
    }

    /**
     * Import to compendium
     * @private
     * @param {Object} monster - Monster data
     * @param {string} compendiumId - Target compendium
     * @returns {Promise<Object>} Import result
     */
    async _importToCompendium(monster, compendiumId) {
        // Placeholder for compendium import logic
        return {
            id: `Actor.${Date.now()}`,
            compendium: compendiumId
        };
    }

    /**
     * Fetch with retry logic
     * @private
     */
    async _fetchWithRetry(url, options, retryCount = 0) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Monster not found');
                } else if (response.status === 403) {
                    throw new Error('Access forbidden');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            return await response.json();
        } catch (error) {
            if (retryCount >= this._maxRetries) {
                throw error;
            }

            const delay = this._retryDelay * Math.pow(2, retryCount);
            await new Promise(resolve => setTimeout(resolve, delay));

            return this._fetchWithRetry(url, options, retryCount + 1);
        }
    }

    /**
     * Get import status
     * @param {string} importId - Import ID
     * @returns {Promise<Object>} Status
     */
    async getImportStatus(importId) {
        // Placeholder
        return {
            importId,
            status: 'completed',
            progress: { total: 1, completed: 1 }
        };
    }
}