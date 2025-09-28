import createFoundryMagicApi from '../../../src/core/api/createFoundryMagicApi.js';

const createDefaultAuthService = () => ({
    authenticate: jest.fn(),
    refreshSession: jest.fn(),
    getActiveSession: jest.fn(),
    endSession: jest.fn()
});

const createDefaultCharacterImporter = () => ({
    listAvailableCharacters: jest.fn(),
    importCharacter: jest.fn(),
    getImportStatus: jest.fn()
});

const createDefaultAdventureImporter = () => ({
    listAvailableAdventures: jest.fn(),
    importAdventure: jest.fn(),
    getImportStatus: jest.fn()
});

const createDefaultContentService = () => ({
    listContent: jest.fn(),
    batchImport: jest.fn(),
    checkDuplicates: jest.fn()
});

export const createApiHarness = (overrides = {}) => {
    const authService = overrides.authService || createDefaultAuthService();
    const characterImporter = overrides.characterImporter || createDefaultCharacterImporter();
    const adventureImporter = overrides.adventureImporter || createDefaultAdventureImporter();
    const contentService = overrides.contentService || createDefaultContentService();

    const api = createFoundryMagicApi({
        authService,
        characterImporter,
        adventureImporter,
        contentService
    });

    return {
        api,
        services: {
            authService,
            characterImporter,
            adventureImporter,
            contentService
        }
    };
};

export default createApiHarness;
