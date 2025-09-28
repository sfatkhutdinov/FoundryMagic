import { createApiHarness } from './helpers/createApiHarness.js';

describe('FoundryMagic.content.list', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lists filtered content for requested type', async () => {
        const expectedResult = {
            content: [
                {
                    id: 'spell-fireball',
                    name: 'Fireball',
                    type: 'spells',
                    source: 'PHB',
                    metadata: {
                        level: 3,
                        school: 'evocation'
                    },
                    lastModified: new Date().toISOString()
                }
            ],
            totalCount: 1,
            hasMore: false
        };

        const contentService = {
            listContent: jest.fn().mockResolvedValue(expectedResult),
            batchImport: jest.fn(),
            checkDuplicates: jest.fn()
        };

        const { api, services } = createApiHarness({ contentService });

        const result = await api.content.list({
            type: 'spells',
            search: 'fire',
            filters: {
                level: 3,
                school: 'evocation'
            }
        });

        expect(services.contentService.listContent).toHaveBeenCalledWith({
            type: 'spells',
            search: 'fire',
            filters: {
                level: 3,
                school: 'evocation'
            }
        });
        expect(result).toEqual(expectedResult);
    });
});
