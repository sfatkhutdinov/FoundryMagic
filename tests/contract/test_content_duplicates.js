import { createApiHarness } from './helpers/createApiHarness.js';

describe('FoundryMagic.content.checkDuplicates', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns duplicate summary results', async () => {
        const duplicateSummary = {
            duplicates: [
                {
                    ddbId: 'item-1',
                    foundryId: 'Compendium.foundrymagic.items.Item.1',
                    name: 'Bag of Holding',
                    lastImported: new Date().toISOString(),
                    suggestedAction: 'overwrite'
                }
            ]
        };

        const contentService = {
            listContent: jest.fn(),
            batchImport: jest.fn(),
            checkDuplicates: jest.fn().mockResolvedValue(duplicateSummary)
        };

        const { api, services } = createApiHarness({ contentService });

        const result = await api.content.checkDuplicates({
            items: [
                { id: 'item-1', name: 'Bag of Holding', type: 'items' }
            ],
            compendiumId: 'foundrymagic.items'
        });

        expect(services.contentService.checkDuplicates).toHaveBeenCalledWith({
            items: [
                { id: 'item-1', name: 'Bag of Holding', type: 'items' }
            ],
            compendiumId: 'foundrymagic.items'
        });
        expect(result).toEqual(duplicateSummary);
    });
});
