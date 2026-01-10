/**
 * InteractiveZone - Represents an interactive area in the game
 */

import { MAP_COORDS } from '../config/GameConfig.js';

export class InteractiveZone {
    constructor(config) {
        this.name = config.name;
        this.xMinMap = config.xMinMap;
        this.xMaxMap = config.xMaxMap;
        this.icon = config.icon;
        this.action = config.action;
        this.type = config.type;
        this.floor = config.floor;
        
        // Optional properties
        this.lockedMessage = config.lockedMessage || null;
        this.unlockMessage = config.unlockMessage || null;
        this.searchMessage = config.searchMessage || null;
        this.brokenMessage = config.brokenMessage || null;
        this.fixedMessage = config.fixedMessage || null;
        this.hasKey = config.hasKey || false;
        this.requiresUnlock = config.requiresUnlock || false;
        
        // Screen coordinates (calculated dynamically)
        this.xMin = 0;
        this.xMax = 0;
    }

    /**
     * Update screen coordinates based on canvas size
     * @param {Function} mapToScreenX - Coordinate conversion function
     */
    updateScreenCoords(mapToScreenX) {
        this.xMin = mapToScreenX(this.xMinMap);
        this.xMax = mapToScreenX(this.xMaxMap);
    }

    /**
     * Check if a position is within this zone
     * @param {number} x - Screen X position
     * @returns {boolean}
     */
    containsX(x) {
        return x >= this.xMin && x <= this.xMax;
    }

    /**
     * Check if zone is on specified floor
     * @param {number} floor
     * @returns {boolean}
     */
    isOnFloor(floor) {
        return this.floor === floor;
    }
}

export default InteractiveZone;
