import Phaser from 'phaser';
import { getMapDrawMetrics } from '../systems/MovementSystem';

/**
 * InventoryButton - Circular button to toggle inventory
 */
export class InventoryButton extends Phaser.GameObjects.Container {
  private onToggle: () => void;
  
  constructor(scene: Phaser.Scene, onToggle: () => void) {
    const { width } = scene.cameras.main;
    const { offsetX } = getMapDrawMetrics(scene.cameras.main.width, scene.cameras.main.height);
    
    super(scene, width - offsetX - 40, 60);
    scene.add.existing(this);
    
    this.onToggle = onToggle;
    
    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.5);
    bg.fillCircle(0, 0, 25);
    bg.lineStyle(2, 0x8c7b64, 1);
    bg.strokeCircle(0, 0, 25);
    this.add(bg);
    
    // Icon
    const icon = scene.add.text(0, 0, '🎒', { fontSize: '24px' }).setOrigin(0.5);
    this.add(icon);
    
    // Interactive
    this.setSize(50, 50);
    this.setInteractive({ useHandCursor: true });
    
    this.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    
    this.on('pointerup', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.onToggle();
    });
    
    this.setDepth(100);
  }
}

/**
 * BuildButton - Circular button to toggle build mode
 */
export class BuildButton extends Phaser.GameObjects.Container {
  private onToggle: () => void;
  
  constructor(scene: Phaser.Scene, onToggle: () => void) {
    const { width, height } = scene.cameras.main;
    const { offsetX } = getMapDrawMetrics(width, height);
    
    super(scene, width - offsetX - 40, height - 90);
    scene.add.existing(this);
    
    this.onToggle = onToggle;
    
    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x3c3228, 0.8);
    bg.fillCircle(0, 0, 22);
    bg.lineStyle(2, 0x8c7b64, 1);
    bg.strokeCircle(0, 0, 22);
    this.add(bg);
    
    // Icon
    const icon = scene.add.text(0, 0, '🔨', { fontSize: '20px' }).setOrigin(0.5);
    this.add(icon);
    
    // Interactive
    this.setSize(44, 44);
    this.setInteractive({ useHandCursor: true });
    
    this.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    
    this.on('pointerup', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.onToggle();
    });
    
    this.setDepth(100);
  }
}
