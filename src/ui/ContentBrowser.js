/**
 * @fileoverview Content Browser with Search and Filter
 * Provides a searchable interface for browsing imported content
 */

export default class ContentBrowser extends Application {
    constructor(foundryMagic, contentType) {
        super();
        this._foundryMagic = foundryMagic;
        this._contentType = contentType;
        this._cacheManager = foundryMagic.cacheManager;
        this._items = [];
        this._filteredItems = [];
        this._searchTerm = '';
        this._filters = {};
        this._sortBy = 'name';
        this._sortOrder = 'asc';
        this._currentPage = 1;
        this._itemsPerPage = 20;
    }

    /**
     * Application configuration
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'foundrymagic-content-browser',
            template: 'modules/foundrymagic/templates/content-browser.html',
            width: 900,
            height: 700,
            resizable: true
        });
    }

    /**
     * Get application data
     */
    async getData() {
        const data = super.getData();

        // Load content items
        await this._loadContent();

        return mergeObject(data, {
            contentType: this._contentType,
            items: this._getPaginatedItems(),
            searchTerm: this._searchTerm,
            filters: this._filters,
            sortBy: this._sortBy,
            sortOrder: this._sortOrder,
            currentPage: this._currentPage,
            totalPages: this._getTotalPages(),
            totalItems: this._filteredItems.length,
            hasFilters: this._hasActiveFilters(),
            filterOptions: this._getFilterOptions()
        });
    }

    /**
     * Load content from cache
     * @private
     */
    async _loadContent() {
        try {
            const cacheKeys = await this._cacheManager.getKeys(`${this._contentType}-`);
            this._items = [];

            for (const key of cacheKeys) {
                const item = await this._cacheManager.retrieve(key);
                if (item) {
                    this._items.push({
                        id: key.replace(`${this._contentType}-`, ''),
                        key: key,
                        ...item,
                        displayName: this._getDisplayName(item),
                        displayType: this._getDisplayType(item)
                    });
                }
            }

            this._applyFiltersAndSort();

        } catch (error) {
            console.error('Failed to load content:', error);
            this._items = [];
            this._filteredItems = [];
        }
    }

    /**
     * Get display name for item
     * @private
     * @param {Object} item - Content item
     * @returns {string} Display name
     */
    _getDisplayName(item) {
        // Override in subclasses for specific content types
        return item.name || item.title || 'Unknown';
    }

    /**
     * Get display type for item
     * @private
     * @param {Object} item - Content item
     * @returns {string} Display type
     */
    _getDisplayType(item) {
        return this._contentType;
    }

    /**
     * Apply filters and sorting
     * @private
     */
    _applyFiltersAndSort() {
        let filtered = [...this._items];

        // Apply search filter
        if (this._searchTerm) {
            const term = this._searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.displayName.toLowerCase().includes(term) ||
                item.description?.toLowerCase().includes(term)
            );
        }

        // Apply custom filters
        filtered = this._applyCustomFilters(filtered);

        // Apply sorting
        filtered.sort((a, b) => {
            let aVal = this._getSortValue(a);
            let bVal = this._getSortValue(b);

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return this._sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return this._sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        this._filteredItems = filtered;
        this._currentPage = Math.min(this._currentPage, this._getTotalPages());
    }

    /**
     * Apply custom filters
     * @private
     * @param {Array} items - Items to filter
     * @returns {Array} Filtered items
     */
    _applyCustomFilters(items) {
        // Override in subclasses for specific filtering logic
        return items;
    }

    /**
     * Get sort value for item
     * @private
     * @param {Object} item - Content item
     * @returns {string|number} Sort value
     */
    _getSortValue(item) {
        switch (this._sortBy) {
            case 'name':
                return item.displayName;
            case 'date':
                return item.timestamp || '';
            case 'type':
                return item.displayType;
            default:
                return item.displayName;
        }
    }

    /**
     * Get filter options
     * @private
     * @returns {Object} Filter options
     */
    _getFilterOptions() {
        // Override in subclasses for specific filter options
        return {};
    }

    /**
     * Get paginated items
     * @private
     * @returns {Array} Items for current page
     */
    _getPaginatedItems() {
        const start = (this._currentPage - 1) * this._itemsPerPage;
        const end = start + this._itemsPerPage;
        return this._filteredItems.slice(start, end);
    }

    /**
     * Get total pages
     * @private
     * @returns {number} Total pages
     */
    _getTotalPages() {
        return Math.ceil(this._filteredItems.length / this._itemsPerPage);
    }

    /**
     * Check if filters are active
     * @private
     * @returns {boolean} Has active filters
     */
    _hasActiveFilters() {
        return this._searchTerm ||
            Object.values(this._filters).some(filter => filter && filter !== '');
    }

    /**
     * Activate listeners
     * @param {jQuery} html - HTML element
     */
    activateListeners(html) {
        super.activateListeners(html);

        // Search input
        html.find('#content-search').on('input', event => {
            this._searchTerm = event.target.value;
            this._currentPage = 1;
            this._applyFiltersAndSort();
            this.render(false);
        });

        // Sort dropdown
        html.find('#sort-by').change(event => {
            this._sortBy = event.target.value;
            this._applyFiltersAndSort();
            this.render(false);
        });

        // Sort order button
        html.find('#sort-order').click(() => {
            this._sortOrder = this._sortOrder === 'asc' ? 'desc' : 'asc';
            this._applyFiltersAndSort();
            this.render(false);
        });

        // Filter inputs
        html.find('.filter-input').change(event => {
            const filterName = event.target.name;
            const filterValue = event.target.value;
            this._filters[filterName] = filterValue;
            this._currentPage = 1;
            this._applyFiltersAndSort();
            this.render(false);
        });

        // Pagination
        html.find('#prev-page').click(() => {
            if (this._currentPage > 1) {
                this._currentPage--;
                this.render(false);
            }
        });

        html.find('#next-page').click(() => {
            if (this._currentPage < this._getTotalPages()) {
                this._currentPage++;
                this.render(false);
            }
        });

        // Items per page
        html.find('#items-per-page').change(event => {
            this._itemsPerPage = parseInt(event.target.value);
            this._currentPage = 1;
            this.render(false);
        });

        // Item actions
        html.find('.item-action').click(event => {
            const action = event.currentTarget.dataset.action;
            const itemId = event.currentTarget.dataset.itemId;
            this._handleItemAction(action, itemId);
        });

        // Clear filters
        html.find('#clear-filters').click(() => {
            this._searchTerm = '';
            this._filters = {};
            this._currentPage = 1;
            this._applyFiltersAndSort();
            this.render(false);
        });

        // Refresh content
        html.find('#refresh-content').click(() => {
            this._loadContent();
            this.render(false);
        });
    }

    /**
     * Handle item action
     * @private
     * @param {string} action - Action type
     * @param {string} itemId - Item ID
     */
    async _handleItemAction(action, itemId) {
        const item = this._items.find(i => i.id === itemId);
        if (!item) return;

        switch (action) {
            case 'view':
                this._viewItem(item);
                break;
            case 'import':
                this._importItem(item);
                break;
            case 'delete':
                await this._deleteItem(item);
                break;
            case 'edit':
                this._editItem(item);
                break;
            default:
                console.warn('Unknown action:', action);
        }
    }

    /**
     * View item details
     * @private
     * @param {Object} item - Content item
     */
    _viewItem(item) {
        // Override in subclasses for specific viewing logic
        console.log('Viewing item:', item);
    }

    /**
     * Import item
     * @private
     * @param {Object} item - Content item
     */
    async _importItem(item) {
        // Override in subclasses for specific import logic
        ui.notifications.info(`Importing ${item.displayName}...`);
    }

    /**
     * Delete item
     * @private
     * @param {Object} item - Content item
     */
    async _deleteItem(item) {
        const confirmed = await Dialog.confirm({
            title: 'Delete Item',
            content: `<p>Are you sure you want to delete "${item.displayName}"?</p>`,
            yes: () => true,
            no: () => false
        });

        if (!confirmed) return;

        try {
            await this._cacheManager.remove(item.key);
            ui.notifications.info(`Deleted ${item.displayName}`);

            // Refresh the list
            await this._loadContent();
            this.render(false);

        } catch (error) {
            console.error('Failed to delete item:', error);
            ui.notifications.error('Failed to delete item');
        }
    }

    /**
     * Edit item
     * @private
     * @param {Object} item - Content item
     */
    _editItem(item) {
        // Override in subclasses for specific editing logic
        console.log('Editing item:', item);
    }

    /**
     * Refresh the browser
     */
    async refresh() {
        await this._loadContent();
        this.render(false);
    }

    /**
     * Set search term
     * @param {string} term - Search term
     */
    setSearchTerm(term) {
        this._searchTerm = term;
        this._currentPage = 1;
        this._applyFiltersAndSort();
        this.render(false);
    }

    /**
     * Set filters
     * @param {Object} filters - Filter object
     */
    setFilters(filters) {
        this._filters = { ...filters };
        this._currentPage = 1;
        this._applyFiltersAndSort();
        this.render(false);
    }
}