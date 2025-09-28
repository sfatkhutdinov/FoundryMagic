/**
 * @fileoverview Scene Enhancement with Walls and Lighting
 * Enhances imported scenes with proper walls, lighting, and interactive elements
 */

export default class SceneEnhancer {
    constructor(foundryMagic) {
        this._foundryMagic = foundryMagic;
        this._enhancementSettings = {
            autoGenerateWalls: true,
            autoGenerateLighting: true,
            wallHeight: 10,
            lightDimRadius: 40,
            lightBrightRadius: 20
        };
    }

    /**
     * Initialize the scene enhancer
     */
    async initialize() {
        console.log('FoundryMagic | Initializing scene enhancer...');

        // Load settings
        this._loadSettings();

        // Register hooks
        this._registerHooks();

        console.log('FoundryMagic | Scene enhancer initialized');
    }

    /**
     * Load enhancement settings
     * @private
     */
    _loadSettings() {
        // Load from Foundry settings if available
        try {
            const settings = game.settings.get('foundrymagic', 'sceneEnhancement') || {};
            this._enhancementSettings = { ...this._enhancementSettings, ...settings };
        } catch (error) {
            console.warn('FoundryMagic | Could not load scene enhancement settings:', error);
        }
    }

    /**
     * Register scene-related hooks
     * @private
     */
    _registerHooks() {
        Hooks.on('createScene', this._onCreateScene.bind(this));
        Hooks.on('updateScene', this._onUpdateScene.bind(this));
        Hooks.on('preCreateWall', this._onPreCreateWall.bind(this));
        Hooks.on('preCreateAmbientLight', this._onPreCreateAmbientLight.bind(this));
    }

    /**
     * Enhance a scene with walls and lighting
     * @param {Scene} scene - Scene to enhance
     * @param {Object} enhancementData - Enhancement data from D&D Beyond
     * @returns {Promise<Object>} Enhancement results
     */
    async enhanceScene(scene, enhancementData = {}) {
        const results = {
            wallsCreated: 0,
            lightsCreated: 0,
            tokensPlaced: 0,
            errors: []
        };

        try {
            console.log(`FoundryMagic | Enhancing scene: ${scene.name}`);

            // Generate walls if enabled
            if (this._enhancementSettings.autoGenerateWalls) {
                const wallResults = await this._generateWalls(scene, enhancementData.walls);
                results.wallsCreated = wallResults.count;
                results.errors.push(...wallResults.errors);
            }

            // Generate lighting if enabled
            if (this._enhancementSettings.autoGenerateLighting) {
                const lightResults = await this._generateLighting(scene, enhancementData.lighting);
                results.lightsCreated = lightResults.count;
                results.errors.push(...lightResults.errors);
            }

            // Place tokens if data provided
            if (enhancementData.tokens) {
                const tokenResults = await this._placeTokens(scene, enhancementData.tokens);
                results.tokensPlaced = tokenResults.count;
                results.errors.push(...tokenResults.errors);
            }

            // Set scene properties
            await this._setSceneProperties(scene, enhancementData.properties);

            console.log(`FoundryMagic | Scene enhancement completed: ${results.wallsCreated} walls, ${results.lightsCreated} lights, ${results.tokensPlaced} tokens`);

        } catch (error) {
            console.error('FoundryMagic | Scene enhancement failed:', error);
            results.errors.push(error.message);
        }

        return results;
    }

    /**
     * Generate walls for scene
     * @private
     * @param {Scene} scene - Target scene
     * @param {Array} wallData - Wall data from D&D Beyond
     * @returns {Promise<Object>} Generation results
     */
    async _generateWalls(scene, wallData = []) {
        const results = { count: 0, errors: [] };

        try {
            // If no wall data provided, generate basic walls from scene dimensions
            if (!wallData || wallData.length === 0) {
                wallData = this._generateBasicWalls(scene);
            }

            const walls = [];

            for (const wall of wallData) {
                try {
                    const wallDocument = await this._createWallDocument(scene, wall);
                    walls.push(wallDocument);
                    results.count++;
                } catch (error) {
                    results.errors.push(`Failed to create wall: ${error.message}`);
                }
            }

            // Create walls in batch
            if (walls.length > 0) {
                await scene.createEmbeddedDocuments('Wall', walls);
            }

        } catch (error) {
            results.errors.push(`Wall generation failed: ${error.message}`);
        }

        return results;
    }

    /**
     * Generate basic walls from scene dimensions
     * @private
     * @param {Scene} scene - Scene
     * @returns {Array} Basic wall data
     */
    _generateBasicWalls(scene) {
        const { width, height } = scene.dimensions;
        const gridSize = scene.grid.size;

        // Create perimeter walls
        return [
            // Top wall
            {
                c: [0, 0, width * gridSize, 0],
                light: 20,
                move: 20,
                sense: 20,
                sound: 20,
                dir: 0,
                door: 0
            },
            // Right wall
            {
                c: [width * gridSize, 0, width * gridSize, height * gridSize],
                light: 20,
                move: 20,
                sense: 20,
                sound: 20,
                dir: 0,
                door: 0
            },
            // Bottom wall
            {
                c: [width * gridSize, height * gridSize, 0, height * gridSize],
                light: 20,
                move: 20,
                sense: 20,
                sound: 20,
                dir: 0,
                door: 0
            },
            // Left wall
            {
                c: [0, height * gridSize, 0, 0],
                light: 20,
                move: 20,
                sense: 20,
                sound: 20,
                dir: 0,
                door: 0
            }
        ];
    }

    /**
     * Create wall document
     * @private
     * @param {Scene} scene - Scene
     * @param {Object} wallData - Wall data
     * @returns {Object} Wall document data
     */
    _createWallDocument(scene, wallData) {
        return {
            c: wallData.c || wallData.coordinates,
            light: wallData.light ?? 20,
            move: wallData.move ?? 20,
            sense: wallData.sense ?? 20,
            sound: wallData.sound ?? 20,
            dir: wallData.dir ?? 0,
            door: wallData.door ?? 0,
            ds: wallData.ds ?? 0,
            flags: {
                foundrymagic: {
                    autoGenerated: true,
                    source: 'enhancement'
                }
            }
        };
    }

    /**
     * Generate lighting for scene
     * @private
     * @param {Scene} scene - Target scene
     * @param {Array} lightingData - Lighting data from D&D Beyond
     * @returns {Promise<Object>} Generation results
     */
    async _generateLighting(scene, lightingData = []) {
        const results = { count: 0, errors: [] };

        try {
            // If no lighting data provided, generate basic lighting
            if (!lightingData || lightingData.length === 0) {
                lightingData = this._generateBasicLighting(scene);
            }

            const lights = [];

            for (const light of lightingData) {
                try {
                    const lightDocument = await this._createLightDocument(scene, light);
                    lights.push(lightDocument);
                    results.count++;
                } catch (error) {
                    results.errors.push(`Failed to create light: ${error.message}`);
                }
            }

            // Create lights in batch
            if (lights.length > 0) {
                await scene.createEmbeddedDocuments('AmbientLight', lights);
            }

        } catch (error) {
            results.errors.push(`Lighting generation failed: ${error.message}`);
        }

        return results;
    }

    /**
     * Generate basic lighting for scene
     * @private
     * @param {Scene} scene - Scene
     * @returns {Array} Basic lighting data
     */
    _generateBasicLighting(scene) {
        const { width, height } = scene.dimensions;
        const gridSize = scene.grid.size;
        const centerX = (width * gridSize) / 2;
        const centerY = (height * gridSize) / 2;

        // Create a central light source
        return [
            {
                x: centerX,
                y: centerY,
                config: {
                    dim: this._enhancementSettings.lightDimRadius,
                    bright: this._enhancementSettings.lightBrightRadius,
                    color: '#ffffff',
                    alpha: 0.5,
                    animation: { type: 'torch', speed: 1, intensity: 1 }
                },
                hidden: false
            }
        ];
    }

    /**
     * Create light document
     * @private
     * @param {Scene} scene - Scene
     * @param {Object} lightData - Light data
     * @returns {Object} Light document data
     */
    _createLightDocument(scene, lightData) {
        return {
            x: lightData.x || 0,
            y: lightData.y || 0,
            config: {
                dim: lightData.config?.dim ?? this._enhancementSettings.lightDimRadius,
                bright: lightData.config?.bright ?? this._enhancementSettings.lightBrightRadius,
                color: lightData.config?.color ?? '#ffffff',
                alpha: lightData.config?.alpha ?? 0.5,
                animation: lightData.config?.animation ?? { type: 'torch', speed: 1, intensity: 1 }
            },
            hidden: lightData.hidden ?? false,
            flags: {
                foundrymagic: {
                    autoGenerated: true,
                    source: 'enhancement'
                }
            }
        };
    }

    /**
     * Place tokens on scene
     * @private
     * @param {Scene} scene - Target scene
     * @param {Array} tokenData - Token data
     * @returns {Promise<Object>} Placement results
     */
    async _placeTokens(scene, tokenData = []) {
        const results = { count: 0, errors: [] };

        try {
            const tokens = [];

            for (const token of tokenData) {
                try {
                    const tokenDocument = await this._createTokenDocument(scene, token);
                    tokens.push(tokenDocument);
                    results.count++;
                } catch (error) {
                    results.errors.push(`Failed to create token: ${error.message}`);
                }
            }

            // Create tokens in batch
            if (tokens.length > 0) {
                await scene.createEmbeddedDocuments('Token', tokens);
            }

        } catch (error) {
            results.errors.push(`Token placement failed: ${error.message}`);
        }

        return results;
    }

    /**
     * Create token document
     * @private
     * @param {Scene} scene - Scene
     * @param {Object} tokenData - Token data
     * @returns {Object} Token document data
     */
    _createTokenDocument(scene, tokenData) {
        return {
            name: tokenData.name || 'Unknown',
            x: tokenData.x || 0,
            y: tokenData.y || 0,
            width: tokenData.width || 1,
            height: tokenData.height || 1,
            scale: tokenData.scale || 1,
            mirrorX: tokenData.mirrorX || false,
            mirrorY: tokenData.mirrorY || false,
            lockRotation: tokenData.lockRotation || false,
            rotation: tokenData.rotation || 0,
            tint: tokenData.tint || null,
            alpha: tokenData.alpha ?? 1,
            hidden: tokenData.hidden || false,
            img: tokenData.img || 'icons/svg/mystery-man.svg',
            flags: {
                foundrymagic: {
                    autoGenerated: true,
                    source: 'enhancement'
                }
            }
        };
    }

    /**
     * Set scene properties
     * @private
     * @param {Scene} scene - Scene
     * @param {Object} properties - Scene properties
     */
    async _setSceneProperties(scene, properties = {}) {
        const updates = {};

        if (properties.backgroundColor) {
            updates.backgroundColor = properties.backgroundColor;
        }

        if (properties.gridType !== undefined) {
            updates.gridType = properties.gridType;
        }

        if (properties.gridColor) {
            updates.gridColor = properties.gridColor;
        }

        if (properties.darkness !== undefined) {
            updates.darkness = properties.darkness;
        }

        if (Object.keys(updates).length > 0) {
            await scene.update(updates);
        }
    }

    /**
     * Remove enhancements from scene
     * @param {Scene} scene - Scene to clean
     * @returns {Promise<Object>} Cleanup results
     */
    async removeEnhancements(scene) {
        const results = {
            wallsRemoved: 0,
            lightsRemoved: 0,
            tokensRemoved: 0,
            errors: []
        };

        try {
            // Remove auto-generated walls
            const wallsToRemove = scene.walls.filter(wall =>
                wall.flags?.foundrymagic?.autoGenerated
            );
            if (wallsToRemove.length > 0) {
                await scene.deleteEmbeddedDocuments('Wall', wallsToRemove.map(w => w.id));
                results.wallsRemoved = wallsToRemove.length;
            }

            // Remove auto-generated lights
            const lightsToRemove = scene.lights.filter(light =>
                light.flags?.foundrymagic?.autoGenerated
            );
            if (lightsToRemove.length > 0) {
                await scene.deleteEmbeddedDocuments('AmbientLight', lightsToRemove.map(l => l.id));
                results.lightsRemoved = lightsToRemove.length;
            }

            // Remove auto-generated tokens
            const tokensToRemove = scene.tokens.filter(token =>
                token.flags?.foundrymagic?.autoGenerated
            );
            if (tokensToRemove.length > 0) {
                await scene.deleteEmbeddedDocuments('Token', tokensToRemove.map(t => t.id));
                results.tokensRemoved = tokensToRemove.length;
            }

        } catch (error) {
            results.errors.push(`Cleanup failed: ${error.message}`);
        }

        return results;
    }

    /**
     * Get enhancement statistics for scene
     * @param {Scene} scene - Scene
     * @returns {Object} Statistics
     */
    getEnhancementStats(scene) {
        const stats = {
            totalWalls: scene.walls.size,
            autoWalls: 0,
            totalLights: scene.lights.size,
            autoLights: 0,
            totalTokens: scene.tokens.size,
            autoTokens: 0
        };

        // Count auto-generated elements
        scene.walls.forEach(wall => {
            if (wall.flags?.foundrymagic?.autoGenerated) stats.autoWalls++;
        });

        scene.lights.forEach(light => {
            if (light.flags?.foundrymagic?.autoGenerated) stats.autoLights++;
        });

        scene.tokens.forEach(token => {
            if (token.flags?.foundrymagic?.autoGenerated) stats.autoTokens++;
        });

        return stats;
    }

    /**
     * Hook: Create scene
     * @private
     * @param {Scene} scene - Created scene
     */
    _onCreateScene(scene) {
        // Check if this scene was imported by FoundryMagic
        if (scene.flags?.foundrymagic?.imported) {
            console.log(`FoundryMagic | Scene created from import: ${scene.name}`);
            // Could trigger automatic enhancement here
        }
    }

    /**
     * Hook: Update scene
     * @private
     * @param {Scene} scene - Updated scene
     * @param {Object} data - Update data
     */
    _onUpdateScene(scene, data) {
        // Handle scene updates that might affect enhancements
    }

    /**
     * Hook: Pre-create wall
     * @private
     * @param {Wall} wall - Wall being created
     * @param {Object} data - Wall data
     */
    _onPreCreateWall(wall, data) {
        // Apply default wall settings
        if (!data.light) data.light = 20;
        if (!data.move) data.move = 20;
        if (!data.sense) data.sense = 20;
        if (!data.sound) data.sound = 20;
    }

    /**
     * Hook: Pre-create ambient light
     * @private
     * @param {AmbientLight} light - Light being created
     * @param {Object} data - Light data
     */
    _onPreCreateAmbientLight(light, data) {
        // Apply default light settings
        if (!data.config) {
            data.config = {
                dim: this._enhancementSettings.lightDimRadius,
                bright: this._enhancementSettings.lightBrightRadius,
                color: '#ffffff',
                alpha: 0.5
            };
        }
    }

    /**
     * Update enhancement settings
     * @param {Object} settings - New settings
     */
    updateSettings(settings) {
        this._enhancementSettings = { ...this._enhancementSettings, ...settings };

        // Save to Foundry settings
        try {
            game.settings.set('foundrymagic', 'sceneEnhancement', this._enhancementSettings);
        } catch (error) {
            console.warn('FoundryMagic | Could not save scene enhancement settings:', error);
        }
    }

    /**
     * Get current enhancement settings
     * @returns {Object} Settings
     */
    getSettings() {
        return { ...this._enhancementSettings };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('FoundryMagic | Scene enhancer cleaned up');
    }
}