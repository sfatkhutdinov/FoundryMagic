/**
 * @fileoverview Core FoundryMagic Module
 * Main orchestrator for all D&D Beyond integration functionality
 */

import AuthenticationService from '../auth/AuthenticationService.js';
import CacheManager from '../cache/CacheManager.js';
import CharacterImporter from '../importers/CharacterImporter.js';

export default class FoundryMagic {
    constructor() {
        this._authService = null;
        this._cacheManager = null;
        this._characterImporter = null;
        this._isInitialized = false;
        this._eventListeners = new Map();
    }

    /**
     * Initialize the FoundryMagic module and all services
     */
    async initialize() {
        try {
            // Register Foundry VTT settings
            this._registerSettings();

            // Initialize services
            this._authService = new AuthenticationService();
            this._cacheManager = new CacheManager();
            this._characterImporter = new CharacterImporter(this._authService, this._cacheManager);

            await this._authService.initialize();
            await this._cacheManager.initialize();
            await this._characterImporter.initialize();

            // Register Foundry VTT hooks
            this._registerHooks();

            this._isInitialized = true;
        } catch (error) {
            console.error('FoundryMagic initialization failed:', error);
            throw error;
        }
    }

    /**
     * Register Foundry VTT settings
     * @private
     */
    _registerSettings() {
        if (!game?.settings) return;

        game.settings.register('foundrymagic', 'ddbToken', {
            name: 'D&D Beyond Token',
            hint: 'Your D&D Beyond cobalt token for API access',
            scope: 'world',
            config: true,
            type: String,
            default: ''
        });

        game.settings.register('foundrymagic', 'cacheEnabled', {
            name: 'Enable Caching',
            hint: 'Cache imported data to improve performance',
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });

        game.settings.register('foundrymagic', 'autoUpdate', {
            name: 'Auto-update Characters',
            hint: 'Automatically check for character updates on D&D Beyond',
            scope: 'world',
            config: true,
            type: Boolean,
            default: false
        });
    }

    /**
     * Register Foundry VTT hooks
     * @private
     */
    _registerHooks() {
        if (!Hooks) return;

        // Initialize when Foundry is ready
        Hooks.once('ready', () => {
            console.log('FoundryMagic | Module ready');
            ui.notifications?.info('FoundryMagic loaded successfully');
        });

        // Add import button to actor sheets
        Hooks.on('renderActorSheet', (sheet, html, data) => {
            this._addImportButton(sheet, html);
        });
    }

    /**
     * Add D&D Beyond import button to character sheets
     * @private
     */
    _addImportButton(sheet, html) {
        if (!sheet.actor || sheet.actor.type !== 'character') return;

        const headerButtons = html.find('.sheet-header .header-buttons');
        if (headerButtons.length === 0) return;

        const importButton = $(`
      <button type="button" class="ddb-import-btn" title="Import from D&D Beyond">
        <i class="fas fa-download"></i> D&D Beyond
      </button>
    `);

        importButton.on('click', () => {
            this._showImportDialog(sheet.actor);
        });

        headerButtons.after(importButton);
    }

    /**
     * Show character import dialog
     * @private
     */
    _showImportDialog(actor) {
        // This would show a dialog for entering D&D Beyond character URL
        // Implementation would depend on Foundry's Dialog API
        const characterUrl = prompt('Enter D&D Beyond character URL:');
        if (characterUrl) {
            this.importCharacterFromURL(characterUrl, actor);
        }
    }

    /**
     * Check if module is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this._isInitialized;
    }

    /**
     * Get authentication service
     * @returns {AuthenticationService}
     * @throws {Error} If module not initialized
     */
    getAuthenticationService() {
        if (!this._isInitialized) {
            throw new Error('Module not initialized');
        }
        return this._authService;
    }

    /**
     * Get cache manager
     * @returns {CacheManager}
     * @throws {Error} If module not initialized
     */
    getCacheManager() {
        if (!this._isInitialized) {
            throw new Error('Module not initialized');
        }
        return this._cacheManager;
    }

    /**
     * Get character importer
     * @returns {CharacterImporter}
     * @throws {Error} If module not initialized
     */
    getCharacterImporter() {
        if (!this._isInitialized) {
            throw new Error('Module not initialized');
        }
        return this._characterImporter;
    }

    /**
     * Get D&D Beyond token from settings
     * @returns {string|null}
     */
    getDDBToken() {
        if (!game?.settings) return null;
        return game.settings.get('foundrymagic', 'ddbToken');
    }

    /**
     * Set D&D Beyond token in settings
     * @param {string} token
     */
    setDDBToken(token) {
        if (game?.settings) {
            game.settings.set('foundrymagic', 'ddbToken', token);
        }
        if (this._authService) {
            this._authService.setToken(token);
        }
    }

    /**
     * Check if caching is enabled
     * @returns {boolean}
     */
    isCacheEnabled() {
        if (!game?.settings) return true;
        return game.settings.get('foundrymagic', 'cacheEnabled');
    }

    /**
     * Import character from D&D Beyond URL
     * @param {string} characterUrl - D&D Beyond character URL
     * @param {Actor} existingActor - Optional existing actor to update
     * @returns {Promise<Object>} Import result
     */
    async importCharacterFromURL(characterUrl, existingActor = null) {
        try {
            const characterId = this._extractCharacterIdFromUrl(characterUrl);

            // Fetch character data
            const characterData = await this._characterImporter.fetchCharacter(characterId);

            // Transform to Foundry format
            const foundryData = this._characterImporter.transformToFoundryFormat(characterData);

            // Create or update actor
            let actor;
            if (existingActor) {
                await this._characterImporter.updateFoundryActor(existingActor, foundryData);
                actor = existingActor;
            } else {
                actor = await this._characterImporter.createFoundryActor(foundryData);
            }

            // Emit success event
            this._emit('character-imported', {
                characterId,
                actor,
                success: true
            });

            return {
                success: true,
                actor,
                characterId
            };

        } catch (error) {
            console.error('Character import failed:', error);

            // Emit failure event
            const characterId = this._extractCharacterIdFromUrl(characterUrl);
            this._emit('character-import-failed', {
                characterId,
                error: error.message,
                success: false
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extract character ID from D&D Beyond URL
     * @private
     */
    _extractCharacterIdFromUrl(url) {
        const characterUrlPattern = /dndbeyond\.com\/characters\/(\d+)/;
        const match = url.match(characterUrlPattern);

        if (!match) {
            throw new Error('Invalid D&D Beyond character URL');
        }

        return match[1];
    }

    /**
     * Import multiple characters
     * @param {Array<string>} characterUrls - Array of character URLs
     * @returns {Promise<Array>} Array of import results
     */
    async importMultipleCharacters(characterUrls) {
        const results = [];

        for (const url of characterUrls) {
            const result = await this.importCharacterFromURL(url);
            results.push(result);
        }

        return results;
    }

    /**
     * Get module health status
     * @returns {Promise<Object>} Health status information
     */
    async getHealthStatus() {
        const status = {
            initialized: this._isInitialized,
            authenticated: false,
            cacheSize: 0,
            healthy: true,
            issues: []
        };

        try {
            if (this._authService) {
                status.authenticated = await this._authService.validateToken();
                if (!status.authenticated) {
                    status.issues.push('Authentication failed');
                    status.healthy = false;
                }
            }

            if (this._cacheManager) {
                status.cacheSize = await this._cacheManager.getCacheSize();
                const maxSize = 500 * 1024 * 1024; // 500MB
                if (status.cacheSize > maxSize) {
                    status.issues.push('Cache size exceeds limit');
                    status.healthy = false;
                }
            }

        } catch (error) {
            status.issues.push(`Health check failed: ${error.message}`);
            status.healthy = false;
        }

        return status;
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        if (!this._eventListeners.has(event)) {
            this._eventListeners.set(event, []);
        }
        this._eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        const listeners = this._eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     * @private
     */
    _emit(event, data) {
        const listeners = this._eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event listener error for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Shutdown and cleanup
     */
    async shutdown() {
        try {
            if (this._cacheManager) {
                this._cacheManager.close();
            }
            if (this._authService) {
                this._authService.cleanup();
            }

            this._isInitialized = false;
            this._eventListeners.clear();
        } catch (error) {
            console.error('Shutdown error:', error);
        }
    }
}