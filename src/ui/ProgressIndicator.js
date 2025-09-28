/**
 * @fileoverview Import Progress Indicator
 * Displays real-time progress for import operations
 */

export default class ProgressIndicator extends Application {
    constructor(options = {}) {
        super(options);
        this._progress = {
            current: 0,
            total: 0,
            message: '',
            status: 'idle', // idle, running, completed, error
            startTime: null,
            endTime: null,
            items: []
        };
        this._updateInterval = null;
        this._isVisible = false;
    }

    /**
     * Application configuration
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'foundrymagic-progress',
            title: 'Import Progress',
            template: 'modules/foundrymagic/templates/progress-indicator.html',
            width: 500,
            height: 300,
            resizable: false,
            minimizable: false
        });
    }

    /**
     * Get application data
     */
    getData() {
        const data = super.getData();

        const progress = { ...this._progress };
        progress.percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
        progress.elapsed = this._getElapsedTime();
        progress.estimated = this._getEstimatedTime();
        progress.speed = this._getItemsPerSecond();

        return mergeObject(data, {
            progress: progress,
            canCancel: progress.status === 'running'
        });
    }

    /**
     * Get elapsed time
     * @private
     * @returns {string} Formatted elapsed time
     */
    _getElapsedTime() {
        if (!this._progress.startTime) return '0s';

        const elapsed = Date.now() - this._progress.startTime;
        return this._formatTime(elapsed);
    }

    /**
     * Get estimated remaining time
     * @private
     * @returns {string} Formatted estimated time
     */
    _getEstimatedTime() {
        if (this._progress.current === 0 || this._progress.status !== 'running') return '--';

        const elapsed = Date.now() - this._progress.startTime;
        const remaining = (elapsed / this._progress.current) * (this._progress.total - this._progress.current);
        return this._formatTime(remaining);
    }

    /**
     * Get items per second
     * @private
     * @returns {number} Items per second
     */
    _getItemsPerSecond() {
        if (!this._progress.startTime || this._progress.current === 0) return 0;

        const elapsed = (Date.now() - this._progress.startTime) / 1000; // seconds
        return Math.round((this._progress.current / elapsed) * 100) / 100;
    }

    /**
     * Format time duration
     * @private
     * @param {number} milliseconds - Time in milliseconds
     * @returns {string} Formatted time
     */
    _formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Start progress tracking
     * @param {string} operation - Operation name
     * @param {number} total - Total items to process
     */
    start(operation, total = 0) {
        this._progress = {
            current: 0,
            total: total,
            message: `Starting ${operation}...`,
            status: 'running',
            startTime: Date.now(),
            endTime: null,
            items: []
        };

        this._show();
        this._startUpdateTimer();
    }

    /**
     * Update progress
     * @param {number} current - Current progress
     * @param {string} message - Status message
     * @param {Object} item - Current item being processed
     */
    update(current, message = null, item = null) {
        this._progress.current = current;
        if (message) this._progress.message = message;
        if (item) this._progress.items.push(item);

        // Keep only last 10 items
        if (this._progress.items.length > 10) {
            this._progress.items = this._progress.items.slice(-10);
        }

        this.render(false);
    }

    /**
     * Complete progress
     * @param {string} message - Completion message
     */
    complete(message = 'Import completed successfully') {
        this._progress.status = 'completed';
        this._progress.message = message;
        this._progress.endTime = Date.now();

        this._stopUpdateTimer();
        this.render(false);

        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (this._progress.status === 'completed') {
                this._hide();
            }
        }, 3000);
    }

    /**
     * Set error state
     * @param {string} message - Error message
     */
    error(message = 'Import failed') {
        this._progress.status = 'error';
        this._progress.message = message;
        this._progress.endTime = Date.now();

        this._stopUpdateTimer();
        this.render(false);
    }

    /**
     * Reset progress
     */
    reset() {
        this._progress = {
            current: 0,
            total: 0,
            message: '',
            status: 'idle',
            startTime: null,
            endTime: null,
            items: []
        };

        this._stopUpdateTimer();
        this.render(false);
    }

    /**
     * Show the progress indicator
     * @private
     */
    _show() {
        if (!this._isVisible) {
            this._isVisible = true;
            this.render(true);
        }
    }

    /**
     * Hide the progress indicator
     * @private
     */
    _hide() {
        if (this._isVisible) {
            this._isVisible = false;
            this.close();
        }
    }

    /**
     * Start update timer
     * @private
     */
    _startUpdateTimer() {
        this._stopUpdateTimer(); // Clear any existing timer
        this._updateInterval = setInterval(() => {
            if (this.rendered) {
                this.render(false);
            }
        }, 1000); // Update every second
    }

    /**
     * Stop update timer
     * @private
     */
    _stopUpdateTimer() {
        if (this._updateInterval) {
            clearInterval(this._updateInterval);
            this._updateInterval = null;
        }
    }

    /**
     * Activate listeners
     * @param {jQuery} html - HTML element
     */
    activateListeners(html) {
        super.activateListeners(html);

        // Cancel button
        html.find('#cancel-import').click(() => {
            this._cancelImport();
        });

        // Close button
        html.find('#close-progress').click(() => {
            this._hide();
        });
    }

    /**
     * Cancel import operation
     * @private
     */
    async _cancelImport() {
        const confirmed = await Dialog.confirm({
            title: 'Cancel Import',
            content: '<p>Are you sure you want to cancel the current import operation?</p>',
            yes: () => true,
            no: () => false
        });

        if (confirmed) {
            this._progress.status = 'cancelled';
            this._progress.message = 'Import cancelled by user';
            this._progress.endTime = Date.now();

            this._stopUpdateTimer();
            this.render(false);

            // Emit cancel event
            this._emitEvent('cancel');
        }
    }

    /**
     * Emit progress event
     * @private
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     */
    _emitEvent(eventType, data = {}) {
        const event = new CustomEvent('foundrymagic:progress:' + eventType, {
            detail: {
                progress: this._progress,
                ...data
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get progress status
     * @returns {Object} Progress status
     */
    getStatus() {
        return { ...this._progress };
    }

    /**
     * Check if operation is in progress
     * @returns {boolean} Is in progress
     */
    isInProgress() {
        return this._progress.status === 'running';
    }

    /**
     * Get progress percentage
     * @returns {number} Progress percentage (0-100)
     */
    getPercentage() {
        if (this._progress.total === 0) return 0;
        return Math.round((this._progress.current / this._progress.total) * 100);
    }

    /**
     * Set total items
     * @param {number} total - Total items
     */
    setTotal(total) {
        this._progress.total = total;
        this.render(false);
    }

    /**
     * Add to current progress
     * @param {number} increment - Amount to add
     * @param {string} message - Status message
     * @param {Object} item - Current item
     */
    increment(increment = 1, message = null, item = null) {
        this.update(this._progress.current + increment, message, item);
    }

    /**
     * Close the progress indicator
     */
    async close() {
        this._stopUpdateTimer();
        this._isVisible = false;
        return super.close();
    }
}