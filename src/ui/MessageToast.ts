import Phaser from 'phaser';

/**
 * MessageToast - Toast notification for game messages
 */
export class MessageToast extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  
  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.cameras.main;
    
    super(scene, width / 2, height * 0.8);
    scene.add.existing(this);
    
    // Background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x000000, 0.9);
    this.bg.fillRoundedRect(-200, -30, 400, 60, 16);
    this.bg.lineStyle(2, 0xffd93d, 0.5);
    this.bg.strokeRoundedRect(-200, -30, 400, 60, 16);
    this.add(this.bg);
    
    // Text
    this.text = scene.add.text(0, 0, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.add(this.text);
    
    // Hidden by default
    this.setVisible(false);
    this.setAlpha(0);
    
    // Very high depth
    this.setDepth(200);
  }
  
  /**
   * Show a message with fade in/out animation
   */
  show(message: string, duration: number = 3000): void {
    this.text.setText(message);
    this.setVisible(true);
    
    // Fade in
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        // Hold then fade out
        this.scene.time.delayedCall(duration, () => {
          this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 300,
            onComplete: () => this.setVisible(false)
          });
        });
      }
    });
  }
}
