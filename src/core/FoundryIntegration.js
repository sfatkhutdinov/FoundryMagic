/**
 * @fileoverview Foundry VTT Integration Layer
 * Handles module initialization, hook registration, and Foundry API integration
 */

export default class FoundryIntegration {
    constructor(foundryMagic) {
        this._foundryMagic = foundryMagic;
        this._hooksRegistered = false;
        this._settingsRegistered = false;
    }

    /**
     * Initialize the Foundry integration
     */
    async initialize() {
        console.log('FoundryMagic | Initializing Foundry VTT integration...');

        // Register settings
        this._registerSettings();

        // Register hooks
        this._registerHooks();

        // Initialize UI components
        await this._initializeUI();

        // Set up socket handling for real-time updates
        this._setupSocketHandling();

        console.log('FoundryMagic | Foundry VTT integration initialized');
    }

    /**
     * Register Foundry settings
     * @private
     */
    _registerSettings() {
        if (this._settingsRegistered) return;

        // Authentication settings
        game.settings.register('foundrymagic', 'cobaltToken', {
            name: 'Cobalt Token',
            hint: 'Your D&D Beyond Cobalt token for API access',
            scope: 'world',
            config: false, // Hidden from settings UI, managed through our dialog
            type: String,
            default: ''
        });

        // Cache settings
        game.settings.register('foundrymagic', 'cacheEnabled', {
            name: 'Enable Caching',
            hint: 'Cache imported content to reduce API calls',
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });

        game.settings.register('foundrymagic', 'cacheSizeLimit', {
            name: 'Cache Size Limit (MB)',
            hint: 'Maximum cache size in megabytes',
            scope: 'world',
            config: true,
            type: Number,
            default: 500,
            range: {
                min: 100,
                max: 2000,
                step: 50
            }
        });

        // Import settings
        game.settings.register('foundrymagic', 'autoCreateCompendiums', {
            name: 'Auto-create Compendiums',
            hint: 'Automatically create compendiums for imported content',
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });

        game.settings.register('foundrymagic', 'importPermissions', {
            name: 'Import Permissions',
            hint: 'Who can import content (DM only recommended)',
            scope: 'world',
            config: true,
            type: String,
            choices: {
                'dm-only': 'DM Only',
                'players-allowed': 'Players Allowed'
            },
            default: 'dm-only'
        });

        // UI settings
        game.settings.register('foundrymagic', 'showProgressBar', {
            name: 'Show Progress Indicators',
            hint: 'Display progress bars during imports',
            scope: 'client',
            config: true,
            type: Boolean,
            default: true
        });

        // Debug settings
        game.settings.register('foundrymagic', 'debugMode', {
            name: 'Debug Mode',
            hint: 'Enable debug logging',
            scope: 'client',
            config: true,
            type: Boolean,
            default: false
        });

        // Internal settings for tracking
        game.settings.register('foundrymagic', 'updateTracking', {
            name: 'Update Tracking',
            scope: 'world',
            config: false,
            type: Object,
            default: {}
        });

        game.settings.register('foundrymagic', 'cacheStats', {
            name: 'Cache Statistics',
            scope: 'world',
            config: false,
            type: Object,
            default: {}
        });

        this._settingsRegistered = true;
    }

    /**
     * Register Foundry hooks
     * @private
     */
    _registerHooks() {
        if (this._hooksRegistered) return;

        // Module initialization hooks
        Hooks.on('init', this._onInit.bind(this));
        Hooks.on('ready', this._onReady.bind(this));
        Hooks.on('setup', this._onSetup.bind(this));

        // UI hooks
        Hooks.on('renderSidebarTab', this._onRenderSidebarTab.bind(this));
        Hooks.on('getSceneControlButtons', this._onGetSceneControlButtons.bind(this));

        // Data management hooks
        Hooks.on('createCompendium', this._onCreateCompendium.bind(this));
        Hooks.on('deleteCompendium', this._onDeleteCompendium.bind(this));

        // User permission hooks
        Hooks.on('userCan', this._onUserCan.bind(this));

        // Socket hooks for real-time updates
        Hooks.on('updateWorldTime', this._onUpdateWorldTime.bind(this));

        this._hooksRegistered = true;
    }

    /**
     * Initialize UI components
     * @private
     */
    async _initializeUI() {
        // Add module button to sidebar
        this._addSidebarButton();

        // Initialize role manager
        if (this._foundryMagic.roleManager) {
            await this._foundryMagic.roleManager.initialize();
        }
    }

    /**
     * Set up socket handling
     * @private
     */
    _setupSocketHandling() {
        // Listen for module-specific socket events
        game.socket.on('module.foundrymagic', this._onSocketMessage.bind(this));
    }

    /**
     * Hook: Foundry init
     * @private
     */
    _onInit() {
        console.log('FoundryMagic | Init hook fired');

        // Register sheet overrides if needed
        // this._registerSheetOverrides();

        // Register custom entity classes if needed
        // this._registerEntityClasses();
    }

    /**
     * Hook: Foundry setup
     * @private
     */
    _onSetup() {
        console.log('FoundryMagic | Setup hook fired');

        // Set up any additional module integrations
        this._setupIntegrations();
    }

    /**
     * Hook: Foundry ready
     * @private
     */
    async _onReady() {
        console.log('FoundryMagic | Ready hook fired');

        // Initialize core services
        await this._initializeServices();

        // Check for updates or maintenance tasks
        await this._performMaintenance();

        // Show welcome message if first time
        this._showWelcomeMessage();
    }

    /**
     * Hook: Render sidebar tab
     * @private
     * @param {SidebarTab} tab - Sidebar tab
     * @param {jQuery} html - HTML element
     */
    _onRenderSidebarTab(tab, html) {
        // Add our module button to relevant sidebar tabs
        if (tab.id === 'compendium') {
            this._addCompendiumIntegration(html);
        }
    }

    /**
     * Hook: Get scene control buttons
     * @private
     * @param {Array} controls - Scene controls
     */
    _onGetSceneControlButtons(controls) {
        // Add our controls to the scene controls
        controls.push({
            name: 'foundrymagic',
            title: 'FoundryMagic',
            icon: 'fas fa-magic',
            layer: 'controls',
            tools: [
                {
                    name: 'import-scene',
                    title: 'Import Scene',
                    icon: 'fas fa-download',
                    onClick: () => this._importCurrentScene(),
                    button: true
                }
            ],
            active: false
        });
    }

    /**
     * Hook: Create compendium
     * @private
     * @param {Compendium} compendium - Created compendium
     */
    _onCreateCompendium(compendium) {
        // Track compendium creation for our module
        console.log('FoundryMagic | Compendium created:', compendium.name);
    }

    /**
     * Hook: Delete compendium
     * @private
     * @param {Compendium} compendium - Deleted compendium
     */
    _onDeleteCompendium(compendium) {
        // Clean up any references to deleted compendiums
        console.log('FoundryMagic | Compendium deleted:', compendium.name);
    }

    /**
     * Hook: User permission check
     * @private
     * @param {User} user - User
     * @param {string} action - Action
     * @param {Object} target - Target object
     * @returns {boolean|null} Permission result or null to use default
     */
    _onUserCan(user, action, target) {
        // Custom permission checks for our module
        if (action.startsWith('foundrymagic.')) {
            const permissionAction = action.replace('foundrymagic.', '');
            return this._foundryMagic.roleManager?.hasPermission(permissionAction, { user, target }) || false;
        }

        return null; // Use default Foundry permissions
    }

    /**
     * Hook: Update world time
     * @private
     * @param {number} worldTime - New world time
     * @param {Object} options - Update options
     */
    _onUpdateWorldTime(worldTime, options) {
        // Periodic maintenance tasks
        if (worldTime % 86400 === 0) { // Daily
            this._performDailyMaintenance();
        }
    }

    /**
     * Handle socket messages
     * @private
     * @param {Object} data - Socket data
     */
    _onSocketMessage(data) {
        switch (data.type) {
            case 'cache-update':
                this._handleCacheUpdate(data);
                break;
            case 'import-progress':
                this._handleImportProgress(data);
                break;
            case 'permission-change':
                this._handlePermissionChange(data);
                break;
            default:
                console.warn('FoundryMagic | Unknown socket message type:', data.type);
        }
    }

    /**
     * Add sidebar button
     * @private
     */
    _addSidebarButton() {
        // Add to the sidebar
        const button = $(`
            <li class="foundrymagic-sidebar-button" title="FoundryMagic - D&D Beyond Import">
                <a class="item" data-tab="foundrymagic">
                    <i class="fas fa-magic"></i>
                    FoundryMagic
                </a>
            </li>
        `);

        button.on('click', () => {
            this._openMainInterface();
        });

        // Insert after the compendium button
        const compendiumButton = $('#sidebar .item[data-tab="compendium"]').parent();
        if (compendiumButton.length) {
            compendiumButton.after(button);
        } else {
            $('#sidebar .directory-list').append(button);
        }
    }

    /**
     * Add compendium integration
     * @private
     * @param {jQuery} html - Compendium tab HTML
     */
    _addCompendiumIntegration(html) {
        // Add import buttons to compendium entries
        const importButton = $(`
            <button class="foundrymagic-import-btn" title="Import with FoundryMagic">
                <i class="fas fa-magic"></i>
            </button>
        `);

        // Add to compendium header or relevant sections
        // Implementation depends on Foundry's compendium UI structure
    }

    /**
     * Open main interface
     * @private
     */
    _openMainInterface() {
        if (this._foundryMagic.mainInterface) {
            this._foundryMagic.mainInterface.render(true);
        }
    }

    /**
     * Import current scene
     * @private
     */
    async _importCurrentScene() {
        const scene = canvas.scene;
        if (!scene) {
            ui.notifications.warn('No active scene to import');
            return;
        }

        // Implementation for scene import
        console.log('FoundryMagic | Importing scene:', scene.name);
    }

    /**
     * Initialize core services
     * @private
     */
    async _initializeServices() {
        // Services are initialized by the main FoundryMagic class
        // This hook ensures they're ready when Foundry is
    }

    /**
     * Perform maintenance tasks
     * @private
     */
    async _performMaintenance() {
        // Clean up old cache entries
        if (this._foundryMagic.cacheManager) {
            await this._foundryMagic.cacheManager.performCleanup();
        }

        // Check for content updates
        if (this._foundryMagic.updateService) {
            // Implementation for background update checks
        }
    }

    /**
     * Perform daily maintenance
     * @private
     */
    async _performDailyMaintenance() {
        console.log('FoundryMagic | Performing daily maintenance');

        // Clean up temporary files
        // Update statistics
        // Check for module updates
    }

    /**
     * Show welcome message
     * @private
     */
    _showWelcomeMessage() {
        const hasSeenWelcome = game.settings.get('foundrymagic', 'hasSeenWelcome');
        if (!hasSeenWelcome) {
            // Show welcome dialog or notification
            ui.notifications.info('FoundryMagic is ready! Click the magic wand icon to get started.');

            // Mark as seen
            game.settings.set('foundrymagic', 'hasSeenWelcome', true);
        }
    }

    /**
     * Set up integrations with other modules
     * @private
     */
    _setupIntegrations() {
        // Check for compatible modules
        const compatibleModules = [
            'dnd5e',
            'lib-wrapper',
            'socketlib'
        ];

        compatibleModules.forEach(moduleId => {
            if (game.modules.get(moduleId)?.active) {
                console.log(`FoundryMagic | Detected compatible module: ${moduleId}`);
                // Set up specific integrations
            }
        });
    }

    /**
     * Handle cache update socket message
     * @private
     * @param {Object} data - Socket data
     */
    _handleCacheUpdate(data) {
        // Update local cache state
        console.log('FoundryMagic | Cache update received:', data);
    }

    /**
     * Handle import progress socket message
     * @private
     * @param {Object} data - Socket data
     */
    _handleImportProgress(data) {
        // Update progress indicators
        if (this._foundryMagic.progressIndicator) {
            this._foundryMagic.progressIndicator.update(data.current, data.message);
        }
    }

    /**
     * Handle permission change socket message
     * @private
     * @param {Object} data - Socket data
     */
    _handlePermissionChange(data) {
        // Update UI based on permission changes
        console.log('FoundryMagic | Permission change:', data);
    }

    /**
     * Emit socket message
     * @param {string} type - Message type
     * @param {Object} data - Message data
     */
    emitSocketMessage(type, data) {
        game.socket.emit('module.foundrymagic', { type, ...data });
    }

    /**
     * Get module settings
     * @returns {Object} Settings object
     */
    getSettings() {
        return {
            cobaltToken: game.settings.get('foundrymagic', 'cobaltToken'),
            cacheEnabled: game.settings.get('foundrymagic', 'cacheEnabled'),
            cacheSizeLimit: game.settings.get('foundrymagic', 'cacheSizeLimit'),
            autoCreateCompendiums: game.settings.get('foundrymagic', 'autoCreateCompendiums'),
            importPermissions: game.settings.get('foundrymagic', 'importPermissions'),
            showProgressBar: game.settings.get('foundrymagic', 'showProgressBar'),
            debugMode: game.settings.get('foundrymagic', 'debugMode')
        };
    }

    /**
     * Update module setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     */
    async updateSetting(key, value) {
        await game.settings.set('foundrymagic', key, value);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Clean up hooks and listeners
        console.log('FoundryMagic | Cleaning up Foundry integration');
    }
}