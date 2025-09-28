import { createApiHarness } from './helpers/createApiHarness.js';

describe('FoundryMagic.content.batchImport', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('wires batch progress and completion events to Foundry sockets', async () => {
        const batchResult = {
            batchId: 'batch-001',
            status: 'queued',
            progress: {
                total: 3,
                completed: 0,
                failed: 0
            }
        };

        const finalResult = {
            batchId: 'batch-001',
            status: 'completed',
            results: [
                {
                    itemId: 'monster-1',
                    foundryId: 'Compendium.foundrymagic.monsters.Monster.1'
                }
            ]
        };

        const contentService = {
            listContent: jest.fn(),
            batchImport: jest.fn().mockImplementation(async ({ onProgress, onComplete }) => {
                onProgress({
                    batchId: 'batch-001',
                    status: 'in_progress',
                    progress: {
                        total: 3,
                        completed: 1,
                        failed: 0
                    },
                    lastItem: {
                        id: 'monster-1',
                        name: 'Goblin'
                    }
                });

                await onComplete(finalResult);

                return batchResult;
            }),
            checkDuplicates: jest.fn()
        };

        const { api, services } = createApiHarness({ contentService });

        game.socket.emit.mockClear();

        const handle = await api.content.batchImport({
            items: [
                { id: 'monster-1', type: 'monsters', targetCompendium: 'foundrymagic.monsters' }
            ],
            options: {
                overwriteExisting: true,
                createFolders: true
            }
        });

        expect(services.contentService.batchImport).toHaveBeenCalled();
        expect(handle).toEqual(batchResult);

        expect(game.socket.emit).toHaveBeenCalledWith('foundrymagic.content.batch-progress', expect.objectContaining({
            batchId: 'batch-001',
            status: 'in_progress'
        }));

        expect(game.socket.emit).toHaveBeenCalledWith('foundrymagic.content.batch-completed', finalResult);
    });
});
