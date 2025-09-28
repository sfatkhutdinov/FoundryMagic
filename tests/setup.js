// Test setup file for Foundry VTT environment simulation
global.game = {
    user: { isGM: true, id: 'test-user' },
    settings: {
        get: jest.fn(),
        set: jest.fn(),
        register: jest.fn()
    },
    socket: {
        on: jest.fn(),
        emit: jest.fn()
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
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
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
        mergeObject: jest.fn((a, b) => Object.assign({}, a, b)),
        duplicate: jest.fn((obj) => JSON.parse(JSON.stringify(obj))),
        randomID: jest.fn(() => 'test-id-' + Math.random().toString(36).substr(2, 9))
    }
};

global.Hooks = {
    on: jest.fn(),
    once: jest.fn(),
    call: jest.fn(),
    callAll: jest.fn()
};

// Mock browser APIs
global.indexedDB = require('fake-indexeddb');
global.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

// Mock fetch for D&D Beyond API calls
global.fetch = jest.fn();