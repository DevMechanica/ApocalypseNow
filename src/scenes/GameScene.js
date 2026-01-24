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

        // 6. Launch UI
        this.scene.launch(CONSTANTS.SCENES.UI);
    }

    update(time, delta) {
        if (!this.player) return;

        const speed = CONFIG.characterSpeed;
        const prevVelocity = this.player.body.velocity.clone();

        // Stop any previous movement from the last frame
        this.player.setVelocity(0);

        // Horizontal movement
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(false); // Left face (Default)
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(true); // Right face (Flipped)
        }

        // Vertical movement
        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            this.player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            this.player.setVelocityY(speed);
        }

        // Normalize and scale the velocity so that player can't move faster along a diagonal
        this.player.body.velocity.normalize().scale(speed);

        // Mobile Touch (Virtual "Joystick" relative to Player position)
        // Check 1: Pointer is down
        // Check 2: UI is not blocked
        // Check 3: Pointer is strictly within the visual camera bounds (ignore clicks on black bars/html background)
        const pointer = this.input.activePointer;
        const withinBounds = pointer.x >= 0 && pointer.x <= this.cameras.main.width &&
            pointer.y >= 0 && pointer.y <= this.cameras.main.height;

        if (pointer.isDown && !this.registry.get('uiBlocked') && withinBounds) {

            // Calculate direction from Player to Pointer in World Space
            // This fixes the issue where clicking below the player moved them up if they weren't in the exact center of the screen
            const dx = pointer.worldX - this.player.x;
            const dy = pointer.worldY - this.player.y;

            // Simple threshold
            if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
                // Determine primary axis or move in 8 directions
                // Replicating game.js logic:
                /*
                   if (Math.abs(dx) > Math.abs(dy)) {
                       if (dx > 30) right ...
                   } else { ... }
                */
                // We'll be smoother and just set velocity towards the touch
                // But mimicking the "Digital" feel of the previous logic:
                this.player.setVelocity(0); // Reset again
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > 30) {
                        this.player.setVelocityX(speed);
                        this.player.setFlipX(true);
                    }
                    else if (dx < -30) {
                        this.player.setVelocityX(-speed);
                        this.player.setFlipX(false);
                    }
                } else {
                    if (dy > 30) this.player.setVelocityY(speed);
                    else if (dy < -30) this.player.setVelocityY(-speed);
                }
            }
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
