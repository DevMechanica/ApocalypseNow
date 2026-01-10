/**
 * Main Entry Point
 * Bootstraps the game when DOM is ready
 */

import { Game } from './Game.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Starting Apocalypse Now...');
    
    // Get canvas element
    const canvas = document.getElementById('game-canvas');
    
    if (!canvas) {
        console.error('❌ Canvas element not found!');
        return;
    }
    
    // Create and initialize game
    const game = new Game(canvas);
    
    try {
        await game.init();
    } catch (error) {
        console.error('❌ Failed to initialize game:', error);
    }
});

// Export for potential testing
export { Game };
