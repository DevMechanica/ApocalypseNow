import * as Phaser from 'phaser';
import { CONSTANTS, CONFIG } from '../config.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super(CONSTANTS.SCENES.GAME);
    }

    create() {
        // 1. Setup World/Map
        const map = this.add.image(0, 0, 'map').setOrigin(0, 0);

        // Based on create_bunker_map.py, the rooms are scaled to 90% of the background width and centered.
        // We set the physics bounds to this inner 'building' area to prevent walking on the surrounding earth/background.
        const mapW = map.width;
        const mapH = map.height;
        const buildingWidth = mapW * 0.90;
        const buildingX = (mapW - buildingWidth) / 2;

        // Recalculated based on exact logic and dimensions:
        // BgWidth: 832. RoomWidth: 1696. Scale: 0.4415. ScldHeight: 268.
        // Entrance(1) + Rooms(3). Padding -60. Start 30.
        // Bottom = 30 + 268 + 3*(268-60) = 922.
        // Map Height is 1248. So building ends at 922.

        const buildingY = 30;
        const buildingHeight = 892; // 922 - 30

        this.physics.world.setBounds(buildingX, buildingY, buildingWidth, buildingHeight);

        // 2. Process Player Texture (Chroma Key)
        this.createPlayerTexture();

        // 3. Create Player
        // Position roughly where it was: center of width, 80y (scaled) or similar.
        // Game.js: x = mapWidth/2 - width/2, y = 80
        const startX = map.width / 2;
        const startY = 150; // Approximated

        this.player = this.physics.add.sprite(startX, startY, 'player_processed');
        this.player.setScale(CONFIG.characterScale);
        this.player.setCollideWorldBounds(true);

        // 4. Camera
        this.cameras.main.setBounds(0, 0, map.width, map.height);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // 5. Input Setup
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // RTS Movement Setup
        this.targetPosition = null;
        this.selectedUnit = null;

        // 1. Selector Handler (Clicking on the Player)
        this.player.setInteractive();
        this.player.on('pointerdown', (pointer) => {
            if (this.selectedUnit === this.player) {
                // Deselect
                this.selectedUnit = null;
                this.player.clearTint();
                this.targetPosition = null; // Stop moving
            } else {
                // Select
                this.selectedUnit = this.player;
                this.player.setTint(0x00ff00); // Visual feedback
            }
        });

        // 2. Ground Click Handler (Movement)
        this.input.on('pointerdown', (pointer, currentlyOver) => {
            // Block if UI is blocked, OR if we clicked on a game object (like the player itself)
            if (this.registry.get('uiBlocked') || currentlyOver.length > 0) return;

            // Check bounds
            const withinBounds = pointer.x >= 0 && pointer.x <= this.cameras.main.width &&
                pointer.y >= 0 && pointer.y <= this.cameras.main.height;

            // Only move if we have a selected unit and are within bounds
            if (this.selectedUnit && withinBounds) {
                this.targetPosition = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
            }
        });

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
