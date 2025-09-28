/**
 * @fileoverview Integration test for module installation and setup
 */

import FoundryMagic from '../../../src/core/FoundryMagic.js';

describe('Module Setup Integration', () => {
    it('initializes FoundryMagic module successfully', async () => {
        const instance = new FoundryMagic();

        await expect(instance.initialize()).resolves.not.toThrow();

        expect(instance._isInitialized).toBe(true);
    });

    it('provides unified API interface', async () => {
        const instance = new FoundryMagic();
        await instance.initialize();

        // Check that API is accessible (assuming it's set on the instance or global)
        // Since the module sets globalThis.foundryMagic, but for test, check instance

        expect(instance._authService).toBeDefined();
        expect(instance._cacheManager).toBeDefined();
        expect(instance._characterImporter).toBeDefined();
    });

    it('registers Foundry VTT hooks', async () => {
        // Mock Hooks
        global.Hooks = {
            once: jest.fn(),
            on: jest.fn()
        };

        const FoundryMagic = require('../../../src/core/FoundryMagic.js').default;

        const instance = new FoundryMagic();
        await instance.initialize();

        // Check that hooks were registered
        expect(Hooks.once).toHaveBeenCalledWith('init', expect.any(Function));
        expect(Hooks.once).toHaveBeenCalledWith('ready', expect.any(Function));
    });
});