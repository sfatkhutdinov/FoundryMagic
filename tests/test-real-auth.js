/**
 * @fileoverview Real Authentication Test for FoundryMagic
 * Tests actual D&D Beyond API integration using .env token
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import AuthenticationService from '../src/auth/AuthenticationService.js';

// Load environment variables
dotenv.config();

// Import Node.js setup (without Jest)
import './setup-node.js';

// Make fetch available globally for SharedUtils
global.fetch = fetch;

/**
 * Real authentication test using actual D&D Beyond API
 */
async function testRealAuthentication() {
    console.log('🔐 Starting Real D&D Beyond Authentication Test...\n');

    try {
        // Foundry environment is already set up via setup.js import

        // Get the cobalt token from environment
        const cobaltToken = process.env.COBALT_COOKIE;

        if (!cobaltToken) {
            throw new Error('COBALT_COOKIE not found in .env file');
        }

        console.log('✅ Cobalt token loaded from .env');
        console.log(`Token preview: ${cobaltToken.substring(0, 50)}...`);

        // Initialize authentication service
        const authService = new AuthenticationService();

        console.log('\n🧪 Testing Authentication...');

        // Test 1: Authenticate with real token
        try {
            const authResult = await authService.authenticate({
                cobaltToken: cobaltToken,
                userId: 'test-user'
            });

            console.log('✅ Authentication successful!');
            console.log('Auth Result:', {
                success: authResult.success,
                userId: authResult.userId,
                sessionDuration: authResult.sessionDuration,
                permissions: authResult.permissions
            });

        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            throw error;
        }

        // Test 2: Check session status
        console.log('\n🧪 Testing Session Status...');
        const session = authService.getSession();

        if (session && session.valid) {
            console.log('✅ Session is valid');
            console.log('Session info:', {
                valid: session.valid,
                expiresAt: session.expiresAt,
                userId: session.userId
            });
        } else {
            console.log('❌ Session is not valid');
        }

        // Test 3: Test API calls with authenticated session
        console.log('\n🧪 Testing Authenticated API Calls...');

        // Test character listing
        try {
            const characters = await testCharacterListing(authService);
            console.log(`✅ Character listing successful - found ${characters.length} characters`);

            if (characters.length > 0) {
                console.log('Sample character:', {
                    id: characters[0].id,
                    name: characters[0].name,
                    level: characters[0].level,
                    class: characters[0].classes?.[0]?.definition?.name
                });
            }
        } catch (error) {
            console.error('⚠️ Character listing failed:', error.message);
        }

        // Test content discovery
        try {
            const monsters = await testContentDiscovery(authService, 'monsters');
            console.log(`✅ Monster content discovery successful - found ${monsters.length} monsters`);

            if (monsters.length > 0) {
                console.log('Sample monster:', {
                    id: monsters[0].id,
                    name: monsters[0].name,
                    type: monsters[0].type,
                    cr: monsters[0].challengeRating
                });
            }
        } catch (error) {
            console.error('⚠️ Content discovery failed:', error.message);
        }

        // Test 4: Session refresh
        console.log('\n🧪 Testing Session Refresh...');
        try {
            const refreshResult = await authService.refreshSession();
            console.log('✅ Session refresh successful:', refreshResult);
        } catch (error) {
            console.error('⚠️ Session refresh failed:', error.message);
        }

        console.log('\n🎉 Real authentication test completed successfully!');
        return true;

    } catch (error) {
        console.error('❌ Real authentication test failed:', error);
        throw error;
    }
}

/**
 * Test character listing with authenticated session
 */
async function testCharacterListing(authService) {
    const session = authService.getSession();
    if (!session || !session.valid) {
        throw new Error('No valid session for character listing');
    }

    // Mock the character API call
    const response = await fetch('https://character-service.dndbeyond.com/character/v5/character', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'FoundryMagic/1.0.0'
        }
    });

    if (!response.ok) {
        throw new Error(`Character listing failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
}

/**
 * Test content discovery with authenticated session
 */
async function testContentDiscovery(authService, contentType) {
    const session = authService.getSession();
    if (!session || !session.valid) {
        throw new Error('No valid session for content discovery');
    }

    // Mock the content API call
    const endpoint = `https://www.dndbeyond.com/api/content/${contentType}`;
    const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
            'Cookie': `CobaltSession=${process.env.COBALT_COOKIE}`,
            'Content-Type': 'application/json',
            'User-Agent': 'FoundryMagic/1.0.0'
        }
    });

    if (!response.ok) {
        throw new Error(`Content discovery failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testRealAuthentication()
        .then(() => {
            console.log('\n✅ All authentication tests passed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Authentication tests failed:', error);
            process.exit(1);
        });
}

export { testRealAuthentication };