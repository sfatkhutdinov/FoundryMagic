/**
 * @fileoverview Integration test for adventure import workflow
 */

import { createApiHarness } from '../contract/helpers/createApiHarness.js';

describe('Adventure Import Workflow Integration', () => {
    it('completes full adventure import with scene enhancements', async () => {
        const adventureImporter = {
            listAvailableAdventures: jest.fn().mockResolvedValue({
                adventures: [
                    {
                        id: 'adv-1',
                        title: 'Test Adventure',
                        description: 'A test adventure',
                        publication: 'Test',
                        levelRange: '1-5',
                        hasScenes: true,
                        hasHandouts: true,
                        lastModified: new Date().toISOString()
                    }
                ],
                totalCount: 1
            }),
            importAdventure: jest.fn().mockResolvedValue({
                importId: 'import-adv-123',
                status: 'started',
                adventure: {
                    id: 'adv-1',
                    title: 'Test Adventure',
                    foundryId: null
                }
            }),
            getImportStatus: jest.fn()
                .mockResolvedValueOnce({
                    importId: 'import-adv-123',
                    status: 'processing',
                    phase: 'downloading',
                    progress: { total: 5, completed: 1 },
                    sceneEnhancements: { walls: false, lighting: false, tokens: 0 },
                    errors: []
                })
                .mockResolvedValueOnce({
                    importId: 'import-adv-123',
                    status: 'processing',
                    phase: 'scenes',
                    progress: { total: 5, completed: 3 },
                    sceneEnhancements: { walls: true, lighting: true, tokens: 8 },
                    errors: []
                })
                .mockResolvedValueOnce({
                    importId: 'import-adv-123',
                    status: 'completed',
                    sceneCount: 3,
                    journalCount: 5,
                    resultCompendiums: {
                        scenes: 'foundrymagic.scenes',
                        journals: 'foundrymagic.journals'
                    }
                })
        };

        const { api } = createApiHarness({ adventureImporter });

        // Step 1: List available adventures
        const adventures = await api.adventures.list();
        expect(adventures.adventures).toHaveLength(1);
        const adventure = adventures.adventures[0];

        // Step 2: Start import with scene options
        const importHandle = await api.adventures.importAdventure({
            adventureId: adventure.id,
            targetCompendiums: {
                journals: 'foundrymagic.journals',
                scenes: 'foundrymagic.scenes',
                actors: 'foundrymagic.monsters'
            },
            sceneOptions: {
                includeLighting: true,
                includeWalls: true,
                includeTokens: true
            }
        });

        expect(importHandle.importId).toBe('import-adv-123');
        expect(importHandle.status).toBe('started');

        // Step 3: Track progress through phases
        let status = await adventureImporter.getImportStatus(importHandle.importId);
        expect(status.phase).toBe('downloading');

        status = await adventureImporter.getImportStatus(importHandle.importId);
        expect(status.phase).toBe('scenes');
        expect(status.sceneEnhancements.walls).toBe(true);
        expect(status.sceneEnhancements.tokens).toBe(8);

        status = await adventureImporter.getImportStatus(importHandle.importId);
        expect(status.status).toBe('completed');
        expect(status.sceneCount).toBe(3);
        expect(status.journalCount).toBe(5);
    });

    it('handles adventure import errors', async () => {
        const adventureImporter = {
            listAvailableAdventures: jest.fn().mockResolvedValue({
                adventures: [
                    {
                        id: 'adv-1',
                        title: 'Test Adventure',
                        description: 'A test adventure',
                        publication: 'Test',
                        levelRange: '1-5',
                        hasScenes: true,
                        hasHandouts: true,
                        lastModified: new Date().toISOString()
                    }
                ],
                totalCount: 1
            }),
            importAdventure: jest.fn().mockRejectedValue(new Error('IMPORT_FAILED')),
            getImportStatus: jest.fn()
        };

        const { api } = createApiHarness({ adventureImporter });

        const adventures = await api.adventures.list();
        const adventure = adventures.adventures[0];

        await expect(
            api.adventures.importAdventure({
                adventureId: adventure.id,
                targetCompendiums: {
                    journals: 'foundrymagic.journals',
                    scenes: 'foundrymagic.scenes'
                }
            })
        ).rejects.toThrow('IMPORT_FAILED');
    });
});