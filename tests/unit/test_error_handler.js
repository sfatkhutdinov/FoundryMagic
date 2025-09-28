/**
 * Unit Tests for Error Handler
 * @fileoverview Tests for comprehensive error handling system
 */

import ErrorHandler from '../../src/utils/ErrorHandler.js';

// Mock Foundry VTT globals
global.ui = {
    notifications: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn()
    }
};

global.console = {
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn()
};

describe('ErrorHandler', () => {
    let errorHandler;

    beforeEach(() => {
        errorHandler = new ErrorHandler();
        jest.clearAllMocks();
    });

    describe('handleError', () => {
        test('should handle authentication errors', () => {
            const error = new Error('Invalid token');
            error.name = 'InvalidTokenError';

            const result = errorHandler.handleError(error, 'authentication');

            expect(result).toEqual({
                handled: true,
                userMessage: 'Authentication failed. Please check your D&D Beyond token.',
                technicalMessage: 'Invalid token',
                category: 'authentication',
                severity: 'error',
                retryable: false
            });

            expect(ui.notifications.error).toHaveBeenCalledWith(
                'Authentication failed. Please check your D&D Beyond token.'
            );
        });

        test('should handle network errors with retry suggestion', () => {
            const error = new Error('Network failure');
            error.name = 'NetworkFailureError';

            const result = errorHandler.handleError(error, 'import');

            expect(result).toEqual({
                handled: true,
                userMessage: 'Network error occurred. Please check your connection and try again.',
                technicalMessage: 'Network failure',
                category: 'import',
                severity: 'error',
                retryable: true
            });

            expect(ui.notifications.error).toHaveBeenCalledWith(
                'Network error occurred. Please check your connection and try again.'
            );
        });

        test('should handle permission errors', () => {
            const error = new Error('Access denied');
            error.name = 'PermissionDeniedError';

            const result = errorHandler.handleError(error);

            expect(result.userMessage).toContain('permission');
            expect(result.retryable).toBe(false);
            expect(result.severity).toBe('error');
        });

        test('should handle validation errors with details', () => {
            const error = new Error('Invalid character data');
            error.name = 'ValidationError';
            error.details = ['Missing name', 'Invalid level'];

            const result = errorHandler.handleError(error, 'validation');

            expect(result.userMessage).toContain('validation');
            expect(result.details).toEqual(['Missing name', 'Invalid level']);
            expect(result.severity).toBe('warning');
        });

        test('should handle unknown errors gracefully', () => {
            const error = new Error('Something went wrong');

            const result = errorHandler.handleError(error);

            expect(result).toEqual({
                handled: true,
                userMessage: 'An unexpected error occurred. Please try again.',
                technicalMessage: 'Something went wrong',
                category: 'unknown',
                severity: 'error',
                retryable: true
            });
        });

        test('should log technical details for debugging', () => {
            const error = new Error('Test error');
            error.stack = 'Test stack trace';

            errorHandler.handleError(error);

            expect(console.error).toHaveBeenCalledWith(
                'FoundryMagic Error:',
                expect.objectContaining({
                    message: 'Test error',
                    stack: 'Test stack trace'
                })
            );
        });
    });

    describe('handleWarning', () => {
        test('should handle warnings appropriately', () => {
            const warning = 'Content may be outdated';
            
            const result = errorHandler.handleWarning(warning, 'cache');

            expect(result).toEqual({
                handled: true,
                userMessage: 'Content may be outdated',
                category: 'cache',
                severity: 'warning'
            });

            expect(ui.notifications.warn).toHaveBeenCalledWith('Content may be outdated');
        });

        test('should suppress duplicate warnings', () => {
            const warning = 'Duplicate warning';
            
            errorHandler.handleWarning(warning, 'test');
            errorHandler.handleWarning(warning, 'test'); // Duplicate

            expect(ui.notifications.warn).toHaveBeenCalledTimes(1);
        });
    });

    describe('isRetryableError', () => {
        test('should identify retryable errors', () => {
            const retryableErrors = [
                { name: 'NetworkFailureError' },
                { name: 'TimeoutError' },
                { name: 'RateLimitError' }
            ];

            retryableErrors.forEach(error => {
                expect(errorHandler.isRetryableError(error)).toBe(true);
            });
        });

        test('should identify non-retryable errors', () => {
            const nonRetryableErrors = [
                { name: 'InvalidTokenError' },
                { name: 'PermissionDeniedError' },
                { name: 'ValidationError' }
            ];

            nonRetryableErrors.forEach(error => {
                expect(errorHandler.isRetryableError(error)).toBe(false);
            });
        });
    });

    describe('getErrorCategory', () => {
        test('should categorize errors correctly', () => {
            const testCases = [
                { name: 'InvalidTokenError', expected: 'authentication' },
                { name: 'NetworkFailureError', expected: 'network' },
                { name: 'ValidationError', expected: 'validation' },
                { name: 'UnknownError', expected: 'unknown' }
            ];

            testCases.forEach(({ name, expected }) => {
                const error = { name };
                expect(errorHandler.getErrorCategory(error)).toBe(expected);
            });
        });
    });

    describe('formatUserMessage', () => {
        test('should format user-friendly messages', () => {
            const testCases = [
                {
                    error: { name: 'InvalidTokenError', message: 'Token invalid' },
                    expected: 'Authentication failed. Please check your D&D Beyond token.'
                },
                {
                    error: { name: 'NetworkFailureError', message: 'Connection failed' },
                    expected: 'Network error occurred. Please check your connection and try again.'
                },
                {
                    error: { name: 'PermissionDeniedError', message: 'Access denied' },
                    expected: 'You don\'t have permission to perform this action.'
                }
            ];

            testCases.forEach(({ error, expected }) => {
                expect(errorHandler.formatUserMessage(error)).toBe(expected);
            });
        });

        test('should include context when provided', () => {
            const error = { name: 'ValidationError', message: 'Invalid data' };
            const context = 'character import';

            const message = errorHandler.formatUserMessage(error, context);

            expect(message).toContain('character import');
        });
    });

    describe('createRecoveryAction', () => {
        test('should suggest appropriate recovery actions', () => {
            const testCases = [
                {
                    error: { name: 'InvalidTokenError' },
                    expected: {
                        action: 'reauthenticate',
                        label: 'Update Token',
                        callback: expect.any(Function)
                    }
                },
                {
                    error: { name: 'NetworkFailureError' },
                    expected: {
                        action: 'retry',
                        label: 'Try Again',
                        callback: expect.any(Function)
                    }
                }
            ];

            testCases.forEach(({ error, expected }) => {
                const recovery = errorHandler.createRecoveryAction(error);
                expect(recovery.action).toBe(expected.action);
                expect(recovery.label).toBe(expected.label);
                expect(recovery.callback).toBeDefined();
            });
        });

        test('should return null for non-recoverable errors', () => {
            const error = { name: 'FatalError' };
            
            const recovery = errorHandler.createRecoveryAction(error);
            
            expect(recovery).toBeNull();
        });
    });

    describe('logError', () => {
        test('should log errors with proper structure', () => {
            const error = new Error('Test error');
            error.stack = 'Test stack';
            
            errorHandler.logError(error, 'test-context', { userId: '123' });

            expect(console.error).toHaveBeenCalledWith(
                'FoundryMagic Error:',
                expect.objectContaining({
                    message: 'Test error',
                    stack: 'Test stack',
                    context: 'test-context',
                    metadata: { userId: '123' },
                    timestamp: expect.any(String)
                })
            );
        });

        test('should include user context when available', () => {
            // Mock game object
            global.game = {
                user: {
                    id: 'user123',
                    name: 'Test User',
                    isGM: true
                }
            };

            const error = new Error('Test error');
            
            errorHandler.logError(error, 'test');

            expect(console.error).toHaveBeenCalledWith(
                'FoundryMagic Error:',
                expect.objectContaining({
                    userContext: {
                        id: 'user123',
                        name: 'Test User',
                        isGM: true
                    }
                })
            );
        });
    });

    describe('getErrorStats', () => {
        test('should track error statistics', () => {
            // Generate some errors
            errorHandler.handleError(new Error('Error 1'));
            errorHandler.handleError(new Error('Error 2'));
            
            const authError = new Error('Auth failed');
            authError.name = 'InvalidTokenError';
            errorHandler.handleError(authError);

            const stats = errorHandler.getErrorStats();

            expect(stats.total).toBe(3);
            expect(stats.byCategory.unknown).toBe(2);
            expect(stats.byCategory.authentication).toBe(1);
        });

        test('should reset error statistics', () => {
            errorHandler.handleError(new Error('Test error'));
            
            expect(errorHandler.getErrorStats().total).toBe(1);
            
            errorHandler.resetStats();
            
            expect(errorHandler.getErrorStats().total).toBe(0);
        });
    });

    describe('batch error handling', () => {
        test('should handle multiple errors efficiently', () => {
            const errors = [
                new Error('Error 1'),
                new Error('Error 2'),
                new Error('Error 3')
            ];

            const results = errorHandler.handleErrors(errors, 'batch-test');

            expect(results).toHaveLength(3);
            expect(results.every(r => r.handled)).toBe(true);
            expect(ui.notifications.error).toHaveBeenCalledTimes(3);
        });

        test('should group similar errors to reduce notification spam', () => {
            const similarErrors = [
                { name: 'NetworkFailureError', message: 'Connection 1 failed' },
                { name: 'NetworkFailureError', message: 'Connection 2 failed' },
                { name: 'NetworkFailureError', message: 'Connection 3 failed' }
            ];

            errorHandler.handleSimilarErrors(similarErrors);

            // Should show only one notification for similar errors
            expect(ui.notifications.error).toHaveBeenCalledTimes(1);
            expect(ui.notifications.error).toHaveBeenCalledWith(
                expect.stringContaining('Network errors occurred (3 similar issues)')
            );
        });
    });
});