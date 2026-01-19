import Phaser from 'phaser';
import { CONFIG, ASSETS } from '../config/GameConfig';
import { processVideoFrame, removeBackground } from '../utils/ChromaKey';
import { mapToScreenX, getMovementConstraints } from '../systems/MovementSystem';

type EnemyState = 'idle' | 'attacking' | 'dead';

/**
 * Enemy - Zombie enemy with roaming AI
 */
export class Enemy {
  private scene: Phaser.Scene;
  public x: number;
  public y: number;
  public health: number;
  public maxHealth: number;
  public state: EnemyState;
  public visible: boolean;
  public size: number;
  
  // Movement
  private speed = CONFIG.enemy.speed;
  private roamTarget: number | null = null;
  private isMoving = false;
  private direction: 'left' | 'right' = 'right';
  
  // Attack
  private attackRange = CONFIG.enemy.attackRange;
  private attackDamage = CONFIG.enemy.attackDamage;
  private attackCooldown = 0;
  private attackCooldownMax = CONFIG.enemy.attackCooldown;
  
  // Animation
  private idleImage!: HTMLImageElement;
  private walkVideo!: HTMLVideoElement;
  private cachedFrameCanvas: HTMLCanvasElement | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.health = CONFIG.enemy.health;
    this.maxHealth = CONFIG.enemy.health;
    this.state = 'idle';
    this.visible = true;
    this.size = CONFIG.character.size;
    
    this.loadAnimations();
  }

  private loadAnimations(): void {
    // Load idle image
    this.idleImage = new Image();
    this.idleImage.src = ASSETS.zombie.idle;
    
    // Load walk video
    this.walkVideo = document.createElement('video');
    this.walkVideo.src = ASSETS.zombie.walk;
    this.walkVideo.loop = true;
    this.walkVideo.muted = true;
    this.walkVideo.playsInline = true;
    this.walkVideo.style.display = 'none';
    document.body.appendChild(this.walkVideo);
    this.walkVideo.load();
    this.walkVideo.play().catch(() => {});
  }

  update(deltaTime: number, playerX: number, playerY: number): { attacked: boolean; damage: number } {
    if (this.state === 'dead') return { attacked: false, damage: 0 };
    
    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }
    
    // Calculate distance to player
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const verticalDist = Math.abs(dy);
    
    // Attack if close and on same Y level
    if (distance < this.attackRange && verticalDist < 30 && this.attackCooldown <= 0) {
      this.attack();
      this.isMoving = false;
      return { attacked: true, damage: this.attackDamage };
    }
    
    // Roam around
    const { width, height } = this.scene.cameras.main;
    const constraints = getMovementConstraints(true, 2, height);
    const minX = mapToScreenX(constraints.xMinMap, width, height);
    const maxX = mapToScreenX(constraints.xMaxMap, width, height);
    
    if (!this.roamTarget || Math.abs(this.x - this.roamTarget) < 5) {
      this.pickNewRoamTarget(minX, maxX);
    }
    
    this.isMoving = true;
    if (this.x < this.roamTarget!) {
      this.x += this.speed * deltaTime;
      this.direction = 'right';
    } else {
      this.x -= this.speed * deltaTime;
      this.direction = 'left';
    }
    
    return { attacked: false, damage: 0 };
  }

  private pickNewRoamTarget(minX: number, maxX: number): void {
    let newTarget = minX + Math.random() * (maxX - minX);
    while (Math.abs(newTarget - this.x) < 20) {
      newTarget = minX + Math.random() * (maxX - minX);
    }
    this.roamTarget = newTarget;
  }

  private attack(): void {
    this.state = 'attacking';
    this.attackCooldown = this.attackCooldownMax;
    
    setTimeout(() => {
      if (this.state !== 'dead') {
        this.state = 'idle';
      }
    }, 500);
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    
    if (this.health <= 0) {
      this.state = 'dead';
      this.visible = false;
      return true; // Dead
    }
    return false; // Still alive
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Flip for direction
    if (this.direction === 'right' && this.isMoving) {
      ctx.scale(-1, 1);
    } else if (this.direction === 'left' && !this.isMoving) {
      ctx.scale(-1, 1);
    }
    
    let drawn = false;
    
    if (this.state === 'attacking' || !this.isMoving) {
      // Use idle image
      if (this.idleImage.complete && this.idleImage.width > 0) {
        const processed = removeBackground(this.idleImage);
        ctx.drawImage(processed, -this.size / 2, -this.size / 2, this.size, this.size);
        drawn = true;
      }
    } else if (this.walkVideo.readyState >= 2) {
      // Use walk video
      const processed = processVideoFrame(this.walkVideo, 0.3, 0);
      ctx.drawImage(processed, -this.size / 2, -this.size / 2, this.size, this.size);
      this.cachedFrameCanvas = processed;
      drawn = true;
    } else if (this.cachedFrameCanvas) {
      // Use cached frame during video loop
      ctx.drawImage(this.cachedFrameCanvas, -this.size / 2, -this.size / 2, this.size, this.size);
      drawn = true;
    }
    
    if (!drawn) {
      // Fallback emoji
      ctx.font = `${this.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧟', 0, 0);
    }
    
    ctx.restore();
    
    // Draw health bar (not transformed)
    const barWidth = 60;
    const barHeight = 6;
    const healthPercent = this.health / this.maxHealth;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    ctx.fillStyle = '#333';
    ctx.fillRect(-barWidth / 2, -this.size / 2 - 15, barWidth, barHeight);
    
    ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : (healthPercent > 0.25 ? '#FFC107' : '#F44336');
    ctx.fillRect(-barWidth / 2, -this.size / 2 - 15, barWidth * healthPercent, barHeight);
    
    ctx.restore();
  }

  destroy(): void {
    if (this.walkVideo.parentNode) {
      this.walkVideo.parentNode.removeChild(this.walkVideo);
    }
  }
}
