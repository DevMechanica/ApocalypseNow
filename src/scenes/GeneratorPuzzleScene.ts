import Phaser from 'phaser';
import { ASSETS } from '../config/GameConfig';
import { gameState } from '../managers/GameState';

/**
 * GeneratorPuzzleScene - Lever puzzle overlay scene
 */
export class GeneratorPuzzleScene extends Phaser.Scene {
  private leverStates: boolean[] = [false, false, false, false, false];
  private leverImages: Phaser.GameObjects.Container[] = [];
  private feedbackText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GeneratorPuzzleScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    
    // Darken background
    this.add.graphics()
      .fillStyle(0x000000, 0.9)
      .fillRect(0, 0, width, height);
    
    // Puzzle container (9:16 aspect ratio centered)
    const puzzleWidth = Math.min(width * 0.9, height * 0.5625);
    const puzzleHeight = puzzleWidth / 0.5625;
    const puzzleX = (width - puzzleWidth) / 2;
    const puzzleY = (height - puzzleHeight) / 2;
    
    // Background panel
    this.add.graphics()
      .fillStyle(0x2a2520, 1)
      .fillRoundedRect(puzzleX, puzzleY, puzzleWidth, puzzleHeight, 16);
    
    this.add.graphics()
      .lineStyle(3, 0x8c7b64, 1)
      .strokeRoundedRect(puzzleX, puzzleY, puzzleWidth, puzzleHeight, 16);
    
    // Title
    this.add.text(width / 2, puzzleY + 40, '⚡ CIRCUIT BREAKER PANEL', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Instructions
    this.add.text(width / 2, puzzleY + 80, 'Flip all levers UP to restore power', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
    
    // Create 5 levers
    const leverY = puzzleY + puzzleHeight * 0.45;
    const leverSpacing = puzzleWidth / 6;
    
    for (let i = 0; i < 5; i++) {
      const leverX = puzzleX + leverSpacing * (i + 1);
      this.createLever(leverX, leverY, i);
    }
    
    // Hint text
    this.add.text(width / 2, puzzleY + puzzleHeight * 0.75, 
      '💡 Hint: Each lever (except the first) also toggles the previous one', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666',
      align: 'center',
      wordWrap: { width: puzzleWidth * 0.8 }
    }).setOrigin(0.5);
    
    // Feedback text (for success)
    this.feedbackText = this.add.text(width / 2, puzzleY + puzzleHeight * 0.55, '', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#44ff44',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);
    
    // Close button
    const closeBtn = this.add.text(width / 2, puzzleY + puzzleHeight - 40, '← BACK', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaaaa',
      backgroundColor: '#333333',
      padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#aaaaaa'));
    closeBtn.on('pointerup', () => this.closePuzzle());
    
    // Keyboard close
    this.input.keyboard?.on('keydown-ESC', () => this.closePuzzle());
  }

  private createLever(x: number, y: number, index: number): void {
    const container = this.add.container(x, y);
    
    // Lever base
    const base = this.add.graphics();
    base.fillStyle(0x444444, 1);
    base.fillRoundedRect(-20, 20, 40, 30, 5);
    base.fillStyle(0x333333, 1);
    base.fillCircle(0, 10, 25);
    
    // Lever handle (will rotate)
    const handle = this.add.graphics();
    handle.fillStyle(0x888888, 1);
    handle.fillRoundedRect(-8, -60, 16, 70, 4);
    handle.fillStyle(0xff4444, 1);
    handle.fillCircle(0, -60, 12);
    
    // Lever number
    const label = this.add.text(0, 70, `${index + 1}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#888888'
    }).setOrigin(0.5);
    
    // State indicator
    const indicator = this.add.text(0, -90, 'DOWN', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ff4444'
    }).setOrigin(0.5);
    
    container.add([base, handle, label, indicator]);
    container.setSize(80, 180);
    container.setInteractive({ useHandCursor: true });
    
    container.on('pointerup', () => {
      this.toggleLever(index);
    });
    
    this.leverImages.push(container);
    
    // Store references for animation
    container.setData('handle', handle);
    container.setData('indicator', indicator);
  }

  private toggleLever(index: number): void {
    // Toggle clicked lever
    this.leverStates[index] = !this.leverStates[index];
    this.animateLever(index);
    
    // Chain effect: also toggle previous lever (except for first)
    if (index > 0) {
      this.leverStates[index - 1] = !this.leverStates[index - 1];
      this.animateLever(index - 1);
    }
    
    // Check solution
    this.time.delayedCall(300, () => {
      if (this.checkSolution()) {
        this.solvePuzzle();
      }
    });
  }

  private animateLever(index: number): void {
    const container = this.leverImages[index];
    const handle = container.getData('handle') as Phaser.GameObjects.Graphics;
    const indicator = container.getData('indicator') as Phaser.GameObjects.Text;
    const isUp = this.leverStates[index];
    
    // Animate handle rotation
    this.tweens.add({
      targets: handle,
      angle: isUp ? -45 : 0,
      duration: 200,
      ease: 'Power2'
    });
    
    // Update indicator
    indicator.setText(isUp ? 'UP' : 'DOWN');
    indicator.setColor(isUp ? '#44ff44' : '#ff4444');
  }

  private checkSolution(): boolean {
    return this.leverStates.every(state => state === true);
  }

  private solvePuzzle(): void {
    // Show success feedback
    this.feedbackText.setText('✅ POWER RESTORED!');
    
    this.tweens.add({
      targets: this.feedbackText,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        // Update game state
        const state = gameState.get();
        state.generatorFixed = true;
        state.currentLevel = 2;
        state.generatorPuzzleActive = false;
        
        // Load the lit level 2 map (for floor 2 overlay only)
        const level2Img = new Image();
        level2Img.src = ASSETS.maps.level2;
        level2Img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = level2Img.width;
          canvas.height = level2Img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(level2Img, 0, 0);
          state.floor2LitCanvas = canvas;  // Store as floor 2 overlay, not full map
          
          // Close after delay
          this.time.delayedCall(1000, () => {
            this.closePuzzle();
          });
        };
        
        // Fallback if image fails to load
        level2Img.onerror = () => {
          console.error('Failed to load level 2 map');
          this.time.delayedCall(1000, () => {
            this.closePuzzle();
          });
        };
      }
    });
  }

  private closePuzzle(): void {
    this.scene.resume('GameScene');
    this.scene.stop();
  }
}
