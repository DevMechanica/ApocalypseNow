/**
 * Game - Main game orchestrator
 * Coordinates all systems, managers, and entities
 */

import { CONFIG } from './config/GameConfig.js';
import { FLOORS } from './config/LevelData.js';
import { eventBus, Events } from './core/EventBus.js';
import { gameLoop } from './core/GameLoop.js';

// Systems
import { InputSystem } from './systems/InputSystem.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { RenderSystem } from './systems/RenderSystem.js';

// Managers
import { GameStateManager, GameStates } from './managers/GameStateManager.js';
import { UIManager } from './managers/UIManager.js';
import { LevelManager } from './managers/LevelManager.js';

// Entities
import { Character } from './entities/Character.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Initialize canvas size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Systems
        this.inputSystem = new InputSystem(canvas);
        this.movementSystem = new MovementSystem(canvas);
        this.combatSystem = new CombatSystem();
        this.renderSystem = new RenderSystem(canvas);
        
        // Managers
        this.stateManager = new GameStateManager();
        this.uiManager = new UIManager();
        this.levelManager = new LevelManager(canvas, this.movementSystem);
        
        // Entities
        this.character = null;
        this.enemies = [];
        
        // Bind methods
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
    }

    /**
     * Initialize the game
     */
    async init() {
        console.log('🎮 Initializing game...');
        
        // Load map image
        const mapImage = await this.levelManager.initMapImage();
        this.renderSystem.setMapImage(mapImage);
        
        // Create character at center of allowed range
        const gameData = this.stateManager.getGameData();
        const constraints = this.movementSystem.getConstraints(gameData);
        const initialX = this.movementSystem.mapToScreenX((constraints.xMinMap + constraints.xMaxMap) / 2);
        const initialY = this.canvas.height * FLOORS.first;
        this.character = new Character(initialX, initialY);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start game loop
        gameLoop
            .onUpdate(this.update)
            .onRender(this.render)
            .start();
        
        // Set state to playing
        this.stateManager.setState(GameStates.PLAYING);
        
        console.log('🎮 Game initialized! Click anywhere to move the character.');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle clicks
        eventBus.on(Events.CLICK, (data) => this.handleClick(data));
        
        // Handle action button clicks
        this.uiManager.onActionButtonClick(() => this.handleAction());
        
        // Handle level changes
        eventBus.on(Events.LEVEL_CHANGED, (data) => {
            if (data.level === 2 && this.enemies.length === 0) {
                const enemy = this.levelManager.spawnLevel2Enemy();
                this.enemies.push(enemy);
            }
        });
    }

    /**
     * Handle click events
     */
    handleClick(data) {
        const { x, y, clientX, clientY } = data;
        const gameData = this.stateManager.getGameData();
        
        // Show click indicator
        this.uiManager.showClickIndicator(clientX, clientY);
        
        // Don't process clicks while climbing
        if (gameData.isClimbing) return;
        
        // Check for floor climbing
        if (this.checkFloorClick(x, y, gameData)) return;
        
        // Check for enemy click (combat)
        if (this.combatSystem.tryAttack(this.character, this.enemies, x, y)) return;
        
        // Normal movement
        this.handleMovement(x, gameData);
    }

    /**
     * Check if click should trigger floor change
     */
    checkFloorClick(x, y, gameData) {
        const firstFloorY = this.canvas.height * FLOORS.first;
        const secondFloorY = this.canvas.height * FLOORS.second;
        
        // Click on lower floor when on first floor in level 2
        if (gameData.currentLevel === 2 && !gameData.onSecondFloor && y > firstFloorY) {
            this.levelManager.handleFloorClimb(this.character, gameData, x, true, null);
            return true;
        }
        
        // Click on first floor when on second floor
        if (gameData.currentLevel === 2 && gameData.onSecondFloor && y < firstFloorY) {
            this.levelManager.handleFloorClimb(this.character, gameData, x, false, null);
            return true;
        }
        
        return false;
    }

    /**
     * Handle normal movement
     */
    handleMovement(x, gameData) {
        const clampedX = this.movementSystem.clampX(x, gameData);
        const floorY = this.movementSystem.getFloorY(gameData.onSecondFloor);
        this.character.moveTo(clampedX, floorY);
    }

    /**
     * Handle action button press
     */
    handleAction() {
        const zone = this.uiManager.getCurrentZone();
        if (!zone) return;
        
        const gameData = this.stateManager.getGameData();
        console.log(`🎮 Action: ${zone.action} at ${zone.name}`);

        switch (zone.type) {
            case 'searchable':
                this.handleSearchable(zone, gameData);
                break;
            case 'action':
                this.handleActionZone(zone);
                break;
            case 'door':
                this.handleDoor(zone, gameData);
                break;
            case 'generator':
                this.handleGenerator(zone, gameData);
                break;
        }
    }

    /**
     * Handle searchable object interaction
     */
    handleSearchable(zone, gameData) {
        this.uiManager.showMessage(zone.searchMessage);
        this.stateManager.markSearched(zone.name);

        if (zone.hasKey && !gameData.keyFound) {
            eventBus.emit(Events.KEY_FOUND);
            setTimeout(() => {
                this.uiManager.showMessage('🎉 You found the Room Key!');
            }, 2000);
        }
    }

    /**
     * Handle action zone (e.g., bed)
     */
    handleActionZone(zone) {
        if (zone.name === 'bed') {
            this.uiManager.showMessage('💤 Going to sleep... Good night!');
        }
    }

    /**
     * Handle door interaction
     */
    handleDoor(zone, gameData) {
        if (gameData.keyFound) {
            if (!gameData.generatorRoomUnlocked) {
                this.uiManager.showMessage(zone.unlockMessage);
                this.levelManager.unlockDoor();
            } else {
                this.uiManager.showMessage('The door is already unlocked.');
            }
        } else {
            this.uiManager.showMessage(zone.lockedMessage);
        }
    }

    /**
     * Handle generator interaction
     */
    handleGenerator(zone, gameData) {
        if (!gameData.generatorFixed) {
            this.uiManager.showMessage(zone.fixedMessage);
            eventBus.emit(Events.GENERATOR_FIXED);
            
            this.levelManager.transitionToLevel2(() => {
                // Level 2 ready
            });
        } else {
            this.uiManager.showMessage('The generator is humming smoothly.');
        }
    }

    /**
     * Update game state
     */
    update(deltaTime) {
        if (!this.stateManager.isPlaying()) return;
        
        const gameData = this.stateManager.getGameData();
        
        // Update character
        this.character.update(deltaTime);
        
        // Update enemies
        this.enemies.forEach(enemy => {
            if (enemy.isAlive()) {
                enemy.update(deltaTime, this.character.x, this.character.y);
            }
        });
        
        // Remove dead enemies
        this.enemies = this.enemies.filter(e => e.isAlive());
        
        // Check interactive zones
        const zone = this.levelManager.findZoneAtPosition(this.character.x, gameData.onSecondFloor);
        this.uiManager.setCurrentZone(zone);
        
        // Update UI
        const mapX = this.movementSystem.screenToMapX(this.character.x);
        this.uiManager.updatePosition(mapX, this.character.y);
        this.uiManager.updateStatus(this.character.getStatus());
    }

    /**
     * Render the game
     */
    render() {
        // Clear and draw background
        this.renderSystem.clear();
        
        // Draw debug info
        this.renderSystem.drawDebug(this.movementSystem);
        
        // Draw character
        this.renderSystem.drawEntity(this.character);
        
        // Draw enemies
        this.renderSystem.drawEntities(this.enemies);
        
        // Draw health bar
        this.renderSystem.drawHealthBar(
            this.combatSystem.playerHealth,
            this.combatSystem.playerMaxHealth
        );
    }
}

export default Game;
