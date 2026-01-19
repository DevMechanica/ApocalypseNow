import Phaser from 'phaser';
import { ASSETS } from '../config/GameConfig';

/**
 * BootScene - Preloads all game assets
 */
export class BootScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingUI();
    this.loadAssets();
  }

  private createLoadingUI(): void {
    const { width, height } = this.cameras.main;
    
    // Progress bar background
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(width / 2 - 160, height / 2, 320, 30);
    
    // Progress bar fill
    this.progressBar = this.add.graphics();
    
    // Loading text
    this.loadingText = this.add.text(width / 2, height / 2 - 40, 'Loading...', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Title
    this.add.text(width / 2, height / 2 - 100, '🧟 APOCALYPSE NOW 🧟', {
      fontFamily: 'Arial',
      fontSize: '36px',
      color: '#ff4444'
    }).setOrigin(0.5);
    
    // Progress events
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xff4444, 1);
      this.progressBar.fillRect(width / 2 - 155, height / 2 + 5, 310 * value, 20);
      this.loadingText.setText(`Loading... ${Math.floor(value * 100)}%`);
    });
    
    this.load.on('complete', () => {
      this.loadingText.setText('Complete!');
    });
  }

  private loadAssets(): void {
    // Character front walking frames
    ASSETS.character.front.forEach((path, index) => {
      this.load.image(`character_front_${index}`, path);
    });
    
    // Character punch
    this.load.image('character_punch', ASSETS.character.punch);
    
    // Zombie idle
    this.load.image('zombie_idle', ASSETS.zombie.idle);
    
    // Generator images
    this.load.image('generator_room', ASSETS.maps.generatorRoom);
    this.load.image('generator_panel', ASSETS.maps.generatorPanel);
    
    // Level 3 map
    this.load.image('map_level3', ASSETS.maps.level3);
    
    // Chest object
    this.load.image('chest', ASSETS.objects.chest);
    
    // Videos will be loaded as DOM elements in scenes that need them
    // Phaser's video loader has limitations, so we handle videos manually
  }

  create(): void {
    // Small delay before transitioning
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}
