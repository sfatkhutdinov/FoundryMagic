/**
 * @fileoverview Test Runner for Quickstart Validation
 * Simple execution script for development and CI testing
 */

import { runQuickstartValidation } from '../src/utils/QuickstartValidator.js';

/**
 * Execute quickstart validation in development environment
 * This script can be used for automated testing or manual validation
 */
async function executeQuickstartTests() {
    console.log('🚀 Starting FoundryMagic Quickstart Validation...\n');

    try {
        // Check if we're in a Foundry environment
        if (typeof game === 'undefined') {
            console.log('⚠️ Running in non-Foundry environment - creating mock environment');
            await createMockFoundryEnvironment();
        }

        // Run the validation
        const report = await runQuickstartValidation();

        // Output detailed results
        console.log('\n=== DETAILED RESULTS ===');
        report.results.forEach(result => {
            console.log(`\n${result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️'} ${result.name}`);
            if (result.details) {
                console.log('  Details:', JSON.stringify(result.details, null, 2));
            }
            if (result.error) {
                console.log('  Error:', result.error);
            }
        });

        console.log('\n=== SUMMARY ===');
        console.log(`Total Tests: ${report.summary.total}`);
        console.log(`Passed: ${report.summary.passed}`);
        console.log(`Failed: ${report.summary.failed}`);
        console.log(`Skipped: ${report.summary.skipped}`);
        console.log(`Success Rate: ${report.summary.successRate}%`);
        console.log(`Ready for Release: ${report.readyForRelease ? 'YES' : 'NO'}`);

        // Exit code for CI
        process.exit(report.readyForRelease ? 0 : 1);

    } catch (error) {
        console.error('❌ Quickstart validation failed:', error);
        process.exit(1);
    }
}

/**
 * Create mock Foundry environment for testing outside Foundry VTT
 */
async function createMockFoundryEnvironment() {
    global.game = {
        modules: new Map([
            ['foundrymagic', {
                active: true,
                api: {
                    auth: {
                        getSession: () => ({ valid: false, expiresAt: new Date() })
                    },
                    characters: {
                        list: async () => ({ characters: [] }),
                        importCharacter: async () => { throw new Error('Mock: Character not found'); }
                    },
                    adventures: {
                        importAdventure: async () => { throw new Error('Mock: Adventure not found'); }
                    },
                    content: {
                        list: async () => ({ total: 0, items: [] }),
                        batchImport: async () => ({ batchId: 'mock-batch' }),
                        checkDuplicates: async () => ({ duplicates: [] })
                    },
                    cache: {
                        getStatus: async () => ({ size: 0, maxSize: 500 * 1024 * 1024 })
                    }
                }
            }]
        ]),
        user: {
            isGM: true
        }
    };

    global.ui = {
        notifications: {
            error: (msg) => console.error('NOTIFICATION:', msg),
            warn: (msg) => console.warn('NOTIFICATION:', msg),
            info: (msg) => console.log('NOTIFICATION:', msg)
        }
    };

    global.Dialog = class MockDialog {
        constructor(options) {
            this.options = options;
        }
        render() {
            console.log('DIALOG:', this.options.title);
            return this;
        }
    };

    console.log('✅ Mock Foundry environment created');
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    executeQuickstartTests();
}

export { executeQuickstartTests };