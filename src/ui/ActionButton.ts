import Phaser from 'phaser';

/**
 * ActionButton - Interactive action button for zone interactions
 */
export class ActionButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private icon: Phaser.GameObjects.Text;
  private label: Phaser.GameObjects.Text;
  private onAction: () => void;
  
  constructor(scene: Phaser.Scene, onAction: () => void) {
    const { width, height } = scene.cameras.main;
    
    super(scene, width - 100, height - 60);
    scene.add.existing(this);
    
    this.onAction = onAction;
    
    // Background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x000000, 0.85);
    this.bg.fillRoundedRect(-100, -25, 200, 50, 16);
    this.bg.lineStyle(2, 0xffd93d, 0.5);
    this.bg.strokeRoundedRect(-100, -25, 200, 50, 16);
    this.add(this.bg);
    
    // Icon
    this.icon = scene.add.text(-80, 0, '🛏️', { fontSize: '24px' }).setOrigin(0, 0.5);
    this.add(this.icon);
    
    // Label
    this.label = scene.add.text(-40, 0, 'Action', { 
      fontFamily: 'Arial', 
      fontSize: '16px', 
      color: '#ffffff' 
    }).setOrigin(0, 0.5);
    this.add(this.label);
    
    // Make interactive
    this.setSize(200, 50);
    this.setInteractive({ useHandCursor: true });
    
    // Stop event propagation on both pointerdown and pointerup
    this.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    
    this.on('pointerup', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.onAction();
    });
    
    // Hidden by default
    this.setVisible(false);
    
    // High depth so it's above gameplay elements
    this.setDepth(100);
  }
  
  /**
   * Update the button display for a zone
   */
  setZone(zoneIcon: string, actionLabel: string): void {
    this.icon.setText(zoneIcon);
    this.label.setText(actionLabel);
  }
  
  /**
   * Show the button
   */
  show(): void {
    this.setVisible(true);
  }
  
  /**
   * Hide the button
   */
  hide(): void {
    this.setVisible(false);
  }
}
