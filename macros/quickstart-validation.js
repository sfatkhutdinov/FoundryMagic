/**
 * @fileoverview FoundryMagic Quickstart Validation Macro
 * Drop this into a macro in Foundry VTT to validate the module installation
 */

// FoundryMagic Quickstart Validation Macro
// This macro runs comprehensive validation tests for FoundryMagic

(async () => {
    // Check if FoundryMagic is available
    const foundryMagic = game.modules.get('foundrymagic')?.api;

    if (!foundryMagic) {
        ui.notifications.error('FoundryMagic module not found. Please ensure it is installed and enabled.');
        return;
    }

    ui.notifications.info('Starting FoundryMagic validation...');

    try {
        // Import and run the validation
        const { runQuickstartValidation } = await import('./modules/foundrymagic/src/utils/QuickstartValidator.js');

        const report = await runQuickstartValidation();

        // Show success notification
        if (report.readyForRelease) {
            ui.notifications.info(`FoundryMagic validation completed successfully! ${report.summary.passed}/${report.summary.total} tests passed.`);
        } else {
            ui.notifications.warn(`FoundryMagic validation completed with issues. ${report.summary.failed} tests failed. Check console for details.`);
        }

    } catch (error) {
        console.error('Validation error:', error);
        ui.notifications.error(`Validation failed: ${error.message}`);

        // Fallback: Run basic validation checks
        console.log('Running fallback validation checks...');
        await runBasicValidation(foundryMagic);
    }
})();

/**
 * Fallback validation function if import fails
 */
async function runBasicValidation(api) {
    const results = [];

    // Test 1: API availability
    console.log('🧪 Testing API availability...');
    const requiredAPIs = ['auth', 'characters', 'adventures', 'content'];
    let apiScore = 0;

    for (const apiName of requiredAPIs) {
        if (api[apiName]) {
            apiScore++;
            console.log(`✅ ${apiName} API available`);
        } else {
            console.log(`❌ ${apiName} API missing`);
        }
    }

    results.push(`API Availability: ${apiScore}/${requiredAPIs.length}`);

    // Test 2: User permissions
    console.log('🧪 Testing user permissions...');
    const isGM = game.user.isGM;
    results.push(`User Role: ${isGM ? 'GM (Full Access)' : 'Player (Limited Access)'}`);
    console.log(isGM ? '✅ GM access detected' : '⚠️ Player access - some features limited');

    // Test 3: Module status
    console.log('🧪 Testing module status...');
    const module = game.modules.get('foundrymagic');
    const moduleStatus = module?.active ? 'Active' : 'Inactive';
    results.push(`Module Status: ${moduleStatus}`);
    console.log(module?.active ? '✅ Module is active' : '❌ Module is inactive');

    // Test 4: Authentication status (if GM)
    if (isGM && api.auth?.getSession) {
        console.log('🧪 Testing authentication status...');
        try {
            const session = api.auth.getSession();
            const hasValidSession = session && session.valid && new Date(session.expiresAt) > new Date();
            results.push(`Authentication: ${hasValidSession ? 'Valid Session' : 'No Valid Session'}`);
            console.log(hasValidSession ? '✅ Valid authentication session' : '⚠️ No valid authentication session');
        } catch (error) {
            results.push('Authentication: Error checking session');
            console.log('⚠️ Error checking authentication:', error.message);
        }
    }

    // Display results
    const content = `
        <h2>FoundryMagic Basic Validation</h2>
        <ul>
            ${results.map(result => `<li>${result}</li>`).join('')}
        </ul>
        <p><em>For comprehensive validation, ensure QuickstartValidator.js is properly imported.</em></p>
    `;

    new Dialog({
        title: 'FoundryMagic Validation Results',
        content,
        buttons: {
            close: {
                label: 'Close',
                callback: () => { }
            }
        }
    }).render(true);

    ui.notifications.info('Basic validation completed - check dialog for results.');
}