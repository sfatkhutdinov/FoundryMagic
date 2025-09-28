import { createApiHarness } from './helpers/createApiHarness.js';

describe('FoundryMagic.characters.importCharacter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('starts character import and emits completion event', async () => {
        const importResult = {
            importId: 'import-001',
            status: 'started',
            character: {
                id: 'char-101',
                name: 'Sir Tests-a-lot',
                foundryId: null
            }
        };

        const characterImporter = {
            listAvailableCharacters: jest.fn(),
            importCharacter: jest.fn().mockResolvedValue(importResult),
            getImportStatus: jest.fn().mockResolvedValue({
                importId: 'import-001',
                status: 'completed',
                result: {
                    foundryId: 'Actor.123',
                    compendiumPath: 'foundrymagic.characters'
                }
            })
        };

        const { api, services } = createApiHarness({ characterImporter });

        game.socket.emit.mockClear();

        const handle = await api.characters.importCharacter({
            characterId: 'char-101',
            targetCompendium: 'foundrymagic.characters',
            options: {
                includeEquipment: true,
                includeSpells: true,
                includeFeatures: true
            }
        });

        expect(services.characterImporter.importCharacter).toHaveBeenCalledWith({
            characterId: 'char-101',
            targetCompendium: 'foundrymagic.characters',
            options: {
                includeEquipment: true,
                includeSpells: true,
                includeFeatures: true
            }
        });

        expect(handle).toEqual(importResult);
        expect(game.socket.emit).toHaveBeenCalledWith('foundrymagic.characters.completed', {
            importId: 'import-001',
            character: importResult.character
        });
    });
});
