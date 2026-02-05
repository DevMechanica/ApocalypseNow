import * as Phaser from 'phaser';
import { CONSTANTS, CONFIG, ECONOMY } from '../config.js';
import { EconomyManager } from '../economy.js';
import { FloatingTextSystem } from '../systems/FloatingTextSystem.js';
import { MAP_OBJECTS_CONFIG } from '../mapObjectsConfig.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super(CONSTANTS.SCENES.GAME);
    }

    init(data) {
        this.sceneId = data.sceneId || 1;
        this.entryPoint = data.entry || 'DEFAULT'; // 'TOP', 'BOTTOM', or 'DEFAULT'
        this.transitionData = data.transition || null; // Capture transition data
        this.sceneConfig = CONSTANTS.SCENE_CONFIG[this.sceneId];
        console.log(`Initializing GameScene: Scene ${this.sceneId} (${this.sceneConfig.name}) Entry: ${this.entryPoint}`);
    }

    create() {
        // Room visual registry (key -> sprite)
        this.roomVisuals = {};

        // Initialize Economy Manager
        this.economy = new EconomyManager(this);
        this.economy.init();

        // Initialize Floating Text System
        this.floatingTextSystem = new FloatingTextSystem(this);

        // Detect and register pre-placed objects from the map
        this.time.delayedCall(500, () => {
            this.detectMapObjects();
        });

        // 1. Setup World/Map - Scale to fit screen (show full width)
        const mapKey = this.sceneConfig.asset;
        const map = this.add.image(0, 0, mapKey).setOrigin(0, 0);

        // Scale map to fit the viewport (prioritize showing full width)
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const scaleX = screenWidth / map.width;
        const scaleY = screenHeight / map.height;
        // Use Math.max to fill the screen completely (no black bars)
        // All scene maps now have matching dimensions after regeneration
        const scale = Math.max(scaleX, scaleY);

        map.setScale(scale);

        // Calculate scaled dimensions
        const scaledMapW = map.width * scale;
        const scaledMapH = map.height * scale;

        // Center the map on screen
        const offsetX = (screenWidth - scaledMapW) / 2;
        const offsetY = (screenHeight - scaledMapH) / 2;
        map.setPosition(offsetX, offsetY);

        // Native Camera Bounds (Standard Phaser Implementation)
        // Wraps the camera to the exact dimensions of the scaled map image.
        this.cameras.main.setBounds(offsetX, offsetY, scaledMapW, scaledMapH);

        // Building bounds - Use Python-derived room positioning
        // These are source image pixel values from grid_config.json
        const SOURCE_CANVAS_WIDTH = 2784;  // grid_config.json -> canvas.width
        const SOURCE_ROOM_X = 418;         // grid_config.json -> room.xPosition
        const SOURCE_ROOM_W = 1948;        // grid_config.json -> room.scaledWidth
        const GRID_PADDING_RATIO = 0.12;   // grid_config.json -> grid.positionPaddingRatio

        // Calculate inner walkable area (grid area with padding applied)
        // This matches where assets are placed in the Python script
        const innerRoomX = SOURCE_ROOM_X + (SOURCE_ROOM_W * GRID_PADDING_RATIO);
        const innerRoomW = SOURCE_ROOM_W * (1.0 - (GRID_PADDING_RATIO * 2));

        // ⚠️ LOCKED VALUE - DO NOT CHANGE
        // Wall line horizontal offset, calibrated to match room visuals
        const WALL_OFFSET_PX = -50;  // Negative = shift left

        // Scale source coordinates to current map scale
        const buildingX = offsetX + ((innerRoomX + WALL_OFFSET_PX) / SOURCE_CANVAS_WIDTH) * scaledMapW;
        const buildingWidth = (innerRoomW / SOURCE_CANVAS_WIDTH) * scaledMapW;

        // Store bounds for clamping later
        this.buildingBounds = { minX: buildingX, maxX: buildingX + buildingWidth };

        // Vertical bounds based on scene-specific room positions
        const isSurface = (this.sceneId === 1);
        const sceneFloorConfig = isSurface
            ? ECONOMY.FLOOR.sceneConfig.surface
            : ECONOMY.FLOOR.sceneConfig.underground;
        const floorStartY = sceneFloorConfig.firstRoomY;
        this.buildingY = offsetY + (floorStartY * scale);

        // Dynamic Height Calculation: Floors * Height + Margin
        const numFloors = this.sceneConfig.endFloor - this.sceneConfig.startFloor + 1;
        this.buildingHeight = (numFloors * ECONOMY.FLOOR.height * scale) + (500 * scale); // Adequate buffer

        this.physics.world.setBounds(buildingX, this.buildingY, buildingWidth, this.buildingHeight);



        // 2. Process Player Texture (Chroma Key)
        this.createPlayerTexture();

        // LAUNCH THE UI SCENE
        this.scene.launch(CONSTANTS.SCENES.UI);
        this.scene.bringToTop(CONSTANTS.SCENES.UI); // Ensure UI stays on top after restart

        // 3. Create Player - Position in center of screen
        const startX = screenWidth / 2;
        const startY = this.buildingY + (150 * scale);  // Start near top of building area

        this.player = this.physics.add.sprite(startX, startY, 'player_processed');
        this.player.setOrigin(0.5, 1); // Align feet to the floor line
        this.player.setScale(CONFIG.characterScale * scale);  // Scale player with map

        // DEBUG: Log Player Creation
        console.log(`[GameScene] Player Created at (${startX}, ${startY})`);
        console.log(`[GameScene] Texture 'player_processed' exists: ${this.textures.exists('player_processed')}`);
        console.log(`[GameScene] Player Visible: ${this.player.visible}, Alpha: ${this.player.alpha}`);

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

        // Resource Manual Farming Indicators
        this.indicators = {};
        this.events.on('manualHarvestReady', this.showHarvestIndicator, this);

        // 4. Camera Setup - Static view (no ZOOM by default)
        // Reset bounds to match screen
        // DISABLE BOUNDS during transition to allow off-screen scrolling
        // this.cameras.main.setBounds(0, 0, screenWidth, screenHeight);

        // HANDLE TRANSITION ANIMATION
        if (this.transitionData && this.transitionData.type === 'SLIDE') {
            console.log('[GameScene] Handling Transition:', this.transitionData);
            const dir = this.transitionData.direction; // 'UP' or 'DOWN'
            // ... (Logic matching implementation plan)

            // Re-evaluating UI Scene Logic:
            // Down Button -> Going Deeper.
            // Old Scene (Snapshot) moves UP. (Texture Y: 0 -> -Height).
            // This looks like we are panning DOWN. (We are moving downwards, so world moves Up).
            // New Scene (Game) should be BELOW the Old Scene.
            // So visually it sits at Y=+Height initially?
            // VISUAL: Old Scene is at Y=0. New Scene is at Y=H.
            // ANIMATION: Old Scene Y -> -H. New Scene Y -> 0.
            // Combine: Viewport moves form 0 to H? No.
            // Viewport moves DOWN over the content.

            // GameScene Camera Logic:
            // We want the GameScene MAP to appear at Screen Y = +Height initially.
            // MapWorldY is constant (0). 
            // ScreenY = MapWorldY - ScrollY.
            // We want ScreenY = +Height.
            // 0 - ScrollY = H => ScrollY = -H. 
            // Wait.
            // If ScrollY is -H, we are looking at Y=-H. The map (at 0) is H pixels BELOW us.
            // So Map Screen Y is +H. Correct.

            let startScrollY = 0;
            if (dir === 'DOWN') {
                // Going Deeper.
                // Snapshot Moves UP (Y: 0 -> -H).
                // We want New Scene to move UP (appear from bottom).
                // Initial: Map at +H (Bottom).
                // ScrollY needs to be -H.
                startScrollY = -screenHeight;
            } else {
                // Going UP (Surface).
                // Snapshot Moves DOWN (Y: 0 -> +H).
                // We want New Scene to move DOWN (appear from top).
                // Initial: Map at -H (Top).
                // We want Map Screen Y = -H.
                // 0 - ScrollY = -H => ScrollY = +H.
                startScrollY = screenHeight;
            }

            console.log(`[GameScene] Setting initial scrollY to ${startScrollY}`);
            // Force scrollY (bypass bounds if any remained)
            this.cameras.main.scrollY = startScrollY;

            this.tweens.add({
                targets: this.cameras.main,
                scrollY: 0,
                duration: 1000,
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                    console.log('[GameScene] Camera tween complete');
                    // Restore bounds after transition?
                    // this.cameras.main.setBounds(0, 0, screenWidth, screenHeight);
                }
            });
        } else {
            console.log('[GameScene] No transition data found');
        }

        // 5. Input Setup (Touch Camera & RTS Controls)
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.input.addPointer(1); // Enable multi-touch (2 pointers total)

        // RESET STATE VARIABLES (Critical for Scene Restart)
        this.playerState = null;
        this.currentFloor = null;
        this.targetFloor = null;
        this.selectedUnit = null;
        this.targetPosition = null;
        this.rtsTargetX = null;

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
        // Logic for Unit Selection / Movement / Collection
        const worldPoint = pointer.positionToCamera(this.cameras.main);

        // 1. Check for Machine Collection (Manual Mode)
        const state = this.registry.get('gameState');
        if (state && !state.autoFarming) {
            // Check each registered room visual
            for (const [key, visual] of Object.entries(this.roomVisuals)) {
                // If visual is a real image/rectangle, check its bounds
                // If it's a mock, we can check proximity to its x,y
                const isHit = visual.getBounds ?
                    visual.getBounds().contains(worldPoint.x, worldPoint.y) :
                    Phaser.Math.Distance.Between(worldPoint.x, worldPoint.y, visual.x, visual.y) < 50;

                if (isHit) {
                    console.log(`[GameScene] Clicked machine: ${key}`);
                    if (this.economy && this.economy.resourceSystem) {
                        // In manual mode, clicking the machine "farms" it (immediate production)
                        const farmed = this.economy.resourceSystem.farmFromRoom(key);

                        // Also try to collect anything that was already stored
                        const collected = this.economy.resourceSystem.collectFromRoom(key);

                        if (farmed || collected) {
                            // Clear indicator (if any)
                            this.clearHarvestIndicator(key);

                            // Trigger feedback animation on the machine
                            this.tweens.add({
                                targets: visual,
                                scaleX: visual.scaleX * 1.1,
                                scaleY: visual.scaleY * 1.1,
                                duration: 100,
                                yoyo: true
                            });
                            return; // Success, don't move
                        }
                    }
                }
            }
        }

        // 2. Selector Logic
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
            let clickedFloor = -1;
            const clickY = worldPoint.y;

            const startFloor = this.sceneConfig.startFloor;
            const endFloor = this.sceneConfig.endFloor;

            for (let i = startFloor; i <= endFloor; i++) {
                const floorBottomY = this.getFloorY(i);

                // Get top of zone
                let zoneTopY = 0;
                if (i > startFloor) {
                    zoneTopY = this.getFloorY(i - 1); // Previous floor bottom is this zone top
                } else {
                    // For the very first floor in scene, Top is effectively 0 or undefined.
                    // Let's assume 0 for simplicity or map top.
                    zoneTopY = 0;
                }

                // Strict line-to-line matching (Zero overlap)
                // Inclusive on bottom (floor level), exclusive on top (ceiling)
                if (clickY > zoneTopY && clickY <= floorBottomY) {
                    clickedFloor = i;
                    break;
                }
            }

            // Catch-all: If click is below the very bottom floor line, it belongs to the bottom floor
            if (clickedFloor === -1 && clickY > this.getFloorY(endFloor)) {
                clickedFloor = endFloor;
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

                console.log(`Auto-Pilot: Walking to elevator to reach Global Floor ${clickedFloor}`);
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

            // Determine start floor based on entry point
            const startFloor = this.sceneConfig.startFloor;
            const endFloor = this.sceneConfig.endFloor;

            if (this.entryPoint === 'TOP') {
                this.currentFloor = startFloor;
            } else if (this.entryPoint === 'BOTTOM') {
                this.currentFloor = endFloor;
            } else {
                // Default (Game Start): Bottom floor of Scene 1? 
                // Or maybe middle? Let's default to bottom (ground level usually)
                this.currentFloor = endFloor;
                // Exception for Surface (Scene 1): "Bottom" is floor 5 (Entrance).
                // Actually floor 1 is top, floor 5 is bottom? 
                // Let's check Python script. Floor 1 is Y=600 (Top). Floor 5 is Y=2676 (Bottom/Entrance).
                // So default start should be Surface Entrance = Floor 5.
            }

            this.targetFloor = this.currentFloor;
            // Snap to floor initially
            const initialY = this.getPlayerGroundedY(this.currentFloor);
            this.player.y = initialY;
            console.log(`[GameScene] Initial Floor Snap: Floor ${this.currentFloor} -> Y=${initialY}`);
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

                // NEW: Wait Phase
                this.playerState = 'WAITING_AT_ELEVATOR';
                // Player remains visible while waiting

                console.log('Player arrived at elevator. Waiting for cutscene...');

                // Wait 1.5 seconds then play cutscene
                this.time.delayedCall(1500, () => {
                    if (this.playerState === 'WAITING_AT_ELEVATOR') {
                        this.playElevatorCutscene(this.targetFloor);
                    }
                });
            }
            return; // Block all other input
        }

        // State: Waiting for cutscene to start
        if (this.playerState === 'WAITING_AT_ELEVATOR') {
            this.player.setVelocity(0);
            return;
        }

        // State: Watching Cutscene (Video Playing)
        if (this.playerState === 'WATCHING_CUTSCENE') {
            this.player.setVelocity(0);
            return;
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
        const targetY = this.getPlayerGroundedY(this.currentFloor);
        if (Math.abs(this.player.y - targetY) > 0.1) {
            this.player.y = targetY;
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

    playElevatorCutscene(targetFloor) {
        // Switch state
        this.playerState = 'WATCHING_CUTSCENE';

        const travelDelay = 1500; // Time between floors (ms)

        // --- PHASE 1: Departure Floor ---
        // Set player depth HIGH so visible above video during entry
        this.player.setDepth(1000);

        // Player visible at start, hides at video halfway (enters elevator)
        this.playElevatorVideo(this.currentFloor, {
            onHalfway: () => {
                // Player enters elevator at halfway point - fully hide
                this.player.setVisible(false);
                this.player.setAlpha(0);
                this.player.setVelocity(0, 0); // Stop any movement
                console.log('[Elevator] Player entered elevator');
            },
            onComplete: () => {
                console.log('[Elevator] Phase 1 complete. Traveling...');

                // Travel delay
                this.time.delayedCall(travelDelay, () => {
                    // Teleport player to target floor (still hidden)
                    this.currentFloor = targetFloor;
                    const newY = this.getPlayerGroundedY(targetFloor);

                    // Position player at elevator (right side of building)
                    const halfWidth = (this.player.width * this.player.scaleX) / 2;
                    const elevatorX = this.buildingBounds.maxX - halfWidth;

                    this.player.x = elevatorX;
                    this.player.y = newY;
                    this.player.setVelocity(0, 0);

                    // --- PHASE 2: Arrival Floor ---
                    // Video pauses at halfway, player appears, then video resumes
                    this.playElevatorVideo(targetFloor, {
                        pauseAtHalfway: true,
                        onHalfway: () => {
                            // Player exits elevator at halfway point - fully show
                            // Set depth ABOVE video so player is visible
                            this.player.setDepth(1000);
                            this.player.setVisible(true);
                            this.player.setAlpha(1);
                            console.log('[Elevator] Player exited elevator');
                        },
                        onComplete: () => {
                            console.log('[Elevator] Phase 2 complete. Sequence finished.');

                            // CRITICAL: Re-snap player to floor after cutscene
                            const finalY = this.getPlayerGroundedY(targetFloor);
                            this.player.y = finalY;

                            // Reset player depth to normal
                            this.player.setDepth(100);

                            // Sync physics body position and ensure it's active
                            if (this.player.body) {
                                this.player.body.reset(this.player.x, this.player.y);
                                this.player.body.enable = true;
                            }

                            // Restore control - CRITICAL: Both state AND selection
                            this.playerState = 'IDLE';
                            this.selectedUnit = this.player; // Re-select so player can move
                            this.player.setTint(0x00ff00); // Visual feedback for selection

                            // Clear any stale movement targets
                            this.targetPosition = null;

                            console.log(`[Elevator] Player final position: (${this.player.x}, ${this.player.y})`);
                            console.log(`[Elevator] playerState: ${this.playerState}, selectedUnit: ${this.selectedUnit ? 'set' : 'null'}`);

                            // Resume RTS movement if pending
                            if (this.rtsTargetX !== null) {
                                const logicTargetY = this.getFloorY(targetFloor);
                                this.targetPosition = new Phaser.Math.Vector2(this.rtsTargetX, logicTargetY);
                                this.rtsTargetX = null;
                            }

                            console.log('Elevator sequence complete. Now on floor ' + targetFloor);
                        }
                    });
                });
            }
        });
    }

    /**
     * Helper: Play elevator video with halfway-point callbacks
     * @param {number} floorIndex - Floor to position video at
     * @param {Object} options - { onHalfway, onComplete, pauseAtHalfway }
     */
    playElevatorVideo(floorIndex, options = {}) {
        const { onHalfway, onComplete, pauseAtHalfway } = options;

        const floorY = this.getFloorY(floorIndex);
        const buildingWidth = this.buildingBounds.maxX - this.buildingBounds.minX;
        const centerX = this.buildingBounds.minX + (buildingWidth / 2);

        console.log(`[Elevator] Playing video at floor ${floorIndex}`);
        const video = this.add.video(centerX + 20, floorY + 115, 'elevator_video');

        video.setScale(this.mapScale * 1.010);
        video.setOrigin(0.5, 1);
        video.setAlpha(0);


        let halfwayTriggered = false;

        video.on('play', () => {
            this.time.delayedCall(100, () => {
                if (!video.active) return;

                const vidW = video.width;
                const vidH = video.height;

                if (vidW > 0 && vidH > 0) {
                    const cropX = vidW * 0.76;
                    const cropY = vidH * 0.30;
                    const cropW = vidW * 0.03;
                    const cropH = vidH * 0.40;

                    video.setCrop(cropX, cropY, cropW, cropH);

                    this.tweens.add({
                        targets: video,
                        alpha: 1,
                        duration: 300,
                        ease: 'Linear'
                    });
                } else {
                    video.setAlpha(1);
                }
            });
        });

        // Monitor video progress for halfway point
        const checkHalfway = this.time.addEvent({
            delay: 50, // Check every 50ms
            loop: true,
            callback: () => {
                if (!video.active || halfwayTriggered) return;

                const currentTime = video.getCurrentTime();
                const duration = video.getDuration();

                if (duration > 0 && currentTime >= duration / 2) {
                    halfwayTriggered = true;
                    checkHalfway.destroy();

                    if (onHalfway) onHalfway();


                    // No pause - video continues, player just appears at halfway
                    // The video will finish naturally and trigger 'complete' event
                }
            }
        });

        // Set video depth BELOW player so player is visible in front during enter/exit
        video.setDepth(999);
        video.play(false);

        video.on('complete', () => {
            checkHalfway.destroy();
            // Fade out video before destroying
            this.tweens.add({
                targets: video,
                alpha: 0,
                duration: 500,
                ease: 'Linear',
                onComplete: () => {
                    video.destroy();
                    if (onComplete) onComplete();
                }
            });
        });
    }

    getFloorY(globalFloorIndex) {
        // globalFloorIndex is 1-based (1 to 50)
        // Convert to 0-based relative to Scene start

        const startFloor = this.sceneConfig.startFloor;
        const endFloor = this.sceneConfig.endFloor;

        // Check if floor is inside this scene
        if (globalFloorIndex < startFloor || globalFloorIndex > endFloor) {
            return -1000; // Off-screen
        }

        const localIndex = globalFloorIndex - startFloor;

        // Use Python-derived positioning constants from config
        const isSurface = (this.sceneId === 1);
        const sceneFloorConfig = isSurface
            ? ECONOMY.FLOOR.sceneConfig.surface
            : ECONOMY.FLOOR.sceneConfig.underground;

        const firstRoomY = sceneFloorConfig.firstRoomY;      // Where first room starts (Y)
        const floorLineOffset = sceneFloorConfig.floorLineOffset; // Floor line within room
        const floorHeight = ECONOMY.FLOOR.height;            // Effective floor spacing (519)

        // Calculate floor line Y in source image pixels:
        // floor_line_Y = firstRoomY + floorLineOffset + (localIndex * floorHeight)
        const floorLineSourceY = firstRoomY + floorLineOffset + (localIndex * floorHeight);

        // Convert to world coordinates (scaled and offset)
        return this.mapOffset.y + (floorLineSourceY * this.mapScale);
    }

    // Helper to get grounded player Y (Floor Y + Visual Offset)
    getPlayerGroundedY(floorIndex) {
        const floorY = this.getFloorY(floorIndex);
        // Visual Offset: Move character DOWN to avoid floating.
        const visualOffset = 80 * this.mapScale;
        return floorY + visualOffset;
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
        // Clamp to valid floors for this scene
        const startFloor = this.sceneConfig.startFloor;
        const endFloor = this.sceneConfig.endFloor;

        if (targetFloor < startFloor || targetFloor > endFloor) return;
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
        // Forced Large Height to ensure walls verify
        const totalHeight = 10000;

        // --- FLOOR ZONES & LINES (GREEN/TINTED) ---
        const zoneColors = [0x0000ff, 0x00ff00, 0xffff00, 0xff0000, 0x00ffff]; // Blue, Green, Yellow, Red, Cyan

        const startFloor = this.sceneConfig.startFloor;
        const endFloor = this.sceneConfig.endFloor;
        const count = endFloor - startFloor + 1;

        for (let i = 0; i < count; i++) {
            const globalFloor = startFloor + i;
            const floorBottomY = this.getFloorY(globalFloor);

            // For Zone Top: Use previous floor's bottom
            let zoneTopY = 0;
            if (i > 0) {
                zoneTopY = this.getFloorY(globalFloor - 1);
            } else {
                zoneTopY = floorBottomY - (ECONOMY.FLOOR.height * this.mapScale); // Approx top for first floor
            }

            let zoneHeight = floorBottomY - zoneTopY;

            // Fill zone with semi-transparent color
            gfx.fillStyle(zoneColors[i % zoneColors.length], 0.1);
            gfx.fillRect(0, zoneTopY, screenWidth * 2, zoneHeight);

            // Draw floor line
            gfx.lineStyle(3, 0x00ff00, 1.0);
            gfx.strokeLineShape(new Phaser.Geom.Line(0, floorBottomY, screenWidth * 2, floorBottomY));

            // Add floor label
            this.add.text(20, floorBottomY - 25, `Global Floor ${globalFloor}`, {
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

        // Check if already processed
        if (textureManager.exists('player_processed')) {
            // Remove it to ensure we regenerate a fresh texture for the new scene/context
            // This prevents "disappearing" issues on scene re-entry
            textureManager.remove('player_processed');
        }

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

    /**
     * Get position for a room slot (for floating text)
     * @param {number} floor - Floor number
     * @param {number} slot - Starting slot number
     * @param {number} width - Width in slots (default 1)
     */
    showHarvestIndicator(data) {
        if (this.indicators[data.key]) return;

        const { x, y } = data.source;

        // Resource-specific scaling
        const scale = (data.type === 'water' || data.type === 'materials') ? 0.04 : 0.08;

        const icon = this.add.image(x, y - 100, `icon_${data.type === 'power' ? 'energy' : (data.type === 'caps' ? 'cash' : data.type)}`)
            .setScale(scale)
            .setAlpha(0);

        this.tweens.add({
            targets: icon,
            alpha: 1,
            y: y - 120,
            duration: 500,
            ease: 'Back.easeOut'
        });

        // Add a floating animation
        this.tweens.add({
            targets: icon,
            y: y - 50,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.indicators[data.key] = icon;
    }

    clearHarvestIndicator(key) {
        if (this.indicators[key]) {
            const icon = this.indicators[key];
            this.tweens.add({
                targets: icon,
                scale: 0,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    icon.destroy();
                }
            });
            delete this.indicators[key];
        }
    }

    getSlotPosition(floor, slot, width = 1) {
        const key = `${floor}_${slot}`;
        if (this.roomVisuals[key]) {
            return { x: this.roomVisuals[key].x, y: this.roomVisuals[key].y };
        }

        const floorY = this.getFloorY(floor);

        // Grid constants from config.js (synchronized with grid_config.json)
        const slots = ECONOMY.FLOOR.slots || 8;
        const slotSpacingFactor = ECONOMY.FLOOR.slotSpacingFactor || 0.77;

        // buildingBounds already accounts for GRID_PADDING_RATIO
        const gridStartX = this.buildingBounds.minX;
        const availableWidth = this.buildingBounds.maxX - this.buildingBounds.minX;
        const slotPx = availableWidth / slots;
        const spacingSlotPx = slotPx * slotSpacingFactor;

        // Calculate center of the machine
        // MATCH PYTHON: Center_X = grid_start_x + (slot * spacing_slot_px) + (slot_px * width) / 2 + x_offset_px
        let assetCenterX = gridStartX + (slot * spacingSlotPx) + ((width * slotPx) / 2);

        // Apply asset-specific X and Y offsets from config.js
        const state = this.registry.get('gameState');
        const roomData = state?.rooms?.[key];
        const offsets = ECONOMY.FLOOR.assetOffsets;
        let activeOffset = offsets.default;

        if (roomData && offsets[roomData.type]) {
            activeOffset = offsets[roomData.type];
        }

        assetCenterX += activeOffset.x * this.mapScale;
        return { x: assetCenterX, y: floorY + (activeOffset.y * this.mapScale) };
    }

    /**
     * Create visual sprite for a room
     */
    createRoomVisual(floor, slot, roomType) {
        const key = `${floor}_${slot}`;
        const roomDef = ECONOMY.ROOM_TYPES[roomType];

        // Get position
        const floorY = this.getFloorY(floor);
        const slotWidth = (this.buildingBounds.maxX - this.buildingBounds.minX) / 8;
        const roomX = this.buildingBounds.minX + (slotWidth * slot) + (slotWidth / 2);
        const roomY = floorY - 100; // Above floor line

        // Determine sprite key based on room type
        let spriteKey = null;
        if (roomType === 'hydroponic_garden') {
            spriteKey = 'room_garden';
        } else if (roomType === 'water_purifier') {
            spriteKey = 'room_water';
        } else if (roomType === 'power_generator') {
            spriteKey = 'room_generator';
        }

        if (spriteKey && this.textures.exists(spriteKey)) {
            const sprite = this.add.image(roomX, roomY, spriteKey);
            sprite.setScale(this.mapScale * 0.5); // Adjust scale as needed
            this.roomVisuals[key] = sprite;
            return sprite;
        }

        // Fallback: create placeholder
        const placeholder = this.add.rectangle(roomX, roomY, 100, 100, 0x00ff00, 0.3);
        this.roomVisuals[key] = placeholder;
        return placeholder;
    }

    /**
     * Detect pre-placed objects on the map and register them as producers
     */
    detectMapObjects() {
        console.log('[MapDetection] Scanning for pre-placed objects...');

        const sceneObjects = MAP_OBJECTS_CONFIG[this.sceneId];
        if (!sceneObjects) {
            console.log('[MapDetection] No objects configured for this scene');
            return;
        }

        let detectedCount = 0;

        // Iterate through floors in this scene
        Object.entries(sceneObjects).forEach(([floorStr, objects]) => {
            const floor = parseInt(floorStr);

            objects.forEach(obj => {
                const key = `${floor}_${obj.slot}`;

                // Calculate position for this object (with proper width)
                const position = this.getSlotPosition(floor, obj.slot, obj.width);

                // Create a mock visual object (since it's baked into the map)
                const mockVisual = { x: position.x, y: position.y };
                this.roomVisuals[key] = mockVisual;

                // Add to gameState if not already there
                const state = this.registry.get('gameState');
                if (state) {
                    if (!state.rooms[key]) {
                        state.rooms[key] = {
                            type: obj.type,
                            level: 1,
                            workers: [],
                            health: 100,
                            width: obj.width // Store width for position calculation
                        };
                    } else {
                        // Update width for existing rooms (in case they were created before width tracking)
                        state.rooms[key].width = obj.width;
                    }
                    this.registry.set('gameState', state);
                }

                // Register with resource system
                if (this.economy && this.economy.resourceSystem) {
                    this.economy.resourceSystem.registerRoom(key, state.rooms[key]);
                    detectedCount++;
                    console.log(`[MapDetection] Registered ${obj.type} at floor ${floor}, slot ${obj.slot}, width ${obj.width}`);
                }
            });
        });

        console.log(`[MapDetection] Complete! Detected ${detectedCount} objects`);
    }
}
