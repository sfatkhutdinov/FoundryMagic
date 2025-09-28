import { createApiHarness } from './helpers/createApiHarness.js';

describe('FoundryMagic.auth.authenticate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns authentication result and emits validation event', async () => {
        const expiresAt = new Date().toISOString();
        const expectedResult = {
            valid: true,
            expiresAt,
            userId: 'user-123',
            permissions: ['characters', 'adventures', 'content']
        };

        const authService = {
            authenticate: jest.fn().mockResolvedValue(expectedResult),
            refreshSession: jest.fn(),
            getActiveSession: jest.fn(),
            endSession: jest.fn()
        };

        const { api, services } = createApiHarness({ authService });

        game.socket.emit.mockClear();

        const result = await api.auth.authenticate({ cobaltToken: 'cobalt-token', userId: 'user-123' });

        expect(services.authService.authenticate).toHaveBeenCalledWith({
            cobaltToken: 'cobalt-token',
            userId: 'user-123'
        });
        expect(game.socket.emit).toHaveBeenCalledWith('foundrymagic.auth.validated', {
            userId: 'user-123',
            expiresAt
        });
        expect(result).toEqual(expectedResult);
    });

    it('propagates authentication errors', async () => {
        const authService = {
            authenticate: jest.fn().mockRejectedValue(new Error('INVALID_TOKEN')),
            refreshSession: jest.fn(),
            getActiveSession: jest.fn(),
            endSession: jest.fn()
        };

        const { api } = createApiHarness({ authService });

        await expect(
            api.auth.authenticate({ cobaltToken: 'bad-token', userId: 'user-123' })
        ).rejects.toThrow('INVALID_TOKEN');
    });
});
