import { createApiHarness } from './helpers/createApiHarness.js';

describe('FoundryMagic.characters.list', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lists characters with optional shared filter', async () => {
        const expectedList = {
            characters: [
                {
                    id: 'char-101',
                    name: 'Sir Tests-a-lot',
                    level: 7,
                    class: 'Paladin',
                    race: 'Aasimar',
                    lastModified: new Date().toISOString(),
                    isShared: true
                }
            ],
            totalCount: 1
        };

        const characterImporter = {
            listAvailableCharacters: jest.fn().mockResolvedValue(expectedList),
            importCharacter: jest.fn(),
            getImportStatus: jest.fn()
        };

        const { api, services } = createApiHarness({ characterImporter });

        const result = await api.characters.list({ filterSharedOnly: true });

        expect(services.characterImporter.listAvailableCharacters).toHaveBeenCalledWith({
            filterSharedOnly: true
        });
        expect(result).toEqual(expectedList);
    });
});
