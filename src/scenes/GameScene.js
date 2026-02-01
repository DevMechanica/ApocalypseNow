import * as Phaser from 'phaser';
import { CONSTANTS, CONFIG, ECONOMY } from '../config.js';
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

        // Building bounds (Centered)
        const leftPadding = scaledMapW * ECONOMY.FLOOR.padding.left;
        const rightPadding = scaledMapW * ECONOMY.FLOOR.padding.right;

        const buildingX = offsetX + leftPadding;
        const buildingWidth = scaledMapW - leftPadding - rightPadding;

        // Store bounds for clamping later
        this.buildingBounds = { minX: buildingX, maxX: buildingX + buildingWidth };

        // Vertical bounds based on room positions
        this.buildingY = offsetY + (ECONOMY.FLOOR.startY * scale);
        this.buildingHeight = 2200 * scale; // Keep this bound for now, but strictly we use floors

        this.physics.world.setBounds(buildingX, this.buildingY, buildingWidth, this.buildingHeight);

        // Debug: Draw Floor Lines
        this.physics.world.setBounds(buildingX, this.buildingY, buildingWidth, this.buildingHeight);


        // 2. Process Player Texture (Chroma Key)
        this.createPlayerTexture();

        // 3. Create Player - Position in center of screen
        const startX = screenWidth / 2;
        const startY = this.buildingY + (150 * scale);  // Start near top of building area

        this.player = this.physics.add.sprite(startX, startY, 'player_processed');
        this.player.setOrigin(0.5, 1); // Align feet to the floor line
        this.player.setScale(CONFIG.characterScale * scale);  // Scale player with map
        // We manage Y manually, so disable World Bounds collision for Y (or entirely if we manage X bounds too)
        // For now, let's keep world bounds but maybe we need to ensure the bounds don't overlap the floor line?
        // Actually, if we snap Y, we shouldn't collide with world bounds on Y.
        this.player.setCollideWorldBounds(true);
        this.player.body.onWorldBounds = true; // Optional

        // CRITICAL FIX: Disable vertical physics collision resolution to prevent jitter
        // The physics engine will try to "separate" the player if they touch the world bound.
        // Since we force Y, this creates a tug-of-war (Jitter).
        // Solution: Allow World Bounds only for X (left/right) or disable strictly for Y?
        // Arcade Physics doesn't allow per-axis world bounds easily. 
        // Simplest: Disable world bounds, and clamp X manually in update.
        this.player.setCollideWorldBounds(false);

        // Store scale for other calculations
        this.mapScale = scale;
        this.mapOffset = { x: offsetX, y: offsetY };

        // DevMode Debug Lines - Draw immediately if enabled
        if (CONFIG.devMode) {
            this.drawDevModeLines();
        }

        // Elevator Highlight (Glow)
        this.elevatorGlow = this.add.graphics();
        this.elevatorGlow.fillStyle(0x00ff00, 0.3); // Green, semi-transparent
        this.elevatorGlow.setBlendMode(Phaser.BlendModes.ADD); // Glow effect
        this.elevatorGlow.setDepth(50); // Behind player but above map
        this.elevatorGlow.setVisible(false);

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

        // 1. Selector Logic
        // Use bounds check for better accuracy with origin (0.5, 1)
        const bounds = this.player.getBounds();

        // Expand bounds slightly for touch friendliness
        const hitArea = new Phaser.Geom.Rectangle(
            bounds.x - 20,
            bounds.y - 20,
            bounds.width + 40,
            bounds.height + 40
        );

        if (hitArea.contains(worldPoint.x, worldPoint.y)) {
            if (this.selectedUnit === this.player) {
                this.selectedUnit = null;
                this.player.clearTint();
            } else {
                this.selectedUnit = this.player;
                this.player.setTint(0x00ff00);
            }
            return;
        }

        // 2. Move Logic
        // STRICT SELECTION: Only move if already selected
        if (this.selectedUnit) {
            // Determine target floor from click Y using FLOOR ZONES
            // Indices 0-3: 0=Top(Floor 4), 3=Bottom(Floor 1)
            let clickedFloor = -1;
            const clickY = worldPoint.y;

            for (let i = 0; i <= 3; i++) {
                const floorBottomY = this.getFloorY(i);
                const zoneTopY = (i === 0) ? 0 : this.getFloorY(i - 1);

                // Strict line-to-line matching (Zero overlap)
                // Inclusive on bottom (floor level), exclusive on top (ceiling)
                if (clickY > zoneTopY && clickY <= floorBottomY) {
                    clickedFloor = i;
                    break;
                }
            }

            // Catch-all: If click is below the very bottom floor line, it belongs to the bottom floor
            if (clickedFloor === -1 && clickY > this.getFloorY(3)) {
                clickedFloor = 3;
            }

            // If click is still outside any valid floor zone (e.g. above ceiling), ignore
            if (clickedFloor === -1) {
                console.log('Clicked outside valid floor zones');
                return;
            }

            if (clickedFloor !== this.currentFloor) {
                // AUTOMATIC ELEVATOR NAVIGATION:
                // Trigger the walk-to-elevator sequence
                this.triggerElevatorMove(clickedFloor);

                // Save where we want to walk AFTER the elevator trip
                const halfWidth = (this.player.width * this.player.scaleX) / 2;
                this.rtsTargetX = Phaser.Math.Clamp(
                    worldPoint.x,
                    this.buildingBounds.minX + halfWidth,
                    this.buildingBounds.maxX - halfWidth
                );

                console.log(`Auto-Pilot: Walking to elevator to reach Floor ${4 - clickedFloor}`);
            } else {
                // Same floor: Move horizontally
                // If we were walking to the elevator for another floor, cancel that.
                if (this.playerState === 'MOVING_TO_ELEVATOR') {
                    this.playerState = 'WALKING';
                }

                const halfWidth = (this.player.width * this.player.scaleX) / 2;
                const clampedX = Phaser.Math.Clamp(
                    worldPoint.x,
                    this.buildingBounds.minX + halfWidth,
                    this.buildingBounds.maxX - halfWidth
                );

                this.targetPosition = new Phaser.Math.Vector2(clampedX, this.getFloorY(clickedFloor));
                this.rtsTargetX = null; // Clear any pending elevator resume
            }
        }


    }

    update(time, delta) {

        if (!this.player) return;

        // Initialize state if missing
        // Initialize state if missing
        if (!this.playerState) {
            this.playerState = 'IDLE';
            this.currentFloor = 3; // Start at Floor 1 (Bottom, index 3)
            this.targetFloor = 3;
            // Snap to floor 1 initially
            this.player.y = this.getFloorY(3);
        }

        const speed = CONFIG.characterSpeed;
        const elevatorX = this.getElevatorX();
        // Elevator visual feedback (Only in DevMode)
        if (CONFIG.devMode && this.canUseElevator()) {
            this.elevatorGlow.setVisible(true);
            const floorY = this.getFloorY(this.currentFloor);
            // Draw glow at elevator position on current floor
            this.elevatorGlow.clear();
            this.elevatorGlow.fillStyle(0x00ff00, 0.3);
            const halfWidth = (this.player.width * this.player.scaleX) / 2;
            const rightWallX = this.buildingBounds.maxX - halfWidth;
            // Rectangle approx size of elevator door/area (100x150)
            this.elevatorGlow.fillRect(rightWallX - 50, floorY - 150, 100, 150);
        } else {
            this.elevatorGlow.setVisible(false);
        }

        const elevatorZone = CONFIG.ELEVATOR.width / 2;

        // --- ELEVATOR SEQUENCE ---

        // State: Moving to elevator (walking to right wall)
        if (this.playerState === 'MOVING_TO_ELEVATOR') {
            const halfWidth = (this.player.width * this.player.scaleX) / 2;
            const elevatorX = this.buildingBounds.maxX - halfWidth;
            const dist = elevatorX - this.player.x;

            if (Math.abs(dist) > 4) {
                this.player.setVelocityX(Math.sign(dist) * speed);
                this.player.setFlipX(dist > 0);
            } else {
                // Arrived at elevator
                this.player.setVelocityX(0);
                this.player.x = elevatorX;
                this.playerState = 'IN_ELEVATOR';
                this.player.setVisible(false); // Hide

                // Start 2-second hold timer
                this.time.delayedCall(2000, () => {
                    if (this.playerState === 'IN_ELEVATOR') {
                        // Teleport to target floor
                        this.currentFloor = this.targetFloor;
                        this.player.y = this.getFloorY(this.targetFloor);
                        this.player.setVisible(true); // Show
                        this.playerState = 'IDLE';

                        // Resume RTS movement if pending
                        if (this.rtsTargetX !== null) {
                            this.targetPosition = new Phaser.Math.Vector2(this.rtsTargetX, this.getFloorY(this.targetFloor));
                            this.rtsTargetX = null;
                        }
                    }
                });
            }
            return; // Block all other input
        }

        // State: Inside elevator (waiting for 2-second timer)
        if (this.playerState === 'IN_ELEVATOR') {
            // Block all input while in elevator
            this.player.setVelocityX(0);
            this.player.setVelocityY(0);
            return;
        }

        // --- NORMAL MOVEMENT (Floor Locked) ---

        // Ensure Y is locked to floor (unless jumping/falling which is disabled)
        const floorY = this.getFloorY(this.currentFloor);
        if (Math.abs(this.player.y - floorY) > 0.1) {
            this.player.y = floorY;
            this.player.setVelocityY(0);
        }

        // STRICT SELECTION CHECK FOR INPUT
        if (this.selectedUnit !== this.player) {
            this.player.setVelocityX(0);
            return;
        }

        let velocityX = 0;
        let isKeyboardMoving = false;

        // Horizontal Input
        // Use physics world bounds
        const bounds = this.physics.world.bounds;
        const halfWidth = (this.player.width * this.player.scaleX) / 2;

        // PREDICTIVE BLOCKING: Check bounds before setting velocity to prevent jitter
        const minX = bounds.x + halfWidth;
        const maxX = bounds.x + bounds.width - halfWidth;

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            if (this.player.x > minX + 1) { // Buffer
                velocityX = -speed;
                this.player.setFlipX(false);
                isKeyboardMoving = true;
            }
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            if (this.player.x < maxX - 1) { // Buffer
                velocityX = speed;
                this.player.setFlipX(true);
                isKeyboardMoving = true;
            }
        }

        // CLAMP X manually since WorldBounds are off
        // 0 to camera width (or world bounds width)
        // Use physics world bounds
        // const bounds = this.physics.world.bounds; // Already defined above
        // const halfWidth = (this.player.width * this.player.scaleX) / 2; // Already defined above

        if (this.player.x < bounds.x + halfWidth) {
            this.player.x = bounds.x + halfWidth;
            if (velocityX < 0) velocityX = 0;
        }
        if (this.player.x > bounds.x + bounds.width - halfWidth) {
            this.player.x = bounds.x + bounds.width - halfWidth;
            if (velocityX > 0) velocityX = 0;
        }

        // Vertical Input (Only at Elevator) - Use JustDown to prevent repeat
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.up)) {
            if (this.canUseElevator()) {
                this.triggerElevatorMove(this.currentFloor - 1);
            }
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.wasd.down)) {
            if (this.canUseElevator()) {
                this.triggerElevatorMove(this.currentFloor + 1);
            }
        }



        if (isKeyboardMoving) {
            this.targetPosition = null;
            this.rtsTargetX = null;
            this.player.setVelocityX(velocityX);
            this.playerState = 'WALKING';
            return;
        }

        // RTS Movement
        if (this.targetPosition) {
            const dist = this.targetPosition.x - this.player.x;
            if (Math.abs(dist) > 4) {
                this.player.setVelocityX(Math.sign(dist) * speed);
                this.player.setFlipX(dist > 0);
                this.playerState = 'WALKING';
            } else {
                this.player.setVelocityX(0);
                this.player.x = this.targetPosition.x;
                this.targetPosition = null;
                this.playerState = 'IDLE';
            }
        } else {
            this.player.setVelocityX(0);
            this.playerState = 'IDLE';
        }
    }

    getFloorY(floorIndex) {

        // Calculate Y based on config
        // Base start + (floor * height)
        // Adjust for scale
        // We add an offset to align feet with the floor line visually
        const floorHeightWorld = ECONOMY.FLOOR.height * this.mapScale;
        // StartY in config is now the exact floor line (1510).
        // User requested "a little lower". Increased offset to +25.
        const startYWorld = this.buildingY + (CONFIG.characterScale * this.mapScale * 25);
        return startYWorld + (floorIndex * floorHeightWorld);
    }

    getElevatorX() {
        const screenWidth = this.cameras.main.width;
        // Assuming elevator is at center of building
        // buildingX and buildingWidth are needed. 
        // We can recalculate or store them. For now, use map center calculated in create()
        // mapOffset.x + (scaledMapW * elevatorXRatio)
        const scaledMapW = this.cameras.main.width / this.mapScale * this.mapScale; // wait...
        // Re-use stored values if possible, or recalculate:
        // Center of screen is approx center of building
        return screenWidth / 2;
    }

    canUseElevator() {
        // Elevator is at the right wall
        const halfWidth = (this.player.width * this.player.scaleX) / 2;
        const rightWallX = this.buildingBounds.maxX - halfWidth;
        // Increase threshold to 20 pixels for more forgiving interaction
        return Math.abs(this.player.x - rightWallX) < 20;
    }

    triggerElevatorMove(targetFloor) {
        // Clamp to valid floors (0-3) -> Floors 4-1
        if (targetFloor < 0 || targetFloor > 3) return;
        if (targetFloor === this.currentFloor) return;

        // Clear existing movement targets immediately
        this.targetPosition = null;
        this.rtsTargetX = null;

        // Store target for state machine
        this.targetFloor = targetFloor;

        // Start elevator sequence: Move to elevator position first
        this.playerState = 'MOVING_TO_ELEVATOR';
    }

    startElevatorTravel() {
        this.playerState = 'ELEVATOR_TRAVEL';
    }

    drawDevModeLines() {
        // Create a fresh graphics object for debug lines
        const gfx = this.add.graphics();
        gfx.setDepth(1000); // Very high depth to be on top

        // Calculate dimensions
        const screenWidth = this.cameras.main.width;
        const totalHeight = this.getFloorY(ECONOMY.FLOOR.maxFloors) + 500;

        // --- FLOOR ZONES & LINES (GREEN/TINTED) ---
        const zoneColors = [0x0000ff, 0x00ff00, 0xffff00, 0xff0000]; // Blue, Green, Yellow, Red

        for (let i = 0; i <= 3; i++) { // Floors 0-3 (Top to Bottom)
            const floorBottomY = this.getFloorY(i);
            const zoneTopY = (i === 0) ? 0 : this.getFloorY(i - 1);
            let zoneHeight = floorBottomY - zoneTopY;

            // Extend bottom floor visualization to show infinite catch-all
            if (i === 3) zoneHeight += 1000;

            // Fill zone with semi-transparent color
            gfx.fillStyle(zoneColors[i], 0.1);
            gfx.fillRect(0, zoneTopY, screenWidth * 2, zoneHeight);

            // Draw floor line
            gfx.lineStyle(3, 0x00ff00, 1.0);
            gfx.strokeLineShape(new Phaser.Geom.Line(0, floorBottomY, screenWidth * 2, floorBottomY));

            // Add floor label
            const displayFloor = 4 - i; // 0->4, 1->3, 2->2, 3->1
            this.add.text(20, floorBottomY - 25, `Floor ${displayFloor} Zone`, {
                fontSize: '14px',
                color: '#ffffff',
                backgroundColor: '#00000088'
            }).setDepth(1001);
        }

        // --- WALL LINES (RED) - Vertical ---
        gfx.lineStyle(3, 0xff0000, 1.0); // Bright red, full opacity

        // Left wall
        gfx.strokeLineShape(new Phaser.Geom.Line(
            this.buildingBounds.minX, 0,
            this.buildingBounds.minX, totalHeight
        ));

        // Right wall
        gfx.strokeLineShape(new Phaser.Geom.Line(
            this.buildingBounds.maxX, 0,
            this.buildingBounds.maxX, totalHeight
        ));

        // Add wall labels
        this.add.text(this.buildingBounds.minX + 5, 100, 'LEFT WALL', {
            fontSize: '12px',
            color: '#ff0000',
            backgroundColor: '#000000'
        }).setDepth(1000);

        this.add.text(this.buildingBounds.maxX - 80, 100, 'RIGHT WALL', {
            fontSize: '12px',
            color: '#ff0000',
            backgroundColor: '#000000'
        }).setDepth(1000);
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
