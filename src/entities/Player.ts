import Phaser from 'phaser';
import { CONFIG, ASSETS } from '../config/GameConfig';
import { processVideoFrame, removeWhiteBackground } from '../utils/ChromaKey';

type Direction = 'front' | 'left' | 'right';

/**
 * Player - Player character with directional animations
 */
export class Player {
  private scene: Phaser.Scene;
  public x: number;
  public y: number;
  public targetX: number;
  public targetY: number;
  public speed: number;
  public size: number;
  public moving: boolean;
  public direction: Direction;
  public visible: boolean;
  
  // Animation
  private frontFrames: HTMLImageElement[] = [];
  private leftVideo!: HTMLVideoElement;
  private rightVideo!: HTMLVideoElement;
  private punchImage!: HTMLImageElement;
  private currentFrame = 0;
  private frameTime = 0;
  private frameDelay = 0.15;
  
  // Punch state
  public isPunching = false;
  private punchTime = 0;
  private punchDuration = CONFIG.character.punchDuration;
  
  // Cached canvas for rendering
  private cachedCanvas: HTMLCanvasElement | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.speed = CONFIG.character.speed;
    this.size = CONFIG.character.size;
    this.moving = false;
    this.direction = 'front';
    this.visible = true;
    
    this.loadAnimations();
  }

  private loadAnimations(): void {
    // Load front walking frames
    ASSETS.character.front.forEach((path, index) => {
      const img = new Image();
      img.src = path;
      this.frontFrames.push(img);
    });
    
    // Load left walking video
    this.leftVideo = document.createElement('video');
    this.leftVideo.src = ASSETS.character.left;
    this.leftVideo.loop = true;
    this.leftVideo.muted = true;
    this.leftVideo.playsInline = true;
    this.leftVideo.style.display = 'none';
    document.body.appendChild(this.leftVideo);
    this.leftVideo.load();
    
    // Load right walking video
    this.rightVideo = document.createElement('video');
    this.rightVideo.src = ASSETS.character.right;
    this.rightVideo.loop = true;
    this.rightVideo.muted = true;
    this.rightVideo.playsInline = true;
    this.rightVideo.style.display = 'none';
    document.body.appendChild(this.rightVideo);
    this.rightVideo.load();
    
    // Load punch image
    this.punchImage = new Image();
    this.punchImage.src = ASSETS.character.punch;
  }

  moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    this.moving = true;
    
    const dx = x - this.x;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(y - this.y);
    
    if (absDx > absDy) {
      if (dx < 0) {
        this.direction = 'left';
        this.leftVideo.currentTime = 0.4;
        this.leftVideo.play().catch(() => {});
        this.rightVideo.pause();
      } else {
        this.direction = 'right';
        this.rightVideo.currentTime = 0.4;
        this.rightVideo.play().catch(() => {});
        this.leftVideo.pause();
      }
    } else {
      this.direction = 'front';
      this.leftVideo.pause();
      this.rightVideo.pause();
      this.currentFrame = 0;
    }
  }

  punch(targetDirection?: Direction): void {
    if (this.isPunching) return;
    this.isPunching = true;
    this.punchTime = 0;
    if (targetDirection) {
      this.direction = targetDirection;
    }
  }

  update(deltaTime: number): void {
    // Update punch timer
    if (this.isPunching) {
      this.punchTime += deltaTime;
      if (this.punchTime >= this.punchDuration) {
        this.isPunching = false;
        this.punchTime = 0;
      }
      this.moving = false;
    }
    
    if (this.moving && !this.isPunching) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 5) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.moving = false;
        this.leftVideo.pause();
        this.rightVideo.pause();
        this.direction = 'front';
        this.currentFrame = 0;
      } else {
        const moveDistance = this.speed * deltaTime;
        const ratio = Math.min(moveDistance / distance, 1);
        this.x += dx * ratio;
        this.y += dy * ratio;
        
        if (this.direction === 'front') {
          this.frameTime += deltaTime;
          if (this.frameTime >= this.frameDelay) {
            this.frameTime = 0;
            this.currentFrame = (this.currentFrame + 1) % this.frontFrames.length;
          }
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const drawWidth = this.size * 0.7;
    const drawHeight = this.size * 0.8;
    
    if (this.isPunching && this.punchImage.complete) {
      // Punch animation
      if (this.direction === 'left') {
        ctx.scale(-1, 1);
      }
      const processed = removeWhiteBackground(this.punchImage);
      ctx.drawImage(processed, -drawWidth / 2, -drawHeight / 2, drawWidth * 1.2, drawHeight * 1.2);
    } else if (this.direction === 'front' && this.frontFrames.length > 0) {
      const img = this.frontFrames[this.currentFrame];
      if (img.complete) {
        const processed = removeWhiteBackground(img);
        ctx.drawImage(processed, -drawWidth * 0.4, -drawHeight / 2, drawWidth * 0.8, drawHeight);
      }
    } else if (this.direction === 'left' && this.leftVideo.readyState >= 2) {
      const processed = processVideoFrame(this.leftVideo, 0.2, 0);
      ctx.drawImage(processed, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    } else if (this.direction === 'right' && this.rightVideo.readyState >= 2) {
      const processed = processVideoFrame(this.rightVideo, 0.2, 0);
      ctx.drawImage(processed, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    } else {
      // Fallback circle
      ctx.fillStyle = '#ffd93d';
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    ctx.restore();
    
    // Draw movement path
    if (this.moving) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 217, 61, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.targetX, this.targetY);
      ctx.stroke();
      
      ctx.strokeStyle = '#ffd93d';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(this.targetX, this.targetY, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  getStatus(): string {
    if (this.isPunching) return 'Attacking';
    if (this.moving) return `Moving ${this.direction}`;
    return 'Idle';
  }

  destroy(): void {
    if (this.leftVideo.parentNode) {
      this.leftVideo.parentNode.removeChild(this.leftVideo);
    }
    if (this.rightVideo.parentNode) {
      this.rightVideo.parentNode.removeChild(this.rightVideo);
    }
  }
}
