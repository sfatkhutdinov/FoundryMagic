/**
 * @fileoverview FoundryMagic Module Entry Point
 * Unified D&D Beyond integration for Foundry VTT
 */

import FoundryMagic from './core/FoundryMagic.js';

// Global module instance
let foundryMagic = null;

/**
 * Initialize FoundryMagic when Foundry is ready
 */
Hooks.once('init', async () => {
    console.log('FoundryMagic | Initializing...');

    try {
        foundryMagic = new FoundryMagic();
        await foundryMagic.initialize();

        // Make module globally accessible
        globalThis.foundryMagic = foundryMagic;

        console.log('FoundryMagic | Initialization complete');
    } catch (error) {
        console.error('FoundryMagic | Initialization failed:', error);
        ui.notifications?.error('FoundryMagic failed to initialize. Check console for details.');
    }
});

/**
 * Cleanup on world shutdown
 */
Hooks.once('ready', () => {
    // Register cleanup handler
    window.addEventListener('beforeunload', () => {
        if (foundryMagic) {
            foundryMagic.shutdown();
        }
    });
});

// Export for testing and external access
export default FoundryMagic;