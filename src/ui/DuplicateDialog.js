/**
 * @fileoverview Duplicate Resolution Dialog
 * Handles conflicts when importing content that already exists
 */

export default class DuplicateDialog extends Application {
    constructor(foundryMagic, duplicates = []) {
        super();
        this._foundryMagic = foundryMagic;
        this._duplicates = duplicates;
        this._resolutions = new Map();
        this._currentIndex = 0;
    }

    /**
     * Application configuration
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'foundrymagic-duplicate-dialog',
            title: 'Resolve Duplicates',
            template: 'modules/foundrymagic/templates/duplicate-dialog.html',
            width: 700,
            height: 500,
            resizable: true
        });
    }

    /**
     * Get application data
     */
    getData() {
        const data = super.getData();

        const currentDuplicate = this._duplicates[this._currentIndex];
        const existingItem = currentDuplicate?.existing;
        const newItem = currentDuplicate?.new;

        return mergeObject(data, {
            duplicates: this._duplicates,
            currentIndex: this._currentIndex,
            currentDuplicate: currentDuplicate,
            existingItem: existingItem,
            newItem: newItem,
            totalDuplicates: this._duplicates.length,
            hasNext: this._currentIndex < this._duplicates.length - 1,
            hasPrevious: this._currentIndex > 0,
            resolution: this._resolutions.get(currentDuplicate?.id) || 'skip',
            canResolve: this._canResolveAll()
        });
    }

    /**
     * Check if all duplicates can be resolved
     * @private
     * @returns {boolean} Can resolve all
     */
    _canResolveAll() {
        return this._duplicates.every(duplicate => this._resolutions.has(duplicate.id));
    }

    /**
     * Set duplicates to resolve
     * @param {Array} duplicates - Array of duplicate objects
     */
    setDuplicates(duplicates) {
        this._duplicates = duplicates;
        this._resolutions.clear();
        this._currentIndex = 0;

        // Set default resolution for each duplicate
        duplicates.forEach(duplicate => {
            this._resolutions.set(duplicate.id, 'skip');
        });

        this.render(false);
    }

    /**
     * Add a duplicate to resolve
     * @param {Object} duplicate - Duplicate object
     */
    addDuplicate(duplicate) {
        this._duplicates.push(duplicate);
        this._resolutions.set(duplicate.id, 'skip');
        this.render(false);
    }

    /**
     * Activate listeners
     * @param {jQuery} html - HTML element
     */
    activateListeners(html) {
        super.activateListeners(html);

        // Resolution radio buttons
        html.find('input[name="resolution"]').change(event => {
            const resolution = event.target.value;
            const currentDuplicate = this._duplicates[this._currentIndex];
            if (currentDuplicate) {
                this._resolutions.set(currentDuplicate.id, resolution);
            }
        });

        // Navigation buttons
        html.find('#prev-duplicate').click(() => {
            if (this._currentIndex > 0) {
                this._currentIndex--;
                this.render(false);
            }
        });

        html.find('#next-duplicate').click(() => {
            if (this._currentIndex < this._duplicates.length - 1) {
                this._currentIndex++;
                this.render(false);
            }
        });

        // Apply to all buttons
        html.find('.apply-to-all').click(event => {
            const resolution = event.currentTarget.dataset.resolution;
            this._applyToAll(resolution);
        });

        // Resolve button
        html.find('#resolve-duplicates').click(() => {
            this._resolveDuplicates();
        });

        // Cancel button
        html.find('#cancel-resolution').click(() => {
            this.close();
        });

        // Item comparison toggle
        html.find('#toggle-comparison').click(() => {
            const comparison = html.find('#item-comparison');
            comparison.toggle();
        });
    }

    /**
     * Apply resolution to all duplicates
     * @private
     * @param {string} resolution - Resolution type
     */
    _applyToAll(resolution) {
        this._duplicates.forEach(duplicate => {
            this._resolutions.set(duplicate.id, resolution);
        });
        this.render(false);
    }

    /**
     * Resolve all duplicates
     * @private
     */
    async _resolveDuplicates() {
        if (!this._canResolveAll()) {
            ui.notifications.error('Please resolve all duplicates before continuing');
            return;
        }

        const resolutions = Array.from(this._resolutions.entries()).map(([id, resolution]) => ({
            id,
            resolution
        }));

        // Emit resolution event
        this._emitResolutions(resolutions);

        // Close dialog
        this.close();
    }

    /**
     * Emit resolution results
     * @private
     * @param {Array} resolutions - Resolution array
     */
    _emitResolutions(resolutions) {
        const event = new CustomEvent('foundrymagic:duplicates-resolved', {
            detail: { resolutions }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get resolution options
     * @returns {Array} Resolution options
     */
    static getResolutionOptions() {
        return [
            {
                value: 'skip',
                label: 'Skip',
                description: 'Do not import this item',
                icon: 'fas fa-ban'
            },
            {
                value: 'overwrite',
                label: 'Overwrite',
                description: 'Replace the existing item with the new one',
                icon: 'fas fa-exchange-alt'
            },
            {
                value: 'keep-both',
                label: 'Keep Both',
                description: 'Import as a new item with a different name',
                icon: 'fas fa-copy'
            },
            {
                value: 'merge',
                label: 'Merge',
                description: 'Combine the existing and new items (where possible)',
                icon: 'fas fa-object-group'
            }
        ];
    }

    /**
     * Show duplicate resolution dialog
     * @param {Object} foundryMagic - FoundryMagic instance
     * @param {Array} duplicates - Duplicates to resolve
     * @returns {Promise} Resolution promise
     */
    static async resolveDuplicates(foundryMagic, duplicates) {
        return new Promise((resolve) => {
            const dialog = new DuplicateDialog(foundryMagic, duplicates);

            // Listen for resolution event
            const handler = (event) => {
                window.removeEventListener('foundrymagic:duplicates-resolved', handler);
                resolve(event.detail.resolutions);
            };
            window.addEventListener('foundrymagic:duplicates-resolved', handler);

            dialog.render(true);
        });
    }

    /**
     * Create duplicate object
     * @param {Object} existing - Existing item
     * @param {Object} newItem - New item
     * @param {string} contentType - Content type
     * @returns {Object} Duplicate object
     */
    static createDuplicate(existing, newItem, contentType) {
        return {
            id: `${contentType}-${newItem.id}`,
            contentType,
            existing,
            new: newItem,
            differences: DuplicateDialog._findDifferences(existing, newItem)
        };
    }

    /**
     * Find differences between items
     * @private
     * @param {Object} existing - Existing item
     * @param {Object} newItem - New item
     * @returns {Array} Differences array
     */
    static _findDifferences(existing, newItem) {
        const differences = [];

        // Compare common properties
        const properties = ['name', 'description', 'level', 'type', 'source'];

        properties.forEach(prop => {
            const existingVal = existing[prop];
            const newVal = newItem[prop];

            if (existingVal !== newVal) {
                differences.push({
                    property: prop,
                    existing: existingVal,
                    new: newVal
                });
            }
        });

        return differences;
    }

    /**
     * Get duplicate summary
     * @param {Array} duplicates - Duplicates array
     * @returns {Object} Summary
     */
    static getSummary(duplicates) {
        const summary = {
            total: duplicates.length,
            byType: {},
            resolutions: {
                skip: 0,
                overwrite: 0,
                'keep-both': 0,
                merge: 0
            }
        };

        duplicates.forEach(duplicate => {
            const type = duplicate.contentType;
            summary.byType[type] = (summary.byType[type] || 0) + 1;
        });

        return summary;
    }
}