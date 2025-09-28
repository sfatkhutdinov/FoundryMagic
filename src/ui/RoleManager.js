/**
 * @fileoverview Role-Based Access Control Manager
 * Manages permissions and access control for DM vs Player roles
 */

export default class RoleManager {
    constructor(foundryMagic) {
        this._foundryMagic = foundryMagic;
        this._permissions = this._loadPermissions();
    }

    /**
     * Initialize the role manager
     */
    async initialize() {
        // Register hooks for permission checks
        Hooks.on('renderApplication', this._onRenderApplication.bind(this));
        Hooks.on('getApplicationHeaderButtons', this._onGetHeaderButtons.bind(this));
    }

    /**
     * Check if user has permission for action
     * @param {string} action - Action to check
     * @param {Object} context - Context object
     * @returns {boolean} Has permission
     */
    hasPermission(action, context = {}) {
        const user = game.user;
        const userRole = this._getUserRole(user);

        const permission = this._permissions[action];
        if (!permission) {
            console.warn(`Unknown permission action: ${action}`);
            return false;
        }

        // Check role-based access
        if (!permission.allowedRoles.includes(userRole)) {
            return false;
        }

        // Check additional conditions
        if (permission.condition && !permission.condition(user, context)) {
            return false;
        }

        return true;
    }

    /**
     * Get user role
     * @private
     * @param {User} user - Foundry user
     * @returns {string} User role
     */
    _getUserRole(user) {
        if (user.isGM) return 'dm';
        if (user.role >= CONST.USER_ROLES.PLAYER) return 'player';
        return 'none';
    }

    /**
     * Filter UI elements based on permissions
     * @param {jQuery} html - HTML element
     * @param {Array} selectors - Selectors to filter
     */
    filterUIElements(html, selectors = []) {
        const user = game.user;
        const userRole = this._getUserRole(user);

        // Default selectors to filter
        const defaultSelectors = [
            '.dm-only',
            '.player-only',
            '[data-permission]'
        ];

        const allSelectors = [...defaultSelectors, ...selectors];

        allSelectors.forEach(selector => {
            html.find(selector).each((index, element) => {
                const el = $(element);
                const requiredPermission = el.data('permission');
                const requiredRole = el.data('role');

                let hasAccess = true;

                if (requiredPermission) {
                    hasAccess = this.hasPermission(requiredPermission);
                } else if (requiredRole) {
                    hasAccess = userRole === requiredRole;
                } else if (el.hasClass('dm-only')) {
                    hasAccess = userRole === 'dm';
                } else if (el.hasClass('player-only')) {
                    hasAccess = userRole === 'player';
                }

                if (!hasAccess) {
                    el.hide();
                } else {
                    el.show();
                }
            });
        });
    }

    /**
     * Get available actions for current user
     * @param {string} context - Context (e.g., 'import', 'settings')
     * @returns {Array} Available actions
     */
    getAvailableActions(context) {
        const actions = [];

        Object.entries(this._permissions).forEach(([action, config]) => {
            if (config.context === context && this.hasPermission(action)) {
                actions.push({
                    action,
                    label: config.label,
                    icon: config.icon,
                    description: config.description
                });
            }
        });

        return actions;
    }

    /**
     * Show permission denied message
     * @param {string} action - Action that was denied
     */
    showPermissionDenied(action) {
        const permission = this._permissions[action];
        const message = permission?.denyMessage || 'You don\'t have permission to perform this action.';

        ui.notifications.error(message);
    }

    /**
     * Hook: Render application
     * @private
     * @param {Application} app - Application instance
     * @param {jQuery} html - HTML element
     */
    _onRenderApplication(app, html) {
        // Filter UI elements based on permissions
        if (app.constructor.name.includes('FoundryMagic')) {
            this.filterUIElements(html);
        }
    }

    /**
     * Hook: Get application header buttons
     * @private
     * @param {Application} app - Application instance
     * @param {Array} buttons - Header buttons
     */
    _onGetHeaderButtons(app, buttons) {
        // Add permission-based buttons
        if (app.constructor.name.includes('FoundryMagic')) {
            const availableActions = this.getAvailableActions('header');

            availableActions.forEach(action => {
                buttons.unshift({
                    label: action.label,
                    class: 'foundrymagic-action',
                    icon: `fas fa-${action.icon}`,
                    onclick: () => this._executeAction(action.action, app)
                });
            });
        }
    }

    /**
     * Execute permission-checked action
     * @private
     * @param {string} action - Action to execute
     * @param {Application} app - Application instance
     */
    _executeAction(action, app) {
        if (!this.hasPermission(action, { app })) {
            this.showPermissionDenied(action);
            return;
        }

        // Execute the action
        const handler = this._getActionHandler(action);
        if (handler) {
            handler(app);
        }
    }

    /**
     * Get action handler
     * @private
     * @param {string} action - Action name
     * @returns {Function} Action handler
     */
    _getActionHandler(action) {
        const handlers = {
            'open-settings': (app) => {
                const settings = new AuthenticationDialog(this._foundryMagic);
                settings.render(true);
            },
            'open-main-interface': (app) => {
                const mainInterface = new MainInterface(this._foundryMagic);
                mainInterface.render(true);
            },
            'clear-cache': async (app) => {
                const confirmed = await Dialog.confirm({
                    title: 'Clear Cache',
                    content: '<p>Are you sure you want to clear all cached content?</p>',
                    yes: () => true,
                    no: () => false
                });

                if (confirmed) {
                    await this._foundryMagic.cacheManager.clear();
                    ui.notifications.info('Cache cleared successfully');
                }
            }
        };

        return handlers[action];
    }

    /**
     * Load permissions configuration
     * @private
     * @returns {Object} Permissions object
     */
    _loadPermissions() {
        return {
            // Import permissions
            'import-character': {
                label: 'Import Character',
                icon: 'user',
                description: 'Import D&D Beyond characters',
                allowedRoles: ['dm', 'player'],
                context: 'import',
                denyMessage: 'Only authenticated users can import characters.'
            },
            'import-adventure': {
                label: 'Import Adventure',
                icon: 'map',
                description: 'Import D&D Beyond adventures',
                allowedRoles: ['dm'],
                context: 'import',
                denyMessage: 'Only DMs can import adventures.'
            },
            'import-monster': {
                label: 'Import Monster',
                icon: 'dragon',
                description: 'Import D&D Beyond monsters',
                allowedRoles: ['dm'],
                context: 'import',
                denyMessage: 'Only DMs can import monsters.'
            },
            'import-spell': {
                label: 'Import Spell',
                icon: 'magic',
                description: 'Import D&D Beyond spells',
                allowedRoles: ['dm'],
                context: 'import',
                denyMessage: 'Only DMs can import spells.'
            },
            'import-item': {
                label: 'Import Item',
                icon: 'shield',
                description: 'Import D&D Beyond items',
                allowedRoles: ['dm'],
                context: 'import',
                denyMessage: 'Only DMs can import items.'
            },
            'batch-import': {
                label: 'Batch Import',
                icon: 'list',
                description: 'Perform batch content import',
                allowedRoles: ['dm'],
                context: 'import',
                denyMessage: 'Only DMs can perform batch imports.'
            },

            // Settings permissions
            'configure-auth': {
                label: 'Configure Authentication',
                icon: 'key',
                description: 'Set up D&D Beyond authentication',
                allowedRoles: ['dm'],
                context: 'settings',
                denyMessage: 'Only DMs can configure authentication.'
            },
            'manage-cache': {
                label: 'Manage Cache',
                icon: 'database',
                description: 'Manage cached content',
                allowedRoles: ['dm'],
                context: 'settings',
                denyMessage: 'Only DMs can manage the cache.'
            },

            // UI permissions
            'open-main-interface': {
                label: 'Open Interface',
                icon: 'cog',
                description: 'Open the main FoundryMagic interface',
                allowedRoles: ['dm', 'player'],
                context: 'ui'
            },
            'open-settings': {
                label: 'Settings',
                icon: 'cog',
                description: 'Open authentication settings',
                allowedRoles: ['dm'],
                context: 'header',
                denyMessage: 'Only DMs can access settings.'
            },
            'clear-cache': {
                label: 'Clear Cache',
                icon: 'trash',
                description: 'Clear all cached content',
                allowedRoles: ['dm'],
                context: 'header',
                denyMessage: 'Only DMs can clear the cache.'
            },

            // Content management
            'view-cached-content': {
                label: 'View Cached Content',
                icon: 'eye',
                description: 'Browse cached content',
                allowedRoles: ['dm', 'player'],
                context: 'content'
            },
            'delete-cached-content': {
                label: 'Delete Cached Content',
                icon: 'trash',
                description: 'Delete cached content items',
                allowedRoles: ['dm'],
                context: 'content',
                denyMessage: 'Only DMs can delete cached content.'
            }
        };
    }

    /**
     * Check if user is DM
     * @returns {boolean} Is DM
     */
    isDM() {
        return game.user.isGM;
    }

    /**
     * Check if user is player
     * @returns {boolean} Is player
     */
    isPlayer() {
        return !game.user.isGM && game.user.role >= CONST.USER_ROLES.PLAYER;
    }

    /**
     * Get current user role info
     * @returns {Object} Role information
     */
    getCurrentUserRole() {
        const user = game.user;
        return {
            role: this._getUserRole(user),
            isGM: user.isGM,
            roleLevel: user.role,
            permissions: this.getAvailableActions()
        };
    }

    /**
     * Validate permission configuration
     * @returns {Array} Validation errors
     */
    validatePermissions() {
        const errors = [];

        Object.entries(this._permissions).forEach(([action, config]) => {
            if (!config.label) errors.push(`Missing label for ${action}`);
            if (!config.allowedRoles || !Array.isArray(config.allowedRoles)) {
                errors.push(`Invalid allowedRoles for ${action}`);
            }
        });

        return errors;
    }
}

// Import required classes (these would be actual imports in the real implementation)
class AuthenticationDialog { constructor(fm) { this._fm = fm; } render() { } }
class MainInterface { constructor(fm) { this._fm = fm; } render() { } }