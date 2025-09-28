/**
 * @fileoverview Authentication Settings Dialog
 * Handles D&D Beyond authentication setup and management
 */

export default class AuthenticationDialog extends Application {
    constructor(foundryMagic) {
        super();
        this._foundryMagic = foundryMagic;
        this._authService = foundryMagic.authService;
    }

    /**
     * Application configuration
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'foundrymagic-auth-dialog',
            title: 'D&D Beyond Authentication',
            template: 'modules/foundrymagic/templates/auth-dialog.html',
            width: 500,
            height: 400,
            resizable: false
        });
    }

    /**
     * Get application data
     */
    getData() {
        const data = super.getData();

        return mergeObject(data, {
            isAuthenticated: this._authService.isAuthenticated(),
            cobaltToken: this._getStoredToken(),
            authStatus: this._getAuthStatus(),
            instructions: this._getInstructions()
        });
    }

    /**
     * Get stored token (masked for display)
     * @private
     */
    _getStoredToken() {
        const token = this._authService.getToken();
        if (!token) return '';

        // Mask the token for display
        const visibleChars = 8;
        const masked = '*'.repeat(Math.max(0, token.length - visibleChars));
        return token.substring(0, visibleChars) + masked;
    }

    /**
     * Get authentication status
     * @private
     */
    _getAuthStatus() {
        if (this._authService.isAuthenticated()) {
            return {
                status: 'authenticated',
                message: 'Successfully authenticated with D&D Beyond',
                icon: 'fas fa-check-circle',
                class: 'success'
            };
        }

        return {
            status: 'not-authenticated',
            message: 'Not authenticated. Please enter your Cobalt token.',
            icon: 'fas fa-exclamation-triangle',
            class: 'warning'
        };
    }

    /**
     * Get setup instructions
     * @private
     */
    _getInstructions() {
        return [
            {
                step: 1,
                title: 'Get Cobalt Token',
                description: 'Visit <a href="https://www.dndbeyond.com/account" target="_blank">D&D Beyond Account Settings</a> and generate a Cobalt token.',
                icon: 'fas fa-key'
            },
            {
                step: 2,
                title: 'Enter Token',
                description: 'Paste your Cobalt token in the field below. It will be stored securely in Foundry VTT.',
                icon: 'fas fa-paste'
            },
            {
                step: 3,
                title: 'Test Connection',
                description: 'Click "Test Authentication" to verify your token works.',
                icon: 'fas fa-plug'
            },
            {
                step: 4,
                title: 'Start Importing',
                description: 'Once authenticated, you can import characters, adventures, and other content.',
                icon: 'fas fa-download'
            }
        ];
    }

    /**
     * Activate listeners
     * @param {jQuery} html - HTML element
     */
    activateListeners(html) {
        super.activateListeners(html);

        // Token input
        html.find('#cobalt-token').on('input', event => {
            this._tokenInput = event.target.value;
        });

        // Save button
        html.find('#save-token').click(() => {
            this._saveToken();
        });

        // Test button
        html.find('#test-auth').click(() => {
            this._testAuthentication();
        });

        // Clear button
        html.find('#clear-token').click(() => {
            this._clearToken();
        });

        // Help links
        html.find('.help-link').click(event => {
            event.preventDefault();
            const url = event.currentTarget.dataset.url;
            if (url) {
                window.open(url, '_blank');
            }
        });
    }

    /**
     * Save authentication token
     * @private
     */
    async _saveToken() {
        const token = this._tokenInput?.trim();

        if (!token) {
            ui.notifications.error('Please enter a Cobalt token');
            return;
        }

        try {
            // Validate token format (basic check)
            if (!this._validateTokenFormat(token)) {
                ui.notifications.error('Invalid token format. Please check your Cobalt token.');
                return;
            }

            // Save token
            await this._authService.setToken(token);

            ui.notifications.info('Token saved successfully');

            // Refresh dialog
            this.render(false);

        } catch (error) {
            console.error('Failed to save token:', error);
            ui.notifications.error('Failed to save token: ' + error.message);
        }
    }

    /**
     * Test authentication
     * @private
     */
    async _testAuthentication() {
        const token = this._authService.getToken();

        if (!token) {
            ui.notifications.error('No token configured. Please save a token first.');
            return;
        }

        // Show loading state
        const testButton = $('#test-auth');
        const originalText = testButton.text();
        testButton.prop('disabled', true).text('Testing...');

        try {
            const isValid = await this._authService.validateToken();

            if (isValid) {
                ui.notifications.success('Authentication successful! You can now import content.');
            } else {
                ui.notifications.error('Authentication failed. Please check your Cobalt token.');
            }

            // Refresh dialog
            this.render(false);

        } catch (error) {
            console.error('Authentication test failed:', error);
            ui.notifications.error('Authentication test failed: ' + error.message);
        } finally {
            // Restore button state
            testButton.prop('disabled', false).text(originalText);
        }
    }

    /**
     * Clear authentication token
     * @private
     */
    async _clearToken() {
        const confirmed = await Dialog.confirm({
            title: 'Clear Authentication',
            content: '<p>Are you sure you want to clear your authentication token? You will need to re-enter it to import content.</p>',
            yes: () => true,
            no: () => false
        });

        if (!confirmed) return;

        try {
            await this._authService.clearToken();
            ui.notifications.info('Authentication token cleared');

            // Clear input field
            this._tokenInput = '';

            // Refresh dialog
            this.render(false);

        } catch (error) {
            console.error('Failed to clear token:', error);
            ui.notifications.error('Failed to clear token: ' + error.message);
        }
    }

    /**
     * Validate token format
     * @private
     * @param {string} token - Token to validate
     * @returns {boolean} Is valid format
     */
    _validateTokenFormat(token) {
        // Basic validation - D&D Beyond tokens are typically long alphanumeric strings
        return token && token.length > 20 && /^[a-zA-Z0-9]+$/.test(token);
    }

    /**
     * Handle dialog submission
     * @param {Event} event - Form submission event
     * @param {Object} formData - Form data
     */
    async _onSubmit(event, { updateData = null, ...formData } = {}) {
        event.preventDefault();

        // Handle save action
        if (formData.save) {
            await this._saveToken();
        }

        // Handle test action
        if (formData.test) {
            await this._testAuthentication();
        }

        // Handle clear action
        if (formData.clear) {
            await this._clearToken();
        }
    }

    /**
     * Get default button
     */
    _getDefaultButton() {
        return 'save-token';
    }
}