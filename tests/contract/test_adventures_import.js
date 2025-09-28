import { createApiHarness } from './helpers/createApiHarness.js';

describe('FoundryMagic.adventures.importAdventure', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('imports an adventure and emits scene summary', async () => {
        const importResult = {
            importId: 'adv-import-001',
            status: 'started',
            adventure: {
                id: 'adv-001',
                title: 'Curse of Jest',
                foundryId: null
            }
        };

        const adventureImporter = {
            listAvailableAdventures: jest.fn(),
            importAdventure: jest.fn().mockResolvedValue(importResult),
            getImportStatus: jest.fn().mockResolvedValue({
                importId: 'adv-import-001',
                status: 'completed',
                sceneCount: 12,
                journalCount: 24,
                compendiums: {
                    scenes: 'foundrymagic.scenes',
                    journals: 'foundrymagic.journals'
                }
            })
        };

        const { api, services } = createApiHarness({ adventureImporter });

        game.socket.emit.mockClear();

        const handle = await api.adventures.importAdventure({
            adventureId: 'adv-001',
            targetCompendiums: {
                scenes: 'foundrymagic.scenes',
                journals: 'foundrymagic.journals',
                actors: 'foundrymagic.monsters'
            },
            sceneOptions: {
                includeLighting: true,
                includeWalls: true,
                includeTokens: true
            }
        });

        expect(services.adventureImporter.importAdventure).toHaveBeenCalledWith({
            adventureId: 'adv-001',
            targetCompendiums: {
                scenes: 'foundrymagic.scenes',
                journals: 'foundrymagic.journals',
                actors: 'foundrymagic.monsters'
            },
            sceneOptions: {
                includeLighting: true,
                includeWalls: true,
                includeTokens: true
            }
        });

        expect(handle).toEqual(importResult);
        expect(game.socket.emit).toHaveBeenCalledWith('foundrymagic.adventures.completed', {
            importId: 'adv-import-001',
            sceneCount: 12,
            journalCount: 24,
            resultCompendiums: {
                scenes: 'foundrymagic.scenes',
                journals: 'foundrymagic.journals'
            }
        });
    });
});
