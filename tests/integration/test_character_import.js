/**
 * @fileoverview Integration test for character import workflow
 */

import { createApiHarness } from '../contract/helpers/createApiHarness.js';

describe('Character Import Workflow Integration', () => {
    it('completes full character import process', async () => {
        const characterImporter = {
            listAvailableCharacters: jest.fn().mockResolvedValue({
                characters: [
                    {
                        id: 'char-1',
                        name: 'Test Character',
                        level: 5,
                        class: 'Fighter',
                        race: 'Human',
                        lastModified: new Date().toISOString(),
                        isShared: true
                    }
                ],
                totalCount: 1
            }),
            importCharacter: jest.fn().mockResolvedValue({
                importId: 'import-123',
                status: 'started',
                character: {
                    id: 'char-1',
                    name: 'Test Character',
                    foundryId: null
                }
            }),
            getImportStatus: jest.fn()
                .mockResolvedValueOnce({
                    importId: 'import-123',
                    status: 'processing',
                    progress: { total: 3, completed: 1, phase: 'downloading' },
                    errors: []
                })
                .mockResolvedValueOnce({
                    importId: 'import-123',
                    status: 'completed',
                    result: {
                        foundryId: 'Actor.xxxxx',
                        compendiumPath: 'foundrymagic.characters'
                    }
                })
        };

        const { api } = createApiHarness({ characterImporter });

        // Step 1: List available characters
        const characters = await api.characters.list();
        expect(characters.characters).toHaveLength(1);
        const character = characters.characters[0];

        // Step 2: Start import
        const importHandle = await api.characters.importCharacter({
            characterId: character.id,
            targetCompendium: 'foundrymagic.characters',
            options: {
                includeEquipment: true,
                includeSpells: true,
                includeFeatures: true
            }
        });

        expect(importHandle.importId).toBe('import-123');
        expect(importHandle.status).toBe('started');

        // Step 3: Track progress (simulate tracking)
        // In real implementation, this would be async iteration
        // For test, call getImportStatus

        let status = await characterImporter.getImportStatus(importHandle.importId);
        expect(status.status).toBe('processing');

        status = await characterImporter.getImportStatus(importHandle.importId);
        expect(status.status).toBe('completed');
        expect(status.result.foundryId).toBe('Actor.xxxxx');
    });

    it('handles import errors gracefully', async () => {
        const characterImporter = {
            listAvailableCharacters: jest.fn().mockResolvedValue({
                characters: [
                    {
                        id: 'char-1',
                        name: 'Test Character',
                        level: 5,
                        class: 'Fighter',
                        race: 'Human',
                        lastModified: new Date().toISOString(),
                        isShared: true
                    }
                ],
                totalCount: 1
            }),
            importCharacter: jest.fn().mockRejectedValue(new Error('NETWORK_ERROR')),
            getImportStatus: jest.fn()
        };

        const { api } = createApiHarness({ characterImporter });

        const characters = await api.characters.list();
        const character = characters.characters[0];

        await expect(
            api.characters.importCharacter({
                characterId: character.id,
                targetCompendium: 'foundrymagic.characters'
            })
        ).rejects.toThrow('NETWORK_ERROR');
    });
});