// Enemy/Zombie Class
class Enemy {
    constructor(x, y, type = 'zombie') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.health = 100;
        this.maxHealth = 100;
        this.state = 'idle'; // idle, attacking, dead
        this.attackRange = 80;
        this.attackDamage = 10;
        this.attackCooldown = 0;
        this.attackCooldownMax = 2; // seconds
        this.size = CONFIG.characterSize * 1.5; // Larger than player
        this.visible = true;

        // Animation state
        this.currentFrame = 0;
        this.frameTime = 0;
        this.frameDelay = 0.3; // seconds between frames

        // Zombie animations
        this.animations = {
            idle: null,  // Front view
            walk: null   // Walking animation
        };

        this.loadAnimations();
    }

    loadAnimations() {
        // Load idle (front view)
        const idleImg = new Image();
        idleImg.src = 'Zombie/Screenshot 2026-01-02 155724.png';
        this.animations.idle = idleImg;

        // Load walking animation
        const walkImg = new Image();
        walkImg.src = 'Zombie/Screenshot 2026-01-02 155800.png';
        this.animations.walk = walkImg;
    }

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

        // Attack if player is in range and cooldown is ready
        if (distance < this.attackRange && this.attackCooldown <= 0) {
            this.attack();
        }

        // Animation
        this.frameTime += deltaTime;
        if (this.frameTime > this.frameDelay) {
            this.frameTime = 0;
            this.currentFrame = (this.currentFrame + 1) % 2;
        }
    }

    attack() {
        this.state = 'attacking';
        this.attackCooldown = this.attackCooldownMax;

        // Deal damage to player
        gameState.playerHealth -= this.attackDamage;
        console.log(`🧟 Zombie attacks! Player health: ${gameState.playerHealth}`);

        if (gameState.playerHealth <= 0) {
            console.log('💀 Player defeated!');
            // Handle player death
        }

        // Reset to idle after attack
        setTimeout(() => {
            if (this.state !== 'dead') {
                this.state = 'idle';
            }
        }, 500);
    }

    takeDamage(amount) {
        this.health -= amount;
        console.log(`💥 Zombie takes ${amount} damage! Health: ${this.health}`);

        if (this.health <= 0) {
            this.state = 'dead';
            this.visible = false;
            console.log('💀 Zombie defeated!');
            gameState.inCombat = false;
            // Remove from enemies array
            const index = gameState.enemies.indexOf(this);
            if (index > -1) {
                gameState.enemies.splice(index, 1);
            }
        }
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw zombie sprite
        const currentAnim = this.currentFrame === 0 ? this.animations.idle : this.animations.walk;
        if (currentAnim && currentAnim.complete) {
            // Apply chroma key to remove white background
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = currentAnim.width;
            tempCanvas.height = currentAnim.height;

            tempCtx.drawImage(currentAnim, 0, 0);
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;

            // Remove white background
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                if (r > 240 && g > 240 && b > 240) {
                    data[i + 3] = 0; // Make transparent
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

        // Draw health bar
        const barWidth = 60;
        const barHeight = 6;
        const healthPercent = this.health / this.maxHealth;

        ctx.fillStyle = '#333';
        ctx.fillRect(-barWidth / 2, -this.size / 2 - 15, barWidth, barHeight);

        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : (healthPercent > 0.25 ? '#FFC107' : '#F44336');
        ctx.fillRect(-barWidth / 2, -this.size / 2 - 15, barWidth * healthPercent, barHeight);

        ctx.restore();
    }
}

