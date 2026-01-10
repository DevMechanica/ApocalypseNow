/**
 * RenderSystem - Handles all canvas rendering
 */

import { CONFIG } from '../config/GameConfig.js';

export class RenderSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mapImage = null;
        this.mapLoaded = false;
    }

    /**
     * Set the map image element
     * @param {HTMLImageElement} image
     */
    setMapImage(image) {
        this.mapImage = image;
        this.mapLoaded = true;
    }

    /**
     * Clear the canvas
     */
    clear() {
        if (this.mapLoaded && this.mapImage) {
            this.drawMap();
        } else {
            this.ctx.fillStyle = '#0a0a0a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Draw the map background
     */
    drawMap() {
        if (!this.mapImage || !this.mapImage.complete) return;

        // Calculate dimensions to fit height and center
        const imgAspect = this.mapImage.width / this.mapImage.height;
        const drawHeight = this.canvas.height;
        const drawWidth = drawHeight * imgAspect;
        const offsetX = (this.canvas.width - drawWidth) / 2;

        // Draw the image
        this.ctx.drawImage(this.mapImage, offsetX, 0, drawWidth, drawHeight);
    }

    /**
     * Draw an entity
     * @param {Entity} entity
     */
    drawEntity(entity) {
        if (entity && entity.isAlive()) {
            entity.draw(this.ctx);
        }
    }

    /**
     * Draw multiple entities
     * @param {Array<Entity>} entities
     */
    drawEntities(entities) {
        entities.forEach(entity => this.drawEntity(entity));
    }

    /**
     * Draw the player health bar
     * @param {number} health
     * @param {number} maxHealth
     */
    drawHealthBar(health, maxHealth) {
        const barWidth = 200;
        const barHeight = 20;
        const barX = 20;
        const barY = 20;
        const healthPercent = health / maxHealth;

        // Background
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health fill
        this.ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : (healthPercent > 0.25 ? '#FFC107' : '#F44336');
        this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        // Border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`HP: ${Math.max(0, Math.round(health))}/${maxHealth}`, barX + 5, barY + 15);
    }

    /**
     * Draw debug grid
     */
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        const gridSize = 50;

        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    /**
     * Draw debug areas
     * @param {MovementSystem} movementSystem
     */
    drawDebug(movementSystem) {
        if (CONFIG.showWalkableAreas) {
            movementSystem.drawDebug(this.ctx);
        }
    }

    /**
     * Get canvas context
     */
    getContext() {
        return this.ctx;
    }
}

export default RenderSystem;
