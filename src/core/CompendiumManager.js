/**
 * @fileoverview Compendium Management with Foundry APIs
 * Handles creation, management, and population of Foundry compendiums
 */

export default class CompendiumManager {
    constructor(foundryMagic) {
        this._foundryMagic = foundryMagic;
        this._compendiums = new Map();
        this._autoCreate = true;
    }

    /**
     * Initialize the compendium manager
     */
    async initialize() {
        console.log('FoundryMagic | Initializing compendium manager...');

        // Load settings
        this._autoCreate = game.settings.get('foundrymagic', 'autoCreateCompendiums');

        // Discover existing compendiums
        await this._discoverCompendiums();

        // Set up compendium hooks
        this._registerHooks();

        console.log('FoundryMagic | Compendium manager initialized');
    }

    /**
     * Discover existing compendiums
     * @private
     */
    async _discoverCompendiums() {
        const packs = game.packs;

        for (const pack of packs) {
            if (pack.metadata.label.includes('FoundryMagic') ||
                pack.metadata.label.includes('D&D Beyond')) {
                this._compendiums.set(pack.collection, {
                    pack,
                    type: this._determinePackType(pack),
                    lastUpdated: pack.metadata.lastModified || Date.now()
                });
            }
        }

        console.log(`FoundryMagic | Discovered ${this._compendiums.size} relevant compendiums`);
    }

    /**
     * Register compendium-related hooks
     * @private
     */
    _registerHooks() {
        Hooks.on('createCompendium', this._onCreateCompendium.bind(this));
        Hooks.on('deleteCompendium', this._onDeleteCompendium.bind(this));
        Hooks.on('updateCompendium', this._onUpdateCompendium.bind(this));
    }

    /**
     * Determine pack type from metadata
     * @private
     * @param {Compendium} pack - Compendium pack
     * @returns {string} Pack type
     */
    _determinePackType(pack) {
        const label = pack.metadata.label.toLowerCase();
        const entity = pack.metadata.type;

        if (label.includes('character') || entity === 'Actor') return 'characters';
        if (label.includes('monster') || label.includes('creature')) return 'monsters';
        if (label.includes('spell')) return 'spells';
        if (label.includes('item') || label.includes('equipment')) return 'items';
        if (label.includes('adventure') || label.includes('campaign')) return 'adventures';

        return 'misc';
    }

    /**
     * Ensure compendium exists for content type
     * @param {string} contentType - Type of content
     * @param {string} label - Compendium label
     * @returns {Promise<Compendium>} Compendium instance
     */
    async ensureCompendium(contentType, label = null) {
        const compendiumKey = `foundrymagic.${contentType}`;
        let compendium = this._compendiums.get(compendiumKey);

        if (!compendium) {
            if (!this._autoCreate) {
                throw new Error(`Compendium for ${contentType} does not exist and auto-creation is disabled`);
            }

            compendium = await this._createCompendium(contentType, label);
        }

        return compendium.pack;
    }

    /**
     * Create a new compendium
     * @private
     * @param {string} contentType - Content type
     * @param {string} customLabel - Custom label
     * @returns {Promise<Object>} Compendium info
     */
    async _createCompendium(contentType, customLabel = null) {
        const label = customLabel || `FoundryMagic ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`;
        const entityType = this._getEntityType(contentType);
        const compendiumKey = `foundrymagic.${contentType}`;

        try {
            // Create the compendium
            const pack = await game.packs.createCompendium({
                name: compendiumKey,
                label: label,
                type: entityType,
                package: 'foundrymagic',
                path: `packs/${contentType}.db`,
                private: false,
                flags: {
                    foundrymagic: {
                        contentType,
                        created: Date.now(),
                        version: '1.0.0'
                    }
                }
            });

            const compendiumInfo = {
                pack,
                type: contentType,
                lastUpdated: Date.now()
            };

            this._compendiums.set(compendiumKey, compendiumInfo);

            console.log(`FoundryMagic | Created compendium: ${label}`);
            ui.notifications.info(`Created compendium: ${label}`);

            return compendiumInfo;

        } catch (error) {
            console.error('FoundryMagic | Failed to create compendium:', error);
            throw new Error(`Failed to create compendium for ${contentType}: ${error.message}`);
        }
    }

    /**
     * Get entity type for content type
     * @private
     * @param {string} contentType - Content type
     * @returns {string} Entity type
     */
    _getEntityType(contentType) {
        switch (contentType) {
            case 'characters':
            case 'monsters':
                return 'Actor';
            case 'spells':
            case 'items':
                return 'Item';
            case 'adventures':
                return 'JournalEntry';
            case 'scenes':
                return 'Scene';
            default:
                return 'Item';
        }
    }

    /**
     * Add content to compendium
     * @param {string} contentType - Content type
     * @param {Object} data - Content data
     * @param {Object} options - Options
     * @returns {Promise<Object>} Added document
     */
    async addToCompendium(contentType, data, options = {}) {
        const pack = await this.ensureCompendium(contentType);
        const entityType = pack.metadata.type;

        try {
            // Transform data for Foundry
            const transformedData = await this._transformForFoundry(data, entityType, options);

            // Check for duplicates
            const existing = await this._findExistingEntry(pack, transformedData);
            if (existing && !options.overwrite) {
                if (options.skipDuplicates) {
                    console.log(`FoundryMagic | Skipping duplicate: ${transformedData.name}`);
                    return existing;
                }

                throw new Error(`Entry already exists: ${transformedData.name}`);
            }

            // Create or update the entry
            let document;
            if (existing && options.overwrite) {
                document = await pack.updateEntity(existing._id, transformedData);
                console.log(`FoundryMagic | Updated compendium entry: ${transformedData.name}`);
            } else {
                document = await pack.createEntity(transformedData);
                console.log(`FoundryMagic | Added to compendium: ${transformedData.name}`);
            }

            // Update metadata
            await this._updateCompendiumMetadata(pack.collection, {
                lastUpdated: Date.now(),
                itemCount: pack.index.size
            });

            return document;

        } catch (error) {
            console.error('FoundryMagic | Failed to add to compendium:', error);
            throw error;
        }
    }

    /**
     * Transform data for Foundry
     * @private
     * @param {Object} data - Raw data
     * @param {string} entityType - Entity type
     * @param {Object} options - Transform options
     * @returns {Promise<Object>} Transformed data
     */
    async _transformForFoundry(data, entityType, options) {
        // Apply D&D 5e compatibility transformations
        if (this._foundryMagic.dnd5eCompat) {
            const contentType = this._getContentTypeFromEntity(entityType);
            data = this._foundryMagic.dnd5eCompat.transformForDnD5e(data, contentType);
        }

        // Ensure proper structure
        data.flags = data.flags || {};
        data.flags.foundrymagic = {
            importedAt: Date.now(),
            source: 'dndbeyond',
            version: data.version || '1.0.0'
        };

        return data;
    }

    /**
     * Get content type from entity type
     * @private
     * @param {string} entityType - Entity type
     * @returns {string} Content type
     */
    _getContentTypeFromEntity(entityType) {
        switch (entityType) {
            case 'Actor':
                return 'character'; // Default, will be overridden by data
            case 'Item':
                return 'item'; // Default, will be overridden by data
            case 'JournalEntry':
                return 'adventure';
            case 'Scene':
                return 'scene';
            default:
                return 'misc';
        }
    }

    /**
     * Find existing entry in compendium
     * @private
     * @param {Compendium} pack - Compendium pack
     * @param {Object} data - Entry data
     * @returns {Promise<Object|null>} Existing entry or null
     */
    async _findExistingEntry(pack, data) {
        const index = pack.index;

        // Search by name first
        let existing = index.find(entry => entry.name === data.name);

        // If not found, try by source ID if available
        if (!existing && data.flags?.foundrymagic?.sourceId) {
            existing = index.find(entry =>
                entry.flags?.foundrymagic?.sourceId === data.flags.foundrymagic.sourceId
            );
        }

        if (existing) {
            return await pack.getEntity(existing._id);
        }

        return null;
    }

    /**
     * Import multiple items to compendium
     * @param {string} contentType - Content type
     * @param {Array} items - Array of items to import
     * @param {Object} options - Import options
     * @returns {Promise<Object>} Import results
     */
    async importBatch(contentType, items, options = {}) {
        const results = {
            successful: [],
            failed: [],
            skipped: []
        };

        const pack = await this.ensureCompendium(contentType);

        for (const item of items) {
            try {
                const document = await this.addToCompendium(contentType, item, options);
                results.successful.push({
                    id: item.id,
                    name: item.name,
                    documentId: document._id
                });
            } catch (error) {
                if (error.message.includes('already exists') && options.skipDuplicates) {
                    results.skipped.push({
                        id: item.id,
                        name: item.name,
                        reason: 'duplicate'
                    });
                } else {
                    results.failed.push({
                        id: item.id,
                        name: item.name,
                        error: error.message
                    });
                }
            }
        }

        console.log(`FoundryMagic | Batch import completed: ${results.successful.length} successful, ${results.failed.length} failed, ${results.skipped.length} skipped`);

        return results;
    }

    /**
     * Get compendium contents
     * @param {string} contentType - Content type
     * @returns {Promise<Array>} Compendium contents
     */
    async getCompendiumContents(contentType) {
        const pack = await this.ensureCompendium(contentType);
        return await pack.getContent();
    }

    /**
     * Search compendium
     * @param {string} contentType - Content type
     * @param {string} query - Search query
     * @returns {Promise<Array>} Search results
     */
    async searchCompendium(contentType, query) {
        const contents = await this.getCompendiumContents(contentType);

        if (!query) return contents;

        const searchTerm = query.toLowerCase();
        return contents.filter(item =>
            item.name.toLowerCase().includes(searchTerm) ||
            item.data?.description?.value?.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Delete from compendium
     * @param {string} contentType - Content type
     * @param {string} entryId - Entry ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteFromCompendium(contentType, entryId) {
        try {
            const pack = await this.ensureCompendium(contentType);
            await pack.deleteEntity(entryId);

            console.log(`FoundryMagic | Deleted from compendium: ${entryId}`);
            return true;
        } catch (error) {
            console.error('FoundryMagic | Failed to delete from compendium:', error);
            return false;
        }
    }

    /**
     * Update compendium metadata
     * @private
     * @param {string} compendiumKey - Compendium key
     * @param {Object} metadata - Metadata to update
     */
    async _updateCompendiumMetadata(compendiumKey, metadata) {
        const compendiumInfo = this._compendiums.get(compendiumKey);
        if (compendiumInfo) {
            Object.assign(compendiumInfo, metadata);
        }
    }

    /**
     * Get compendium statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        const stats = {
            totalCompendiums: this._compendiums.size,
            byType: {},
            totalEntries: 0
        };

        for (const [key, info] of this._compendiums) {
            const type = info.type;
            stats.byType[type] = (stats.byType[type] || 0) + 1;

            if (info.pack) {
                stats.totalEntries += info.pack.index.size;
            }
        }

        return stats;
    }

    /**
     * Clean up empty compendiums
     * @returns {Promise<number>} Number of compendiums cleaned up
     */
    async cleanupEmptyCompendiums() {
        let cleaned = 0;

        for (const [key, info] of this._compendiums) {
            if (info.pack && info.pack.index.size === 0) {
                try {
                    await info.pack.delete();
                    this._compendiums.delete(key);
                    cleaned++;
                } catch (error) {
                    console.error(`FoundryMagic | Failed to delete empty compendium ${key}:`, error);
                }
            }
        }

        return cleaned;
    }

    /**
     * Export compendium to JSON
     * @param {string} contentType - Content type
     * @returns {Promise<Object>} Export data
     */
    async exportCompendium(contentType) {
        const pack = await this.ensureCompendium(contentType);
        const contents = await pack.getContent();

        return {
            metadata: pack.metadata,
            contents: contents.map(entity => entity.toJSON()),
            exportedAt: Date.now()
        };
    }

    /**
     * Hook: Create compendium
     * @private
     * @param {Compendium} pack - Created compendium
     */
    _onCreateCompendium(pack) {
        if (pack.metadata.package === 'foundrymagic') {
            const contentType = pack.metadata.flags?.foundrymagic?.contentType;
            if (contentType) {
                this._compendiums.set(pack.collection, {
                    pack,
                    type: contentType,
                    lastUpdated: Date.now()
                });
                console.log(`FoundryMagic | Tracked new compendium: ${pack.metadata.label}`);
            }
        }
    }

    /**
     * Hook: Delete compendium
     * @private
     * @param {Compendium} pack - Deleted compendium
     */
    _onDeleteCompendium(pack) {
        if (this._compendiums.has(pack.collection)) {
            this._compendiums.delete(pack.collection);
            console.log(`FoundryMagic | Removed tracked compendium: ${pack.metadata.label}`);
        }
    }

    /**
     * Hook: Update compendium
     * @private
     * @param {Compendium} pack - Updated compendium
     * @param {Object} data - Update data
     */
    _onUpdateCompendium(pack, data) {
        const info = this._compendiums.get(pack.collection);
        if (info) {
            info.lastUpdated = Date.now();
        }
    }

    /**
     * Get all tracked compendiums
     * @returns {Array} Compendium list
     */
    getTrackedCompendiums() {
        return Array.from(this._compendiums.values()).map(info => ({
            key: info.pack.collection,
            label: info.pack.metadata.label,
            type: info.type,
            entryCount: info.pack.index.size,
            lastUpdated: info.lastUpdated
        }));
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this._compendiums.clear();
        console.log('FoundryMagic | Compendium manager cleaned up');
    }
}