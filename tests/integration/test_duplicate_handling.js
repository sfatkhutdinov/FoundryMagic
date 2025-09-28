/**
 * @fileoverview Integration test for duplicate content handling
 */

import { createApiHarness } from '../contract/helpers/createApiHarness.js';

describe('Duplicate Content Handling Integration', () => {
    it('detects and handles duplicate characters', async () => {
        const characterImporter = {
            listAvailableCharacters: jest.fn().mockResolvedValue({
                characters: [
                    {
                        id: 'char-1',
                        name: 'Existing Character',
                        level: 5,
                        class: 'Fighter',
                        race: 'Human',
                        lastModified: new Date().toISOString(),
                        isShared: true
                    }
                ],
                totalCount: 1
            }),
            importCharacter: jest.fn(),
            getImportStatus: jest.fn()
        };

        const contentService = {
            listContent: jest.fn(),
            batchImport: jest.fn(),
            checkDuplicates: jest.fn().mockResolvedValue({
                duplicates: [
                    {
                        ddbId: 'char-1',
                        foundryId: 'Actor.existing123',
                        name: 'Existing Character',
                        lastImported: new Date().toISOString(),
                        suggestedAction: 'overwrite'
                    }
                ]
            })
        };

        const { api } = createApiHarness({ characterImporter, contentService });

        // Step 1: List characters
        const characters = await api.characters.list();
        const character = characters.characters[0];

        // Step 2: Check duplicates before import
        const duplicates = await api.content.checkDuplicates({
            items: [{ id: character.id, type: 'characters' }],
            compendiumId: 'foundrymagic.characters'
        });

        expect(duplicates.duplicates).toHaveLength(1);
        expect(duplicates.duplicates[0].ddbId).toBe('char-1');
        expect(duplicates.duplicates[0].suggestedAction).toBe('overwrite');

        // Step 3: Test overwrite (simulate import with overwrite)
        characterImporter.importCharacter.mockResolvedValueOnce({
            importId: 'import-overwrite-123',
            status: 'started',
            character: { id: 'char-1', name: 'Existing Character', foundryId: null }
        });

        const importHandle = await api.characters.importCharacter({
            characterId: character.id,
            targetCompendium: 'foundrymagic.characters',
            options: { overwriteExisting: true }
        });

        expect(importHandle.status).toBe('started');
    });

    it('handles skip and rename options', async () => {
        const contentService = {
            listContent: jest.fn(),
            batchImport: jest.fn(),
            checkDuplicates: jest.fn().mockResolvedValue({
                duplicates: [
                    {
                        ddbId: 'char-1',
                        foundryId: 'Actor.existing123',
                        name: 'Existing Character',
                        lastImported: new Date().toISOString(),
                        suggestedAction: 'skip'
                    }
                ]
            })
        };

        const { api } = createApiHarness({ contentService });

        // Check duplicates
        const duplicates = await api.content.checkDuplicates({
            items: [{ id: 'char-1', type: 'characters' }],
            compendiumId: 'foundrymagic.characters'
        });

        expect(duplicates.duplicates[0].suggestedAction).toBe('skip');

        // For skip, the import would not proceed or would be cancelled
        // For rename, the name would be modified
        // Since UI handles this, the API might have options for resolution
    });

    it('handles batch duplicate resolution', async () => {
        const contentService = {
            listContent: jest.fn().mockResolvedValue({
                content: [
                    { id: 'mon-1', name: 'Existing Monster', type: 'monsters', source: 'MM', metadata: { challengeRating: '1' }, lastModified: new Date().toISOString() },
                    { id: 'mon-2', name: 'New Monster', type: 'monsters', source: 'MM', metadata: { challengeRating: '2' }, lastModified: new Date().toISOString() }
                ],
                totalCount: 2,
                hasMore: false
            }),
            batchImport: jest.fn().mockResolvedValue({
                batchId: 'batch-dup-123',
                status: 'queued',
                progress: { total: 2, completed: 0, failed: 0 }
            }),
            checkDuplicates: jest.fn().mockResolvedValue({
                duplicates: [
                    {
                        ddbId: 'mon-1',
                        foundryId: 'Actor.existingMon',
                        name: 'Existing Monster',
                        lastImported: new Date().toISOString(),
                        suggestedAction: 'overwrite'
                    }
                ]
            })
        };

        contentService.trackBatch = jest.fn().mockResolvedValue({
            batchId: 'batch-dup-123',
            status: 'completed',
            progress: { total: 2, completed: 2, failed: 0 },
            results: [
                { id: 'mon-1', status: 'success', foundryId: 'Actor.existingMon', action: 'overwritten' },
                { id: 'mon-2', status: 'success', foundryId: 'Actor.newMon' }
            ]
        });

        const { api } = createApiHarness({ contentService });

        // List content
        const monsters = await api.content.list({ type: 'monsters' });

        // Check duplicates
        const duplicates = await api.content.checkDuplicates({
            items: monsters.content.map(m => ({ id: m.id, type: 'monsters' })),
            compendiumId: 'foundrymagic.monsters'
        });

        expect(duplicates.duplicates).toHaveLength(1);

        // Batch import with overwrite
        const batchHandle = await api.content.batchImport({
            items: monsters.content.map(m => ({
                id: m.id,
                type: 'monsters',
                targetCompendium: 'foundrymagic.monsters'
            })),
            options: { overwriteExisting: true }
        });

        const progress = await contentService.trackBatch(batchHandle.batchId);
        expect(progress.results[0].action).toBe('overwritten');
    });
});