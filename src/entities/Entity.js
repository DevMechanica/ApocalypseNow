/**
 * Entity - Base class for all game entities
 * Provides common properties and interface for update/draw
 */

export class Entity {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this.size = 48;
        this.visible = true;
        this.active = true;
    }

    /**
     * Update entity state
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Override in subclass
    }

    /**
     * Draw entity
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        // Override in subclass
    }

    /**
     * Check if entity is visible and active
     * @returns {boolean}
     */
    isAlive() {
        return this.visible && this.active;
    }

    /**
     * Get bounding box for collision detection
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    getBounds() {
        return {
            x: this.x - this.size / 2,
            y: this.y - this.size / 2,
            width: this.size,
            height: this.size
        };
    }

    /**
     * Check collision with another entity
     * @param {Entity} other
     * @returns {boolean}
     */
    collidesWith(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    /**
     * Get distance to another entity
     * @param {Entity} other
     * @returns {number}
     */
    distanceTo(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

export default Entity;
