/**
 * @fileoverview Direct API Test
 * Test D&D Beyond API endpoints directly to find working endpoints
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function testDirectAPI() {
    const token = process.env.COBALT_COOKIE;
    console.log('🔍 Testing D&D Beyond API endpoints directly...\n');

    const endpoints = [
        // Try character service with proper headers
        {
            url: 'https://character-service.dndbeyond.com/character/v5/character',
            method: 'POST',
            body: JSON.stringify({})
        },
        // Try the working characters page but look for AJAX endpoints
        {
            url: 'https://www.dndbeyond.com/characters',
            method: 'GET'
        },
        // Try some potential API endpoints
        {
            url: 'https://character-service.dndbeyond.com/character/v5/character/list',
            method: 'POST',
            body: JSON.stringify({})
        },
        {
            url: 'https://www.dndbeyond.com/api/campaign/characters',
            method: 'GET'
        }
    ];

    for (const endpoint of endpoints) {
        const url = typeof endpoint === 'string' ? endpoint : endpoint.url;
        const method = typeof endpoint === 'string' ? 'GET' : (endpoint.method || 'GET');
        const body = typeof endpoint === 'string' ? null : endpoint.body;

        console.log(`🧪 Testing: ${method} ${url}`);

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Cookie': `CobaltSession=${token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'FoundryMagic/1.0.0'
                },
                body: body
            });

            console.log(`   Status: ${response.status} ${response.statusText}`);

            if (response.ok) {
                try {
                    const data = await response.text();
                    console.log(`   Response length: ${data.length} characters`);

                    // Try to parse as JSON
                    const json = JSON.parse(data);
                    console.log(`   JSON keys: ${Object.keys(json).slice(0, 5).join(', ')}`);
                } catch (e) {
                    console.log(`   Non-JSON response`);
                }
            }

        } catch (error) {
            console.log(`   Error: ${error.message}`);
        }

        console.log('');
    }
}

testDirectAPI().catch(console.error);