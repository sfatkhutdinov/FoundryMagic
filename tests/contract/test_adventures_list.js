import { createApiHarness } from './helpers/createApiHarness.js';

describe('FoundryMagic.adventures.list', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lists adventures available for import', async () => {
        const expected = {
            adventures: [
                {
                    id: 'adv-001',
                    title: 'Curse of Jest',
                    description: 'A spooky testing adventure',
                    publication: 'QA Press',
                    levelRange: '5-10',
                    hasScenes: true,
                    hasHandouts: true,
                    lastModified: new Date().toISOString()
                }
            ],
            totalCount: 1
        };

        const adventureImporter = {
            listAvailableAdventures: jest.fn().mockResolvedValue(expected),
            importAdventure: jest.fn(),
            getImportStatus: jest.fn()
        };

        const { api, services } = createApiHarness({ adventureImporter });

        const result = await api.adventures.list();

        expect(services.adventureImporter.listAvailableAdventures).toHaveBeenCalledWith();
        expect(result).toEqual(expected);
    });
});
