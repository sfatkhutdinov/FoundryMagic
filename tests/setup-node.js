/**
 * @fileoverview Node.js Test Setup for FoundryMagic
 * Simple mock environment without Jest dependencies
 */

// Simple mock functions
const mockFn = (returnValue) => {
    const fn = (...args) => returnValue;
    fn.mockImplementation = (impl) => { fn.implementation = impl; };
    fn.mockReturnValue = (val) => { fn.returnValue = val; };
    return fn;
};

// Mock Foundry VTT environment
global.game = {
    user: { isGM: true, id: 'test-user' },
    settings: {
        get: mockFn(),
        set: mockFn(),
        register: mockFn()
    },
    socket: {
        on: mockFn(),
        emit: mockFn()
    },
    packs: new Map(),
    actors: new Map(),
    scenes: new Map(),
    items: new Map()
};

global.canvas = {
    scene: null,
    tokens: {
        placeables: []
    }
};

global.ui = {
    notifications: {
        info: (...args) => console.log('INFO:', ...args),
        warn: (...args) => console.warn('WARN:', ...args),
        error: (...args) => console.error('ERROR:', ...args)
    }
};

global.CONFIG = {
    DND5E: {}
};

global.CONST = {
    ENTITY_TYPES: {},
    COMPENDIUM_ENTITY_TYPES: {}
};

global.foundry = {
    utils: {
        mergeObject: (a, b) => Object.assign({}, a, b),
        duplicate: (obj) => JSON.parse(JSON.stringify(obj)),
        randomID: () => 'test-id-' + Math.random().toString(36).substr(2, 9)
    }
};

// Mock IndexedDB for testing
global.indexedDB = {
    open: mockFn(),
    deleteDatabase: mockFn()
};

// Mock localStorage
global.localStorage = {
    getItem: mockFn(),
    setItem: mockFn(),
    removeItem: mockFn(),
    clear: mockFn()
};

console.log('✅ Node.js Foundry mock environment initialized');