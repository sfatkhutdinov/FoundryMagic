/**
 * @fileoverview User feedback and notification system for FoundryMagic
 * @description Provides comprehensive notification services including Foundry UI notifications,
 * progress indicators, toast messages, and custom dialog notifications.
 */

import { ErrorHandler } from './ErrorHandler.js';

/**
 * Notification types for different message severities
 * @enum {string}
 */
export const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    PROGRESS: 'progress'
};

/**
 * Notification display methods
 * @enum {string}
 */
export const NOTIFICATION_METHODS = {
    TOAST: 'toast',
    DIALOG: 'dialog',
    CONSOLE: 'console',
    CHAT: 'chat'
};

/**
 * User feedback and notification service for FoundryMagic
 * Integrates with Foundry VTT's notification system and provides
 * comprehensive user feedback mechanisms.
 */
export class NotificationService {
    /**
     * Creates a new NotificationService instance
     */
    constructor() {
        this._settings = {
            enableToast: true,
            enableChat: false,
            enableConsole: true,
            toastDuration: 5000,
            maxProgressNotifications: 3
        };

        this._activeProgress = new Map();
        this._notificationHistory = [];
        this._maxHistorySize = 100;

        this._initializeSettings();
        this._setupEventListeners();
    }

    /**
     * Initialize notification settings from Foundry config
     * @private
     */
    _initializeSettings() {
        // Register settings with Foundry
        game.settings.register('foundry-magic', 'notificationSettings', {
            name: 'Notification Preferences',
            hint: 'Configure how notifications are displayed',
            scope: 'client',
            config: true,
            type: Object,
            default: this._settings,
            onChange: (value) => {
                this._settings = { ...this._settings, ...value };
            }
        });

        // Load saved settings
        const savedSettings = game.settings.get('foundry-magic', 'notificationSettings');
        if (savedSettings) {
            this._settings = { ...this._settings, ...savedSettings };
        }
    }

    /**
     * Setup event listeners for notification events
     * @private
     */
    _setupEventListeners() {
        // Listen for custom notification events
        Hooks.on('foundryMagic:notify', this._handleNotificationEvent.bind(this));
        Hooks.on('foundryMagic:progress', this._handleProgressEvent.bind(this));
    }

    /**
     * Handle custom notification events
     * @param {Object} data - Notification data
     * @private
     */
    _handleNotificationEvent(data) {
        const { type, message, options = {} } = data;
        this.notify(type, message, options);
    }

    /**
     * Handle progress notification events
     * @param {Object} data - Progress data
     * @private
     */
    _handleProgressEvent(data) {
        const { id, progress, message, options = {} } = data;
        this.updateProgress(id, progress, message, options);
    }

    /**
     * Display a notification to the user
     * @param {string} type - Notification type from NOTIFICATION_TYPES
     * @param {string} message - Notification message
     * @param {Object} options - Additional options
     * @param {string} options.method - Display method (default: auto)
     * @param {boolean} options.permanent - Whether notification should persist
     * @param {number} options.duration - Duration in ms for temporary notifications
     * @param {string} options.title - Title for dialog notifications
     * @param {Function} options.onClick - Click handler for notifications
     */
    notify(type, message, options = {}) {
        try {
            const notification = {
                id: this._generateId(),
                type,
                message,
                timestamp: Date.now(),
                options: { ...options }
            };

            // Add to history
            this._addToHistory(notification);

            // Determine display method
            const method = options.method || this._getDefaultMethod(type);

            switch (method) {
                case NOTIFICATION_METHODS.TOAST:
                    this._showToast(notification);
                    break;
                case NOTIFICATION_METHODS.DIALOG:
                    this._showDialog(notification);
                    break;
                case NOTIFICATION_METHODS.CHAT:
                    this._showChatMessage(notification);
                    break;
                case NOTIFICATION_METHODS.CONSOLE:
                    this._logToConsole(notification);
                    break;
                default:
                    this._showToast(notification);
            }

            return notification.id;
        } catch (error) {
            ErrorHandler.handleError(error, 'NotificationService.notify', {
                type,
                message,
                options
            });
            return null;
        }
    }

    /**
     * Show a toast notification using Foundry's UI
     * @param {Object} notification - Notification object
     * @private
     */
    _showToast(notification) {
        if (!this._settings.enableToast) return;

        const { type, message, options } = notification;
        const duration = options.duration || this._settings.toastDuration;

        // Map our types to Foundry notification types
        const foundryType = this._mapToFoundryType(type);

        // Use Foundry's notification system
        ui.notifications.notify(message, foundryType, {
            permanent: options.permanent || false,
            localize: false,
            console: false // We'll handle console logging separately
        });

        // Auto-dismiss if not permanent
        if (!options.permanent && duration > 0) {
            setTimeout(() => {
                this.dismiss(notification.id);
            }, duration);
        }
    }

    /**
     * Show a dialog notification
     * @param {Object} notification - Notification object
     * @private
     */
    _showDialog(notification) {
        const { type, message, options } = notification;
        const title = options.title || this._getDialogTitle(type);

        new Dialog({
            title,
            content: `<p>${message}</p>`,
            buttons: {
                ok: {
                    label: 'OK',
                    callback: options.onClick || (() => { })
                }
            },
            default: 'ok'
        }).render(true);
    }

    /**
     * Show notification as a chat message
     * @param {Object} notification - Notification object
     * @private
     */
    _showChatMessage(notification) {
        if (!this._settings.enableChat) return;

        const { type, message } = notification;
        const speaker = ChatMessage.getSpeaker({ alias: 'FoundryMagic' });

        ChatMessage.create({
            speaker,
            content: `<div class="foundry-magic-notification ${type}">${message}</div>`,
            type: CONST.CHAT_MESSAGE_TYPES.OOC
        });
    }

    /**
     * Log notification to console
     * @param {Object} notification - Notification object
     * @private
     */
    _logToConsole(notification) {
        if (!this._settings.enableConsole) return;

        const { type, message } = notification;
        const prefix = `[FoundryMagic:${type.toUpperCase()}]`;

        switch (type) {
            case NOTIFICATION_TYPES.ERROR:
                console.error(prefix, message);
                break;
            case NOTIFICATION_TYPES.WARNING:
                console.warn(prefix, message);
                break;
            default:
                console.log(prefix, message);
        }
    }

    /**
     * Start a progress notification
     * @param {string} id - Progress ID
     * @param {string} message - Initial message
     * @param {Object} options - Progress options
     * @param {number} options.max - Maximum progress value
     * @param {boolean} options.showPercentage - Show percentage in message
     */
    startProgress(id, message, options = {}) {
        const progress = {
            id,
            message,
            current: 0,
            max: options.max || 100,
            startTime: Date.now(),
            options: { ...options },
            active: true
        };

        this._activeProgress.set(id, progress);

        // Limit concurrent progress notifications
        if (this._activeProgress.size > this._settings.maxProgressNotifications) {
            this._cleanupOldProgress();
        }

        this._updateProgressDisplay(progress);
        return id;
    }

    /**
     * Update progress notification
     * @param {string} id - Progress ID
     * @param {number} current - Current progress value
     * @param {string} message - Updated message (optional)
     * @param {Object} options - Additional options
     */
    updateProgress(id, current, message = null, options = {}) {
        const progress = this._activeProgress.get(id);
        if (!progress || !progress.active) return;

        progress.current = current;
        if (message) progress.message = message;
        Object.assign(progress.options, options);

        this._updateProgressDisplay(progress);
    }

    /**
     * Complete a progress notification
     * @param {string} id - Progress ID
     * @param {string} message - Completion message
     */
    completeProgress(id, message = 'Complete') {
        const progress = this._activeProgress.get(id);
        if (!progress) return;

        progress.current = progress.max;
        progress.message = message;
        progress.active = false;
        progress.completedAt = Date.now();

        this._updateProgressDisplay(progress);

        // Auto-remove after a delay
        setTimeout(() => {
            this._activeProgress.delete(id);
        }, 3000);
    }

    /**
     * Fail a progress notification
     * @param {string} id - Progress ID
     * @param {string} errorMessage - Error message
     */
    failProgress(id, errorMessage) {
        const progress = this._activeProgress.get(id);
        if (!progress) return;

        progress.message = `Failed: ${errorMessage}`;
        progress.active = false;
        progress.failed = true;
        progress.completedAt = Date.now();

        this._updateProgressDisplay(progress);

        // Show error notification
        this.notify(NOTIFICATION_TYPES.ERROR, errorMessage);

        // Auto-remove after a delay
        setTimeout(() => {
            this._activeProgress.delete(id);
        }, 5000);
    }

    /**
     * Dismiss a notification
     * @param {string} notificationId - Notification ID to dismiss
     */
    dismiss(notificationId) {
        // Foundry handles toast dismissal automatically
        // For custom notifications, we could implement dismissal logic here
    }

    /**
     * Get notification history
     * @param {Object} filter - Filter options
     * @param {string} filter.type - Filter by type
     * @param {number} filter.limit - Maximum number of entries
     * @returns {Array} Notification history
     */
    getHistory(filter = {}) {
        let history = [...this._notificationHistory];

        if (filter.type) {
            history = history.filter(n => n.type === filter.type);
        }

        if (filter.limit) {
            history = history.slice(-filter.limit);
        }

        return history;
    }

    /**
     * Clear notification history
     */
    clearHistory() {
        this._notificationHistory = [];
    }

    /**
     * Update notification settings
     * @param {Object} settings - New settings
     */
    updateSettings(settings) {
        this._settings = { ...this._settings, ...settings };
        game.settings.set('foundry-magic', 'notificationSettings', this._settings);
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return { ...this._settings };
    }

    /**
     * Map our notification types to Foundry types
     * @param {string} type - Our notification type
     * @returns {string} Foundry notification type
     * @private
     */
    _mapToFoundryType(type) {
        switch (type) {
            case NOTIFICATION_TYPES.SUCCESS:
                return 'success';
            case NOTIFICATION_TYPES.WARNING:
                return 'warning';
            case NOTIFICATION_TYPES.ERROR:
                return 'error';
            default:
                return 'info';
        }
    }

    /**
     * Get default display method for notification type
     * @param {string} type - Notification type
     * @returns {string} Default method
     * @private
     */
    _getDefaultMethod(type) {
        switch (type) {
            case NOTIFICATION_TYPES.ERROR:
                return NOTIFICATION_METHODS.TOAST;
            case NOTIFICATION_TYPES.PROGRESS:
                return NOTIFICATION_METHODS.TOAST;
            default:
                return NOTIFICATION_METHODS.TOAST;
        }
    }

    /**
     * Get dialog title for notification type
     * @param {string} type - Notification type
     * @returns {string} Dialog title
     * @private
     */
    _getDialogTitle(type) {
        switch (type) {
            case NOTIFICATION_TYPES.ERROR:
                return 'Error';
            case NOTIFICATION_TYPES.WARNING:
                return 'Warning';
            case NOTIFICATION_TYPES.SUCCESS:
                return 'Success';
            default:
                return 'Information';
        }
    }

    /**
     * Update progress display
     * @param {Object} progress - Progress object
     * @private
     */
    _updateProgressDisplay(progress) {
        const { current, max, message, options } = progress;
        const percentage = Math.round((current / max) * 100);

        let displayMessage = message;
        if (options.showPercentage !== false) {
            displayMessage = `${message} (${percentage}%)`;
        }

        // For now, use toast notifications for progress
        // In a more advanced implementation, this could show a progress bar
        if (progress.active) {
            ui.notifications.info(displayMessage, { permanent: true });
        } else if (progress.failed) {
            ui.notifications.error(displayMessage);
        } else {
            ui.notifications.info(displayMessage);
        }
    }

    /**
     * Clean up old progress notifications
     * @private
     */
    _cleanupOldProgress() {
        const entries = Array.from(this._activeProgress.entries());
        entries.sort((a, b) => a[1].startTime - b[1].startTime);

        // Remove oldest progress notifications
        const toRemove = entries.slice(0, entries.length - this._settings.maxProgressNotifications + 1);
        toRemove.forEach(([id]) => {
            this._activeProgress.delete(id);
        });
    }

    /**
     * Add notification to history
     * @param {Object} notification - Notification to add
     * @private
     */
    _addToHistory(notification) {
        this._notificationHistory.push(notification);

        // Maintain max history size
        if (this._notificationHistory.length > this._maxHistorySize) {
            this._notificationHistory.shift();
        }
    }

    /**
     * Generate unique notification ID
     * @returns {string} Unique ID
     * @private
     */
    _generateId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get statistics about notifications
     * @returns {Object} Notification statistics
     */
    getStats() {
        const stats = {
            total: this._notificationHistory.length,
            byType: {},
            activeProgress: this._activeProgress.size
        };

        // Count by type
        this._notificationHistory.forEach(notification => {
            stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        });

        return stats;
    }
}

// Export singleton instance
export const notificationService = new NotificationService();