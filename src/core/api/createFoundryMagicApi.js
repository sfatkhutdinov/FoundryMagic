const safeEmit = (socket, event, payload) => {
    if (socket?.emit) {
        socket.emit(event, payload);
    }
};

const createAuthApi = (authService, socket) => ({
    async authenticate(params) {
        const result = await authService.authenticate(params);
        if (result?.userId && result?.expiresAt) {
            safeEmit(socket, 'foundrymagic.auth.validated', {
                userId: result.userId,
                expiresAt: result.expiresAt
            });
        }
        return result;
    },

    async refreshSession() {
        const result = await authService.refreshSession();
        if (result?.expiresAt) {
            safeEmit(socket, 'foundrymagic.auth.refreshed', {
                expiresAt: result.expiresAt
            });
        }
        return result;
    },

    async getActiveSession() {
        if (typeof authService.getActiveSession === 'function') {
            return await authService.getActiveSession();
        }
        return null;
    },

    async endSession() {
        if (typeof authService.endSession === 'function') {
            await authService.endSession();
        }
        safeEmit(socket, 'foundrymagic.auth.ended');
    }
});

const createCharactersApi = (characterImporter, socket) => ({
    async list(params = {}) {
        return await characterImporter.listAvailableCharacters(params);
    },

    async importCharacter(payload) {
        const handle = await characterImporter.importCharacter(payload);

        if (handle?.importId && typeof characterImporter.getImportStatus === 'function') {
            try {
                const status = await characterImporter.getImportStatus(handle.importId);
                if (status?.status === 'completed') {
                    safeEmit(socket, 'foundrymagic.characters.completed', {
                        importId: handle.importId,
                        character: handle.character
                    });
                } else if (status?.status === 'failed') {
                    safeEmit(socket, 'foundrymagic.characters.failed', {
                        importId: handle.importId,
                        errors: status.errors || []
                    });
                }
            } catch (error) {
                safeEmit(socket, 'foundrymagic.characters.failed', {
                    importId: handle.importId,
                    errors: [error.message]
                });
            }
        }

        return handle;
    }
});

const createAdventuresApi = (adventureImporter, socket) => ({
    async list() {
        return await adventureImporter.listAvailableAdventures();
    },

    async importAdventure(payload) {
        const handle = await adventureImporter.importAdventure(payload);

        if (handle?.importId && typeof adventureImporter.getImportStatus === 'function') {
            try {
                const status = await adventureImporter.getImportStatus(handle.importId);
                if (status?.status === 'completed') {
                    safeEmit(socket, 'foundrymagic.adventures.completed', {
                        importId: handle.importId,
                        sceneCount: status.sceneCount,
                        journalCount: status.journalCount,
                        resultCompendiums: status.compendiums
                    });
                } else if (status?.status === 'failed') {
                    safeEmit(socket, 'foundrymagic.adventures.failed', {
                        importId: handle.importId,
                        errors: status.errors || []
                    });
                }
            } catch (error) {
                safeEmit(socket, 'foundrymagic.adventures.failed', {
                    importId: handle.importId,
                    errors: [error.message]
                });
            }
        }

        return handle;
    }
});

const createContentApi = (contentService, socket) => ({
    async list(params) {
        return await contentService.listContent(params);
    },

    async batchImport({ items, options }) {
        const handle = await contentService.batchImport({
            items,
            options,
            onProgress: (progress) => {
                safeEmit(socket, 'foundrymagic.content.batch-progress', progress);
            },
            onComplete: async (result) => {
                safeEmit(socket, 'foundrymagic.content.batch-completed', result);
            },
            onError: (error) => {
                safeEmit(socket, 'foundrymagic.content.batch-failed', error);
            }
        });

        return handle;
    },

    async checkDuplicates(payload) {
        return await contentService.checkDuplicates(payload);
    }
});

const createFoundryMagicApi = ({
    authService,
    characterImporter,
    adventureImporter,
    contentService,
    socket = game?.socket
}) => {
    if (!authService) {
        throw new Error('authService is required');
    }
    if (!characterImporter) {
        throw new Error('characterImporter is required');
    }
    if (!adventureImporter) {
        throw new Error('adventureImporter is required');
    }
    if (!contentService) {
        throw new Error('contentService is required');
    }

    return {
        auth: createAuthApi(authService, socket),
        characters: createCharactersApi(characterImporter, socket),
        adventures: createAdventuresApi(adventureImporter, socket),
        content: createContentApi(contentService, socket)
    };
};

export default createFoundryMagicApi;
