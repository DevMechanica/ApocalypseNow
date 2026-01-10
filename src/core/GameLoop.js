/**
 * GameLoop - RequestAnimationFrame-based game loop
 * Provides consistent timing and update/render callbacks
 */

class GameLoop {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.frameId = null;
        
        // Callbacks
        this.updateCallback = null;
        this.renderCallback = null;
        
        // Bind the loop method
        this.loop = this.loop.bind(this);
    }

    /**
     * Set the update callback
     * @param {Function} callback - (deltaTime) => void
     */
    onUpdate(callback) {
        this.updateCallback = callback;
        return this;
    }

    /**
     * Set the render callback
     * @param {Function} callback - () => void
     */
    onRender(callback) {
        this.renderCallback = callback;
        return this;
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        this.frameId = requestAnimationFrame(this.loop);
        
        console.log('🎮 Game loop started');
    }

    /**
     * Stop the game loop
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        
        console.log('🛑 Game loop stopped');
    }

    /**
     * Pause the game loop
     */
    pause() {
        if (!this.isRunning || this.isPaused) return;
        this.isPaused = true;
        console.log('⏸️ Game loop paused');
    }

    /**
     * Resume the game loop
     */
    resume() {
        if (!this.isRunning || !this.isPaused) return;
        this.isPaused = false;
        this.lastTime = performance.now(); // Reset time to prevent jump
        console.log('▶️ Game loop resumed');
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * Main loop function
     * @param {number} currentTime - Current timestamp from RAF
     */
    loop(currentTime) {
        if (!this.isRunning) return;

        // Calculate delta time in seconds
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Cap delta time to prevent huge jumps (e.g., after tab switch)
        if (this.deltaTime > 0.1) {
            this.deltaTime = 0.016; // Assume 60fps
        }

        // Update logic (skip if paused)
        if (!this.isPaused && this.updateCallback) {
            this.updateCallback(this.deltaTime);
        }

        // Render always runs (to show pause screen, etc.)
        if (this.renderCallback) {
            this.renderCallback();
        }

        // Schedule next frame
        this.frameId = requestAnimationFrame(this.loop);
    }

    /**
     * Get current FPS
     * @returns {number}
     */
    getFPS() {
        return this.deltaTime > 0 ? Math.round(1 / this.deltaTime) : 0;
    }

    /**
     * Get delta time
     * @returns {number}
     */
    getDeltaTime() {
        return this.deltaTime;
    }
}

// Singleton instance
export const gameLoop = new GameLoop();
export default GameLoop;
