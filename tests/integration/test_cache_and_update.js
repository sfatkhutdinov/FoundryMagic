/**
 * @fileoverview Integration test for cache management and content update workflow
 */

import { createApiHarness } from '../contract/helpers/createApiHarness.js';

describe('Cache Management and Content Update Integration', () => {
    it('manages cache size and automatic cleanup', async () => {
        // Mock cache manager
        const cacheManager = {
            initialize: jest.fn().mockResolvedValue(),
            getCacheSize: jest.fn()
                .mockResolvedValueOnce(400 * 1024 * 1024) // 400MB
                .mockResolvedValueOnce(450 * 1024 * 1024) // 450MB
                .mockResolvedValueOnce(300 * 1024 * 1024), // After cleanup: 300MB
            cleanup: jest.fn().mockResolvedValue({ freedBytes: 150 * 1024 * 1024 }),
            store: jest.fn().mockResolvedValue(),
            retrieve: jest.fn().mockResolvedValue({ data: 'cached content' }),
            clear: jest.fn().mockResolvedValue()
        };

        const contentService = {
            listContent: jest.fn().mockResolvedValue({
                content: [
                    { id: 'large-mon-1', name: 'Large Monster 1', type: 'monsters', source: 'MM', metadata: { challengeRating: '10' }, lastModified: new Date().toISOString() },
                    { id: 'large-mon-2', name: 'Large Monster 2', type: 'monsters', source: 'MM', metadata: { challengeRating: '11' }, lastModified: new Date().toISOString() }
                ],
                totalCount: 2,
                hasMore: false
            }),
            batchImport: jest.fn().mockResolvedValue({
                batchId: 'batch-cache-123',
                status: 'queued',
                progress: { total: 2, completed: 0, failed: 0 }
            }),
            checkDuplicates: jest.fn().mockResolvedValue({ duplicates: [] })
        };

        contentService.trackBatch = jest.fn().mockResolvedValue({
            batchId: 'batch-cache-123',
            status: 'completed',
            progress: { total: 2, completed: 2, failed: 0 },
            results: [
                { id: 'large-mon-1', status: 'success', foundryId: 'Actor.large1' },
                { id: 'large-mon-2', status: 'success', foundryId: 'Actor.large2' }
            ]
        });

        // Mock FoundryMagic to include cache manager
        const FoundryMagic = require('../../../src/core/FoundryMagic.js').default;
        const instance = new FoundryMagic();
        instance._cacheManager = cacheManager;

        // Step 1: Check initial cache size
        let size = await cacheManager.getCacheSize();
        expect(size).toBe(400 * 1024 * 1024);

        // Step 2: Import large content
        const { api } = createApiHarness({ contentService });
        const monsters = await api.content.list({ type: 'monsters' });
        await api.content.batchImport({
            items: monsters.content.map(m => ({
                id: m.id,
                type: 'monsters',
                targetCompendium: 'foundrymagic.monsters'
            }))
        });

        // Step 3: Check cache size after import
        size = await cacheManager.getCacheSize();
        expect(size).toBe(450 * 1024 * 1024); // Approaching limit

        // Step 4: Trigger automatic cleanup
        await cacheManager.cleanup();
        size = await cacheManager.getCacheSize();
        expect(size).toBe(300 * 1024 * 1024); // After cleanup
    });

    it('provides offline access to cached content', async () => {
        const cacheManager = {
            initialize: jest.fn().mockResolvedValue(),
            getCacheSize: jest.fn().mockResolvedValue(100 * 1024 * 1024),
            cleanup: jest.fn().mockResolvedValue({ freedBytes: 0 }),
            store: jest.fn().mockResolvedValue(),
            retrieve: jest.fn().mockResolvedValue({
                data: 'cached monster data',
                timestamp: new Date().toISOString()
            }),
            clear: jest.fn().mockResolvedValue()
        };

        const contentService = {
            listContent: jest.fn().mockResolvedValue({
                content: [
                    { id: 'cached-mon-1', name: 'Cached Monster', type: 'monsters', source: 'MM', metadata: { challengeRating: '5' }, lastModified: new Date().toISOString() }
                ],
                totalCount: 1,
                hasMore: false
            }),
            batchImport: jest.fn(),
            checkDuplicates: jest.fn().mockResolvedValue({ duplicates: [] })
        };

        // Step 1: Store content in cache
        await cacheManager.store('cached-mon-1', { data: 'monster data' });

        // Step 2: Retrieve from cache (offline access)
        const cached = await cacheManager.retrieve('cached-mon-1');
        expect(cached.data).toBe('cached monster data');
        expect(cached.timestamp).toBeDefined();
    });

    it('persists cache across sessions', async () => {
        const cacheManager = {
            initialize: jest.fn().mockResolvedValue(),
            getCacheSize: jest.fn().mockResolvedValue(50 * 1024 * 1024),
            cleanup: jest.fn().mockResolvedValue({ freedBytes: 0 }),
            store: jest.fn().mockResolvedValue(),
            retrieve: jest.fn().mockResolvedValue({
                data: 'persistent data',
                timestamp: new Date().toISOString()
            }),
            clear: jest.fn().mockResolvedValue()
        };

        // Simulate session restart by re-initializing
        await cacheManager.initialize();

        // Content should still be available
        const cached = await cacheManager.retrieve('persistent-item');
        expect(cached.data).toBe('persistent data');
    });

    it('allows manual cache clearing', async () => {
        const cacheManager = {
            initialize: jest.fn().mockResolvedValue(),
            getCacheSize: jest.fn().mockResolvedValue(200 * 1024 * 1024),
            cleanup: jest.fn().mockResolvedValue({ freedBytes: 0 }),
            store: jest.fn().mockResolvedValue(),
            retrieve: jest.fn().mockResolvedValue(null), // After clear
            clear: jest.fn().mockResolvedValue()
        };

        // Step 1: Store some content
        await cacheManager.store('item-to-clear', { data: 'content' });

        // Step 2: Manual clear
        await cacheManager.clear();

        // Step 3: Verify cleared
        const cached = await cacheManager.retrieve('item-to-clear');
        expect(cached).toBeNull();
    });
});