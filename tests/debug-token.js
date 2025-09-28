/**
 * @fileoverview Debug token validation
 */

import dotenv from 'dotenv';
import { validateCobaltTokenFormat } from '../src/utils/SharedUtils.js';

dotenv.config();

const token = process.env.COBALT_COOKIE;
console.log('Token from env:', token);
console.log('Token length:', token?.length);
console.log('Starts with eyJ:', token?.startsWith('eyJ'));
console.log('JWT pattern test:', /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*$/.test(token));

// Test the validation function
console.log('Validation result:', validateCobaltTokenFormat(token));