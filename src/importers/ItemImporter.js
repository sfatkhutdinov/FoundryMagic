/**
 * @fileoverview Item Importer for D&D Beyond integration
 * Handles fetching, transforming, and importing items with dnd5e properties
 */

export default class ItemImporter {
    constructor(authService, cacheManager) {
        this._authService = authService;
        this._cacheManager = cacheManager;
        this._maxRetries = 3;
        this._retryDelay = 1000;
    }

    /**
     * Initialize the item importer
     */
    async initialize() {
        // Initialization logic if needed
    }

    /**
     * List available items
     * @param {Object} filters - Search filters
     * @returns {Promise<Object>} Item list with pagination
     */
    async listAvailableItems(filters = {}) {
        const token = this._authService.getToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const cacheKey = `items-${JSON.stringify(filters)}`;
        const cached = await this._cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }

        const queryParams = new URLSearchParams();
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.rarity) queryParams.append('rarity', filters.rarity);
        if (filters.category) queryParams.append('category', filters.category);

        const url = `https://www.dndbeyond.com/api/magic-items?${queryParams.toString()}`;

        const items = await this._fetchWithRetry(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        await this._cacheManager.set(cacheKey, items);
        return items;
    }

    /**
     * Import item
     * @param {Object} params - Import parameters
     * @returns {Promise<Object>} Import result
     */
    async importItem(params) {
        const { itemId, targetCompendium } = params;

        try {
            const itemData = await this.fetchItem(itemId);
            const foundryItem = this.transformItem(itemData);

            const result = await this._importToCompendium(foundryItem, targetCompendium);

            return {
                importId: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                status: 'completed',
                item: {
                    id: itemId,
                    name: foundryItem.name,
                    foundryId: result.id
                }
            };

        } catch (error) {
            return {
                importId: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Fetch item data
     * @param {string} itemId - Item ID
     * @returns {Promise<Object>} Item data
     */
    async fetchItem(itemId) {
        const token = this._authService.getToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const cached = await this._cacheManager.getItem(itemId);
        if (cached) {
            return cached;
        }

        const itemData = await this._fetchWithRetry(
            `https://www.dndbeyond.com/api/magic-items/${itemId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        await this._cacheManager.setItem(itemId, itemData);
        return itemData;
    }

    /**
     * Transform D&D Beyond item to Foundry format
     * @param {Object} ddbItem - D&D Beyond item data
     * @returns {Object} Foundry item data
     */
    transformItem(ddbItem) {
        const item = {
            id: ddbItem.id,
            name: ddbItem.name,
            type: this._determineItemType(ddbItem),
            rarity: ddbItem.rarity || 'common',
            weight: ddbItem.weight || 0,
            cost: { gp: ddbItem.cost || 0 },
            properties: ddbItem.properties || [],
            description: ddbItem.description,
            attunement: ddbItem.attunement || false
        };

        // Add type-specific properties
        if (item.type === 'weapon') {
            item.damage = ddbItem.damage ? {
                dice: ddbItem.damage.dice,
                type: ddbItem.damage.type
            } : null;
        }

        if (item.type === 'armor') {
            item.armorClass = ddbItem.armorClass ? {
                value: ddbItem.armorClass.value,
                dexBonus: ddbItem.armorClass.dexBonus || 0
            } : null;
        }

        return item;
    }

    /**
     * Determine Foundry item type from D&D Beyond data
     * @private
     * @param {Object} item - Item data
     * @returns {string} Foundry item type
     */
    _determineItemType(item) {
        const category = item.category?.toLowerCase();

        if (category?.includes('weapon')) return 'weapon';
        if (category?.includes('armor')) return 'armor';
        if (category?.includes('tool')) return 'tool';
        if (category?.includes('potion') || category?.includes('scroll')) return 'consumable';

        // Check for magical properties
        if (item.rarity !== 'common' || item.attunement) {
            return 'equipment'; // Magic items
        }

        return 'equipment'; // Default
    }

    /**
     * Import to compendium
     * @private
     * @param {Object} item - Item data
     * @param {string} compendiumId - Target compendium
     * @returns {Promise<Object>} Import result
     */
    async _importToCompendium(item, compendiumId) {
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
                    throw new Error('Item not found');
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