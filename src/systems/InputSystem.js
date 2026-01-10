/**
 * InputSystem - Handles all user input (click, keyboard)
 */

import { eventBus, Events } from '../core/EventBus.js';
import { CONFIG } from '../config/GameConfig.js';

export class InputSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.enabled = true;
        
        this.setupEventListeners();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Canvas click handler
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // Keyboard handler
        window.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Handle canvas click
     */
    handleClick(e) {
        if (!this.enabled) return;

        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        eventBus.emit(Events.CLICK, {
            x: clickX,
            y: clickY,
            clientX: e.clientX,
            clientY: e.clientY
        });
    }

    /**
     * Handle keyboard input
     */
    handleKeydown(e) {
        if (!this.enabled) return;

        eventBus.emit(Events.KEY_PRESS, {
            key: e.key,
            code: e.code,
            event: e
        });

        // Debug toggle
        if (e.key === 'd' || e.key === 'D') {
            CONFIG.showWalkableAreas = !CONFIG.showWalkableAreas;
            console.log(`🔍 Walkable areas debug: ${CONFIG.showWalkableAreas ? 'ON' : 'OFF'}`);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        CONFIG.canvas.width = window.innerWidth;
        CONFIG.canvas.height = window.innerHeight;
    }

    /**
     * Enable/disable input
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

export default InputSystem;
