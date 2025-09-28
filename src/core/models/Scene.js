/**
 * @fileoverview Scene model for D&D Beyond battle maps and encounter locations
 */

export default class Scene {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.mapImage = data.mapImage || '';
        this.gridSize = data.gridSize || { width: 20, height: 20, scale: 5 };
        this.walls = data.walls || [];
        this.lighting = data.lighting || [];
        this.tokens = data.tokens || [];
        this.notes = data.notes || [];
        this.metadata = data.metadata || {};
        this.state = data.state || 'extracted';
    }

    /**
     * Validate scene data
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];

        // Required fields
        if (!this.name) errors.push('Name is required');

        // Grid size validation
        if (this.gridSize.width < 1 || this.gridSize.width > 100) {
            errors.push('Grid width must be between 1 and 100');
        }
        if (this.gridSize.height < 1 || this.gridSize.height > 100) {
            errors.push('Grid height must be between 1 and 100');
        }
        if (this.gridSize.scale < 1 || this.gridSize.scale > 10) {
            errors.push('Grid scale must be between 1 and 10 feet per square');
        }

        // Map image validation (if present)
        if (this.mapImage && !this.isValidImageUrl(this.mapImage)) {
            errors.push('Map image must be a valid URL');
        }

        // Walls validation
        for (const wall of this.walls) {
            if (!wall.start || !wall.end) {
                errors.push('Walls must have start and end coordinates');
            }
        }

        // Lighting validation
        for (const light of this.lighting) {
            if (!light.position) {
                errors.push('Lights must have a position');
            }
            if (light.brightRadius < 0 || light.dimRadius < 0) {
                errors.push('Light radii cannot be negative');
            }
        }

        // Tokens validation
        for (const token of this.tokens) {
            if (!token.name) {
                errors.push('Tokens must have a name');
            }
            if (!token.position) {
                errors.push('Tokens must have a position');
            }
        }

        // Notes validation
        for (const note of this.notes) {
            if (!note.text) {
                errors.push('Notes must have text');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Transition to next state
     * @param {string} newState - Target state
     * @returns {boolean} Success of transition
     */
    transitionTo(newState) {
        const validTransitions = {
            'extracted': ['enhanced'],
            'enhanced': ['imported'],
            'imported': ['active'],
            'active': ['active'] // Can stay active
        };

        if (validTransitions[this.state]?.includes(newState)) {
            this.state = newState;
            return true;
        }

        return false;
    }

    /**
     * Get scene summary
     * @returns {Object} Summary data
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            gridSize: this.gridSize,
            wallCount: this.walls.length,
            lightCount: this.lighting.length,
            tokenCount: this.tokens.length,
            noteCount: this.notes.length,
            state: this.state
        };
    }

    /**
     * Add wall segment
     * @param {Object} wall - Wall data
     */
    addWall(wall) {
        this.walls.push({
            start: wall.start,
            end: wall.end,
            type: wall.type || 'wall',
            move: wall.move || 0,
            sense: wall.sense || 0,
            sound: wall.sound || 0
        });
    }

    /**
     * Add lighting source
     * @param {Object} light - Light data
     */
    addLight(light) {
        this.lighting.push({
            position: light.position,
            brightRadius: light.brightRadius || 20,
            dimRadius: light.dimRadius || 20,
            color: light.color || '#ffffff',
            intensity: light.intensity || 0.5,
            type: light.type || 'torch'
        });
    }

    /**
     * Add token
     * @param {Object} token - Token data
     */
    addToken(token) {
        this.tokens.push({
            name: token.name,
            position: token.position,
            size: token.size || 1,
            image: token.image || '',
            monsterId: token.monsterId || null,
            hp: token.hp || null
        });
    }

    /**
     * Add note
     * @param {Object} note - Note data
     */
    addNote(note) {
        this.notes.push({
            text: note.text,
            position: note.position,
            icon: note.icon || 'sticky-note',
            visible: note.visible !== false
        });
    }

    /**
     * Get all monster tokens
     * @returns {Array} Monster tokens
     */
    getMonsterTokens() {
        return this.tokens.filter(token => token.monsterId);
    }

    /**
     * Get scene dimensions in pixels
     * @returns {Object} Dimensions
     */
    getDimensions() {
        return {
            width: this.gridSize.width * this.gridSize.scale * 10, // 10 pixels per foot
            height: this.gridSize.height * this.gridSize.scale * 10
        };
    }

    /**
     * Check if position is within scene bounds
     * @param {Object} position - {x, y} coordinates
     * @returns {boolean} True if within bounds
     */
    isPositionValid(position) {
        const dims = this.getDimensions();
        return position.x >= 0 && position.x <= dims.width &&
            position.y >= 0 && position.y <= dims.height;
    }

    /**
     * Get lighting coverage percentage
     * @returns {number} Percentage of scene covered by light
     */
    getLightingCoverage() {
        if (this.lighting.length === 0) return 0;

        const sceneArea = this.gridSize.width * this.gridSize.height;
        let litArea = 0;

        for (const light of this.lighting) {
            const radius = Math.max(light.brightRadius, light.dimRadius);
            const lightArea = Math.PI * radius * radius;
            litArea += lightArea;
        }

        // Cap at 100% and convert to percentage
        return Math.min((litArea / sceneArea) * 100, 100);
    }

    /**
     * Check if scene has line of sight between two points
     * @param {Object} start - Start position
     * @param {Object} end - End position
     * @returns {boolean} True if line of sight exists
     */
    hasLineOfSight(start, end) {
        // Simple implementation - check if line intersects any walls
        for (const wall of this.walls) {
            if (this.linesIntersect(start, end, wall.start, wall.end)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if two lines intersect
     * @param {Object} p1 - Line 1 start
     * @param {Object} p2 - Line 1 end
     * @param {Object} p3 - Line 2 start
     * @param {Object} p4 - Line 2 end
     * @returns {boolean} True if lines intersect
     */
    linesIntersect(p1, p2, p3, p4) {
        const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
        if (det === 0) return false;

        const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
        const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;

        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }

    /**
     * Check if URL is valid image URL
     * @param {string} url - URL to check
     * @returns {boolean} True if valid
     */
    isValidImageUrl(url) {
        try {
            const parsed = new URL(url);
            return ['http:', 'https:', 'data:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Get scene difficulty based on complexity
     * @returns {string} Difficulty level
     */
    getComplexityRating() {
        const factors = [
            this.walls.length > 10 ? 1 : 0,
            this.lighting.length > 5 ? 1 : 0,
            this.tokens.length > 20 ? 1 : 0,
            this.notes.length > 5 ? 1 : 0
        ];

        const score = factors.reduce((sum, factor) => sum + factor, 0);

        if (score <= 1) return 'Simple';
        if (score <= 2) return 'Moderate';
        return 'Complex';
    }
}