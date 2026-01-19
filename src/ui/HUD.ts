import Phaser from 'phaser';
import { getMapDrawMetrics } from '../systems/MovementSystem';
import { GameStateData } from '../managers/GameState';

/**
 * HUD - Heads-up display component showing player stats
 */
export class HUD extends Phaser.GameObjects.Container {
  private healthBar: Phaser.GameObjects.Graphics;
  private healthBarBg: Phaser.GameObjects.Graphics;
  private moneyText: Phaser.GameObjects.Text;
  private profileBg: Phaser.GameObjects.Graphics;
  private offsetX: number;
  
  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.cameras.main;
    const { offsetX } = getMapDrawMetrics(width, height);
    
    super(scene, 0, 0);
    scene.add.existing(this);
    
    this.offsetX = offsetX;
    
    // Profile icon background
    this.profileBg = scene.add.graphics();
    this.profileBg.fillStyle(0x111111, 1);
    this.profileBg.fillCircle(offsetX + 45, 45, 25);
    this.profileBg.lineStyle(2, 0xffffff, 1);
    this.profileBg.strokeCircle(offsetX + 45, 45, 25);
    this.add(this.profileBg);
    
    // Profile image (using texture from boot scene)
    if (scene.textures.exists('character_front_0')) {
      const profileIcon = scene.add.image(offsetX + 45, 45, 'character_front_0');
      profileIcon.setDisplaySize(40, 40);
      // Create circular mask using off-screen graphics
      const maskGraphics = new Phaser.GameObjects.Graphics(scene);
      maskGraphics.fillCircle(offsetX + 45, 45, 20);
      profileIcon.setMask(maskGraphics.createGeometryMask());
      this.add(profileIcon);
    }
    
    // Health bar background
    this.healthBarBg = scene.add.graphics();
    this.healthBarBg.fillStyle(0x333333, 1);
    this.healthBarBg.fillRect(offsetX + 80, 35, 120, 14);
    this.add(this.healthBarBg);
    
    // Health bar fill
    this.healthBar = scene.add.graphics();
    this.add(this.healthBar);
    
    // Money display
    this.moneyText = scene.add.text(offsetX + 80, 58, '💰 100', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffd700'
    });
    this.add(this.moneyText);
    
    // Set high depth so HUD is always on top
    this.setDepth(100);
  }
  
  /**
   * Update health bar display
   */
  updateHealth(health: number, maxHealth: number): void {
    this.healthBar.clear();
    const percent = health / maxHealth;
    const color = percent > 0.5 ? 0x4CAF50 : (percent > 0.25 ? 0xFFC107 : 0xF44336);
    this.healthBar.fillStyle(color, 1);
    this.healthBar.fillRect(this.offsetX + 80, 35, 120 * percent, 14);
  }
  
  /**
   * Update money display
   */
  updateMoney(money: number): void {
    this.moneyText.setText(`💰 ${money}`);
  }
  
  /**
   * Update all HUD elements from game state
   */
  updateFromState(state: GameStateData): void {
    this.updateHealth(state.playerHealth, state.playerMaxHealth);
    this.updateMoney(state.money);
  }
}
