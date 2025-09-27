/**
 * @fileoverview Character Importer for D&D Beyond integration
 * Handles fetching, transforming, and importing character data into Foundry VTT
 */

export default class CharacterImporter {
    constructor(authService, cacheManager) {
        this._authService = authService;
        this._cacheManager = cacheManager;
        this._maxRetries = 3;
        this._retryDelay = 1000; // 1 second base delay
    }

    /**
     * Initialize the character importer
     */
    async initialize() {
        // Initialization logic if needed
    }

    /**
     * Fetch character data from D&D Beyond API
     * @param {string} characterId - D&D Beyond character ID
     * @returns {Promise<Object>} Character data
     */
    async fetchCharacter(characterId) {
        // Check authentication
        const token = this._authService.getToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const isValid = await this._authService.validateToken();
        if (!isValid) {
            throw new Error('Authentication required');
        }

        // Check cache first
        const cached = await this._cacheManager.getCharacter(characterId);
        if (cached) {
            return cached;
        }

        // Fetch from API with retry logic
        const characterData = await this._fetchWithRetry(
            `https://character-service.dndbeyond.com/character/v5/character/${characterId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Cache the result
        await this._cacheManager.setCharacter(characterId, characterData);

        return characterData;
    }

    /**
     * Fetch with exponential backoff retry logic
     * @private
     */
    async _fetchWithRetry(url, options, retryCount = 0) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Character not found');
                } else if (response.status === 403) {
                    // Check if premium access is required
                    const hasPremium = await this._authService.hasPremiumAccess();
                    if (!hasPremium) {
                        throw new Error('Premium subscription required');
                    }
                    throw new Error('Access forbidden');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            return await response.json();
        } catch (error) {
            if (retryCount >= this._maxRetries) {
                throw new Error('Maximum retry attempts exceeded');
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = this._retryDelay * Math.pow(2, retryCount);
            await new Promise(resolve => setTimeout(resolve, delay));

            return this._fetchWithRetry(url, options, retryCount + 1);
        }
    }

    /**
     * Transform D&D Beyond character data to Foundry format
     * @param {Object} ddbCharacter - D&D Beyond character data
     * @returns {Object} Foundry-compatible character data
     */
    transformToFoundryFormat(ddbCharacter) {
        const foundryData = {
            name: ddbCharacter.name || 'Unknown Character',
            type: 'character',
            system: {
                details: {
                    race: this._extractRace(ddbCharacter),
                    class: this._extractClass(ddbCharacter),
                    level: { value: this._calculateTotalLevel(ddbCharacter) },
                    background: this._extractBackground(ddbCharacter),
                    xp: { value: 0 }
                },
                abilities: this._extractAbilities(ddbCharacter),
                attributes: {
                    hp: this._extractHitPoints(ddbCharacter)
                }
            }
        };

        return foundryData;
    }

    /**
     * Extract race information
     * @private
     */
    _extractRace(ddbCharacter) {
        return ddbCharacter.race?.fullName || ddbCharacter.race?.definition?.name || '';
    }

    /**
     * Extract class information
     * @private
     */
    _extractClass(ddbCharacter) {
        if (!ddbCharacter.classes || ddbCharacter.classes.length === 0) {
            return '';
        }

        return ddbCharacter.classes
            .map(cls => `${cls.definition?.name || cls.name} ${cls.level}`)
            .join(', ');
    }

    /**
     * Calculate total character level
     * @private
     */
    _calculateTotalLevel(ddbCharacter) {
        if (!ddbCharacter.classes || ddbCharacter.classes.length === 0) {
            return 1;
        }

        return ddbCharacter.classes.reduce((total, cls) => total + (cls.level || 0), 0);
    }

    /**
     * Extract background information
     * @private
     */
    _extractBackground(ddbCharacter) {
        return ddbCharacter.background?.definition?.name || '';
    }

    /**
     * Extract and transform ability scores
     * @private
     */
    _extractAbilities(ddbCharacter) {
        const abilityMap = {
            1: 'str', 2: 'dex', 3: 'con',
            4: 'int', 5: 'wis', 6: 'cha'
        };

        const abilities = {
            str: { value: 10, mod: 0 },
            dex: { value: 10, mod: 0 },
            con: { value: 10, mod: 0 },
            int: { value: 10, mod: 0 },
            wis: { value: 10, mod: 0 },
            cha: { value: 10, mod: 0 }
        };

        if (ddbCharacter.stats) {
            ddbCharacter.stats.forEach(stat => {
                const abilityKey = abilityMap[stat.id];
                if (abilityKey) {
                    const score = stat.value || 10;
                    abilities[abilityKey] = {
                        value: score,
                        mod: Math.floor((score - 10) / 2)
                    };
                }
            });
        }

        return abilities;
    }

    /**
     * Extract hit points information
     * @private
     */
    _extractHitPoints(ddbCharacter) {
        const baseHp = ddbCharacter.baseHitPoints || 0;
        const currentHp = ddbCharacter.hitPointInfo?.current ?? baseHp;
        const maxHp = ddbCharacter.hitPointInfo?.maximum ?? baseHp;

        return {
            value: currentHp,
            max: maxHp
        };
    }

    /**
     * Create a new Foundry actor from character data
     * @param {Object} characterData - Foundry-compatible character data
     * @returns {Promise<Actor>} Created actor
     */
    async createFoundryActor(characterData) {
        try {
            const ActorClass = CONFIG.Actor?.documentClass || Actor;
            const actor = await ActorClass.create(characterData);
            return actor;
        } catch (error) {
            throw new Error(`Failed to create actor: ${error.message}`);
        }
    }

    /**
     * Update an existing Foundry actor
     * @param {Actor} actor - Existing actor to update
     * @param {Object} characterData - New character data
     * @returns {Promise<boolean>} True if successful
     */
    async updateFoundryActor(actor, characterData) {
        try {
            await actor.update(characterData);
            return true;
        } catch (error) {
            throw new Error(`Failed to update actor: ${error.message}`);
        }
    }

    /**
     * Extract equipment from D&D Beyond character
     * @param {Object} ddbCharacter - D&D Beyond character data
     * @returns {Array} Array of equipment items
     */
    extractEquipment(ddbCharacter) {
        if (!ddbCharacter.inventory || !Array.isArray(ddbCharacter.inventory)) {
            return [];
        }

        return ddbCharacter.inventory.map(item => ({
            name: item.definition?.name || 'Unknown Item',
            type: 'equipment',
            system: {
                equipped: item.equipped || false,
                quantity: item.quantity || 1,
                weight: item.definition?.weight || 0,
                description: {
                    value: item.definition?.description || ''
                }
            }
        }));
    }

    /**
     * Extract spells from D&D Beyond character
     * @param {Object} ddbCharacter - D&D Beyond character data
     * @returns {Array} Array of spell items
     */
    extractSpells(ddbCharacter) {
        const spells = [];

        if (ddbCharacter.spells?.class) {
            ddbCharacter.spells.class.forEach(spell => {
                spells.push({
                    name: spell.definition?.name || 'Unknown Spell',
                    type: 'spell',
                    system: {
                        level: spell.definition?.level || 0,
                        school: spell.definition?.school?.toLowerCase() || '',
                        prepared: spell.prepared || false,
                        description: {
                            value: spell.definition?.description || ''
                        }
                    }
                });
            });
        }

        return spells;
    }

    /**
     * Extract features from D&D Beyond character
     * @param {Object} ddbCharacter - D&D Beyond character data
     * @returns {Array} Array of feature items
     */
    extractFeatures(ddbCharacter) {
        const features = [];

        if (ddbCharacter.classes) {
            ddbCharacter.classes.forEach(cls => {
                if (cls.classFeatures) {
                    cls.classFeatures.forEach(feature => {
                        features.push({
                            name: feature.definition?.name || 'Unknown Feature',
                            type: 'feat',
                            system: {
                                description: {
                                    value: feature.definition?.description || ''
                                }
                            }
                        });
                    });
                }
            });
        }

        return features;
    }
}