/**
 * @fileoverview Integration test for authentication workflow
 */

import { createApiHarness } from '../contract/helpers/createApiHarness.js';

describe('Authentication Workflow Integration', () => {
    it('completes full authentication and content discovery flow', async () => {
        const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

        const authService = {
            authenticate: jest.fn().mockResolvedValue({
                valid: true,
                expiresAt,
                userId: 'user-123',
                permissions: ['characters', 'adventures', 'content']
            }),
            refreshSession: jest.fn(),
            getActiveSession: jest.fn().mockResolvedValue({
                userId: 'user-123',
                expiresAt,
                permissions: ['characters', 'adventures', 'content'],
                createdAt: new Date().toISOString()
            }),
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
            importCharacter: jest.fn(),
            getImportStatus: jest.fn()
        };

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
            importAdventure: jest.fn(),
            getImportStatus: jest.fn()
        };

        const contentService = {
            listContent: jest.fn().mockResolvedValue({
                content: [
                    {
                        id: 'mon-1',
                        name: 'Test Monster',
                        type: 'monsters',
                        source: 'MM',
                        metadata: { challengeRating: '1' },
                        lastModified: new Date().toISOString()
                    }
                ],
                totalCount: 1,
                hasMore: false
            }),
            batchImport: jest.fn(),
            checkDuplicates: jest.fn()
        };

        const { api } = createApiHarness({
            authService,
            characterImporter,
            adventureImporter,
            contentService
        });

        // Step 1: Authenticate
        const authResult = await api.auth.authenticate({
            cobaltToken: 'valid-token',
            userId: 'user-123'
        });

        expect(authResult.valid).toBe(true);
        expect(authResult.userId).toBe('user-123');

        // Step 2: Get active session
        const session = await api.auth.getActiveSession();
        expect(session).toBeDefined();
        expect(session.userId).toBe('user-123');

        // Step 3: List characters
        const characters = await api.characters.list();
        expect(characters.characters).toHaveLength(1);
        expect(characters.characters[0].name).toBe('Test Character');

        // Step 4: List adventures
        const adventures = await api.adventures.list();
        expect(adventures.adventures).toHaveLength(1);
        expect(adventures.adventures[0].title).toBe('Test Adventure');

        // Step 5: List content (monsters)
        const monsters = await api.content.list({ type: 'monsters' });
        expect(monsters.content).toHaveLength(1);
        expect(monsters.content[0].name).toBe('Test Monster');
    });

    it('handles authentication failure gracefully', async () => {
        const authService = {
            authenticate: jest.fn().mockRejectedValue(new Error('INVALID_TOKEN')),
            refreshSession: jest.fn(),
            getActiveSession: jest.fn(),
            endSession: jest.fn()
        };

        const { api } = createApiHarness({ authService });

        await expect(
            api.auth.authenticate({ cobaltToken: 'invalid-token', userId: 'user-123' })
        ).rejects.toThrow('INVALID_TOKEN');
    });
});