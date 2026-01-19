import Phaser from 'phaser';
import { CONFIG, ASSETS, MAP_COORDS } from '../config/GameConfig';
import { INTERACTIVE_ZONES, InteractiveZone, getZonesForFloor } from '../config/InteractiveZones';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { gameState } from '../managers/GameState';
import { 
  getMapDrawMetrics, 
  mapToScreenX, 
  screenToMapX, 
  getFloorY, 
  getMovementConstraints,
  getStairsX 
} from '../systems/MovementSystem';
import { HUD, ActionButton, MessageToast, InventoryButton, BuildButton } from '../ui';

/**
 * GameScene - Main gameplay scene
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private mapVideo!: HTMLVideoElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private currentZone: InteractiveZone | null = null;
  
  // UI Components (extracted)
  private hud!: HUD;
  private actionButton!: ActionButton;
  private messageToast!: MessageToast;
  private inventoryButton!: InventoryButton;
  private buildButton!: BuildButton;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    
    // Reset game state
    gameState.reset();
    
    // Create canvas for custom rendering
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
    
    // Create map video
    this.createMapVideo();
    
    // Initialize player
    const state = gameState.get();
    const constraints = getMovementConstraints(state.generatorRoomUnlocked, 1, height);
    const initialX = mapToScreenX((constraints.xMinMap + constraints.xMaxMap) / 2, width, height);
    const initialY = getFloorY(1, height);
    this.player = new Player(this, initialX, initialY);
    
    // Create UI components (using extracted classes)
    this.actionButton = new ActionButton(this, () => this.handleAction());
    this.messageToast = new MessageToast(this);
    this.hud = new HUD(this);
    this.inventoryButton = new InventoryButton(this, () => this.toggleInventory());
    this.buildButton = new BuildButton(this, () => this.toggleBuildMode());
    
    // Set up input
    this.setupInput();
    
    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);
    
    // Handle resize
    this.scale.on('resize', this.handleResize, this);
  }

  private createMapVideo(): void {
    this.mapVideo = document.createElement('video');
    this.mapVideo.src = ASSETS.maps.video;
    this.mapVideo.muted = true;
    this.mapVideo.playsInline = true;
    this.mapVideo.preload = 'auto';
    this.mapVideo.style.display = 'none';
    document.body.appendChild(this.mapVideo);
    
    this.mapVideo.addEventListener('loadeddata', () => {
      this.mapVideo.currentTime = 2; // Locked state
    });
    
    this.mapVideo.addEventListener('timeupdate', () => {
      if (this.mapVideo.currentTime >= 4 && !this.mapVideo.paused) {
        this.mapVideo.pause();
        this.mapVideo.currentTime = 4;
      }
    });
    
    this.mapVideo.load();
  }

  /**
   * Show a toast message using the MessageToast component
   */
  private showMessage(msg: string): void {
    this.messageToast.show(msg);
  }

  private setupInput(): void {
    // Click to move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer.x, pointer.y);
    });
    
    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-D', () => {
      // Toggle debug mode (not implemented for simplicity)
    });
    
    this.input.keyboard?.on('keydown-ESC', () => {
      // Close any open UI
    });
  }

  private handleClick(clickX: number, clickY: number): void {
    const { width, height } = this.cameras.main;
    const state = gameState.get();
    
    // Don't process while climbing
    if (state.isClimbing) return;
    
    const currentFloorY = getFloorY(1, height);
    const lowerFloorY = getFloorY(2, height);
    const thirdFloorY = getFloorY(3, height);
    
    // Check floor transitions
    if (this.handleFloorTransition(clickX, clickY, currentFloorY, lowerFloorY, thirdFloorY)) {
      return;
    }
    
    // Check enemy click (combat)
    for (const enemy of this.enemies) {
      const dx = clickX - enemy.x;
      const dy = clickY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < enemy.size / 2) {
        this.handleEnemyClick(enemy);
        return;
      }
    }
    
    // Normal movement
    const constraints = getMovementConstraints(state.generatorRoomUnlocked, gameState.getCurrentFloor(), height);
    const minX = mapToScreenX(constraints.xMinMap, width, height);
    const maxX = mapToScreenX(constraints.xMaxMap, width, height);
    const clampedX = Math.max(minX, Math.min(maxX, clickX));
    
    this.player.moveTo(clampedX, constraints.yPos);
  }

  private handleFloorTransition(clickX: number, clickY: number, floor1Y: number, floor2Y: number, floor3Y: number): boolean {
    const { width, height } = this.cameras.main;
    const state = gameState.get();
    
    // Going down from floor 1 to floor 2
    if (state.currentLevel >= 2 && !state.onSecondFloor && !state.onThirdFloor && clickY > floor1Y) {
      this.climbToFloor(2, clickX);
      return true;
    }
    
    // Going up from floor 2 to floor 1
    if (state.currentLevel >= 2 && state.onSecondFloor && clickY < floor1Y) {
      this.climbToFloor(1, clickX);
      return true;
    }
    
    // Going down from floor 2 to floor 3
    if (state.currentLevel === 3 && state.onSecondFloor && clickY > floor2Y) {
      this.climbToFloor(3, clickX);
      return true;
    }
    
    // Going up from floor 3 to floor 2
    if (state.onThirdFloor && clickY < floor1Y) {
      this.climbToFloor(2, clickX);
      return true;
    }
    
    return false;
  }

  private climbToFloor(targetFloor: number, targetX: number): void {
    const { width, height } = this.cameras.main;
    const state = gameState.get();
    
    state.isClimbing = true;
    state.climbTargetX = targetX;
    
    const stairsX = getStairsX(width, height);
    const currentY = getFloorY(gameState.getCurrentFloor(), height);
    
    this.player.moveTo(stairsX, currentY);
    
    // Wait for player to reach stairs
    const checkInterval = this.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.player.moving) {
          checkInterval.destroy();
          this.player.visible = false;
          
          this.time.delayedCall(1000, () => {
            const newY = getFloorY(targetFloor, height);
            const newX = mapToScreenX(344, width, height);
            
            this.player.x = newX;
            this.player.y = newY;
            this.player.visible = true;
            
            // Update state
            state.onSecondFloor = targetFloor === 2;
            state.onThirdFloor = targetFloor === 3;
            state.isClimbing = false;
            
            // Move to target
            const constraints = getMovementConstraints(state.generatorRoomUnlocked, targetFloor, height);
            const minX = mapToScreenX(constraints.xMinMap, width, height);
            const maxX = mapToScreenX(constraints.xMaxMap, width, height);
            const clampedX = Math.max(minX, Math.min(maxX, state.climbTargetX!));
            this.player.moveTo(clampedX, newY);
            
            // Spawn zombie on floor 2
            if (targetFloor === 2 && this.enemies.length === 0 && !state.zombieDefeated) {
              this.spawnZombie();
            }
          });
        }
      },
      loop: true
    });
  }

  private spawnZombie(): void {
    const { width, height } = this.cameras.main;
    const y = getFloorY(2, height);
    const x = mapToScreenX(360, width, height);
    
    const zombie = new Enemy(this, x, y);
    this.enemies.push(zombie);
  }

  private handleEnemyClick(enemy: Enemy): void {
    const dist = Math.sqrt(
      Math.pow(enemy.x - this.player.x, 2) + 
      Math.pow(enemy.y - this.player.y, 2)
    );
    
    if (dist < CONFIG.character.punchRange) {
      const direction = (enemy.x - this.player.x) < 0 ? 'left' : 'right';
      this.player.punch(direction);
      
      if (enemy.takeDamage(CONFIG.character.punchDamage)) {
        // Enemy died
        gameState.get().zombieDefeated = true;
        this.showMessage('🎉 Zombie defeated! The chest is now accessible.');
        
        const idx = this.enemies.indexOf(enemy);
        if (idx > -1) {
          this.enemies.splice(idx, 1);
          enemy.destroy();
        }
      }
    } else {
      this.showMessage('Too far to attack! Get closer.');
    }
  }

  private handleAction(): void {
    if (!this.currentZone) return;
    
    const state = gameState.get();
    const zone = this.currentZone;
    
    switch (zone.type) {
      case 'searchable':
        if (zone.loot) {
          this.showLootUI(zone);
        } else {
          this.showMessage(zone.searchMessage || 'Nothing useful here.');
          state.searchedObjects.add(zone.name);
          if (zone.hasKey && !state.keyFound) {
            state.keyFound = true;
            this.time.delayedCall(2000, () => {
              this.showMessage('🎉 You found the Room Key!');
            });
          }
        }
        break;
        
      case 'door':
        if (state.keyFound) {
          if (!state.generatorRoomUnlocked) {
            this.showMessage(zone.unlockMessage || 'Door unlocked!');
            this.mapVideo.play();
            state.generatorRoomUnlocked = true;
          } else {
            this.showMessage('The door is already unlocked.');
          }
        } else {
          this.showMessage(zone.lockedMessage || 'The door is locked.');
        }
        break;
        
      case 'generator':
        if (!state.generatorFixed) {
          this.scene.launch('GeneratorPuzzleScene');
          this.scene.pause();
        } else {
          this.showMessage('The generator is humming smoothly.');
        }
        break;
        
      case 'chest':
        if (zone.requiresZombieDefeated && !state.zombieDefeated) {
          this.showMessage(zone.lockedMessage || 'Cannot open.');
        } else if (zone.loot) {
          this.showLootUI(zone);
        }
        break;
        
      case 'reactor':
        if (state.reactorCoreInserted) {
          this.showMessage('The reactor is already powered.');
        } else if (gameState.hasItem('Reactor Core')) {
          gameState.removeFromInventory('Reactor Core', 1);
          state.reactorCoreInserted = true;
          this.showMessage(zone.insertMessage || 'Inserting...');
          this.playReactorCutscene();
        } else {
          this.showMessage(zone.requiresCoreMessage || 'Need reactor core.');
        }
        break;
        
      case 'action':
        if (zone.name === 'bed') {
          this.showMessage('💤 Going to sleep... Good night!');
        }
        break;
    }
  }

  private showLootUI(_zone: InteractiveZone): void {
    // Simplified loot - just add items directly
    if (_zone.loot) {
      _zone.loot.forEach(item => {
        gameState.addToInventory(item.name, item.count, item.icon);
        this.showMessage(`+${item.count} ${item.name}`);
      });
    }
  }

  private playReactorCutscene(): void {
    const state = gameState.get();
    
    // Load level 3 map
    const level3Img = new Image();
    level3Img.src = ASSETS.maps.level3;
    level3Img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = level3Img.width;
      canvas.height = level3Img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(level3Img, 0, 0);
      state.mapFrameCanvas = canvas;
      state.currentLevel = 3;
      this.showMessage('☢️ Reactor Core Inserted! New floors unlocked!');
    };
  }

  private toggleInventory(): void {
    // Simplified - just log inventory
    const inv = gameState.get().inventory;
    const items = Object.entries(inv).map(([name, data]) => `${data.icon} ${data.count}x ${name}`);
    console.log('Inventory:', items.length ? items.join(', ') : 'Empty');
  }

  private toggleBuildMode(): void {
    // Build mode toggle - simplified
    this.showMessage('Build mode coming soon!');
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.canvas.width = gameSize.width;
    this.canvas.height = gameSize.height;
  }

  update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    const { width, height } = this.cameras.main;
    const state = gameState.get();
    
    // Update player
    this.player.update(deltaSeconds);
    
    // Update enemies
    for (const enemy of this.enemies) {
      const result = enemy.update(deltaSeconds, this.player.x, this.player.y);
      if (result && result.attacked) {
        if (gameState.takeDamage(result.damage)) {
          this.showMessage('💀 You died!');
        }
      }
    }
    
    // Check interactive zones
    this.checkInteractiveZones();
    
    // Draw everything
    this.draw();
  }

  private checkInteractiveZones(): void {
    const { width, height } = this.cameras.main;
    const zones = getZonesForFloor(gameState.getCurrentFloor());
    let foundZone: InteractiveZone | null = null;
    
    for (const zone of zones) {
      const xMin = mapToScreenX(zone.xMinMap, width, height);
      const xMax = mapToScreenX(zone.xMaxMap, width, height);
      
      if (this.player.x >= xMin && this.player.x <= xMax) {
        foundZone = zone;
        break;
      }
    }
    
    if (foundZone && foundZone !== this.currentZone) {
      this.currentZone = foundZone;
      this.actionButton.setZone(foundZone.icon, foundZone.action);
      this.actionButton.show();
    } else if (!foundZone && this.currentZone) {
      this.currentZone = null;
      this.actionButton.hide();
    }
  }

  private draw(): void {
    const { width, height } = this.cameras.main;
    const state = gameState.get();
    const { drawWidth, offsetX } = getMapDrawMetrics(width, height);
    
    // Clear canvas
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, width, height);
    
    // Draw map based on current level state
    if (state.mapFrameCanvas) {
      // Level 3 unlocked - show full level 3 map
      const aspect = state.mapFrameCanvas.width / state.mapFrameCanvas.height;
      const dw = height * aspect;
      const ox = (width - dw) / 2;
      this.ctx.drawImage(state.mapFrameCanvas, ox, 0, dw, height);
    } else {
      // Draw the base video (floor 1)
      if (this.mapVideo.readyState >= 2) {
        this.ctx.drawImage(this.mapVideo, offsetX, 0, drawWidth, height);
      }
      
      // Overlay floor 2 lit portion if generator is fixed
      if (state.generatorFixed && state.floor2LitCanvas) {
        const srcCanvas = state.floor2LitCanvas;
        const aspect = srcCanvas.width / srcCanvas.height;
        const dw = height * aspect;
        const ox = (width - dw) / 2;
        
        // Floor 2 Y range in source image (approximately 56% to 70% of image height)
        const floor2StartPercent = 0.55;
        const floor2EndPercent = 0.72;
        
        const srcY = srcCanvas.height * floor2StartPercent;
        const srcH = srcCanvas.height * (floor2EndPercent - floor2StartPercent);
        
        const destY = height * floor2StartPercent;
        const destH = height * (floor2EndPercent - floor2StartPercent);
        
        // Draw only the floor 2 portion from the lit image
        this.ctx.drawImage(
          srcCanvas,
          0, srcY, srcCanvas.width, srcH,  // Source rectangle
          ox, destY, dw, destH              // Destination rectangle
        );
      }
    }
    
    // Draw enemies
    for (const enemy of this.enemies) {
      enemy.draw(this.ctx);
    }
    
    // Draw player
    this.player.draw(this.ctx);
    
    // Update Phaser texture from canvas
    if (!this.textures.exists('gameCanvas')) {
      this.textures.addCanvas('gameCanvas', this.canvas);
    } else {
      this.textures.get('gameCanvas').getSourceImage();
    }
    
    // Draw as Phaser image
    if (!this.children.getByName('gameImage')) {
      const img = this.add.image(width / 2, height / 2, 'gameCanvas').setName('gameImage');
      img.setDepth(-1);
    } else {
      (this.textures.get('gameCanvas') as Phaser.Textures.CanvasTexture).refresh();
    }
  }

  shutdown(): void {
    this.player?.destroy();
    this.enemies.forEach(e => e.destroy());
    if (this.mapVideo?.parentNode) {
      this.mapVideo.parentNode.removeChild(this.mapVideo);
    }
  }
}
