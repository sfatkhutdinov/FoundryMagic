import { createApiHarness } from './helpers/createApiHarness.js';

describe('FoundryMagic.auth.refreshSession', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns refresh result and emits refreshed event', async () => {
        const refreshResult = {
            refreshed: true,
            expiresAt: new Date(Date.now() + 3600000).toISOString()
        };

        const authService = {
            authenticate: jest.fn(),
            refreshSession: jest.fn().mockResolvedValue(refreshResult),
            getActiveSession: jest.fn(),
            endSession: jest.fn()
        };

        const { api, services } = createApiHarness({ authService });

        game.socket.emit.mockClear();

        const result = await api.auth.refreshSession();

        expect(services.authService.refreshSession).toHaveBeenCalled();
        expect(game.socket.emit).toHaveBeenCalledWith('foundrymagic.auth.refreshed', {
            expiresAt: refreshResult.expiresAt
        });
        expect(result).toEqual(refreshResult);
    });

    it('propagates refresh failures', async () => {
        const authService = {
            authenticate: jest.fn(),
            refreshSession: jest.fn().mockRejectedValue(new Error('REFRESH_FAILED')),
            getActiveSession: jest.fn(),
            endSession: jest.fn()
        };

        const { api } = createApiHarness({ authService });

        await expect(api.auth.refreshSession()).rejects.toThrow('REFRESH_FAILED');
    });
});
