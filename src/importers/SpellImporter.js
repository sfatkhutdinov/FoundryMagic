/**
 * @fileoverview Spell Importer for D&D Beyond integration
 * Handles fetching, transforming, and importing spells with active effects
 */

export default class SpellImporter {
    constructor(authService, cacheManager) {
        this._authService = authService;
        this._cacheManager = cacheManager;
        this._maxRetries = 3;
        this._retryDelay = 1000;
    }

    /**
     * Initialize the spell importer
     */
    async initialize() {
        // Initialization logic if needed
    }

    /**
     * List available spells
     * @param {Object} filters - Search filters
     * @returns {Promise<Object>} Spell list with pagination
     */
    async listAvailableSpells(filters = {}) {
        const token = this._authService.getToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const cacheKey = `spells-${JSON.stringify(filters)}`;
        const cached = await this._cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }

        const queryParams = new URLSearchParams();
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.level !== undefined) queryParams.append('level', filters.level);
        if (filters.school) queryParams.append('school', filters.school);

        const url = `https://www.dndbeyond.com/api/spells?${queryParams.toString()}`;

        const spells = await this._fetchWithRetry(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        await this._cacheManager.set(cacheKey, spells);
        return spells;
    }

    /**
     * Import spell
     * @param {Object} params - Import parameters
     * @returns {Promise<Object>} Import result
     */
    async importSpell(params) {
        const { spellId, targetCompendium } = params;

        try {
            const spellData = await this.fetchSpell(spellId);
            const foundrySpell = this.transformSpell(spellData);

            const result = await this._importToCompendium(foundrySpell, targetCompendium);

            return {
                importId: `spell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                status: 'completed',
                spell: {
                    id: spellId,
                    name: foundrySpell.name,
                    foundryId: result.id
                }
            };

        } catch (error) {
            return {
                importId: `spell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Fetch spell data
     * @param {string} spellId - Spell ID
     * @returns {Promise<Object>} Spell data
     */
    async fetchSpell(spellId) {
        const token = this._authService.getToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const cached = await this._cacheManager.getSpell(spellId);
        if (cached) {
            return cached;
        }

        const spellData = await this._fetchWithRetry(
            `https://www.dndbeyond.com/api/spells/${spellId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        await this._cacheManager.setSpell(spellId, spellData);
        return spellData;
    }

    /**
     * Transform D&D Beyond spell to Foundry format
     * @param {Object} ddbSpell - D&D Beyond spell data
     * @returns {Object} Foundry spell data
     */
    transformSpell(ddbSpell) {
        return {
            id: ddbSpell.id,
            name: ddbSpell.name,
            level: ddbSpell.level,
            school: ddbSpell.school,
            castingTime: ddbSpell.castingTime,
            range: ddbSpell.range,
            components: {
                verbal: ddbSpell.components.includes('V'),
                somatic: ddbSpell.components.includes('S'),
                material: ddbSpell.components.includes('M'),
                materialDescription: ddbSpell.materialComponents
            },
            duration: ddbSpell.duration,
            description: ddbSpell.description,
            damage: ddbSpell.damage ? {
                dice: ddbSpell.damage.dice,
                type: ddbSpell.damage.type
            } : null,
            savingThrow: ddbSpell.savingThrow,
            activeEffects: this._generateActiveEffects(ddbSpell)
        };
    }

    /**
     * Generate active effects for spell
     * @private
     * @param {Object} spell - Spell data
     * @returns {Array} Active effects
     */
    _generateActiveEffects(spell) {
        const effects = [];

        // Concentration effects
        if (spell.duration.toLowerCase().includes('concentration')) {
            effects.push({
                name: `${spell.name} (Concentration)`,
                duration: {
                    rounds: null, // Until broken
                    concentration: true
                },
                changes: [
                    // Effects would depend on spell mechanics
                ]
            });
        }

        // Damage over time effects
        if (spell.description.toLowerCase().includes('damage') &&
            spell.duration !== 'Instantaneous') {
            effects.push({
                name: `${spell.name} (Ongoing)`,
                duration: this._parseDuration(spell.duration),
                changes: [
                    // Damage effects would be calculated
                ]
            });
        }

        return effects;
    }

    /**
     * Parse duration string to Foundry format
     * @private
     * @param {string} duration - Duration string
     * @returns {Object} Duration object
     */
    _parseDuration(duration) {
        const lower = duration.toLowerCase();

        if (lower === 'instantaneous') {
            return { rounds: 0 };
        }

        // Parse "1 minute", "10 minutes", etc.
        const minuteMatch = lower.match(/(\d+)\s*minute/);
        if (minuteMatch) {
            return { rounds: parseInt(minuteMatch[1]) * 10 }; // 1 minute = 10 rounds
        }

        const hourMatch = lower.match(/(\d+)\s*hour/);
        if (hourMatch) {
            return { rounds: parseInt(hourMatch[1]) * 600 }; // 1 hour = 600 rounds
        }

        // Default to 1 round for unknown durations
        return { rounds: 1 };
    }

    /**
     * Import to compendium
     * @private
     * @param {Object} spell - Spell data
     * @param {string} compendiumId - Target compendium
     * @returns {Promise<Object>} Import result
     */
    async _importToCompendium(spell, compendiumId) {
        // Placeholder
        return {
            id: `Item.${Date.now()}`,
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
                    throw new Error('Spell not found');
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