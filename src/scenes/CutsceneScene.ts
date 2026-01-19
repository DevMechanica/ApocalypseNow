import Phaser from 'phaser';
import { ASSETS } from '../config/GameConfig';

interface CutsceneConfig {
  src: string;
  subtitle: string;
  subtitleStart: number;
  subtitleEnd: number;
}

/**
 * CutsceneScene - Plays opening cutscene videos
 * Ported from opening-cutscene.html
 */
export class CutsceneScene extends Phaser.Scene {
  private videoElement!: HTMLVideoElement;
  private currentSceneIndex = 0;
  private subtitleText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private cutscenes: CutsceneConfig[] = [
    {
      src: ASSETS.cutscenes.intro[0],
      subtitle: 'A lone survivor enters the hatch...',
      subtitleStart: 0,
      subtitleEnd: 3
    },
    {
      src: ASSETS.cutscenes.intro[1],
      subtitle: 'The darkness reveals its secrets...',
      subtitleStart: 0,
      subtitleEnd: 3
    }
  ];

  constructor() {
    super({ key: 'CutsceneScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    
    this.cameras.main.fadeIn(500, 0, 0, 0);
    
    // Create video element
    this.createVideoElement();
    
    // Progress bar
    this.progressBar = this.add.graphics();
    
    // Subtitle text
    this.subtitleText = this.add.text(width / 2, height - 100, '', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setAlpha(0);
    this.subtitleText.setShadow(2, 2, '#000000', 4);
    
    // Skip button
    const skipBtn = this.add.text(width - 30, height - 30, 'Skip Intro →', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      padding: { x: 16, y: 8 }
    }).setOrigin(1).setInteractive({ useHandCursor: true });
    
    skipBtn.on('pointerover', () => skipBtn.setAlpha(1));
    skipBtn.on('pointerout', () => skipBtn.setAlpha(0.7));
    skipBtn.on('pointerup', () => this.endCutscenes());
    skipBtn.setAlpha(0.7);
    
    // Keyboard skip
    this.input.keyboard?.on('keydown-SPACE', () => this.endCutscenes());
    this.input.keyboard?.on('keydown-ESC', () => this.endCutscenes());
    
    // Start first cutscene
    this.loadCutscene(0);
  }

  private createVideoElement(): void {
    const { width, height } = this.cameras.main;
    
    this.videoElement = document.createElement('video');
    this.videoElement.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      max-width: 100%;
      max-height: 100%;
      z-index: 10;
    `;
    this.videoElement.playsInline = true;
    this.videoElement.muted = false;
    
    document.body.appendChild(this.videoElement);
    
    // Video events
    this.videoElement.addEventListener('ended', () => this.onVideoEnded());
    this.videoElement.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.videoElement.addEventListener('error', () => this.endCutscenes());
  }

  private loadCutscene(index: number): void {
    if (index >= this.cutscenes.length) {
      this.endCutscenes();
      return;
    }
    
    this.currentSceneIndex = index;
    const scene = this.cutscenes[index];
    
    this.videoElement.src = scene.src;
    this.videoElement.load();
    this.videoElement.play().catch(() => {
      // Autoplay blocked, user needs to interact
      console.log('Autoplay blocked, waiting for interaction...');
      this.input.once('pointerdown', () => {
        this.videoElement.play();
      });
    });
    
    this.subtitleText.setText(scene.subtitle);
  }

  private onTimeUpdate(): void {
    const scene = this.cutscenes[this.currentSceneIndex];
    const currentTime = this.videoElement.currentTime;
    const duration = this.videoElement.duration || 1;
    
    // Update subtitle visibility
    if (currentTime >= scene.subtitleStart && currentTime <= scene.subtitleEnd) {
      this.subtitleText.setAlpha(1);
    } else {
      this.subtitleText.setAlpha(0);
    }
    
    // Update progress bar
    const { width, height } = this.cameras.main;
    const totalProgress = (this.currentSceneIndex + currentTime / duration) / this.cutscenes.length;
    
    this.progressBar.clear();
    this.progressBar.fillStyle(0x333333, 0.5);
    this.progressBar.fillRect(0, height - 4, width, 4);
    
    const gradient = this.progressBar.createLinearGradient(0, 0, width * totalProgress, 0);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(1, '#ffd93d');
    
    this.progressBar.fillStyle(0xff6b6b, 1);
    this.progressBar.fillRect(0, height - 4, width * totalProgress, 4);
  }

  private onVideoEnded(): void {
    // Fade out and load next
    this.tweens.add({
      targets: this.videoElement,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.currentSceneIndex++;
        if (this.currentSceneIndex < this.cutscenes.length) {
          this.loadCutscene(this.currentSceneIndex);
          // Fade back in
          this.tweens.add({
            targets: this.videoElement,
            alpha: 1,
            duration: 500
          });
        } else {
          this.endCutscenes();
        }
      }
    });
  }

  private endCutscenes(): void {
    // Remove video element
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.pause();
      this.videoElement.parentNode.removeChild(this.videoElement);
    }
    
    // Fade to game scene
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene');
    });
  }

  shutdown(): void {
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
    }
  }
}
