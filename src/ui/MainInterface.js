/**
 * @fileoverview Main Module Interface for FoundryMagic
 * Provides the primary UI for D&D Beyond content import
 */

export default class MainInterface extends Application {
    constructor(foundryMagic) {
        super();
        this._foundryMagic = foundryMagic;
        this._currentTab = 'characters';
        this._importProgress = null;
    }

    /**
     * Application configuration
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'foundrymagic-main',
            title: 'FoundryMagic - D&D Beyond Import',
            template: 'modules/foundrymagic/templates/main-interface.html',
            width: 800,
            height: 600,
            resizable: true,
            tabs: [{ navSelector: '.tabs', contentSelector: '.tab-content' }]
        });
    }

    /**
     * Get application data
     */
    getData() {
        const data = super.getData();

        return mergeObject(data, {
            currentTab: this._currentTab,
            tabs: this._getTabs(),
            importProgress: this._importProgress,
            isDM: game.user.isGM,
            canImport: this._canImport()
        });
    }

    /**
     * Get available tabs
     * @private
     */
    _getTabs() {
        const tabs = [
            {
                id: 'characters',
                label: 'Characters',
                icon: 'fas fa-user',
                content: this._getCharacterTabData()
            },
            {
                id: 'adventures',
                label: 'Adventures',
                icon: 'fas fa-map',
                content: this._getAdventureTabData()
            },
            {
                id: 'monsters',
                label: 'Monsters',
                icon: 'fas fa-dragon',
                content: this._getMonsterTabData()
            },
            {
                id: 'spells',
                label: 'Spells',
                icon: 'fas fa-magic',
                content: this._getSpellTabData()
            },
            {
                id: 'items',
                label: 'Items',
                icon: 'fas fa-shield',
                content: this._getItemTabData()
            },
            {
                id: 'batch',
                label: 'Batch Import',
                icon: 'fas fa-list',
                content: this._getBatchTabData()
            }
        ];

        // Only show DM-only tabs to DMs
        return tabs.filter(tab => !tab.dmOnly || game.user.isGM);
    }

    /**
     * Get character tab data
     * @private
     */
    _getCharacterTabData() {
        return {
            description: 'Import D&D Beyond characters with equipment, spells, and abilities.',
            actions: [
                {
                    id: 'import-character',
                    label: 'Import Character',
                    icon: 'fas fa-download',
                    handler: () => this._importCharacter()
                },
                {
                    id: 'list-characters',
                    label: 'Browse Characters',
                    icon: 'fas fa-list',
                    handler: () => this._showCharacterBrowser()
                }
            ],
            recent: this._getRecentImports('characters')
        };
    }

    /**
     * Get adventure tab data
     * @private
     */
    _getAdventureTabData() {
        return {
            description: 'Import D&D Beyond adventures with scenes, encounters, and story content.',
            actions: [
                {
                    id: 'import-adventure',
                    label: 'Import Adventure',
                    icon: 'fas fa-download',
                    handler: () => this._importAdventure(),
                    dmOnly: true
                },
                {
                    id: 'list-adventures',
                    label: 'Browse Adventures',
                    icon: 'fas fa-list',
                    handler: () => this._showAdventureBrowser()
                }
            ],
            recent: this._getRecentImports('adventures')
        };
    }

    /**
     * Get monster tab data
     * @private
     */
    _getMonsterTabData() {
        return {
            description: 'Import D&D Beyond monsters and creatures for encounters.',
            actions: [
                {
                    id: 'import-monster',
                    label: 'Import Monster',
                    icon: 'fas fa-download',
                    handler: () => this._importMonster(),
                    dmOnly: true
                },
                {
                    id: 'list-monsters',
                    label: 'Browse Monsters',
                    icon: 'fas fa-list',
                    handler: () => this._showMonsterBrowser()
                }
            ],
            recent: this._getRecentImports('monsters')
        };
    }

    /**
     * Get spell tab data
     * @private
     */
    _getSpellTabData() {
        return {
            description: 'Import D&D Beyond spells with active effects and automation.',
            actions: [
                {
                    id: 'import-spell',
                    label: 'Import Spell',
                    icon: 'fas fa-download',
                    handler: () => this._importSpell(),
                    dmOnly: true
                },
                {
                    id: 'list-spells',
                    label: 'Browse Spells',
                    icon: 'fas fa-list',
                    handler: () => this._showSpellBrowser()
                }
            ],
            recent: this._getRecentImports('spells')
        };
    }

    /**
     * Get item tab data
     * @private
     */
    _getItemTabData() {
        return {
            description: 'Import D&D Beyond equipment, weapons, and magic items.',
            actions: [
                {
                    id: 'import-item',
                    label: 'Import Item',
                    icon: 'fas fa-download',
                    handler: () => this._importItem(),
                    dmOnly: true
                },
                {
                    id: 'list-items',
                    label: 'Browse Items',
                    icon: 'fas fa-list',
                    handler: () => this._showItemBrowser()
                }
            ],
            recent: this._getRecentImports('items')
        };
    }

    /**
     * Get batch import tab data
     * @private
     */
    _getBatchTabData() {
        return {
            description: 'Import multiple content items at once with progress tracking.',
            actions: [
                {
                    id: 'batch-import',
                    label: 'Start Batch Import',
                    icon: 'fas fa-play',
                    handler: () => this._startBatchImport(),
                    dmOnly: true
                },
                {
                    id: 'batch-status',
                    label: 'View Batch Status',
                    icon: 'fas fa-chart-bar',
                    handler: () => this._showBatchStatus()
                }
            ],
            recent: this._getRecentBatchImports()
        };
    }

    /**
     * Check if user can import
     * @private
     */
    _canImport() {
        return this._foundryMagic.authService.isAuthenticated();
    }

    /**
     * Get recent imports for content type
     * @private
     * @param {string} contentType - Content type
     */
    _getRecentImports(contentType) {
        // Placeholder - would load from cache/storage
        return [];
    }

    /**
     * Get recent batch imports
     * @private
     */
    _getRecentBatchImports() {
        // Placeholder - would load from cache/storage
        return [];
    }

    /**
     * Import character
     * @private
     */
    async _importCharacter() {
        if (!this._canImport()) {
            ui.notifications.error('Authentication required for import');
            return;
        }

        // Show character selection dialog
        const dialog = new CharacterBrowser(this._foundryMagic);
        dialog.render(true);
    }

    /**
     * Import adventure
     * @private
     */
    async _importAdventure() {
        if (!this._canImport()) {
            ui.notifications.error('Authentication required for import');
            return;
        }

        if (!game.user.isGM) {
            ui.notifications.error('Only DMs can import adventures');
            return;
        }

        // Show adventure selection dialog
        const dialog = new AdventureBrowser(this._foundryMagic);
        dialog.render(true);
    }

    /**
     * Import monster
     * @private
     */
    async _importMonster() {
        if (!this._canImport()) {
            ui.notifications.error('Authentication required for import');
            return;
        }

        if (!game.user.isGM) {
            ui.notifications.error('Only DMs can import monsters');
            return;
        }

        // Show monster selection dialog
        const dialog = new MonsterBrowser(this._foundryMagic);
        dialog.render(true);
    }

    /**
     * Import spell
     * @private
     */
    async _importSpell() {
        if (!this._canImport()) {
            ui.notifications.error('Authentication required for import');
            return;
        }

        if (!game.user.isGM) {
            ui.notifications.error('Only DMs can import spells');
            return;
        }

        // Show spell selection dialog
        const dialog = new SpellBrowser(this._foundryMagic);
        dialog.render(true);
    }

    /**
     * Import item
     * @private
     */
    async _importItem() {
        if (!this._canImport()) {
            ui.notifications.error('Authentication required for import');
            return;
        }

        if (!game.user.isGM) {
            ui.notifications.error('Only DMs can import items');
            return;
        }

        // Show item selection dialog
        const dialog = new ItemBrowser(this._foundryMagic);
        dialog.render(true);
    }

    /**
     * Start batch import
     * @private
     */
    async _startBatchImport() {
        if (!this._canImport()) {
            ui.notifications.error('Authentication required for import');
            return;
        }

        if (!game.user.isGM) {
            ui.notifications.error('Only DMs can perform batch imports');
            return;
        }

        // Show batch import dialog
        const dialog = new BatchImportDialog(this._foundryMagic);
        dialog.render(true);
    }

    /**
     * Show character browser
     * @private
     */
    _showCharacterBrowser() {
        const browser = new CharacterBrowser(this._foundryMagic);
        browser.render(true);
    }

    /**
     * Show adventure browser
     * @private
     */
    _showAdventureBrowser() {
        const browser = new AdventureBrowser(this._foundryMagic);
        browser.render(true);
    }

    /**
     * Show monster browser
     * @private
     */
    _showMonsterBrowser() {
        const browser = new MonsterBrowser(this._foundryMagic);
        browser.render(true);
    }

    /**
     * Show spell browser
     * @private
     */
    _showSpellBrowser() {
        const browser = new SpellBrowser(this._foundryMagic);
        browser.render(true);
    }

    /**
     * Show item browser
     * @private
     */
    _showItemBrowser() {
        const browser = new ItemBrowser(this._foundryMagic);
        browser.render(true);
    }

    /**
     * Show batch status
     * @private
     */
    _showBatchStatus() {
        const status = new BatchStatusDialog(this._foundryMagic);
        status.render(true);
    }

    /**
     * Handle tab change
     * @param {Event} event - Tab change event
     * @param {Object} tabs - Tabs object
     * @param {string} active - Active tab ID
     */
    _onChangeTab(event, tabs, active) {
        super._onChangeTab(event, tabs, active);
        this._currentTab = active;
    }

    /**
     * Activate listeners
     * @param {jQuery} html - HTML element
     */
    activateListeners(html) {
        super.activateListeners(html);

        // Tab navigation
        html.find('.tab-link').click(event => {
            const tab = event.currentTarget.dataset.tab;
            this._onChangeTab(event, this.options.tabs[0], tab);
        });

        // Action buttons
        html.find('.action-button').click(event => {
            const action = event.currentTarget.dataset.action;
            const handler = this[`_handle${action.charAt(0).toUpperCase() + action.slice(1)}`];
            if (handler) handler.call(this);
        });

        // Settings button
        html.find('.settings-button').click(() => {
            const settings = new AuthenticationDialog(this._foundryMagic);
            settings.render(true);
        });
    }

    /**
     * Update import progress
     * @param {Object} progress - Progress data
     */
    updateProgress(progress) {
        this._importProgress = progress;
        this.render(false);
    }

    /**
     * Clear progress
     */
    clearProgress() {
        this._importProgress = null;
        this.render(false);
    }

    /**
     * Close the interface
     */
    async close() {
        this.clearProgress();
        return super.close();
    }
}

// Import browser classes (placeholders for now)
class CharacterBrowser extends Application {
    constructor(foundryMagic) { super(); this._foundryMagic = foundryMagic; }
    static get defaultOptions() { return mergeObject(super.defaultOptions, { title: 'Character Browser' }); }
}

class AdventureBrowser extends Application {
    constructor(foundryMagic) { super(); this._foundryMagic = foundryMagic; }
    static get defaultOptions() { return mergeObject(super.defaultOptions, { title: 'Adventure Browser' }); }
}

class MonsterBrowser extends Application {
    constructor(foundryMagic) { super(); this._foundryMagic = foundryMagic; }
    static get defaultOptions() { return mergeObject(super.defaultOptions, { title: 'Monster Browser' }); }
}

class SpellBrowser extends Application {
    constructor(foundryMagic) { super(); this._foundryMagic = foundryMagic; }
    static get defaultOptions() { return mergeObject(super.defaultOptions, { title: 'Spell Browser' }); }
}

class ItemBrowser extends Application {
    constructor(foundryMagic) { super(); this._foundryMagic = foundryMagic; }
    static get defaultOptions() { return mergeObject(super.defaultOptions, { title: 'Item Browser' }); }
}

class BatchImportDialog extends Application {
    constructor(foundryMagic) { super(); this._foundryMagic = foundryMagic; }
    static get defaultOptions() { return mergeObject(super.defaultOptions, { title: 'Batch Import' }); }
}

class BatchStatusDialog extends Application {
    constructor(foundryMagic) { super(); this._foundryMagic = foundryMagic; }
    static get defaultOptions() { return mergeObject(super.defaultOptions, { title: 'Batch Import Status' }); }
}

class AuthenticationDialog extends Application {
    constructor(foundryMagic) { super(); this._foundryMagic = foundryMagic; }
    static get defaultOptions() { return mergeObject(super.defaultOptions, { title: 'Authentication Settings' }); }
}