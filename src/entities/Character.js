/**
 * Character - Player character with directional animations
 */

import { Entity } from './Entity.js';
import { CONFIG, ANIMATION, ASSETS } from '../config/GameConfig.js';
import { eventBus, Events } from '../core/EventBus.js';
import { removeWhiteBackground } from '../utils/ChromaKey.js';

export class Character extends Entity {
    constructor(x, y) {
        super(x, y);
        
        this.size = CONFIG.character.size;
        this.speed = CONFIG.character.speed;
        
        // Movement state
        this.targetX = x;
        this.targetY = y;
        this.moving = false;
        this.angle = 0;
        this.direction = 'front'; // 'left', 'front', 'right'
        
        // Animation state
        this.currentFrame = 0;
        this.frameTime = 0;
        this.frameDelay = ANIMATION.characterFrameDelay;
        
        // Animations storage
        this.animations = {
            front: [],
            left: null,
            right: null,
            punch: null
        };
        
        // Punch state
        this.isPunching = false;
        this.punchTime = 0;
        this.punchDuration = CONFIG.character.punchDuration;
        
        this.loadAnimations();
    }

    /**
     * Load all character animations
     */
    loadAnimations() {
        // Load front walking images (3 frames)
        ASSETS.character.front.forEach(src => {
            const img = new Image();
            img.src = src;
            this.animations.front.push(img);
        });

        // Load left walking video
        this.animations.left = document.createElement('video');
        this.animations.left.src = ASSETS.character.left;
        this.animations.left.loop = true;
        this.animations.left.muted = true;
        this.animations.left.playsInline = true;
        this.animations.left.load();

        // Load right walking video
        this.animations.right = document.createElement('video');
        this.animations.right.src = ASSETS.character.right;
        this.animations.right.loop = true;
        this.animations.right.muted = true;
        this.animations.right.playsInline = true;
        this.animations.right.load();

        // Load punch animation
        const punchImg = new Image();
        punchImg.src = ASSETS.character.punch;
        this.animations.punch = punchImg;
    }

    /**
     * Move character to target position
     * @param {number} x - Target X
     * @param {number} y - Target Y
     */
    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.moving = true;

        // Calculate angle for rotation
        const dx = x - this.x;
        const dy = y - this.y;
        this.angle = Math.atan2(dy, dx);

        // Determine direction based on horizontal movement
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > absDy) {
            // Moving more horizontally
            if (dx < 0) {
                this.direction = 'left';
                this.animations.left.currentTime = ANIMATION.videoStartOffset;
                this.animations.left.play().catch(() => {});
                this.animations.right.pause();
            } else {
                this.direction = 'right';
                this.animations.right.currentTime = ANIMATION.videoStartOffset;
                this.animations.right.play().catch(() => {});
                this.animations.left.pause();
            }
        } else {
            // Moving more vertically
            this.direction = 'front';
            this.animations.left.pause();
            this.animations.right.pause();
            this.currentFrame = 0;
        }
    }

    /**
     * Trigger punch attack
     * @param {string} targetDirection - Direction to face
     */
    punch(targetDirection) {
        if (this.isPunching) return;
        
        this.isPunching = true;
        this.punchTime = 0;
        
        if (targetDirection) {
            this.direction = targetDirection;
        }
        
        eventBus.emit(Events.PLAYER_ATTACKED, { 
            x: this.x, 
            y: this.y, 
            direction: this.direction 
        });
    }

    /**
     * Update character state
     * @param {number} deltaTime
     */
    update(deltaTime) {
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
                // Arrived at destination
                this.x = this.targetX;
                this.y = this.targetY;
                this.moving = false;

                // Stop all animations and reset to front
                this.animations.left.pause();
                this.animations.right.pause();
                this.direction = 'front';
                this.currentFrame = 0;

                eventBus.emit(Events.PLAYER_MOVED, { x: this.x, y: this.y, arrived: true });
            } else {
                // Move towards target
                const moveDistance = this.speed * deltaTime;
                const ratio = Math.min(moveDistance / distance, 1);

                this.x += dx * ratio;
                this.y += dy * ratio;

                // Update frame for front animation
                if (this.direction === 'front') {
                    this.frameTime += deltaTime;
                    if (this.frameTime >= this.frameDelay) {
                        this.frameTime = 0;
                        this.currentFrame = (this.currentFrame + 1) % this.animations.front.length;
                    }
                }
            }
        }
    }

    /**
     * Draw character
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.visible) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw punch animation
        if (this.isPunching && this.animations.punch) {
            const pWidth = this.size * 1.2;
            const pHeight = this.size * 1.2;

            ctx.save();
            if (this.direction === 'left') {
                ctx.scale(-1, 1);
            }
            this.drawWithChromaKey(ctx, this.animations.punch, -pWidth / 2, -pHeight / 2, pWidth, pHeight);
            ctx.restore();

        } else if (this.direction === 'front' && this.animations.front.length > 0) {
            const img = this.animations.front[this.currentFrame];
            if (img.complete) {
                const frontWidth = this.size * 0.5;
                const frontHeight = this.size * 0.8;
                this.drawWithChromaKey(ctx, img, -frontWidth / 2, -frontHeight / 2, frontWidth, frontHeight);
            }
        } else if (this.direction === 'left' && this.animations.left) {
            const leftWidth = this.size * 0.7;
            const leftHeight = this.size * 0.8;
            this.drawVideoCropped(ctx, this.animations.left, -leftWidth / 2, -leftHeight / 2, leftWidth, leftHeight, 0.2, 0);
        } else if (this.direction === 'right' && this.animations.right) {
            const rightWidth = this.size * 0.7;
            const rightHeight = this.size * 0.8;
            this.drawVideoCropped(ctx, this.animations.right, -rightWidth / 2, -rightHeight / 2, rightWidth, rightHeight, 0.2, 0);
        } else {
            // Fallback placeholder
            ctx.fillStyle = '#ffd93d';
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();

        // Draw path line when moving
        if (this.moving) {
            this.drawMovementPath(ctx);
        }
    }

    /**
     * Draw movement path indicator
     */
    drawMovementPath(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 217, 61, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.targetX, this.targetY);
        ctx.stroke();

        // Draw target indicator
        ctx.strokeStyle = '#ffd93d';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(this.targetX, this.targetY, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw image with white background removal
     */
    drawWithChromaKey(ctx, img, x, y, width, height) {
        if (!img.complete || img.width === 0) return;
        
        const processed = removeWhiteBackground(img);
        ctx.drawImage(processed, x, y, width, height);
    }

    /**
     * Draw video cropped with chroma key
     */
    drawVideoCropped(ctx, video, x, y, width, height, cropPercentX, cropPercentY = 0) {
        if (video.readyState < video.HAVE_CURRENT_DATA) return;

        const vw = video.videoWidth;
        const vh = video.videoHeight;

        // Calculate crop area
        const cropX = vw * cropPercentX;
        const cropY = vh * cropPercentY;
        const cropWidth = vw * (1 - cropPercentX * 2);
        const cropHeight = vh * (1 - cropPercentY * 2);

        // Create temp canvas for chroma key
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropWidth;
        tempCanvas.height = cropHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw cropped video frame
        tempCtx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        // Remove white background
        const imageData = tempCtx.getImageData(0, 0, cropWidth, cropHeight);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            if (r > 220 && g > 220 && b > 220) {
                data[i + 3] = 0;
            }
        }

        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, x, y, width, height);
    }

    /**
     * Get current status text
     */
    getStatus() {
        if (this.isPunching) return 'Attacking';
        if (this.moving) return `Moving ${this.direction}`;
        return 'Idle';
    }
}

export default Character;
