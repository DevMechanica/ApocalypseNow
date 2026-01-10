/**
 * LevelManager - Handles level transitions, floor changes, and zones
 */

import { eventBus, Events } from '../core/EventBus.js';
import { INTERACTIVE_ZONES, STAIRS, ENEMY_SPAWNS, FLOORS } from '../config/LevelData.js';
import { ASSETS } from '../config/GameConfig.js';
import { InteractiveZone } from '../entities/InteractiveZone.js';
import { Enemy } from '../entities/Enemy.js';

export class LevelManager {
    constructor(canvas, movementSystem) {
        this.canvas = canvas;
        this.movementSystem = movementSystem;
        
        // Map image (static background)
        this.mapImage = null;
        this.mapLoaded = false;
        
        // Interactive zones
        this.zones = INTERACTIVE_ZONES.map(config => new InteractiveZone(config));
        
        // Update zone screen coordinates
        this.updateZoneCoords();
    }

    /**
     * Initialize the map image
     * @returns {Promise<HTMLImageElement>}
     */
    async initMapImage() {
        return new Promise((resolve, reject) => {
            this.mapImage = new Image();
            
            this.mapImage.onload = () => {
                this.mapLoaded = true;
                console.log('🗺️ Map image loaded!');
                resolve(this.mapImage);
            };

            this.mapImage.onerror = () => {
                console.error('❌ Failed to load map image');
                reject(new Error('Failed to load map image'));
            };

            this.mapImage.src = ASSETS.maps.background;
        });
    }

    /**
     * Update zone screen coordinates
     */
    updateZoneCoords() {
        const mapToScreenX = (mapX) => this.movementSystem.mapToScreenX(mapX);
        this.zones.forEach(zone => zone.updateScreenCoords(mapToScreenX));
    }

    /**
     * Get zones for current floor
     * @param {boolean} onSecondFloor
     * @returns {Array<InteractiveZone>}
     */
    getZonesForFloor(onSecondFloor) {
        const floor = onSecondFloor ? 2 : 1;
        return this.zones.filter(zone => zone.isOnFloor(floor));
    }

    /**
     * Find zone at position
     * @param {number} x - Character X position
     * @param {boolean} onSecondFloor
     * @returns {InteractiveZone|null}
     */
    findZoneAtPosition(x, onSecondFloor) {
        const zones = this.getZonesForFloor(onSecondFloor);
        return zones.find(zone => zone.containsX(x)) || null;
    }

    /**
     * Unlock the door
     */
    unlockDoor() {
        eventBus.emit(Events.DOOR_UNLOCKED);
        console.log('🔓 Door unlocked!');
    }

    /**
     * Transition to level 2
     * @param {Function} onComplete - Callback when transition is done
     */
    transitionToLevel2(onComplete) {
        console.log('⚡ Generator fixed! Transitioning to level 2...');

        // Fade effect
        this.canvas.style.transition = 'opacity 0.5s';
        this.canvas.style.opacity = '0.3';

        setTimeout(() => {
            // Fade back in
            this.canvas.style.opacity = '1';
            
            console.log('✨ Level 2 revealed!');
            eventBus.emit(Events.LEVEL_CHANGED, { level: 2 });
            
            if (onComplete) onComplete();
        }, 500);
    }

    /**
     * Spawn enemy for level 2
     * @returns {Enemy}
     */
    spawnLevel2Enemy() {
        const spawnConfig = ENEMY_SPAWNS.level2;
        const x = this.movementSystem.mapToScreenX(spawnConfig.xMapPosition);
        const y = this.canvas.height * FLOORS.second;
        
        const enemy = new Enemy(x, y, 'zombie');
        
        // Set movement constraints
        const constraints = this.movementSystem.getConstraints({ currentLevel: 2 });
        const minX = this.movementSystem.mapToScreenX(constraints.xMinMap);
        const maxX = this.movementSystem.mapToScreenX(constraints.xMaxMap);
        enemy.setConstraints(minX, maxX);
        
        console.log('🧟 Zombie spawned on second floor!');
        eventBus.emit(Events.ENEMY_SPAWNED, { enemy });
        
        return enemy;
    }

    /**
     * Handle floor climbing
     * @param {Character} character
     * @param {Object} gameState
     * @param {number} targetX - Where to walk after climbing
     * @param {boolean} goingDown
     * @param {Function} onComplete
     */
    handleFloorClimb(character, gameState, targetX, goingDown, onComplete) {
        console.log(`🪜 ${goingDown ? 'Going down' : 'Climbing up'}...`);
        
        gameState.isClimbing = true;
        gameState.climbTargetX = targetX;

        const startFloorY = this.movementSystem.getFloorY(goingDown ? false : true);
        const stairsX = this.movementSystem.mapToScreenX(STAIRS.xMapPosition);

        // Walk to stairs
        character.moveTo(stairsX, startFloorY);

        // Wait for arrival
        const checkArrival = setInterval(() => {
            if (!character.moving) {
                clearInterval(checkArrival);

                // Hide character during climb
                character.visible = false;
                console.log('👻 Character hidden, climbing...');

                // Simulate climb time
                setTimeout(() => {
                    const endFloorY = this.movementSystem.getFloorY(goingDown);
                    const constraints = this.movementSystem.getConstraints(gameState);
                    const leftX = this.movementSystem.mapToScreenX(constraints.xMinMap);

                    character.x = leftX;
                    character.y = endFloorY;
                    character.visible = true;
                    
                    gameState.onSecondFloor = goingDown;
                    gameState.isClimbing = false;

                    eventBus.emit(Events.FLOOR_CHANGED, { onSecondFloor: goingDown });
                    console.log(`✨ Character on ${goingDown ? 'lower' : 'first'} floor!`);

                    // Walk to target
                    const clampedX = this.movementSystem.clampX(gameState.climbTargetX, gameState);
                    character.moveTo(clampedX, endFloorY);

                    if (onComplete) onComplete();
                }, 1000);
            }
        }, 100);
    }

    /**
     * Get map image
     * @returns {HTMLImageElement}
     */
    getMapImage() {
        return this.mapImage;
    }
}

export default LevelManager;
