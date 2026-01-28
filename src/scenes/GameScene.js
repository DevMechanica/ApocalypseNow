import * as Phaser from 'phaser';
import { CONSTANTS, CONFIG } from '../config.js';
import { EconomyManager } from '../economy.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super(CONSTANTS.SCENES.GAME);
    }

    create() {
        // Initialize Economy Manager
        this.economy = new EconomyManager(this);
        this.economy.init();

        // 1. Setup World/Map - Scale to fit screen (show full width)
        const map = this.add.image(0, 0, 'map').setOrigin(0, 0);

        // Scale map to fit the viewport (prioritize showing full width)
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const scaleX = screenWidth / map.width;
        const scaleY = screenHeight / map.height;
        const scale = scaleY; // Stretch to fill screen height

        map.setScale(scale);

        // Calculate scaled dimensions
        const scaledMapW = map.width * scale;
        const scaledMapH = map.height * scale;

        // Center the map on screen
        const offsetX = (screenWidth - scaledMapW) / 2;
        const offsetY = (screenHeight - scaledMapH) / 2;
        map.setPosition(offsetX, offsetY);

        // Building bounds (70% of map width, centered)
        const buildingWidthRatio = 0.70;
        const buildingX = offsetX + (scaledMapW * (1 - buildingWidthRatio) / 2);
        const buildingWidth = scaledMapW * buildingWidthRatio;

        // Vertical bounds based on room positions
        const buildingY = offsetY + (430 * scale);
        const buildingHeight = 693 * scale;

        this.physics.world.setBounds(buildingX, buildingY, buildingWidth, buildingHeight);


        // 2. Process Player Texture (Chroma Key)
        this.createPlayerTexture();

        // 3. Create Player - Position in center of screen
        const startX = screenWidth / 2;
        const startY = buildingY + (150 * scale);  // Start near top of building area

        this.player = this.physics.add.sprite(startX, startY, 'player_processed');
        this.player.setScale(CONFIG.characterScale * scale);  // Scale player with map
        this.player.setCollideWorldBounds(true);

        // Store scale for other calculations
        this.mapScale = scale;
        this.mapOffset = { x: offsetX, y: offsetY };

        // 4. Camera Setup - Static view (no ZOOM by default)
        // Reset bounds to match screen
        this.cameras.main.setBounds(0, 0, screenWidth, screenHeight);

        // 5. Input Setup (Touch Camera & RTS Controls)
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.input.addPointer(1); // Enable multi-touch (2 pointers total)

        // Camera Logic Variables
        this.pinchDist = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.camStart = { x: 0, y: 0 };

        // --- Mouse Wheel Zoom (PC) ---
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const sensitivity = 0.001;
            const newZoom = Phaser.Math.Clamp(this.cameras.main.zoom - (deltaY * sensitivity), 1.0, 3.0);
            this.cameras.main.setZoom(newZoom);
        });

        // --- Touch Handling ---

        this.input.on('pointerdown', (pointer) => {
            // 1. Two fingers = Pinch Start
            if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
                this.isDragging = false; // Cancel drag
                this.pinchDist = Phaser.Math.Distance.Between(
                    this.input.pointer1.x, this.input.pointer1.y,
                    this.input.pointer2.x, this.input.pointer2.y
                );
                return;
            }

            // 2. One finger = Ready to Drag or Click
            if (!this.registry.get('uiBlocked')) {
                this.isDragging = true;
                this.dragStart.x = pointer.x;
                this.dragStart.y = pointer.y;
                this.camStart.x = this.cameras.main.scrollX;
                this.camStart.y = this.cameras.main.scrollY;
            }
        });

        this.input.on('pointermove', (pointer) => {
            // A. Pinch-to-Zoom (Two Fingers)
            if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
                const dist = Phaser.Math.Distance.Between(
                    this.input.pointer1.x, this.input.pointer1.y,
                    this.input.pointer2.x, this.input.pointer2.y
                );

                // Sensitivity
                const sensitivity = 0.005;
                const diff = (dist - this.pinchDist) * sensitivity;

                // Apply Zoom (Clamp 1.0 to 3.0)
                const newZoom = Phaser.Math.Clamp(this.cameras.main.zoom + diff, 1.0, 3.0);
                this.cameras.main.setZoom(newZoom);
                this.pinchDist = dist;
                return;
            }

            // B. Drag-to-Pan (One Finger)
            if (this.isDragging) {
                const diffX = (this.dragStart.x - pointer.x) / this.cameras.main.zoom;
                const diffY = (this.dragStart.y - pointer.y) / this.cameras.main.zoom;

                this.cameras.main.setScroll(this.camStart.x + diffX, this.camStart.y + diffY);
            }
        });

        this.input.on('pointerup', (pointer) => {
            this.isDragging = false;
            this.pinchDist = 0;

            // Detect "Tap" (Movement < 10px) - Handle Selection
            const distMoved = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.dragStart.x, this.dragStart.y);

            if (distMoved < 10 && !this.registry.get('uiBlocked')) {
                this.handleTap(pointer);
            }
        });
    }

    handleTap(pointer) {
        // Logic for Unit Selection / Movement
        const worldPoint = pointer.positionToCamera(this.cameras.main);

        // 1. Check if clicked on player (Distance Check for better precision)
        // Using a radius of 40px from center instead of bounding box
        if (Phaser.Math.Distance.Between(worldPoint.x, worldPoint.y, this.player.x, this.player.y) < 40) {
            if (this.selectedUnit === this.player) {
                // Deselect
                this.selectedUnit = null;
                this.player.clearTint();
                this.targetPosition = null;
            } else {
                // Select
                this.selectedUnit = this.player;
                this.player.setTint(0x00ff00);
            }
            return;
        }

        // 2. Move to location (if selected)
        if (this.selectedUnit) {
            this.targetPosition = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
        }

        // 6. Launch UI
        this.scene.launch(CONSTANTS.SCENES.UI);
    }

    update(time, delta) {
        if (!this.player) return;

        // If not selected, do not move (neither WASD nor RTS)
        if (this.selectedUnit !== this.player) {
            this.player.setVelocity(0);
            return;
        }

        const speed = CONFIG.characterSpeed;

        // --- 1. Keyboard Input (Priority) ---
        let velocityX = 0;
        let velocityY = 0;
        let isKeyboardMoving = false;

        // Horizontal
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            velocityX = -speed;
            this.player.setFlipX(false);
            isKeyboardMoving = true;
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            velocityX = speed;
            this.player.setFlipX(true);
            isKeyboardMoving = true;
        }

        // Vertical
        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            velocityY = -speed;
            isKeyboardMoving = true;
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            velocityY = speed;
            isKeyboardMoving = true;
        }

        // Apply Keyboard Movement
        if (isKeyboardMoving) {
            // Cancel RTS movement if player takes manual control
            this.targetPosition = null;

            this.player.setVelocity(velocityX, velocityY);
            this.player.body.velocity.normalize().scale(speed);
            return; // Skip RTS logic
        }

        // --- 2. RTS Movement (Click to Move) ---
        if (this.targetPosition) {
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                this.targetPosition.x, this.targetPosition.y
            );

            // Tolerance to stop jittering when reaching target (e.g. 4px)
            if (distance > 4) {
                // Move towards target
                this.physics.moveToObject(this.player, this.targetPosition, speed);

                // Update Facing Direction
                if (this.player.body.velocity.x > 0) {
                    this.player.setFlipX(true);
                } else if (this.player.body.velocity.x < 0) {
                    this.player.setFlipX(false);
                }
            } else {
                // Reached target
                this.player.body.reset(this.player.x, this.player.y);
                this.targetPosition = null;
            }
        } else {
            // Idle
            this.player.setVelocity(0);
        }
    }

    createPlayerTexture() {
        // Create a canvas to process the image
        const textureManager = this.textures;
        const sourceImage = textureManager.get('player').getSourceImage();

        // Handle if image not loaded perfectly or already processed
        if (!sourceImage) return;

        const canvas = document.createElement('canvas');
        canvas.width = sourceImage.width;
        canvas.height = sourceImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sourceImage, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const threshold = 200; // Match game.js config

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Simple white removal
            if (r > threshold && g > threshold && b > threshold) {
                data[i + 3] = 0;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Add to texture manager
        textureManager.addCanvas('player_processed', canvas);
    }
}
