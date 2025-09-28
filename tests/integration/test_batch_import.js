/**
 * @fileoverview Integration test for batch content import
 */

import { createApiHarness } from '../contract/helpers/createApiHarness.js';

describe('Batch Content Import Integration', () => {
    it('completes batch import of multiple monsters', async () => {
        const contentService = {
            listContent: jest.fn().mockResolvedValue({
                content: [
                    { id: 'mon-1', name: 'Monster 1', type: 'monsters', source: 'MM', metadata: { challengeRating: '1' }, lastModified: new Date().toISOString() },
                    { id: 'mon-2', name: 'Monster 2', type: 'monsters', source: 'MM', metadata: { challengeRating: '2' }, lastModified: new Date().toISOString() },
                    { id: 'mon-3', name: 'Monster 3', type: 'monsters', source: 'MM', metadata: { challengeRating: '3' }, lastModified: new Date().toISOString() }
                ],
                totalCount: 3,
                hasMore: false
            }),
            batchImport: jest.fn().mockResolvedValue({
                batchId: 'batch-123',
                status: 'queued',
                progress: { total: 3, completed: 0, failed: 0 }
            }),
            checkDuplicates: jest.fn().mockResolvedValue({
                duplicates: []
            })
        };

        // Mock tracking function
        contentService.trackBatch = jest.fn()
            .mockResolvedValueOnce({
                batchId: 'batch-123',
                status: 'in_progress',
                progress: { total: 3, completed: 1, failed: 0 },
                lastItem: { id: 'mon-1', name: 'Monster 1' },
                errors: []
            })
            .mockResolvedValueOnce({
                batchId: 'batch-123',
                status: 'completed',
                progress: { total: 3, completed: 3, failed: 0 },
                results: [
                    { id: 'mon-1', status: 'success', foundryId: 'Actor.mon1' },
                    { id: 'mon-2', status: 'success', foundryId: 'Actor.mon2' },
                    { id: 'mon-3', status: 'success', foundryId: 'Actor.mon3' }
                ]
            });

        const { api } = createApiHarness({ contentService });

        // Step 1: List available monsters
        const monsters = await api.content.list({ type: 'monsters' });
        expect(monsters.content).toHaveLength(3);

        // Step 2: Check for duplicates
        const duplicates = await api.content.checkDuplicates({
            items: monsters.content.map(m => ({ id: m.id, type: 'monsters' })),
            compendiumId: 'foundrymagic.monsters'
        });
        expect(duplicates.duplicates).toHaveLength(0);

        // Step 3: Start batch import
        const batchHandle = await api.content.batchImport({
            items: monsters.content.map(m => ({
                id: m.id,
                type: 'monsters',
                targetCompendium: 'foundrymagic.monsters'
            })),
            options: {
                overwriteExisting: false,
                createFolders: true
            }
        });

        expect(batchHandle.batchId).toBe('batch-123');
        expect(batchHandle.status).toBe('queued');

        // Step 4: Track batch progress
        let progress = await contentService.trackBatch(batchHandle.batchId);
        expect(progress.status).toBe('in_progress');
        expect(progress.progress.completed).toBe(1);

        progress = await contentService.trackBatch(batchHandle.batchId);
        expect(progress.status).toBe('completed');
        expect(progress.progress.completed).toBe(3);
        expect(progress.results).toHaveLength(3);
    });

    it('handles batch import with some failures', async () => {
        const contentService = {
            listContent: jest.fn().mockResolvedValue({
                content: [
                    { id: 'mon-1', name: 'Monster 1', type: 'monsters', source: 'MM', metadata: { challengeRating: '1' }, lastModified: new Date().toISOString() },
                    { id: 'mon-2', name: 'Monster 2', type: 'monsters', source: 'MM', metadata: { challengeRating: '2' }, lastModified: new Date().toISOString() }
                ],
                totalCount: 2,
                hasMore: false
            }),
            batchImport: jest.fn().mockResolvedValue({
                batchId: 'batch-fail-123',
                status: 'queued',
                progress: { total: 2, completed: 0, failed: 0 }
            }),
            checkDuplicates: jest.fn().mockResolvedValue({ duplicates: [] })
        };

        contentService.trackBatch = jest.fn().mockResolvedValue({
            batchId: 'batch-fail-123',
            status: 'completed',
            progress: { total: 2, completed: 1, failed: 1 },
            results: [
                { id: 'mon-1', status: 'success', foundryId: 'Actor.mon1' },
                { id: 'mon-2', status: 'failed', error: 'Network timeout' }
            ],
            errors: [
                { itemId: 'mon-2', error: 'Network timeout', code: 'NETWORK_TIMEOUT' }
            ]
        });

        const { api } = createApiHarness({ contentService });

        const monsters = await api.content.list({ type: 'monsters' });
        const batchHandle = await api.content.batchImport({
            items: monsters.content.map(m => ({
                id: m.id,
                type: 'monsters',
                targetCompendium: 'foundrymagic.monsters'
            }))
        });

        const progress = await contentService.trackBatch(batchHandle.batchId);
        expect(progress.progress.failed).toBe(1);
        expect(progress.errors).toHaveLength(1);
        expect(progress.errors[0].itemId).toBe('mon-2');
    });
});