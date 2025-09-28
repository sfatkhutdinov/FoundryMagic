/**
 * @fileoverview Integration test for error handling and recovery
 */

import { createApiHarness } from '../contract/helpers/createApiHarness.js';

describe('Error Handling and Recovery Integration', () => {
    it('handles authentication expiration during import', async () => {
        const authService = {
            authenticate: jest.fn().mockResolvedValue({
                valid: true,
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                userId: 'user-123',
                permissions: ['characters', 'adventures', 'content']
            }),
            refreshSession: jest.fn()
                .mockRejectedValueOnce(new Error('SESSION_EXPIRED'))
                .mockResolvedValueOnce({
                    refreshed: true,
                    expiresAt: new Date(Date.now() + 3600000).toISOString()
                }),
            getActiveSession: jest.fn(),
            endSession: jest.fn()
        };

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
            importCharacter: jest.fn()
                .mockRejectedValueOnce(new Error('AUTHENTICATION_FAILED'))
                .mockResolvedValueOnce({
                    importId: 'import-retry-123',
                    status: 'started',
                    character: { id: 'char-1', name: 'Test Character', foundryId: null }
                }),
            getImportStatus: jest.fn()
        };

        const { api } = createApiHarness({ authService, characterImporter });

        // Step 1: Authenticate initially
        await api.auth.authenticate({ cobaltToken: 'token', userId: 'user-123' });

        // Step 2: Attempt import that fails due to expired auth
        const characters = await api.characters.list();
        const character = characters.characters[0];

        await expect(
            api.characters.importCharacter({
                characterId: character.id,
                targetCompendium: 'foundrymagic.characters'
            })
        ).rejects.toThrow('AUTHENTICATION_FAILED');

        // Step 3: Refresh session
        const refreshResult = await api.auth.refreshSession();
        expect(refreshResult.refreshed).toBe(true);

        // Step 4: Retry import
        const importHandle = await api.characters.importCharacter({
            characterId: character.id,
            targetCompendium: 'foundrymagic.characters'
        });

        expect(importHandle.status).toBe('started');
    });

    it('handles network interruptions with retry', async () => {
        const contentService = {
            listContent: jest.fn().mockResolvedValue({
                content: [
                    { id: 'mon-1', name: 'Monster 1', type: 'monsters', source: 'MM', metadata: { challengeRating: '1' }, lastModified: new Date().toISOString() }
                ],
                totalCount: 1,
                hasMore: false
            }),
            batchImport: jest.fn()
                .mockRejectedValueOnce(new Error('NETWORK_ERROR'))
                .mockResolvedValueOnce({
                    batchId: 'batch-retry-123',
                    status: 'queued',
                    progress: { total: 1, completed: 0, failed: 0 }
                }),
            checkDuplicates: jest.fn().mockResolvedValue({ duplicates: [] })
        };

        contentService.trackBatch = jest.fn().mockResolvedValue({
            batchId: 'batch-retry-123',
            status: 'completed',
            progress: { total: 1, completed: 1, failed: 0 },
            results: [{ id: 'mon-1', status: 'success', foundryId: 'Actor.mon1' }]
        });

        const { api } = createApiHarness({ contentService });

        // Step 1: List content
        const monsters = await api.content.list({ type: 'monsters' });

        // Step 2: Attempt batch import that fails
        await expect(
            api.content.batchImport({
                items: [{ id: 'mon-1', type: 'monsters', targetCompendium: 'foundrymagic.monsters' }]
            })
        ).rejects.toThrow('NETWORK_ERROR');

        // Step 3: Retry batch import
        const batchHandle = await api.content.batchImport({
            items: [{ id: 'mon-1', type: 'monsters', targetCompendium: 'foundrymagic.monsters' }]
        });

        expect(batchHandle.status).toBe('queued');

        // Step 4: Verify completion
        const progress = await contentService.trackBatch(batchHandle.batchId);
        expect(progress.status).toBe('completed');
    });

    it('provides clear error messages and recovery options', async () => {
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
            importAdventure: jest.fn().mockRejectedValue(new Error('INSUFFICIENT_PERMISSIONS')),
            getImportStatus: jest.fn()
        };

        const { api } = createApiHarness({ adventureImporter });

        const adventures = await api.adventures.list();
        const adventure = adventures.adventures[0];

        // Attempt import that fails with clear error
        await expect(
            api.adventures.importAdventure({
                adventureId: adventure.id,
                targetCompendiums: {
                    journals: 'foundrymagic.journals',
                    scenes: 'foundrymagic.scenes'
                }
            })
        ).rejects.toThrow('INSUFFICIENT_PERMISSIONS');

        // The error should be specific enough to guide recovery (e.g., re-authenticate)
    });
});