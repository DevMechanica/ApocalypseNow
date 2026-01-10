/**
 * MovementSystem - Handles movement constraints and coordinate conversion
 */

import { MAP_COORDS } from '../config/GameConfig.js';
import { FLOORS, MOVEMENT_CONSTRAINTS, WALKABLE_AREAS } from '../config/LevelData.js';

export class MovementSystem {
    constructor(canvas) {
        this.canvas = canvas;
    }

    /**
     * Get map drawing metrics
     * @returns {{drawWidth: number, offsetX: number}}
     */
    getMapDrawMetrics() {
        const mapAspect = 9 / 16;
        const drawHeight = this.canvas.height;
        const drawWidth = drawHeight * mapAspect;
        const offsetX = (this.canvas.width - drawWidth) / 2;
        return { drawWidth, offsetX };
    }

    /**
     * Convert MAP coordinate (304-427) to SCREEN pixel X
     * @param {number} mapX
     * @returns {number}
     */
    mapToScreenX(mapX) {
        const { drawWidth, offsetX } = this.getMapDrawMetrics();
        const mapRange = MAP_COORDS.xMax - MAP_COORDS.xMin;
        const percent = (mapX - MAP_COORDS.xMin) / mapRange;
        return offsetX + percent * drawWidth;
    }

    /**
     * Convert SCREEN pixel X to MAP coordinate (304-427)
     * @param {number} screenX
     * @returns {number}
     */
    screenToMapX(screenX) {
        const { drawWidth, offsetX } = this.getMapDrawMetrics();
        const mapRange = MAP_COORDS.xMax - MAP_COORDS.xMin;
        const percent = (screenX - offsetX) / drawWidth;
        return MAP_COORDS.xMin + percent * mapRange;
    }

    /**
     * Get movement constraints based on game state
     * @param {Object} gameState
     * @returns {{yPercent: number, xMinMap: number, xMaxMap: number}}
     */
    getConstraints(gameState) {
        let constraints;
        
        if (gameState.currentLevel === 2) {
            constraints = MOVEMENT_CONSTRAINTS.level2;
        } else if (gameState.generatorRoomUnlocked) {
            constraints = MOVEMENT_CONSTRAINTS.level1Unlocked;
        } else {
            constraints = MOVEMENT_CONSTRAINTS.level1Locked;
        }

        const yPercent = gameState.currentLevel === 2 ? FLOORS.first : FLOORS.first;

        return {
            yPercent,
            xMinMap: constraints.xMinMap,
            xMaxMap: constraints.xMaxMap
        };
    }

    /**
     * Get floor Y position
     * @param {boolean} onSecondFloor
     * @returns {number}
     */
    getFloorY(onSecondFloor) {
        return this.canvas.height * (onSecondFloor ? FLOORS.second : FLOORS.first);
    }

    /**
     * Clamp X position to constraints
     * @param {number} x - Screen X
     * @param {Object} gameState
     * @returns {number}
     */
    clampX(x, gameState) {
        const constraints = this.getConstraints(gameState);
        const minX = this.mapToScreenX(constraints.xMinMap);
        const maxX = this.mapToScreenX(constraints.xMaxMap);
        return Math.max(minX, Math.min(maxX, x));
    }

    /**
     * Check if point is walkable using ray casting algorithm
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    isPointWalkable(x, y) {
        for (const area of WALKABLE_AREAS) {
            if (this.pointInPolygon(x, y, area.points)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Point-in-polygon test using ray casting
     */
    pointInPolygon(x, y, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /**
     * Draw walkable areas for debugging
     */
    drawDebug(ctx) {
        ctx.save();
        for (const area of WALKABLE_AREAS) {
            // Fill area
            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
            ctx.beginPath();
            ctx.moveTo(area.points[0].x, area.points[0].y);
            for (let i = 1; i < area.points.length; i++) {
                ctx.lineTo(area.points[i].x, area.points[i].y);
            }
            ctx.closePath();
            ctx.fill();

            // Draw border
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw corner points
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            for (const point of area.points) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw label
            if (area.name) {
                const centerX = area.points.reduce((sum, p) => sum + p.x, 0) / area.points.length;
                const centerY = area.points.reduce((sum, p) => sum + p.y, 0) / area.points.length;
                ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(area.name, centerX, centerY);
            }
        }
        ctx.restore();
    }
}

export default MovementSystem;
