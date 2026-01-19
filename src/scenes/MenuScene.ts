import Phaser from 'phaser';

/**
 * MenuScene - Main menu with animated background
 * Ported from original index.html
 */
export class MenuScene extends Phaser.Scene {
  private particles: Phaser.GameObjects.Graphics[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private flickerTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    
    // Background gradient (dark)
    this.cameras.main.setBackgroundColor('#0a0a0a');
    
    // Create floating particles
    this.createParticles();
    
    // Zombie silhouettes
    this.add.text(50, height - 150, '🧟', {
      fontSize: '150px'
    }).setAlpha(0.1);
    
    this.add.text(width - 200, height - 150, '🧟', {
      fontSize: '150px'
    }).setAlpha(0.1).setFlipX(true);
    
    // Title with flicker effect
    this.titleText = this.add.text(width / 2, height * 0.25, 'APOCALYPSE NOW', {
      fontFamily: 'Georgia, serif',
      fontSize: '64px',
      color: '#ff4444',
      stroke: '#1a1a1a',
      strokeThickness: 4
    }).setOrigin(0.5);
    
    // Add glow effect via shadow
    this.titleText.setShadow(0, 0, '#ff4444', 20, true, true);
    
    // Flicker animation
    this.flickerTimer = this.time.addEvent({
      delay: 3000,
      callback: this.flicker,
      callbackScope: this,
      loop: true
    });
    
    // Subtitle
    this.add.text(width / 2, height * 0.35, 'SURVIVE THE BUNKER', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#888888',
      letterSpacing: 8
    }).setOrigin(0.5);
    
    // Menu buttons
    const buttonY = height * 0.5;
    const buttonSpacing = 70;
    
    this.createButton(width / 2, buttonY, '▶ START GAME', () => this.startGame(), true);
    this.createButton(width / 2, buttonY + buttonSpacing, '🎮 CONTROLS', () => this.showControls());
    this.createButton(width / 2, buttonY + buttonSpacing * 2, '📜 CREDITS', () => this.showCredits());
    
    // Version
    this.add.text(width - 60, height - 30, 'v1.0.0', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#444444'
    }).setOrigin(0.5);
  }

  private createParticles(): void {
    const { width, height } = this.cameras.main;
    
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(2, 6);
      
      const particle = this.add.graphics();
      const colors = [0xff6464, 0xff9632, 0xffc832];
      const color = Phaser.Math.RND.pick(colors);
      
      particle.fillStyle(color, 0.3);
      particle.fillCircle(0, 0, size);
      particle.setPosition(x, y);
      
      // Animate particle
      this.tweens.add({
        targets: particle,
        y: -100,
        duration: Phaser.Math.Between(10000, 20000),
        ease: 'Linear',
        repeat: -1,
        onRepeat: () => {
          particle.setPosition(Phaser.Math.Between(0, width), height + 50);
        }
      });
      
      this.particles.push(particle);
    }
  }

  private flicker(): void {
    // Quick flicker sequence
    this.tweens.add({
      targets: this.titleText,
      alpha: 0.8,
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.titleText.setAlpha(1);
      }
    });
  }

  private createButton(x: number, y: number, text: string, callback: () => void, primary = false): void {
    const button = this.add.container(x, y);
    
    // Button background
    const bg = this.add.graphics();
    const bgColor = primary ? 0xff4444 : 0x333333;
    bg.fillStyle(bgColor, 0.3);
    bg.fillRoundedRect(-140, -25, 280, 50, 8);
    bg.lineStyle(2, primary ? 0xff4444 : 0x555555, 0.8);
    bg.strokeRoundedRect(-140, -25, 280, 50, 8);
    
    // Button text
    const buttonText = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    button.add([bg, buttonText]);
    button.setSize(280, 50);
    button.setInteractive({ useHandCursor: true });
    
    // Hover effects
    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(primary ? 0xff4444 : 0x444444, 0.5);
      bg.fillRoundedRect(-140, -25, 280, 50, 8);
      bg.lineStyle(2, 0xff4444, 1);
      bg.strokeRoundedRect(-140, -25, 280, 50, 8);
      button.setScale(1.05);
    });
    
    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(primary ? 0xff4444 : 0x333333, 0.3);
      bg.fillRoundedRect(-140, -25, 280, 50, 8);
      bg.lineStyle(2, primary ? 0xff4444 : 0x555555, 0.8);
      bg.strokeRoundedRect(-140, -25, 280, 50, 8);
      button.setScale(1);
    });
    
    button.on('pointerdown', () => {
      button.setScale(0.98);
    });
    
    button.on('pointerup', () => {
      button.setScale(1);
      callback();
    });
  }

  private startGame(): void {
    // Fade out and go to cutscene
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('CutsceneScene');
    });
  }

  private showControls(): void {
    // Show controls popup (using Phaser's native alert would require DOM)
    // For now, create a simple overlay
    this.showPopup(
      '🎮 CONTROLS',
      '• Click anywhere to move\n• Click on objects to interact\n• Press D to toggle debug mode\n• Click enemies (when close) to attack'
    );
  }

  private showCredits(): void {
    this.showPopup(
      '📜 CREDITS',
      'Apocalypse Now\nA Survival Horror Game\n\nDeveloped with ❤️'
    );
  }

  private showPopup(title: string, content: string): void {
    const { width, height } = this.cameras.main;
    
    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, width, height);
    
    // Popup background
    const popup = this.add.graphics();
    popup.fillStyle(0x1a1a1a, 1);
    popup.fillRoundedRect(width / 2 - 200, height / 2 - 150, 400, 300, 16);
    popup.lineStyle(2, 0xff4444, 0.5);
    popup.strokeRoundedRect(width / 2 - 200, height / 2 - 150, 400, 300, 16);
    
    // Title
    const titleText = this.add.text(width / 2, height / 2 - 100, title, {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffd93d'
    }).setOrigin(0.5);
    
    // Content
    const contentText = this.add.text(width / 2, height / 2, content, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5);
    
    // Close button
    const closeBtn = this.add.text(width / 2, height / 2 + 100, '[ CLOSE ]', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#888888'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#888888'));
    closeBtn.on('pointerup', () => {
      overlay.destroy();
      popup.destroy();
      titleText.destroy();
      contentText.destroy();
      closeBtn.destroy();
    });
  }

  shutdown(): void {
    if (this.flickerTimer) {
      this.flickerTimer.destroy();
    }
  }
}
