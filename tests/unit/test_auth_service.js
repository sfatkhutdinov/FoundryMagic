/**
 * Unit Tests for Authentication Service
 * @fileoverview Tests for the authentication service functionality
 */

import AuthenticationService from '../../src/auth/AuthenticationService.js';

// Mock Foundry VTT globals
global.game = {
    user: {
        isGM: true
    },
    settings: {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue(true)
    },
    socket: {
        emit: jest.fn()
    }
};

// Mock fetch
global.fetch = jest.fn();

describe('AuthenticationService', () => {
    let authService;

    beforeEach(() => {
        authService = new AuthenticationService();
        jest.clearAllMocks();
        global.fetch.mockClear();
    });

    describe('constructor', () => {
        test('should initialize with null token and session', () => {
            expect(authService._token).toBeNull();
            expect(authService._sessionData).toBeNull();
            expect(authService._isInitialized).toBe(false);
        });
    });

    describe('authenticate', () => {
        const validToken = 'cobalt_2_' + 'a'.repeat(50);
        const userId = 'test-user-123';

        beforeEach(() => {
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({ id: 123 })
            });
        });

        test('should authenticate with valid token and userId', async () => {
            const result = await authService.authenticate({ cobaltToken: validToken, userId });

            expect(result).toEqual({
                valid: true,
                expiresAt: expect.any(String),
                userId,
                permissions: ['characters', 'adventures', 'content']
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://www.dndbeyond.com/api/user/me',
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${validToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            expect(game.settings.set).toHaveBeenCalledWith('foundrymagic', 'ddbToken', validToken);
            expect(game.socket.emit).toHaveBeenCalledWith('foundrymagic.auth.validated', {
                userId,
                expiresAt: expect.any(String)
            });
        });

        test('should throw PermissionDeniedError for non-GM user', async () => {
            game.user.isGM = false;

            await expect(authService.authenticate({ cobaltToken: validToken, userId }))
                .rejects
                .toThrow('Only DMs can authenticate with D&D Beyond');
            
            // Reset for other tests
            game.user.isGM = true;
        });

        test('should throw InvalidTokenError for malformed token', async () => {
            const invalidToken = 'invalid-token';

            await expect(authService.authenticate({ cobaltToken: invalidToken, userId }))
                .rejects
                .toThrow('Invalid cobalt token format');
        });

        test('should throw InvalidTokenError for 401 response', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 401
            });

            await expect(authService.authenticate({ cobaltToken: validToken, userId }))
                .rejects
                .toThrow('Invalid or expired cobalt token');
        });

        test('should throw NetworkFailureError for other HTTP errors', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });

            await expect(authService.authenticate({ cobaltToken: validToken, userId }))
                .rejects
                .toThrow('Network failure: 500');
        });

        test('should throw NetworkFailureError for network errors', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            await expect(authService.authenticate({ cobaltToken: validToken, userId }))
                .rejects
                .toThrow('Network failure during authentication');
        });
    });

    describe('refreshSession', () => {
        beforeEach(() => {
            // Set up a mock session
            authService._token = 'cobalt_2_' + 'a'.repeat(50);
            authService._sessionData = {
                valid: true,
                expiresAt: new Date(Date.now() + 1000000).toISOString(),
                userId: 'test-user',
                permissions: ['characters', 'adventures', 'content']
            };
        });

        test('should refresh valid session', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({ id: 123 })
            });

            const result = await authService.refreshSession();

            expect(result).toEqual({
                refreshed: true,
                expiresAt: expect.any(String)
            });

            expect(game.socket.emit).toHaveBeenCalledWith('foundrymagic.auth.refreshed', {
                expiresAt: expect.any(String)
            });
        });

        test('should throw NoActiveSessionError when no session exists', async () => {
            authService._token = null;
            authService._sessionData = null;

            await expect(authService.refreshSession())
                .rejects
                .toThrow('No active session to refresh');
        });

        test('should throw RefreshFailedError for invalid token', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 401
            });

            await expect(authService.refreshSession())
                .rejects
                .toThrow('Token refresh failed - invalid token');
        });
    });

    describe('_validateTokenFormat', () => {
        test('should validate correct cobalt v2 token format', () => {
            const validToken = 'cobalt_2_' + 'a'.repeat(50);
            expect(authService._validateTokenFormat(validToken)).toBe(true);
        });

        test('should reject invalid token formats', () => {
            expect(authService._validateTokenFormat('invalid')).toBe(false);
            expect(authService._validateTokenFormat('cobalt_1_token')).toBe(false);
            expect(authService._validateTokenFormat('cobalt_2_short')).toBe(false);
            expect(authService._validateTokenFormat('')).toBe(false);
            expect(authService._validateTokenFormat(null)).toBe(false);
        });
    });

    describe('getSession', () => {
        test('should return null when no session exists', () => {
            expect(authService.getSession()).toBeNull();
        });

        test('should return session data copy when session exists', () => {
            const sessionData = {
                valid: true,
                expiresAt: new Date().toISOString(),
                userId: 'test',
                permissions: ['characters']
            };

            authService._sessionData = sessionData;
            const result = authService.getSession();

            expect(result).toEqual(sessionData);
            expect(result).not.toBe(sessionData); // Should be a copy
        });
    });

    describe('clearToken', () => {
        test('should clear token and session data', () => {
            authService._token = 'test-token';
            authService._sessionData = { valid: true };
            authService._refreshTimer = setTimeout(() => {}, 1000);

            authService.clearToken();

            expect(authService._token).toBeNull();
            expect(authService._sessionData).toBeNull();
            expect(game.settings.set).toHaveBeenCalledWith('foundrymagic', 'ddbToken', null);
            expect(game.settings.set).toHaveBeenCalledWith('foundrymagic', 'sessionData', null);
        });
    });

    describe('cleanup', () => {
        test('should cleanup all resources', () => {
            authService._token = 'test-token';
            authService._sessionData = { valid: true };
            authService._isInitialized = true;
            authService._refreshTimer = setTimeout(() => {}, 1000);

            authService.cleanup();

            expect(authService._token).toBeNull();
            expect(authService._sessionData).toBeNull();
            expect(authService._isInitialized).toBe(false);
            expect(authService._refreshTimer).toBeNull();
        });
    });
});