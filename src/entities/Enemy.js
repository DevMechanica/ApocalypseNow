/**
 * Enemy - Zombie enemy with roaming AI and attack behavior
 */

import { Entity } from './Entity.js';
import { CONFIG, ANIMATION, ASSETS } from '../config/GameConfig.js';
import { eventBus, Events } from '../core/EventBus.js';

export class Enemy extends Entity {
    constructor(x, y, type = 'zombie') {
        super(x, y);
        
        this.type = type;
        this.size = CONFIG.enemy.size;
        
        // Health
        this.health = 100;
        this.maxHealth = 100;
        
        // State
        this.state = 'idle'; // idle, attacking, dead
        this.isMoving = false;
        this.direction = 'right';
        
        // Attack
        this.attackRange = CONFIG.enemy.attackRange;
        this.attackDamage = CONFIG.enemy.attackDamage;
        this.attackCooldown = 0;
        this.attackCooldownMax = CONFIG.enemy.attackCooldown;
        
        // Roaming
        this.roamTarget = null;
        this.roamSpeed = CONFIG.enemy.roamSpeed;
        
        // Animation
        this.currentFrame = 0;
        this.frameTime = 0;
        this.frameDelay = ANIMATION.enemyFrameDelay;
        
        // Animations storage
        this.animations = {
            idle: null,
            walkLeft: null,
            walkRight: null
        };
        
        this.loadAnimations();
    }

    /**
     * Load enemy animations
     */
    loadAnimations() {
        // Load idle image
        const idleImg = new Image();
        idleImg.src = ASSETS.zombie.idle;
        this.animations.idle = idleImg;

        // Setup video helper
        const setupVideo = (src) => {
            const vid = document.createElement('video');
            vid.src = src;
            vid.loop = true;
            vid.muted = true;
            vid.playsInline = true;
            vid.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;pointer-events:none;';
            document.body.appendChild(vid);
            vid.load();
            vid.play().catch(() => {});
            return vid;
        };

        // Load walking videos (use same video, flip for right)
        this.animations.walkLeft = setupVideo(ASSETS.zombie.walkLeft);
        this.animations.walkRight = setupVideo(ASSETS.zombie.walkLeft);
    }

    /**
     * Update enemy state
     * @param {number} deltaTime
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     */
    update(deltaTime, playerX, playerY) {
        if (this.state === 'dead') return;

        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // Calculate distance to player
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const verticalDist = Math.abs(dy);

        // Attack if player is in range and on same Y level
        if (distance < this.attackRange && verticalDist < 30 && this.attackCooldown <= 0) {
            this.attack();
            this.isMoving = false;
        } else {
            // Roam around
            this.roam(deltaTime);
        }

        // Animation update
        this.frameTime += deltaTime;
        if (this.frameTime > this.frameDelay) {
            this.frameTime = 0;
            this.currentFrame = (this.currentFrame + 1) % 4;
        }
    }

    /**
     * Roaming behavior
     */
    roam(deltaTime) {
        // Pick new roam target if needed
        if (!this.roamTarget) {
            this.pickNewRoamTarget();
        }

        // Check if reached target
        if (Math.abs(this.x - this.roamTarget) < 5) {
            this.pickNewRoamTarget();
        }

        // Move toward roam target
        this.isMoving = true;

        if (this.x < this.roamTarget) {
            this.x += this.roamSpeed * deltaTime;
            this.direction = 'right';
        } else {
            this.x -= this.roamSpeed * deltaTime;
            this.direction = 'left';
        }
    }

    /**
     * Pick a new roaming target position
     */
    pickNewRoamTarget() {
        // Get constraints from game (will be injected)
        const minX = this.minX || this.x - 100;
        const maxX = this.maxX || this.x + 100;
        
        let newTarget = minX + Math.random() * (maxX - minX);
        while (Math.abs(newTarget - this.x) < 20) {
            newTarget = minX + Math.random() * (maxX - minX);
        }
        this.roamTarget = newTarget;
    }

    /**
     * Set movement constraints
     */
    setConstraints(minX, maxX) {
        this.minX = minX;
        this.maxX = maxX;
    }

    /**
     * Attack the player
     */
    attack() {
        this.state = 'attacking';
        this.attackCooldown = this.attackCooldownMax;

        // Emit damage event
        eventBus.emit(Events.ENEMY_ATTACKED, { 
            damage: this.attackDamage,
            enemy: this
        });

        // Reset to idle after attack
        setTimeout(() => {
            if (this.state !== 'dead') {
                this.state = 'idle';
            }
        }, 500);
    }

    /**
     * Take damage
     * @param {number} amount
     */
    takeDamage(amount) {
        this.health -= amount;
        
        eventBus.emit(Events.ENEMY_DAMAGED, {
            enemy: this,
            damage: amount,
            health: this.health
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    /**
     * Handle death
     */
    die() {
        this.state = 'dead';
        this.visible = false;
        this.active = false;
        
        eventBus.emit(Events.ENEMY_DIED, { enemy: this });
    }

    /**
     * Draw enemy
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.visible) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Select animation source
        let source = null;
        let isVideo = false;

        if (this.state === 'attacking' || !this.isMoving) {
            source = this.animations.idle;
            if (this.direction === 'left') {
                ctx.scale(-1, 1);
            }
        } else {
            if (this.direction === 'left') {
                source = this.animations.walkLeft;
                isVideo = true;
            } else {
                source = this.animations.walkRight;
                isVideo = true;
                ctx.scale(-1, 1);
            }
        }

        // Draw the sprite
        this.drawSprite(ctx, source, isVideo);

        // Draw health bar
        this.drawHealthBar(ctx);

        ctx.restore();
    }

    /**
     * Draw sprite with chroma key
     */
    drawSprite(ctx, source, isVideo) {
        let width = 0;
        let height = 0;
        let ready = false;

        if (isVideo && source) {
            width = source.videoWidth;
            height = source.videoHeight;
            ready = source.readyState >= 2;
        } else if (source) {
            width = source.width;
            height = source.height;
            ready = source.complete && source.width > 0;
        }

        if (source && ready && width > 0) {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            if (isVideo) {
                // Crop to remove pillars
                const cropX = width * 0.25;
                const cropWidth = width * 0.5;
                tempCanvas.width = cropWidth;
                tempCanvas.height = height;
                tempCtx.drawImage(source, cropX, 0, cropWidth, height, 0, 0, cropWidth, height);
            } else {
                tempCanvas.width = width;
                tempCanvas.height = height;
                tempCtx.drawImage(source, 0, 0, width, height);
            }

            // Remove white background
            const activeWidth = tempCanvas.width;
            const activeHeight = tempCanvas.height;
            const imageData = tempCtx.getImageData(0, 0, activeWidth, activeHeight);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                if (r > 240 && g > 240 && b > 240) {
                    data[i + 3] = 0;
                }
            }

            tempCtx.putImageData(imageData, 0, 0);
            ctx.drawImage(tempCanvas, -this.size / 2, -this.size / 2, this.size, this.size);
        } else {
            // Fallback emoji
            ctx.font = `${this.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🧟', 0, 0);
        }
    }

    /**
     * Draw health bar above enemy
     */
    drawHealthBar(ctx) {
        const barWidth = 60;
        const barHeight = 6;
        const healthPercent = this.health / this.maxHealth;

        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(-barWidth / 2, -this.size / 2 - 15, barWidth, barHeight);

        // Health fill
        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : (healthPercent > 0.25 ? '#FFC107' : '#F44336');
        ctx.fillRect(-barWidth / 2, -this.size / 2 - 15, barWidth * healthPercent, barHeight);
    }
}

export default Enemy;
