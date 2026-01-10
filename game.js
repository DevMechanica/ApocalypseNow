// Game Configuration
const CONFIG = {
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,
    characterSpeed: 200, // pixels per second
    characterSize: 48, // Reduced size for better visibility
    fps: 60,
    mapZoom: 0.6, // 0.6 = zoom out to show more map (lower = more zoomed out)
    showWalkableAreas: false // Toggle with 'D' key for debug
};

// Walkable Areas Configuration
// Define walkable floor areas as polygons (array of {x, y} points)
// Add your floor boundaries here - each area is a polygon defined by corner points
const WALKABLE_AREAS = [
    // Example: Main floor area (covers most of the screen)
    // REPLACE THESE WITH YOUR ACTUAL FLOOR COORDINATES
    {
        name: 'Main Floor',
        points: [
            { x: 100, y: 100 },
            { x: window.innerWidth - 100, y: 100 },
            { x: window.innerWidth - 100, y: window.innerHeight - 100 },
            { x: 100, y: window.innerHeight - 100 }
        ]
    }
    // Add more floor areas here as needed:
    // {
    //     name: 'Upper Platform',
    //     points: [
    //         { x: 200, y: 50 },
    //         { x: 400, y: 50 },
    //         { x: 400, y: 150 },
    //         { x: 200, y: 150 }
    //     ]
    // }
];

// Canvas Setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.canvasWidth;
canvas.height = CONFIG.canvasHeight;

// UI Elements
const posDisplay = document.getElementById('pos-display');
const statusDisplay = document.getElementById('status-display');
const clickIndicator = document.getElementById('click-indicator');
const actionButton = document.getElementById('action-button');

// Game State
const gameState = {
    keyFound: false,
    searchedObjects: new Set(),
    currentLevel: 1,
    generatorRoomUnlocked: false,
    generatorFixed: false,
    isClimbing: false,
    onSecondFloor: false,
    climbTargetX: null, // Store where to walk after climbing
    // Combat system
    playerHealth: 100,
    playerMaxHealth: 100,
    inCombat: false,
    enemies: []
};

// =============================================================
// MAP COORDINATE SYSTEM
// User's coordinates are based on the MAP IMAGE, range 304-427
// =============================================================
const MAP_X_MIN = 304; // Left edge of map in user's coordinate system
const MAP_X_MAX = 427; // Right edge of map in user's coordinate system

// Get the screen position where the map is drawn (must match drawMap logic!)
function getMapDrawMetrics() {
    const mapAspect = 9 / 16;
    const drawHeight = canvas.height;
    const drawWidth = drawHeight * mapAspect;
    const offsetX = (canvas.width - drawWidth) / 2; // Centered
    return { drawWidth, offsetX };
}

// Convert MAP coordinate (304-427) to SCREEN pixel X
function mapToScreenX(mapX) {
    const { drawWidth, offsetX } = getMapDrawMetrics();
    const mapRange = MAP_X_MAX - MAP_X_MIN; // 123
    const percent = (mapX - MAP_X_MIN) / mapRange; // 0.0 to 1.0
    return offsetX + percent * drawWidth;
}

// Convert SCREEN pixel X to MAP coordinate (304-427) - for debug display
function screenToMapX(screenX) {
    const { drawWidth, offsetX } = getMapDrawMetrics();
    const mapRange = MAP_X_MAX - MAP_X_MIN;
    const percent = (screenX - offsetX) / drawWidth;
    return MAP_X_MIN + percent * mapRange;
}

// Interactive Zones Configuration (using MAP coordinates 344-384)
const INTERACTIVE_ZONES_CONFIG = [
    {
        name: 'door',
        xMinMap: 358,
        xMaxMap: 360, // Door at 358-360
        icon: '🚪',
        action: 'Unlock Door',
        type: 'door',
        floor: 1, // Only on first floor
        lockedMessage: '🔒 The door is locked. You need a key...',
        unlockMessage: '🔓 You unlocked the door! The room is revealed...'
    },
    {
        name: 'lantern',
        xMinMap: 350,
        xMaxMap: 352, // Lantern at 350-352
        icon: '🏮',
        action: 'Search Lantern',
        type: 'searchable',
        floor: 1, // Only on first floor
        searchMessage: 'An old oil lantern. It flickers warmly but nothing useful here...'
    },
    {
        name: 'bed',
        xMinMap: 362,
        xMaxMap: 376, // Bed at 362-376
        icon: '🛏️',
        action: 'Go to Sleep',
        type: 'action',
        floor: 1 // Only on first floor
    },
    {
        name: 'shelf',
        xMinMap: 380,
        xMaxMap: 384, // Shelf at right boundary (384)
        icon: '📦',
        action: 'Search Shelf',
        type: 'searchable',
        floor: 1, // Only on first floor
        searchMessage: '🔑 You found a rusty key hidden behind old books!',
        hasKey: true
    },
    {
        name: 'generator',
        xMinMap: 344,
        xMaxMap: 348, // Generator at 344-348
        icon: '⚡',
        action: 'Fix Generator',
        type: 'generator',
        floor: 1, // Only on first floor
        requiresUnlock: true,
        brokenMessage: '⚙️ The generator is broken. You need to fix it to restore power!',
        fixedMessage: '💡 Generator is working! Level 2 unlocked!'
    }
];

// Movement constraints (using MAP coordinates)
function getMovementConstraints() {
    // Locked: can only go left to 358 (door); Unlocked: can go to 344 (left edge of usable area)
    const leftLimit = gameState.generatorRoomUnlocked ? 344 : 358;
    const rightLimit = 384;

    // Different Y position for Level 2 (second floor)
    const yPos = gameState.currentLevel === 2 ? 0.563 : 0.57;

    return {
        yPercent: yPos,
        xMinMap: leftLimit,
        xMaxMap: rightLimit
    };
}

// Get interactive zones with current screen dimensions
function getInteractiveZones() {
    // Filter zones based on current floor
    const currentFloor = gameState.onSecondFloor ? 2 : 1;

    return INTERACTIVE_ZONES_CONFIG
        .filter(zone => zone.floor === currentFloor)
        .map(zone => ({
            ...zone,
            xMin: mapToScreenX(zone.xMinMap),
            xMax: mapToScreenX(zone.xMaxMap)
        }));
}

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
        this.size = CONFIG.characterSize; // Same size as player
        this.visible = true;

        // Animation state
        this.currentFrame = 0;
        this.frameTime = 0;
        this.frameDelay = 0.3; // seconds between frames

        // Zombie animations
        this.animations = {
            idle: null,
            walkRight: null, // Video
            walkLeft: null   // Video
        };

        this.direction = 'right'; // Track facing direction

        this.loadAnimations();
    }

    loadAnimations() {
        // Load idle (front view)
        const idleImg = new Image();
        idleImg.src = 'Zombie/zombie_idle.png';
        this.animations.idle = idleImg;

        // Load walking left video
        // Helper to setup video
        const setupVideo = (src) => {
            const vid = document.createElement('video');
            vid.src = src;
            vid.loop = true;
            vid.muted = true;
            vid.playsInline = true;
            // Hide but keep in DOM to prevent power saving pause
            vid.style.position = 'absolute';
            vid.style.top = '-9999px';
            vid.style.left = '-9999px';
            vid.style.width = '1px';
            vid.style.height = '1px';
            vid.style.pointerEvents = 'none';
            document.body.appendChild(vid);
            vid.load();
            vid.play().catch(e => console.log('Zombie video play warning:', e));
            return vid;
        };

        // Load walking left video
        this.animations.walkLeft = setupVideo('Zombie/WalkingLeft/zombie_walk.mp4');

        // For walking right, we use the SAME video but will flip it in draw()
        const rightVideo = document.createElement('video');
        rightVideo.src = 'Zombie/WalkingLeft/zombie_walk.mp4'; // Same source
        rightVideo.loop = true;
        rightVideo.muted = true;
        rightVideo.playsInline = true;
        rightVideo.load();
        rightVideo.play().catch(e => console.log('Zombie video autoplay failed:', e));
        this.animations.walkRight = rightVideo;
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

        // Vertical check - strictly enforce Y proximity for attacks
        const verticalDist = Math.abs(dy);

        // Attack if player is in range, on same Y level, and cooldown is ready
        if (distance < this.attackRange && verticalDist < 30 && this.attackCooldown <= 0) {
            this.attack();
            this.isMoving = false; // Stop moving when attacking
        } else {
            // Roam around when not attacking
            // Initialize roam target if none exists
            if (!this.roamTarget) {
                this.pickNewRoamTarget();
            }

            // Check if reached target
            if (Math.abs(this.x - this.roamTarget) < 5) {
                this.pickNewRoamTarget();
            }

            // Move toward roam target
            const roamSpeed = 30; // pixels per second
            this.isMoving = true;

            if (this.x < this.roamTarget) {
                this.x += roamSpeed * deltaTime;
                this.direction = 'right';
            } else {
                this.x -= roamSpeed * deltaTime;
                this.direction = 'left';
            }
        }

        // Animation
        this.frameTime += deltaTime;
        if (this.frameTime > this.frameDelay) {
            this.frameTime = 0;
            this.currentFrame = (this.currentFrame + 1) % 4;
        }
    }

    pickNewRoamTarget() {
        const constraints = getMovementConstraints();
        const minX = mapToScreenX(constraints.xMinMap);
        const maxX = mapToScreenX(constraints.xMaxMap);
        // Ensure new target is some distance away to prevent jitter
        let newTarget = minX + Math.random() * (maxX - minX);
        while (Math.abs(newTarget - this.x) < 20) {
            newTarget = minX + Math.random() * (maxX - minX);
        }
        this.roamTarget = newTarget;
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

        // Select animation source
        let source = null;
        let isVideo = false;

        // Use state determined in update() for robustness
        if (this.state === 'attacking' || !this.isMoving) {
            // Idle
            source = this.animations.idle;
            // Flip idle based on direction
            if (this.direction === 'left') {
                ctx.scale(-1, 1);
            }
        } else {
            // Walking
            if (this.direction === 'left') {
                source = this.animations.walkLeft;
                isVideo = true;
                // No flip for left (source is left walk)
            } else {
                source = this.animations.walkRight;
                isVideo = true;
                // Flip for right (since source is left walk reversed)
                ctx.scale(-1, 1);
            }
        }

        let width = 0;
        let height = 0;
        let ready = false;

        if (isVideo && source) {
            width = source.videoWidth;
            height = source.videoHeight;
            ready = source.readyState >= 2; // HAVE_CURRENT_DATA
        } else if (source) {
            width = source.width;
            height = source.height;
            ready = source.complete && source.width > 0;
        }

        if (source && ready && width > 0) {
            // Apply chroma key to remove white background
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = width;
            tempCanvas.height = height;

            // Draw to temp canvas - apply cropping if it's a video to remove black bars
            if (isVideo) {
                // Crop 25% from left and right to remove pillars
                const cropX = width * 0.25;
                const cropWidth = width * 0.5;
                // Draw cropped portion to full temp canvas size (stretching it back? No, resize canvas or draw centered)
                // Better: Resize temp canvas to cropped size
                tempCanvas.width = cropWidth;
                tempCtx.drawImage(source, cropX, 0, cropWidth, height, 0, 0, cropWidth, height);
            } else {
                tempCtx.drawImage(source, 0, 0, width, height);
            }

            // Get image data from whatever size we drew
            const activeWidth = tempCanvas.width;
            const activeHeight = tempCanvas.height;
            const imageData = tempCtx.getImageData(0, 0, activeWidth, activeHeight);
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


// Character Class with Directional Animations
class Character {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.speed = CONFIG.characterSpeed;
        this.size = CONFIG.characterSize;
        this.moving = false;
        this.angle = 0;
        this.direction = 'front'; // 'left', 'front', 'right'
        this.visible = true; // For hiding during floor climb

        // Animation state
        this.currentFrame = 0;
        this.frameTime = 0;
        this.frameDelay = 0.15; // seconds between frames

        // Directional animations
        this.animations = {
            front: [],
            left: null,
            right: null,
            punch: null // Punch animation
        };

        // Punch state
        this.isPunching = false;
        this.punchTime = 0;
        this.punchDuration = 0.3; // seconds

        this.loadAnimations();
    }

    loadAnimations() {
        // Load front walking images (3 frames)
        for (let i = 1; i <= 3; i++) {
            const img = new Image();
            img.src = `Character/Walking_Animations/Walkind_front/Gemini_Generated_Image_528t6j528t6j528t_${i}.jpg`;
            this.animations.front.push(img);
        }

        // Load left walking video
        this.animations.left = document.createElement('video');
        this.animations.left.src = 'Character/Walking_Animations/Walking_left/download (40).mp4';
        this.animations.left.loop = true;
        this.animations.left.muted = true;
        this.animations.left.playsInline = true;
        this.animations.left.load();

        // Load right walking video (flipped from left)
        this.animations.right = document.createElement('video');
        this.animations.right.src = 'Character/Walking_Animations/Walking_right/walking_right_flipped.mp4';
        this.animations.right.loop = true;
        this.animations.right.muted = true;
        this.animations.right.playsInline = true;
        this.animations.right.load();

        // Load punch animation
        const punchImg = new Image();
        punchImg.src = 'Screenshot 2026-01-02 154835.png';
        this.animations.punch = punchImg;
    }

    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.moving = true;

        // Calculate angle for rotation
        const dx = x - this.x;
        const dy = y - this.y;
        this.angle = Math.atan2(dy, dx);

        // Determine direction based on horizontal movement
        // If moving mainly horizontally, use left/right
        // If moving mainly vertically, use front
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > absDy) {
            // Moving more horizontally
            if (dx < 0) {
                // Clicking LEFT of character
                this.direction = 'left';
                this.animations.left.currentTime = 0.4; // Start at 0.4 seconds
                this.animations.left.play();
                this.animations.right.pause();
            } else {
                // Clicking RIGHT of character
                this.direction = 'right';
                this.animations.right.currentTime = 0.4; // Start at 0.4 seconds (same as left)
                this.animations.right.play();
                this.animations.left.pause();
            }
        } else {
            // Moving more vertically (up or down) - use front animation
            this.direction = 'front';
            this.animations.left.pause();
            this.animations.right.pause();
            this.currentFrame = 0;
        }

        console.log(`Moving ${this.direction}`);
    }

    punch(targetDirection) {
        if (this.isPunching) return;
        this.isPunching = true;
        this.punchTime = 0;
        if (targetDirection) {
            this.direction = targetDirection;
        }
        console.log('🥊 PUNCH!');
    }

    update(deltaTime) {
        // Update punch timer
        if (this.isPunching) {
            this.punchTime += deltaTime;
            if (this.punchTime >= this.punchDuration) {
                this.isPunching = false;
                this.punchTime = 0;
            }
            // Stop moving while punching
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

                statusDisplay.textContent = 'Idle';
            } else {
                // Move towards target
                const moveDistance = this.speed * deltaTime;
                const ratio = Math.min(moveDistance / distance, 1);

                this.x += dx * ratio;
                this.y += dy * ratio;

                // Update frame for front animation (image sequence)
                if (this.direction === 'front') {
                    this.frameTime += deltaTime;
                    if (this.frameTime >= this.frameDelay) {
                        this.frameTime = 0;
                        this.currentFrame = (this.currentFrame + 1) % this.animations.front.length;
                    }
                }

                statusDisplay.textContent = `Moving ${this.direction}`;
            }
        }

        // Update position display (show MAP coordinates 304-427 for debugging)
        const mapX = Math.round(screenToMapX(this.x));
        posDisplay.textContent = `${mapX}, ${Math.round(this.y)}`;
    }

    draw(ctx) {
        // Don't draw if character is hidden (during floor climb)
        if (!this.visible) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw punch animation handles flipping
        if (this.isPunching && this.animations.punch) {
            const pWidth = this.size * 1.2; // Slightly larger punch
            const pHeight = this.size * 1.2;

            ctx.save();
            // Default assumes punch image faces LEFT (based on common sprite sheets, or checking user input). 
            // Actually most face RIGHT. Let's assume input faces RIGHT.
            // If direction is LEFT, flip.
            if (this.direction === 'right') {
                ctx.scale(-1, 1); // Flip horizontally if original faces left? 
                // User said "flipped on the side of which its punching left or right".
                // Let's assume standard right-facing sprite.
                // If direction is LEFT, scale(-1, 1). 
                // WAIT. User provided Screenshot 2026-01-02 154835.png.
                // I will assume it faces ONE way. 
                // Let's try: if direction is LEFT, normal. If RIGHT, flip. (Or vice versa).
                // I'll assume usage of scale(-1, 1) for Left.
            }

            // The screenshot provided earlier (which I can't see but assume exists)
            // I'll flip for RIGHT side just to be safe, or check direction logic.
            // Let's implement generic flipping logic.
            if (this.direction === 'left') {
                // If the image faces Right by default, this flips to Left.
                // If the image faces Left by default, this keeps it Left? No, scale(-1, 1) flips coordinate system.
                // Let's assume the image faces RIGHT. 
                // Then for LEFT: ctx.scale(-1, 1).
                ctx.scale(-1, 1);
            }

            this.drawWithChromaKey(ctx, this.animations.punch, -pWidth / 2, -pHeight / 2, pWidth, pHeight);
            ctx.restore();

        } else if (this.direction === 'front' && this.animations.front.length > 0) {
            const img = this.animations.front[this.currentFrame];
            if (img.complete) {
                // Front animation: smaller and narrower (50% width, 80% height)
                const frontWidth = this.size * 0.5;
                const frontHeight = this.size * 0.8;
                this.drawWithChromaKey(ctx, img, -frontWidth / 2, -frontHeight / 2, frontWidth, frontHeight);
            }
        } else if (this.direction === 'left' && this.animations.left) {
            // More width for side view (70% width), same height as front (80% height)
            const leftWidth = this.size * 0.7;
            const leftHeight = this.size * 0.8;
            this.drawVideoCropped(ctx, this.animations.left, -leftWidth / 2, -leftHeight / 2, leftWidth, leftHeight, 0.2, 0);
        } else if (this.direction === 'right' && this.animations.right) {
            // More width for side view (70% width), same height as front (80% height)
            const rightWidth = this.size * 0.7;
            const rightHeight = this.size * 0.8;
            this.drawVideoCropped(ctx, this.animations.right, -rightWidth / 2, -rightHeight / 2, rightWidth, rightHeight, 0.2, 0);
        } else {
            // Fallback placeholder
            ctx.fillStyle = '#ffd93d';
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();

            // Direction indicator
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        // Draw path line when moving
        if (this.moving) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 217, 61, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.targetX, this.targetY);
            ctx.stroke();
            ctx.restore();

            // Draw target indicator
            ctx.save();
            ctx.strokeStyle = '#ffd93d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.targetX, this.targetY, 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // Helper method to draw image with white background removal
    drawWithChromaKey(ctx, img, x, y, width, height) {
        // Create temporary canvas for processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw image to temp canvas
        tempCtx.drawImage(img, 0, 0);

        // Get image data and remove white/near-white pixels
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Only remove white pixels (threshold 220)
            if (r > 220 && g > 220 && b > 220) {
                data[i + 3] = 0; // Set alpha to 0 (transparent)
            }
        }

        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, x, y, width, height);
    }

    // Helper method to draw video with white background removal
    drawVideoWithChromaKey(ctx, video, x, y, width, height) {
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
            // Create temporary canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            const tempCtx = tempCanvas.getContext('2d');

            // Draw video frame
            tempCtx.drawImage(video, 0, 0);

            // Remove white background
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Remove white pixels (threshold 220)
                if (r > 220 && g > 220 && b > 220) {
                    data[i + 3] = 0;
                }
                // Also remove black/dark pixels (those black lines)
                else if (r < 40 && g < 40 && b < 40) {
                    data[i + 3] = 0;
                }
            }

            tempCtx.putImageData(imageData, 0, 0);
            ctx.drawImage(tempCanvas, x, y, width, height);
        }
    }

    // Draw video cropped to center (removes edges by cropX% horizontally, cropY% vertically)
    drawVideoCropped(ctx, video, x, y, width, height, cropPercentX, cropPercentY = 0) {
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            // Calculate crop area (removes cropPercent from each edge)
            const cropX = vw * cropPercentX;
            const cropY = vh * cropPercentY;
            const cropWidth = vw * (1 - cropPercentX * 2);
            const cropHeight = vh * (1 - cropPercentY * 2);

            // Create temp canvas for chroma key (white only)
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = cropWidth;
            tempCanvas.height = cropHeight;
            const tempCtx = tempCanvas.getContext('2d');

            // Draw cropped video frame
            tempCtx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

            // Remove white background only
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
    }
}

// Walkable Area Utilities
class WalkableAreaManager {
    constructor(areas) {
        this.areas = areas;
    }

    // Check if a point is inside any walkable area using ray casting algorithm
    isPointWalkable(x, y) {
        for (const area of this.areas) {
            if (this.pointInPolygon(x, y, area.points)) {
                return true;
            }
        }
        return false;
    }

    // Point-in-polygon test using ray casting
    pointInPolygon(x, y, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // Find the nearest walkable point to a given position
    findNearestWalkablePoint(x, y) {
        if (this.isPointWalkable(x, y)) {
            return { x, y };
        }

        // If not walkable, find the closest point on the nearest polygon edge
        let nearestPoint = null;
        let minDistance = Infinity;

        for (const area of this.areas) {
            for (let i = 0; i < area.points.length; i++) {
                const p1 = area.points[i];
                const p2 = area.points[(i + 1) % area.points.length];

                const closest = this.closestPointOnSegment(x, y, p1.x, p1.y, p2.x, p2.y);
                const dist = Math.sqrt((closest.x - x) ** 2 + (closest.y - y) ** 2);

                if (dist < minDistance) {
                    minDistance = dist;
                    nearestPoint = closest;
                }
            }
        }

        return nearestPoint || { x, y };
    }

    // Find closest point on a line segment
    closestPointOnSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
        return {
            x: x1 + t * dx,
            y: y1 + t * dy
        };
    }

    // Draw walkable areas for debugging
    draw(ctx) {
        if (!CONFIG.showWalkableAreas) return;

        ctx.save();
        for (const area of this.areas) {
            // Fill area
            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
            ctx.beginPath();
            ctx.moveTo(area.points[0].x, area.points[0].y);
            for (let i = 1; i < area.points.length; i++) {
                ctx.lineTo(area.points[i].x, area.points[i].y);
            }
            ctx.closePath();
            ctx.fill();

            // Draw border
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw corner points
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            for (const point of area.points) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw label
            if (area.name) {
                const centerX = area.points.reduce((sum, p) => sum + p.x, 0) / area.points.length;
                const centerY = area.points.reduce((sum, p) => sum + p.y, 0) / area.points.length;
                ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(area.name, centerX, centerY);
            }
        }
        ctx.restore();
    }
}

// Map Background - Static Image
const mapImage = new Image();
mapImage.src = 'Maps/processed-image.png';
let mapLoaded = false;

// Set image to loaded state
mapImage.addEventListener('load', () => {
    mapLoaded = true;
    console.log('🗺️ Map image loaded!');
});

mapImage.addEventListener('error', () => {
    console.error('❌ Failed to load map image');
});

// Game State
const walkableManager = new WalkableAreaManager(WALKABLE_AREAS);
// Initialize character at center of allowed range (starting at bunker level)
const initConstraints = getMovementConstraints();
const initialX = mapToScreenX((initConstraints.xMinMap + initConstraints.xMaxMap) / 2);
const initialY = canvas.height * 0.563; // Start at bunker level (first floor)
let character = new Character(initialX, initialY);
let lastTime = performance.now();

// Input Handling
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Don't process clicks while climbing
    if (gameState.isClimbing) return;

    // Calculate movement constraints (using map coordinates)
    const constraints = getMovementConstraints();
    const currentFloorY = canvas.height * 0.563; // Bunker first floor (where character starts)
    const lowerFloorY = canvas.height * 0.66; // Lower bunker floor (second floor down)

    // Check if clicking on lower floor (below current position) when on Level 2
    if (gameState.currentLevel === 2 && !gameState.onSecondFloor && clickY > currentFloorY) {
        // Trigger climb DOWN to lower floor
        console.log('🪜 Going down to lower floor...');
        gameState.isClimbing = true;
        gameState.climbTargetX = clickX; // Store where to walk after climbing

        // Walk to stairs position (x=335 in map coordinates)
        const stairsX = mapToScreenX(335);
        character.moveTo(stairsX, currentFloorY);

        // Wait for character to reach stairs, then hide and climb
        const checkArrival = setInterval(() => {
            if (!character.moving) {
                clearInterval(checkArrival);

                // Hide character
                character.visible = false;
                console.log('👻 Character hidden, going down...');

                // Simulate climb time (1 second)
                setTimeout(() => {
                    // Move character to lower floor (left side)
                    const lowerFloorLeftX = mapToScreenX(344); // Left edge
                    character.x = lowerFloorLeftX;
                    character.y = lowerFloorY;

                    // Show character and walk to target
                    character.visible = true;
                    gameState.onSecondFloor = true;
                    gameState.isClimbing = false;

                    console.log('✨ Character on lower floor!');

                    // Walk to clicked position
                    const minX = mapToScreenX(constraints.xMinMap);
                    const maxX = mapToScreenX(constraints.xMaxMap);
                    const clampedX = Math.max(minX, Math.min(maxX, gameState.climbTargetX));
                    character.moveTo(clampedX, lowerFloorY);
                }, 1000);
            }
        }, 100);
    }
    // Check if clicking on first floor (above current position) when on second floor
    else if (gameState.currentLevel === 2 && gameState.onSecondFloor && clickY < currentFloorY) {
        // Trigger climb UP to first floor
        console.log('🪜 Climbing back up to first floor...');
        gameState.isClimbing = true;
        gameState.climbTargetX = clickX;

        const stairsX = mapToScreenX(335);
        character.moveTo(stairsX, lowerFloorY);

        const checkArrival = setInterval(() => {
            if (!character.moving) {
                clearInterval(checkArrival);
                character.visible = false;
                console.log('👻 Character hidden, climbing up...');

                setTimeout(() => {
                    const firstFloorLeftX = mapToScreenX(344);
                    character.x = firstFloorLeftX;
                    character.y = currentFloorY;
                    character.visible = true;
                    gameState.onSecondFloor = false;
                    gameState.isClimbing = false;
                    console.log('✨ Character back on first floor!');

                    const minX = mapToScreenX(constraints.xMinMap);
                    const maxX = mapToScreenX(constraints.xMaxMap);
                    const clampedX = Math.max(minX, Math.min(maxX, gameState.climbTargetX));
                    character.moveTo(clampedX, currentFloorY);
                }, 1000);
            }
        }, 100);
    }
    else {
        // Check if clicking on enemy (combat)
        let clickedEnemy = null;
        for (const enemy of gameState.enemies) {
            const dx = clickX - enemy.x;
            const dy = clickY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < enemy.size / 2) {
                clickedEnemy = enemy;
                break;
            }
        }

        if (clickedEnemy) {
            // Check distance checks if close enough to punch
            const dx = clickedEnemy.x - character.x;
            const dy = clickedEnemy.y - character.y;
            const distToEnemy = Math.sqrt(dx * dx + dy * dy);
            const punchRange = 100; // Pixels

            if (distToEnemy < punchRange) {
                // Determine direction to face enemy
                const direction = dx < 0 ? 'left' : 'right';

                // Trigger punch animation and damage
                character.punch(direction);
                console.log('👊 Attacking zombie!');
                clickedEnemy.takeDamage(25);
            } else {
                console.log('Too far to punch! Get closer.');
                // Optionally move deeper? 
                // For now just prevent attack to force player to move closer.
            }
        } else {
            // Normal movement on current floor
            const fixedY = gameState.onSecondFloor ? lowerFloorY : currentFloorY;
            const minX = mapToScreenX(constraints.xMinMap);
            const maxX = mapToScreenX(constraints.xMaxMap);
            const clampedX = Math.max(minX, Math.min(maxX, clickX));
            const walkablePoint = { x: clampedX, y: fixedY };

            // Only move if the point is walkable or we found a nearby walkable point
            if (walkablePoint) {
                character.moveTo(walkablePoint.x, walkablePoint.y);

                // Visual feedback for invalid clicks
                if (clickX !== walkablePoint.x || clickY !== walkablePoint.y) {
                    console.log('⚠️ Clicked outside walkable area, moving to nearest valid point');
                }
            }
        }
    }

    // Show click indicator
    clickIndicator.style.left = e.clientX + 'px';
    clickIndicator.style.top = e.clientY + 'px';
    clickIndicator.classList.add('show-click');

    setTimeout(() => {
        clickIndicator.classList.remove('show-click');
    }, 600);
});

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    CONFIG.canvasWidth = window.innerWidth;
    CONFIG.canvasHeight = window.innerHeight;
});

// Toggle walkable area visualization with 'D' key
window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
        CONFIG.showWalkableAreas = !CONFIG.showWalkableAreas;
        console.log(`🔍 Walkable areas debug: ${CONFIG.showWalkableAreas ? 'ON' : 'OFF'}`);
    }
});

// Game Loop
function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    // Clear canvas and draw map background
    if (mapLoaded) {
        drawMap();
    } else {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw grid (optional - can be removed for production)
    // drawGrid();

    // Draw walkable areas (if debug mode enabled)
    walkableManager.draw(ctx);

    // Update and draw character
    character.update(deltaTime);
    character.draw(ctx);

    // Update and draw enemies
    for (const enemy of gameState.enemies) {
        enemy.update(deltaTime, character.x, character.y);
        enemy.draw(ctx);
    }

    // Draw player health bar
    const healthBarWidth = 200;
    const healthBarHeight = 20;
    const healthBarX = 20;
    const healthBarY = 20;
    const healthPercent = gameState.playerHealth / gameState.playerMaxHealth;

    ctx.fillStyle = '#333';
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : (healthPercent > 0.25 ? '#FFC107' : '#F44336');
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.fillText(`HP: ${Math.max(0, gameState.playerHealth)}/${gameState.playerMaxHealth}`, healthBarX + 5, healthBarY + 15);

    // Check interactive zones and show/hide action button
    checkInteractiveZones();

    requestAnimationFrame(gameLoop);
}

function drawMap() {
    if (!mapImage.complete) return;
    
    // Use actual image aspect ratio
    const mapAspect = mapImage.width / mapImage.height;

    // Always fit to full height and center horizontally
    const drawHeight = canvas.height;
    const drawWidth = drawHeight * mapAspect;
    const offsetX = (canvas.width - drawWidth) / 2;

    // Draw the image as map background
    ctx.drawImage(mapImage, offsetX, 0, drawWidth, drawHeight);
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    const gridSize = 50;

    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Check if character is in an interactive zone
let currentZone = null;

function checkInteractiveZones() {
    const charX = character.x;
    let foundZone = null;

    // Get zones with current screen dimensions
    const zones = getInteractiveZones();

    for (const zone of zones) {
        if (charX >= zone.xMin && charX <= zone.xMax) {
            foundZone = zone;
            break;
        }
    }

    if (foundZone && foundZone !== currentZone) {
        // Entered a new zone
        currentZone = foundZone;
        actionButton.querySelector('.icon').textContent = foundZone.icon;
        actionButton.querySelector('span:last-child').textContent = foundZone.action;
        actionButton.classList.add('visible');
    } else if (!foundZone && currentZone) {
        // Left the zone
        currentZone = null;
        actionButton.classList.remove('visible');
    }
}

// Action button click handler
// Action button click handler
actionButton.addEventListener('click', () => {
    if (currentZone) {
        console.log(`🎮 Action: ${currentZone.action} at ${currentZone.name}`);

        // Handle searchable objects
        if (currentZone.type === 'searchable') {
            showMessage(currentZone.searchMessage);
            gameState.searchedObjects.add(currentZone.name);

            if (currentZone.hasKey && !gameState.keyFound) {
                gameState.keyFound = true;
                setTimeout(() => {
                    showMessage('🎉 You found the Room Key!');
                }, 2000);
            }
        }
        // Handle action objects (Bed)
        else if (currentZone.type === 'action') {
            if (currentZone.name === 'bed') {
                showMessage('💤 Going to sleep... Good night!');
            }
        }
        // Handle Door
        else if (currentZone.type === 'door') {
            if (gameState.keyFound) {
                if (!gameState.generatorRoomUnlocked) {
                    showMessage(currentZone.unlockMessage);
                    gameState.generatorRoomUnlocked = true;
                    console.log('🔓 Door unlocked!');
                } else {
                    showMessage('The door is already unlocked.');
                }
            } else {
                showMessage(currentZone.lockedMessage);
            }
        }
        // Handle Generator
        else if (currentZone.type === 'generator') {
            if (!gameState.generatorFixed) {
                gameState.generatorFixed = true;
                showMessage(currentZone.fixedMessage);

                // Fade out canvas for smooth transition
                canvas.style.transition = 'opacity 0.5s';
                canvas.style.opacity = '0.3';

                setTimeout(() => {
                    console.log('⚡ Generator fixed! Level 2 unlocked!');
                    
                    // Fade back in
                    canvas.style.opacity = '1';
                    
                    console.log('✨ Level 2 revealed!');
                    gameState.currentLevel = 2;

                    // Spawn zombie on second floor
                    if (gameState.enemies.length === 0) {
                        const zombieX = mapToScreenX(370); // Center of second floor
                        const zombieY = canvas.height * 0.66; // Second floor Y position
                        const zombie = new Enemy(zombieX, zombieY, 'zombie');
                        gameState.enemies.push(zombie);
                        console.log('🧟 Zombie spawned on second floor!');
                    }
                }, 500); // Wait for fade out
            } else {
                showMessage('The generator is humming smoothly.');
            }
        }
    }
});

// Show message popup
function showMessage(text) {
    // Create message element if it doesn't exist
    let messageBox = document.getElementById('message-box');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.id = 'message-box';
        messageBox.style.cssText = `
            position: fixed;
            bottom: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 16px;
            border: 2px solid rgba(255, 217, 61, 0.5);
            font-size: 16px;
            max-width: 80%;
            text-align: center;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            backdrop-filter: blur(10px);
        `;
        document.body.appendChild(messageBox);
    }

    messageBox.textContent = text;
    messageBox.style.opacity = '1';

    // Hide after 3 seconds
    setTimeout(() => {
        messageBox.style.opacity = '0';
    }, 3000);
}

// Start the game
gameLoop(performance.now());

console.log('🎮 Game initialized! Click anywhere to move the character.');
console.log('📝 To add sprites: Extract frames using sprite-extractor.html, then uncomment the loadSprites line in game.js');
