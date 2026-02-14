import * as Phaser from 'phaser';

import { PhaserResourceBars } from '../systems/PhaserResourceBars.js';
import { CONSTANTS, ECONOMY, INITIAL_GAME_STATE } from '../config.js';

export class UIScene extends Phaser.Scene {
    constructor() {
        super(CONSTANTS.SCENES.UI);
    }

    create() {
        // Initialize game state if not present
        if (!this.registry.get('gameState')) {
            this.registry.set('gameState', JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));
        }

        // Initialize Native Phaser Resource Bars
        this.resourceBars = new PhaserResourceBars(this);
        this.resourceBars.create();

        // Old Canvas Bars (Disabled)
        // this.createResourceBars();
        this.createButtons();
        this.createBuildPopup();
        this.createUpgradeDrawer();
        this.createPausePopup();
        this.createMapPopup();
        this.createSettingsPopup();
        this.createCancelBuildButton(); // Add Cancel Button initialization
        this.createTooltip();

        // Listen for economy updates
        const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
        if (gameScene) {
            gameScene.events.on('economyTick', this.updateAllResources, this);
            gameScene.events.on('economyTick', this.updateUpgradeButtonStates, this);
            gameScene.events.on('machineUpgraded', this.onMachineUpgraded, this);
        }

        // Listen for registry changes
        this.registry.events.on('changedata', this.updateData, this);

        // Input Blocking Logic
        this.input.on('gameobjectdown', () => {
            this.registry.set('uiBlocked', true);
        });

        this.input.on('pointerup', () => {
            this.registry.set('uiBlocked', false);
        });
    }

    createResourceBars() {
        const screenWidth = this.cameras.main.width;

        // Responsive sizing based on screen width
        const padding = Math.max(4, screenWidth * 0.01);
        const iconSize = Math.max(16, Math.floor(screenWidth * 0.035));
        const barWidth = Math.max(70, Math.floor(screenWidth * 0.13)); // Increased from 0.07 to 0.13 (Prolonged)
        const barHeight = Math.max(16, Math.floor(screenWidth * 0.03));
        const fontSize = Math.max(9, Math.floor(screenWidth * 0.018));

        // Calculate spacing to fit all 5 resources on screen
        const resourceKeys = ['caps', 'food', 'water', 'power', 'materials'];
        const totalResourceWidth = iconSize + barWidth + padding;
        const availableWidth = screenWidth - (padding * 2);
        // If we make bars too wide, we might need more space.
        // Let's use flexible spacing or just ensure they fit.
        // 5 items * (Icon + Bar + Gap) must < ScreenWidth.
        // spacing should be strictly width/5
        const spacing = Math.floor(availableWidth / resourceKeys.length);

        const y = padding;

        resourceKeys.forEach((key, index) => {
            const resDef = ECONOMY.RESOURCES[key];
            const containerX = padding + (index * spacing);
            const totalW = iconSize + 4 + barWidth;
            const totalH = Math.max(iconSize, barHeight);

            // Create invisible hit area for the entire resource group
            const hitArea = this.add.rectangle(containerX, y, totalW, totalH, 0x000000, 0)
                .setOrigin(0, 0)
                .setInteractive();

            hitArea.on('pointerover', () => {
                this.showTooltip(
                    containerX,
                    y + totalH + 5,
                    `${resDef.name}: ${resDef.description}`
                );
            });

            hitArea.on('pointerout', () => {
                this.hideTooltip();
            });

            // Icon - Larger and overlapping left edge
            const icon = this.add.image(containerX, y + barHeight / 2, resDef.icon)
                .setDisplaySize(iconSize * 1.3, iconSize * 1.3)
                .setDepth(10); // Above bar

            // Bar dimensions
            const pillHeight = barHeight;
            const pillWidth = barWidth; // Use full calculated width
            const pillX = containerX + (iconSize / 2); // Start bar halfway through icon
            const cornerRadius = 6; // User requested "not fully rounded", just "a bit"

            // Background Pill (Dark)
            const bgGraphics = this.add.graphics();
            bgGraphics.fillStyle(0x151d29, 1);
            bgGraphics.fillRoundedRect(pillX, y, pillWidth, pillHeight, cornerRadius);

            // Fill Pill (Colored) - We use a Graphics object that we can clear/redraw or use a masked rect
            // To make "width" updates easy without redrawing every frame if possible, 
            // but Graphics redraw is clean for rounded rects.
            const fillGraphics = this.add.graphics();
            // Initial draw (full or 0) - will be updated by updateResourceUI

            // Text - Centered in Pill
            const text = this.add.text(pillX + pillWidth / 2 + 5, y + pillHeight / 2, '', {
                fontSize: `${fontSize}px`,
                fontFamily: 'Arial',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5, 0.5).setDepth(5);

            // Store references
            this['barGraphics_' + key] = fillGraphics;
            this['barConfigs_' + key] = {
                x: pillX,
                y: y,
                w: pillWidth,
                h: pillHeight,
                color: resDef.color,
                radius: cornerRadius
            };
            this['text_' + key] = text;
        });

        // --- NEW PREMIUM TOGGLE SWITCH ---
        // Position it relative to the last resource or absolute right?
        // If we pack resources tightly, we might have space on far right.
        // Let's put it on the far right edge of the screen.
        const toggleW = 40;
        const toggleH = 20;
        const toggleX = screenWidth - toggleW / 2 - 20; // 20px padding from right
        const toggleY = y + barHeight / 2; // Vertically aligned with bars

        const toggleBtn = this.add.container(toggleX, toggleY);

        // Track Background (Capsule)
        const track = this.add.rectangle(0, 0, toggleW, toggleH, 0x111111)
            .setStrokeStyle(1.5, 0x444444);

        // Use a simple interact zone
        track.setInteractive({ useHandCursor: true });

        // Knob (Circle that slides)
        const knobSize = toggleH * 0.8;
        const knob = this.add.circle(-(toggleW / 2) + knobSize / 2 + 2, 0, knobSize / 2, 0x88ff88)
            .setStrokeStyle(1, 0xffffff);

        // Label Texture (Small text)
        const label = this.add.text(0, toggleH / 2 + 10, 'AUTO', {
            fontSize: `${Math.max(8, fontSize * 1.2)}px`,
            fontStyle: 'bold',
            color: '#88ff88'
        }).setOrigin(0.5);

        toggleBtn.add([track, knob, label]);

        const updateToggleVisual = (isAuto, animate = true) => {
            const targetX = isAuto ? -(toggleW / 2) + knobSize / 2 + 2 : (toggleW / 2) - knobSize / 2 - 2;
            const targetColor = isAuto ? 0x88ff88 : 0xff8888;
            const labelText = isAuto ? 'AUTO' : 'MANUAL';

            label.setText(labelText);
            label.setColor(isAuto ? '#88ff88' : '#ff8888');

            if (animate) {
                this.tweens.add({
                    targets: knob,
                    x: targetX,
                    duration: 150,
                    ease: 'Power2'
                });
                this.tweens.addCounter({
                    from: 0,
                    to: 100,
                    duration: 150,
                    onUpdate: (tween) => {
                        const v = tween.getValue() / 100;
                        // Manual color interpolation is messy in vanilla phaser without plugins, 
                        // so we just snap color at the end or use a halfway point
                        if (v > 0.5) knob.setFillStyle(targetColor);
                    }
                });
            } else {
                knob.x = targetX;
                knob.setFillStyle(targetColor);
            }
        };

        track.on('pointerdown', () => {
            const state = this.registry.get('gameState');
            state.autoFarming = !state.autoFarming;
            this.registry.set('gameState', state);
            updateToggleVisual(state.autoFarming);

            // AUTO-COLLECT if switched to Auto mode
            if (state.autoFarming) {
                const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
                if (gameScene && gameScene.economy && gameScene.economy.resourceSystem) {
                    gameScene.economy.resourceSystem.collectAll();
                }
            }

            // Add a small scale "click" effect
            this.tweens.add({
                targets: toggleBtn,
                scale: 0.95,
                duration: 50,
                yoyo: true
            });

            console.log(`Auto-Farming: ${state.autoFarming}`);
        });

        // Initialize state
        const initialState = this.registry.get('gameState');
        if (initialState) {
            updateToggleVisual(initialState.autoFarming, false);
        }

        this.autoFarmingToggle = toggleBtn;

        // Initial update
        this.updateAllResources();
    }

    createButtons() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Responsive sizing
        const btnSize = Math.max(30, Math.floor(width * 0.08));
        const sideMargin = Math.max(20, Math.floor(width * 0.05));
        const sideY = Math.max(80, Math.floor(height * 0.15));
        const spacing = Math.max(40, Math.floor(height * 0.08));
        const fontSize = Math.max(12, Math.floor(width * 0.025));

        const createSideBtn = (icon, index, callback) => {
            const btn = this.add.image(width - sideMargin, sideY + (index * spacing), icon)
                .setInteractive()
                .setDisplaySize(btnSize, btnSize);

            if (callback) {
                btn.on('pointerdown', callback);
            }
            return btn;
        };

        // Sidebar buttons (Right side)
        // Replaced old icons with new 'btn_side_X' assets
        const sideBtnKeys = ['btn_side_1', 'btn_side_2', 'btn_side_3', 'btn_side_4'];

        // Define actions for them (Temporary mapping until user identifies them)
        const sideBtnActions = [
            () => { console.log('Side Button 1 Clicked (Pause?)'); if (this.pausePopup) this.pausePopup.setVisible(!this.pausePopup.visible); },
            () => { console.log('Side Button 2 Clicked (Map?)'); if (this.mapPopup) this.mapPopup.setVisible(!this.mapPopup.visible); },
            () => { console.log('Side Button 3 Clicked (Settings?)'); if (this.settingsPopup) this.settingsPopup.setVisible(!this.settingsPopup.visible); },
            () => { console.log('Side Button 4 Clicked (Shop/Quests?)'); console.log('Shop/Quests logic here'); }
        ];

        sideBtnKeys.forEach((key, index) => {
            const btn = this.add.image(width - sideMargin, sideY + (index * (btnSize + 25)), key)
                .setInteractive();

            // Scale based on width to match other buttons, but let height be taller
            const scale = btnSize / btn.width;
            btn.setScale(scale, scale * 1); // 15% taller than wide

            // Add bouncy click
            btn.on('pointerdown', () => {
                this.tweens.add({
                    targets: btn,
                    scaleX: scale * 0.9,
                    scaleY: (scale * 1) * 0.9,
                    duration: 50,
                    yoyo: true
                });
                if (sideBtnActions[index]) sideBtnActions[index]();
            });
        });

        // --- NEW BOTTOM BAR ---
        const bottomBarHeight = Math.max(80, Math.floor(height * 0.12));
        const bottomY = height - bottomBarHeight / 2;

        // Helper to scale button while keeping aspect ratio
        const setupBottomButton = (x, keyRoot) => {
            const btn = this.add.image(x, bottomY, keyRoot + '_inactive').setInteractive();
            btn.keyRoot = keyRoot; // Store root for state toggling

            // User feedback: "still too big"
            // Reduce to 0.65x of bar height (smaller, more breathing room)
            const targetHeight = bottomBarHeight * 0.45;
            const scale = targetHeight / btn.height;
            btn.setScale(scale);

            return btn;
        };

        // Track buttons for animation
        this.bottomNavInteractables = [];

        // 1. Character Button (Left) - NOW CENTERED
        const btnChar = setupBottomButton(0, 'btn_char');
        const btnUpgrades = setupBottomButton(0, 'btn_upgrades');
        const btnAchiev = setupBottomButton(0, 'btn_achiev');

        this.bottomNavInteractables.push(btnChar, btnUpgrades, btnAchiev);

        // State for active menu
        this.activeMenuBtn = null;

        const setActiveMenu = (btn) => {
            // Reset previous
            if (this.activeMenuBtn && this.activeMenuBtn !== btn) {
                this.activeMenuBtn.setTexture(this.activeMenuBtn.keyRoot + '_inactive');
            }

            // Set new
            this.activeMenuBtn = btn;
            btn.setTexture(btn.keyRoot + '_active');
        };

        // Calculate layout for centering
        // User feedback: "one bit closer to each other" -> overlap slightly
        const btnSpacing = -5; // Negative spacing for overlap
        const totalWidth = btnChar.displayWidth + btnUpgrades.displayWidth + btnAchiev.displayWidth + (btnSpacing * 2);

        // Start X such that the group is centered
        let currentX = (width - totalWidth) / 2 + (btnChar.displayWidth / 2);

        // Position 1: Character
        btnChar.x = currentX;
        // User feedback: "touch the most down part" -> 0 padding
        const lowerY = height - (btnChar.displayHeight / 2);
        btnChar.y = lowerY;

        const addBouncyClick = (btn, callback) => {
            btn.on('pointerdown', () => {
                // Animation
                this.tweens.add({
                    targets: btn,
                    scaleX: btn.scaleX * 0.9,
                    scaleY: btn.scaleY * 0.9,
                    duration: 50,
                    yoyo: true
                });

                // Active State logic
                setActiveMenu(btn);

                if (callback) callback();
            });
        };

        addBouncyClick(btnChar, () => console.log('Character Menu Clicked'));

        // Position 2: Upgrades
        currentX += (btnChar.displayWidth / 2) + (btnUpgrades.displayWidth / 2) + btnSpacing;
        btnUpgrades.x = currentX;
        btnUpgrades.y = lowerY;

        addBouncyClick(btnUpgrades, () => {
            this.toggleUpgradeDrawer();
        });


        // Position 3: Achievements
        currentX += (btnUpgrades.displayWidth / 2) + (btnAchiev.displayWidth / 2) + btnSpacing;
        btnAchiev.x = currentX;
        btnAchiev.y = lowerY;

        addBouncyClick(btnAchiev, () => console.log('Achievements Menu Clicked'));

        // 4. Build Button (Right - Large)
        // Replaces old build button logic
        const buildBtnSize = Math.max(100, Math.floor(width * 0.25)); // Make it big
        // Create at 0,0 initially, will position with origin
        const buildBtn = this.add.image(0, 0, 'btn_build')
            .setInteractive();

        // Scale build button firmly to width, but keep aspect ratio
        // User feedback: "build button should be smaller"
        // Reduced from 1.1x to 0.8x
        const targetBuildHeight = bottomBarHeight * 0.6;
        const buildScale = targetBuildHeight / buildBtn.height;
        buildBtn.setScale(buildScale);

        // Reposition build button to bottom-right corner
        buildBtn.setOrigin(0.95, 0.95);
        buildBtn.setPosition(width, height);

        buildBtn.on('pointerdown', () => {
            // Animation
            this.tweens.add({
                targets: buildBtn,
                scaleX: buildScale * 0.95,
                scaleY: buildScale * 0.95,
                duration: 50,
                yoyo: true
            });

            if (this.buildPopup) {
                this.buildPopup.setVisible(!this.buildPopup.visible);
            }
        });

        // Floor indicator - responsive positioning
        const bottomPadding = Math.max(20, Math.floor(height * 0.03));
        this.floorText = this.add.text(10, height - bottomPadding, 'Floor: 1', {
            fontSize: `${fontSize}px`,
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });

        // Survivor count
        this.survivorText = this.add.text(10, height - bottomPadding - (fontSize * 1.5), 'Survivors: 0/4', {
            fontSize: `${Math.floor(fontSize * 0.9)}px`,
            fontFamily: 'Arial',
            color: '#88ff88',
            stroke: '#000000',
            strokeThickness: 2
        });

        // --- NAVIGATION BUTTONS (Right Side, Above Build) ---
        // Positioned slightly above the Build Button
        const buildBtnHeight = bottomBarHeight * 0.6; // We know this from build btn logic
        const buildBtnWidthApprox = buildBtnHeight; // Assuming roughly square or similar aspect

        // Align with the center of the build button (which is at width - width/2)
        // Since build button is at (width, height) with origin (1,1)
        const navX = width - (buildBtnHeight / 2);

        const navBtnSize = 50;
        const padding = 10;

        // Down Arrow (Immediately above build button)
        const navY_Down = height - buildBtnHeight - (navBtnSize / 2) - padding;

        // Up Arrow (Above Down Arrow)
        const navY_Up = navY_Down - navBtnSize - padding;

        /* 
           Note: We have side buttons at (width - sideMargin). 
           We need to ensure these don't overlap. 
           If sideMargin is small, they might share the same column.
           Assuming side buttons start from top or middle, and these are at bottom.
        */

        // Up Arrow
        const btnUp = this.add.image(navX, navY_Up, 'btn_arrow_up')
            .setInteractive();

        // Scale to reasonable size
        const scaleUp = navBtnSize / btnUp.height;
        btnUp.setScale(scaleUp);

        btnUp.on('pointerdown', () => {
            this.tweens.add({
                targets: btnUp,
                scaleX: scaleUp * 0.9,
                scaleY: scaleUp * 0.9,
                duration: 50,
                yoyo: true
            });

            const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
            if (gameScene && gameScene.sceneId > 1) {
                this.startSceneTransition(gameScene.sceneId - 1, 'BOTTOM');
            }
        });

        // Down Arrow
        const btnDown = this.add.image(navX, navY_Down, 'btn_arrow_down')
            .setInteractive();

        const scaleDown = navBtnSize / btnDown.height;
        btnDown.setScale(scaleDown);

        btnDown.on('pointerdown', () => {
            this.tweens.add({
                targets: btnDown,
                scaleX: scaleDown * 0.9,
                scaleY: scaleDown * 0.9,
                duration: 50,
                yoyo: true
            });

            const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
            // Max scenes = 10
            if (gameScene && gameScene.sceneId < 10) {
                this.startSceneTransition(gameScene.sceneId + 1, 'TOP');
            }
        });
    }

    createPopupWindow(title) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const container = this.add.container(0, 0);
        container.setVisible(false);
        container.setDepth(100);

        // Overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setInteractive();

        overlay.on('pointerdown', () => {
            container.setVisible(false);
        });
        container.add(overlay);

        // Window
        const windowW = width * 0.9;
        const windowH = height * 0.65;
        const windowBg = this.add.rectangle(width / 2, height / 2, windowW, windowH, 0x1a2130)
            .setStrokeStyle(4, 0x4a5a75)
            .setInteractive();
        container.add(windowBg);

        // Title
        const titleText = this.add.text(width / 2, height / 2 - windowH / 2 + 25, title, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(titleText);

        // Close Button
        const closeBtn = this.add.text(width / 2 + windowW / 2 - 25, height / 2 - windowH / 2 + 25, 'X', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ff4444',
            fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive();

        closeBtn.on('pointerdown', () => {
            container.setVisible(false);
        });
        container.add(closeBtn);

        return { container, windowW, windowH };
    }

    createBuildPopup_OLD() {
        const { container, windowW, windowH } = this.createPopupWindow('Build Menu');
        this.buildPopup = container;

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const startX = width / 2 - windowW / 2 + 30;
        const startY = height / 2 - windowH / 2 + 60;
        const slotSize = 70;
        const gap = 15;

        // Room categories
        const categories = ['production', 'utility', 'defense', 'special'];
        const categoryColors = {
            production: 0x2a4a2a,
            utility: 0x2a3a4a,
            defense: 0x4a2a2a,
            special: 0x4a3a2a
        };

        let index = 0;
        Object.entries(ECONOMY.ROOM_TYPES).forEach(([key, room]) => {
            if (index >= 12) return;  // Max 12 slots

            const row = Math.floor(index / 3);
            const col = index % 3;
            const slotX = startX + col * (slotSize + gap);
            const slotY = startY + row * (slotSize + gap);

            const slot = this.add.rectangle(slotX, slotY, slotSize, slotSize, categoryColors[room.category])
                .setOrigin(0, 0)
                .setStrokeStyle(2, 0x5a657c)
                .setInteractive();

            // Room name (abbreviated)
            const shortName = room.name.split(' ').map(w => w[0]).join('');
            const nameText = this.add.text(slotX + slotSize / 2, slotY + slotSize / 2 - 8, shortName, {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            // Cost
            const cost = room.buildCost.materials || 0;
            const costText = this.add.text(slotX + slotSize / 2, slotY + slotSize / 2 + 12, `${cost}`, {
                fontSize: '10px',
                fontFamily: 'Arial',
                color: '#aaaaaa'
            }).setOrigin(0.5);

            // Click handler
            slot.on('pointerdown', () => {
                console.log(`Selected room: ${room.name}`);
                const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
                if (gameScene) {
                    // Emit event to start building mode
                    gameScene.events.emit('START_BUILDING', { roomType: key, roomData: room });

                    // Close the build menu
                    if (this.buildPopup) {
                        this.buildPopup.setVisible(false);
                    }
                }
            });

            this.buildPopup.add(slot);
            this.buildPopup.add(nameText);
            this.buildPopup.add(costText);

            index++;
        });
    }

    createPausePopup() {
        const { container } = this.createPopupWindow('Paused');
        this.pausePopup = container;
    }

    createMapPopup() {
        const { container, windowW, windowH } = this.createPopupWindow('Biome Map');
        this.mapPopup = container;

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Show available biomes
        let y = height / 2 - windowH / 2 + 70;
        Object.entries(ECONOMY.BIOMES).forEach(([key, biome]) => {
            const biomeText = this.add.text(width / 2, y, biome.name, {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: key === 'urban_ruins' ? '#88ff88' : '#666666'
            }).setOrigin(0.5);

            container.add(biomeText);
            y += 35;
        });
    }

    createSettingsPopup() {
        const { container } = this.createPopupWindow('Settings');
        this.settingsPopup = container;
    }

    updateData(parent, key, data) {
        if (key === 'gameState') {
            this.updateAllResources();
        }
    }

    updateAllResources() {
        const state = this.registry.get('gameState');
        if (!state) return;

        // Update each resource bar
        // Update Resource Bars
        if (this.resourceBars) {
            this.resourceBars.update(state);
        }

        // Update floor text
        if (this.floorText) {
            this.floorText.setText(`Floor: ${state.currentFloor}`);
        }

        // Update survivor count
        if (this.survivorText) {
            this.survivorText.setText(`Survivors: ${state.survivors.length}/${state.survivorCapacity}`);
        }
    }

    updateResourceUI(key, state) {
        const fillGraphics = this['barGraphics_' + key];
        const config = this['barConfigs_' + key];
        const text = this['text_' + key];

        if (!fillGraphics || !config || !text || !state) return;

        const current = Math.floor(state.resources[key] || 0);
        const max = state.resourceMax[key] || 0;

        // Update text
        if (key === 'caps') {
            text.setText(`$${current.toLocaleString()}`);
        } else if (max > 0) {
            text.setText(`${current}/${max}`);
        } else {
            text.setText(`${current}`);
        }

        // Redraw Bar
        const percent = (max > 0) ? Phaser.Math.Clamp(current / max, 0, 1) : 1;
        const currentW = Math.max(0, config.w * percent);

        fillGraphics.clear();
        if (currentW > 0) {
            fillGraphics.fillStyle(config.color, 1);

            // If width is smaller than corner radius, we reduce radius to avoid artifacts
            // or just clip it.
            // Simple approach: Standard rounded rect

            // To prevent "square" look at low percentages if we used simple rect, 
            // we use round for the whole thing.
            // Ideally, we might want it to be "cut off" on right but rounded on left?
            // "Pill" usually means fully rounded ends.
            // If we fill only part, it looks like a smaaaall pill.
            // Let's optimize: Draw rounded rect for full width, and mask it?
            // Actually, redrawing a small rounded rect looks fine as a "growing pill".

            // Corner radius from config (subtle, not full pill)
            const radius = config.radius || 5;

            // Ensure width isn't smaller than diameter? No, standard fillRoundedRect is robust.
            fillGraphics.fillRoundedRect(config.x, config.y, currentW, config.h, radius);
        }
    }

    createTooltip() {
        this.tooltipContainer = this.add.container(0, 0);
        this.tooltipContainer.setDepth(200);
        this.tooltipContainer.setVisible(false);

        const bg = this.add.rectangle(0, 0, 100, 40, 0x000000, 0.9)
            .setStrokeStyle(1, 0xffffff)
            .setOrigin(0, 0);

        const text = this.add.text(5, 5, '', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#ffffff',
            wordWrap: { width: 180 }
        });

        this.tooltipContainer.add([bg, text]);
        this.tooltipBg = bg;
        this.tooltipText = text;
    }

    showTooltip(x, y, text) {
        if (!this.tooltipContainer) return;

        this.tooltipText.setText(text);
        const bounds = this.tooltipText.getBounds();
        const width = bounds.width + 10;
        const height = bounds.height + 10;

        this.tooltipBg.setSize(width, height);

        // Ensure tooltip doesn't go off screen
        let finalX = x;
        let finalY = y;

        const screenWidth = this.cameras.main.width;
        if (finalX + width > screenWidth) {
            finalX = screenWidth - width - 5;
        }

        this.tooltipContainer.setPosition(finalX, finalY);
        this.tooltipContainer.setVisible(true);
    }

    hideTooltip() {
        if (this.tooltipContainer) {
            this.tooltipContainer.setVisible(false);
        }
    }

    startSceneTransition(nextSceneId, entryPoint) {
        const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
        if (!gameScene) return;

        // Prevent Double-Click
        if (this.registry.get('uiBlocked')) return;
        this.registry.set('uiBlocked', true);

        // Determine Direction
        // If moving to ID > current, we are going DOWN to deeper floors
        const direction = nextSceneId > gameScene.sceneId ? 'DOWN' : 'UP';

        console.log(`[UIScene] Starting Transition: Scene ${gameScene.sceneId} -> ${nextSceneId} (${direction})`);

        // 1. Capture Snapshot of the entire game
        // We use the game renderer to take a texture snap
        this.game.renderer.snapshot((image) => {
            console.log('[UIScene] Snapshot captured');
            // Create a temporary texture from the image source
            if (this.textures.exists('snap_transition')) {
                this.textures.remove('snap_transition');
            }
            this.textures.addImage('snap_transition', image);
            console.log('[UIScene] Texture created: snap_transition');

            const width = this.cameras.main.width;
            const height = this.cameras.main.height;

            // Create Image on UI Scene (since UI scene persists)
            const snap = this.add.image(0, 0, 'snap_transition').setOrigin(0, 0);
            snap.setDepth(-100);
            console.log(`[UIScene] Snapshot overlay added at 0,0 size ${snap.width}x${snap.height}`);

            // 2. Restart Game Scene immediately
            gameScene.scene.restart({
                sceneId: nextSceneId,
                entry: entryPoint,
                transition: {
                    type: 'SLIDE',
                    direction: direction
                }
            });

            // 3. Animate the Snapshot
            // Logic:
            // Going DOWN: We are descending. Old scene moves UP (visual). New scene appears from Bottom.
            // Going UP: We are ascending. Old scene moves DOWN (visual). New scene appears from Top.

            let targetY = 0;
            if (direction === 'DOWN') {
                targetY = -height; // Move old scene UP
            } else {
                targetY = height;  // Move old scene DOWN
            }

            this.tweens.add({
                targets: snap,
                y: targetY,
                duration: 1000,
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                    snap.destroy();
                    this.registry.set('uiBlocked', false);
                    console.log('[UIScene] Transition Complete');
                }
            });
        });
    }
    createBuildPopup_legacy() {
        // Use a larger window for the build menu
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const windowW = width * 0.95;
        const windowH = height * 0.85;

        const container = this.add.container(0, 0);
        container.setVisible(false);
        container.setDepth(100);
        this.buildPopup = container;

        // Overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
            .setInteractive();

        overlay.on('pointerdown', () => {
            container.setVisible(false);
        });
        container.add(overlay);

        // Window Background
        const bg = this.add.rectangle(width / 2, height / 2, windowW, windowH, 0x1a2130)
            .setStrokeStyle(4, 0x4a5a75)
            .setInteractive();
        container.add(bg);

        // Title
        const titleText = this.add.text(width / 2, height / 2 - windowH / 2 + 30, 'CONSTRUCTION', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(titleText);

        // Close Button
        const closeBtn = this.add.text(width / 2 + windowW / 2 - 30, height / 2 - windowH / 2 + 30, 'X', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ff4444',
            fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive();

        closeBtn.on('pointerdown', () => {
            container.setVisible(false);
        });
        container.add(closeBtn);

        // Grid Configuration
        const slotSize = 100;
        const gap = 20;

        // Calculate available area
        const startY = height / 2 - windowH / 2 + 80;
        const availableW = windowW - 60; // Padding
        const cols = Math.floor(availableW / (slotSize + gap));
        const totalGridW = cols * slotSize + (cols - 1) * gap;
        const startX = width / 2 - totalGridW / 2 + slotSize / 2; // Center the grid

        // Sort rooms by category, then cost
        const rooms = Object.entries(ECONOMY.ROOM_TYPES).sort((a, b) => {
            if (a[1].category !== b[1].category) return a[1].category.localeCompare(b[1].category);
            return (a[1].buildCost.materials || 0) - (b[1].buildCost.materials || 0);
        });

        // Category Colors
        const categoryColors = {
            production: 0x2a6a2a,
            utility: 0x2a4a6a,
            defense: 0x6a2a2a,
            special: 0x6a4a2a
        };

        rooms.forEach(([key, room], index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const slotX = startX + col * (slotSize + gap);
            const slotY = startY + row * (slotSize + gap);

            // Group Container for Slot
            const slot = this.add.rectangle(slotX, slotY, slotSize, slotSize, categoryColors[room.category] || 0x444444)
                .setStrokeStyle(2, 0x888888)
                .setInteractive();

            // Icon (if available, else text)
            let iconKey = room.sprite;
            if (!iconKey || !this.textures.exists(iconKey)) iconKey = 'icon_build'; // Fallback

            const icon = this.add.image(slotX, slotY - 15, iconKey);
            // Fit icon roughly
            const scale = Math.min((slotSize - 20) / icon.width, (slotSize - 40) / icon.height);
            icon.setScale(scale);

            // Name
            const nameText = this.add.text(slotX, slotY + 25, room.name.replace(' ', '\n'), {
                fontSize: '10px',
                fontFamily: 'Arial',
                align: 'center',
                color: '#ffffff',
                wordWrap: { width: slotSize - 5 }
            }).setOrigin(0.5, 0);

            // Cost Label
            const cost = room.buildCost.materials || 0;
            const costText = this.add.text(slotX, slotY + slotSize / 2 - 10, `${cost} Mat`, {
                fontSize: '10px',
                color: '#aaaaaa'
            }).setOrigin(0.5);

            // Click Handler
            slot.on('pointerdown', () => {
                const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
                if (gameScene) {
                    gameScene.events.emit('START_BUILDING', { roomType: key, roomData: room });
                    this.buildPopup.setVisible(false);
                }
            });

            container.add([slot, icon, nameText, costText]);
        });
    }

    createCancelBuildButton_legacy() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.cancelBtnContainer = this.add.container(width / 2, height - 80);
        this.cancelBtnContainer.setVisible(false);
        this.cancelBtnContainer.setDepth(200);

        const bg = this.add.rectangle(0, 0, 200, 50, 0xff0000)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive();

        const text = this.add.text(0, 0, 'CANCEL BUILD', {
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        bg.on('pointerdown', () => {
            const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
            if (gameScene && gameScene.cancelBuildMode) {
                gameScene.cancelBuildMode();
            }
        });

        this.cancelBtnContainer.add([bg, text]);

        // Listeners to toggle visibility
        const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
        if (gameScene) {
            gameScene.events.on('START_BUILDING', () => this.cancelBtnContainer.setVisible(true));
            gameScene.events.on('STOP_BUILDING', () => this.cancelBtnContainer.setVisible(false));

            // Check initial state
            if (gameScene.isBuildingMode) {
                this.cancelBtnContainer.setVisible(true);
            }
        }
    }
    createBuildPopup() {
        // Use a larger window for the build menu
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const windowW = width * 0.95;
        const windowH = height * 0.85;

        const container = this.add.container(0, 0);
        container.setVisible(false);
        container.setDepth(100);
        this.buildPopup = container;

        // Overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
            .setInteractive();

        overlay.on('pointerdown', () => {
            container.setVisible(false);
        });
        container.add(overlay);

        // Window Background
        const bg = this.add.rectangle(width / 2, height / 2, windowW, windowH, 0x1a2130)
            .setStrokeStyle(4, 0x4a5a75)
            .setInteractive();
        container.add(bg);

        // Title - Positioned higher to avoid overlap
        const titleText = this.add.text(width / 2, height / 2 - windowH / 2 + 50, 'CONSTRUCTION', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(titleText);

        // Close Button
        const closeBtn = this.add.text(width / 2 + windowW / 2 - 40, height / 2 - windowH / 2 + 40, 'X', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ff4444',
            fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive();

        closeBtn.on('pointerdown', () => {
            container.setVisible(false);
        });
        container.add(closeBtn);

        // Grid Configuration
        const slotSize = 130;
        const gap = 15;

        // Calculate available area logic
        const contentTopY = height / 2 - windowH / 2 + 160; // Increased top padding
        const availableW = windowW - 80; // Side padding
        const cols = Math.floor(availableW / (slotSize + gap));
        const totalGridW = cols * slotSize + (cols - 1) * gap;
        const startX = width / 2 - totalGridW / 2 + slotSize / 2;

        // Sort rooms by category, then cost
        const rooms = Object.entries(ECONOMY.ROOM_TYPES).sort((a, b) => {
            if (a[1].category !== b[1].category) return a[1].category.localeCompare(b[1].category);
            return (a[1].buildCost.materials || 0) - (b[1].buildCost.materials || 0);
        });

        // Category Colors
        const categoryColors = {
            production: 0x2a6a2a,
            utility: 0x2a4a6a,
            defense: 0x6a2a2a,
            special: 0x6a4a2a
        };

        rooms.forEach(([key, room], index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const slotX = startX + col * (slotSize + gap);
            const slotY = contentTopY + row * (slotSize + gap);

            // Group Container for Slot
            const slot = this.add.rectangle(slotX, slotY, slotSize, slotSize, categoryColors[room.category] || 0x444444)
                .setStrokeStyle(2, 0x888888)
                .setInteractive();

            // Icon
            let iconKey = room.sprite;
            if (!iconKey || !this.textures.exists(iconKey)) iconKey = 'icon_build';

            // Icon - Moved up and scaled to fit strictly
            const icon = this.add.image(slotX, slotY - 30, iconKey);
            // Max width: slot - padding. Max height: space above name text (approx 50px)
            const maxIconSize = slotSize - 20;
            const maxIconHeight = 50;
            const scale = Math.min(maxIconSize / icon.width, maxIconHeight / icon.height);
            icon.setScale(scale);

            // Name - Centered vertically in the available space between icon and cost
            const nameText = this.add.text(slotX, slotY + 10, room.name.replace(' ', '\n'), {
                fontSize: '10px',
                fontFamily: 'Arial',
                align: 'center',
                color: '#ffffff',
                fontStyle: 'bold',
                wordWrap: { width: slotSize - 5 }
            }).setOrigin(0.5, 0.5); // Center origin for better positioning

            // Detailed Cost Display
            const matCost = room.buildCost.materials || 0;
            const capsCost = room.buildCost.caps || 0;
            let costString = '';

            if (matCost > 0) costString += `${matCost} Mat`;
            if (capsCost > 0) costString += (costString ? '\n' : '') + `$${capsCost}`;

            // Cost - Fixed at bottom
            const costBg = this.add.rectangle(slotX, slotY + slotSize / 2 - 15, slotSize - 4, 24, 0x000000, 0.7);

            const costText = this.add.text(slotX, slotY + slotSize / 2 - 15, costString, {
                fontSize: '11px',
                fontFamily: 'Arial',
                align: 'center',
                color: '#ffdd44',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);

            // Click Handler with Resource Check
            slot.on('pointerdown', () => {
                const state = this.registry.get('gameState');
                const currentMats = state.resources.materials || 0;
                const currentCaps = state.resources.caps || 0;

                if (currentMats >= matCost && currentCaps >= capsCost) {
                    // Success
                    const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
                    if (gameScene) {
                        gameScene.events.emit('START_BUILDING', { roomType: key, roomData: room });
                        this.buildPopup.setVisible(false);
                    }
                } else {
                    // Failure
                    this.showFloatingMessage(slotX, slotY, "Not Enough Resources!", 0xff4444);
                    this.cameras.main.shake(100, 0.005);
                }
            });

            container.add([slot, icon, nameText, costBg, costText]);
        });
    }

    // =========================================================================
    // UPGRADE POPUP
    // =========================================================================

    // =========================================================================
    // UI HELPERS (HYBRID: USER BACKGROUND + PROCEDURAL ELEMENTS)
    // =========================================================================

    createIndustrialPanel(w, h) {
        const container = this.add.container(0, 0);

        // Use user-provided background
        if (this.textures.exists('ui_upgrade_panel')) {
            const panel = this.add.image(0, 0, 'ui_upgrade_panel').setOrigin(0.5, 0);

            // "Cover" scaling: Scale to fill dimensions
            const scaleX = w / panel.width;
            const scaleY = h / panel.height;
            // Use max to ensure it covers the height (since it's portrait)
            const scale = Math.max(scaleX, scaleY);

            // User requested "stretch horizontally a little" but "1.15 was too wide"
            // Reduced to 5% stretch.
            panel.setScale(scale * 1.05, scale);

            panel.setPosition(w / 2, 0);
            container.add(panel);
        } else {
            // Fallback if asset missing (safety)
            const bg = this.add.rectangle(0, 0, w, h, 0x222222).setOrigin(0);
            container.add(bg);
        }

        return container;
    }

    // Type: 'green', 'gray', 'red'
    createIndustrialButton(w, h, textStr, type = 'green', callback) {
        const container = this.add.container(0, 0);

        const colors = {
            green: { base: 0x4a8a3a, light: 0x6aba5a, dark: 0x2a5a2a, text: '#ffffff' },
            gray: { base: 0x4a4a4a, light: 0x6a6a6a, dark: 0x2a2a2a, text: '#aaaaaa' },
            red: { base: 0x8a3a3a, light: 0xba5a5a, dark: 0x5a2a2a, text: '#ffffff' }
        };
        const c = colors[type] || colors.green;

        const bg = this.add.graphics();
        container.add(bg);

        const drawBtn = (isPressed) => {
            bg.clear();
            const yOff = isPressed ? 2 : 0;

            // Shadow/Bevel Bottom
            bg.fillStyle(c.dark, 1);
            bg.fillRoundedRect(0, 0 + yOff, w, h, 6);

            // Main Body
            bg.fillStyle(c.base, 1);
            bg.fillRoundedRect(0, 0 + yOff, w, h - 4, 6);

            // Highlight Top
            bg.fillStyle(c.light, 1);
            bg.fillRoundedRect(2, 2 + yOff, w - 4, h / 2 - 4, { tl: 4, tr: 4, bl: 0, br: 0 });
        };

        drawBtn(false);

        // Text
        const text = this.add.text(Math.round(w / 2), Math.round(h / 2 - 2), textStr, {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: c.text,
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', fill: true }
        }).setOrigin(0.5).setResolution(2);
        container.add(text);

        // Interactive Region
        container.setSize(w, h);
        container.setInteractive();

        if (type !== 'gray') {
            container.on('pointerdown', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation(); // Stop map drag
                drawBtn(true);
                text.y += 2;
                if (callback) callback();
            });
            container.on('pointerup', () => {
                drawBtn(false);
                text.y -= 2;
            });
            container.on('pointerout', () => {
                drawBtn(false);
                text.y = h / 2 - 2;
            });
        }

        container.btnBg = bg; // Reference for updates
        return container;
    }

    createSlotBackground(w, h) {
        const container = this.add.container(0, 0);
        const g = this.add.graphics();

        // Simple semi-transparent dark background for slots
        // to let the main background show through slightly if desired, or just solid
        g.fillStyle(0x000000, 0.6);
        g.fillRoundedRect(0, 0, w, h, 12);

        // Border
        g.lineStyle(2, 0x555555, 1);
        g.strokeRoundedRect(0, 0, w, h, 12);

        container.add(g);
        return container;
    }

    // =========================================================================
    // UPGRADE POPUP (REFACTORED)
    // =========================================================================

    createUpgradeDrawer() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Drawer dimensions
        const drawerH = height * 0.65;
        this.drawerHeight = drawerH;

        const container = this.add.container(0, height); // Start off-screen
        container.setDepth(90);
        this.upgradeDrawer = container;
        this.isDrawerOpen = false;

        // 0. Input Blocker (Prevents map interaction behind drawer)
        const inputBlocker = this.add.rectangle(0, 0, width, drawerH, 0x000000, 0).setOrigin(0);
        inputBlocker.setInteractive();
        inputBlocker.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
        });
        container.add(inputBlocker);

        // 1. Background Panel (Asset)
        const panel = this.createIndustrialPanel(width, drawerH);
        container.add(panel);

        // Title
        // Title
        const titleText = this.add.text(Math.round(width / 2), 41, 'Machine upgrades', {
            fontSize: '26px',
            fontFamily: 'Impact, Arial Black',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setResolution(2);

        container.add(titleText);

        /*
        // Title "Badge" behind text
        const titleBadge = this.add.graphics();
        titleBadge.fillStyle(0x000000, 0.5);
        titleBadge.fillRoundedRect(width / 2 - titleText.width / 2 - 20, 10, titleText.width + 40, 50, 4);
        
        container.add(titleBadge);
        // container.add(titleText); // Already added above
        */

        // Close Button — created here but added to container later (after dragZone)
        // so it sits on top and can receive click events
        const closeBtn = this.createIndustrialButton(30, 30, 'X', 'red', () => this.toggleUpgradeDrawer());
        closeBtn.x = width - 47;
        closeBtn.y = 30;

        // Increase hit area for easier clicking (centered at 15,15 relative to container)
        // Rectangle: x, y, width, height
        closeBtn.setInteractive(new Phaser.Geom.Rectangle(-15, -15, 60, 60), Phaser.Geom.Rectangle.Contains);



        // Listen for global upgrade events to refresh UI
        const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
        if (gameScene) {
            gameScene.events.on('machineUpgraded', (data) => {
                // Refresh slot list (content)
                if (this.isDrawerOpen) this.refreshUpgradeSlots();
                // Show feedback text
                this.onMachineUpgraded(data);
            }, this);
        }

        // --- SCROLLABLE CONTENT AREA ---
        // We also need to hide the slots.

        // --- SCROLLABLE CONTENT AREA ---
        this.upgradeWindowW = width * 0.92;
        this.upgradeContentTopY = 80;
        const scrollAreaH = drawerH - 90;
        this.upgradeScrollAreaH = scrollAreaH;

        // Mask (Re-enabled)
        const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect((width - this.upgradeWindowW) / 2, 0, this.upgradeWindowW, scrollAreaH);
        const mask = maskShape.createGeometryMask();
        this.upgradeMaskGraphics = maskShape; // Assign for tween updates

        // Drag Zone
        const dragZone = this.add.rectangle(
            width / 2, this.upgradeContentTopY + scrollAreaH / 2,
            width, scrollAreaH,
            0x000000, 0
        ).setInteractive({ draggable: true })
            .on('pointerdown', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
            });
        container.add(dragZone);

        // Scroll Container (Added AFTER DragZone so buttons are clickable)
        this.upgradeScrollContainer = this.add.container(0, this.upgradeContentTopY);
        container.add(this.upgradeScrollContainer);
        this.upgradeScrollContainer.setMask(mask);

        // Drag Logic
        let dragStartY = 0;
        let scrollStartY = 0;

        dragZone.on('dragstart', (pointer) => {
            dragStartY = pointer.y;
            scrollStartY = this.upgradeScrollY;
        });

        dragZone.on('drag', (pointer) => {
            const deltaY = pointer.y - dragStartY;
            this.upgradeScrollY = Phaser.Math.Clamp(
                scrollStartY + deltaY,
                -this.upgradeScrollMax,
                0
            );
            this.upgradeScrollContainer.y = this.upgradeScrollY + this.upgradeContentTopY;
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (!this.isDrawerOpen) return;
            // Simple global wheel for now
            this.upgradeScrollY = Phaser.Math.Clamp(
                this.upgradeScrollY - deltaY * 0.5,
                -this.upgradeScrollMax,
                0
            );
            this.upgradeScrollContainer.y = this.upgradeScrollY + this.upgradeContentTopY;
        });

        // Add close button LAST so it layers on top of the drag zone
        container.add(closeBtn);

        // Initialize empty
        this.upgradeSlotElements = [];
        this.upgradeEmptyLabel = this.add.text(width / 2, drawerH / 2, 'No machines available.', {
            fontSize: '18px',
            color: '#888888'
        }).setOrigin(0.5);
        container.add(this.upgradeEmptyLabel);
    }

    toggleUpgradeDrawer() {
        if (!this.upgradeDrawer) return;

        this.isDrawerOpen = !this.isDrawerOpen;
        const height = this.cameras.main.height;

        // Offset: "bring it down a bit" -> +50px
        const openY = (height - this.drawerHeight) + 50;
        const targetY = this.isDrawerOpen ? openY : height;

        // 1. Tween Drawer
        this.tweens.add({
            targets: this.upgradeDrawer,
            y: targetY,
            duration: 300,
            ease: 'Power2',
            onUpdate: () => {
                // Keep mask valid if needed (GeometryMask is static usually)
                // For simple rect masks, we might need to update the graphics position
                if (this.upgradeMaskGraphics) {
                    this.upgradeMaskGraphics.y = this.upgradeDrawer.y + this.upgradeContentTopY;
                }
            }
        });

        // 2. Tween Navigation Buttons (Lift Effect)
        // We want them to sit on top of the drawer title
        // Original logic: overlap 20px.
        // New logic: Drawer is 50px lower. 
        // User says "buttons are getting cut off, want them slightly up".
        // Previous offset was -(this.drawerHeight - 70).
        // To move them UP more, we need a larger negative number (magnitude).
        // (drawerHeight - 50) is larger than (drawerHeight - 70).
        // So we try -(this.drawerHeight - 50).
        const navTargetYOffset = this.isDrawerOpen ? -(this.drawerHeight - 65) : 0;

        // We know the original Y (around height - 40/50).
        // Let's store original Ys if not stored.
        if (!this.navButtonsOriginalY) {
            this.navButtonsOriginalY = this.bottomNavInteractables.map(b => b.y);
        }

        this.bottomNavInteractables.forEach((btn, index) => {
            this.tweens.add({
                targets: btn,
                y: this.navButtonsOriginalY[index] + navTargetYOffset,
                duration: 300,
                ease: 'Power2'
            });
        });

        // 3. Logic
        if (this.isDrawerOpen) {
            this.refreshUpgradeSlots();
        }
    }

    /**
     * Rebuild all upgrade slots from current game state.
     * Called when the popup opens or after an upgrade.
     */
    refreshUpgradeSlots() {
        // Clear old
        if (this.upgradeSlotElements) {
            this.upgradeSlotElements.forEach(el => el.destroy());
        }
        this.upgradeSlotElements = [];

        this.upgradeScrollY = 0;
        if (this.upgradeScrollContainer) {
            this.upgradeScrollContainer.y = this.upgradeContentTopY;
        }

        const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
        if (!gameScene || !gameScene.upgradeManager) {
            if (this.upgradeEmptyLabel) this.upgradeEmptyLabel.setVisible(true);
            return;
        }

        const upgradeManager = gameScene.upgradeManager;
        const rooms = upgradeManager.getUpgradeableRooms();

        if (rooms.length === 0) {
            if (this.upgradeEmptyLabel) this.upgradeEmptyLabel.setVisible(true);
            return;
        }
        if (this.upgradeEmptyLabel) this.upgradeEmptyLabel.setVisible(false);

        // Group rooms by machine TYPE (one card per type)
        const roomsByType = {};
        rooms.forEach((room) => {
            if (!roomsByType[room.type]) {
                roomsByType[room.type] = [];
            }
            roomsByType[room.type].push(room);
        });

        const width = this.cameras.main.width;
        const slotW = 370;
        const slotH = 160;
        const gap = 7;
        const startX = width / 2;
        let currentY = 10;

        // Reset button tracking
        this.upgradeButtons = [];

        const scrollTarget = this.upgradeScrollContainer;
        if (!scrollTarget) return;

        Object.entries(roomsByType).forEach(([type, typeRooms]) => {
            // Pick the first (lowest level) room as representative
            const room = typeRooms.sort((a, b) => a.level - b.level)[0];

            // 1. Card background
            if (this.textures.exists('ui_upgrade_card')) {
                const card = this.add.image(startX, currentY + slotH / 2, 'ui_upgrade_card');
                card.setOrigin(0.5);
                card.setDisplaySize(slotW, slotH);
                card.setCrop();

                scrollTarget.add(card);
                this.upgradeSlotElements.push(card);

                // Border
                const border = this.add.graphics();
                border.lineStyle(2, 0x555555, 1);
                border.strokeRoundedRect(startX - slotW / 2, currentY, slotW, slotH, 12);
                scrollTarget.add(border);
                this.upgradeSlotElements.push(border);

                // --- Machine Icon (left side) ---
                const iconKey = room.roomDef.sprite;
                if (iconKey && this.textures.exists(iconKey)) {
                    const iconX = startX - slotW / 2 + 58;
                    const iconY = currentY + slotH / 2 - 23;
                    const icon = this.add.image(iconX, iconY, iconKey);
                    // Per-type icon sizing
                    const iconSizes = { 'room_garden': 95, 'room_generator': 80 };
                    const iconMaxSize = iconSizes[iconKey] || 85;
                    const iconScale = Math.min(iconMaxSize / icon.width, iconMaxSize / icon.height);
                    icon.setScale(iconScale);
                    icon.setOrigin(0.5);
                    scrollTarget.add(icon);
                    this.upgradeSlotElements.push(icon);
                }

                // --- Room Name + Level (Top Section) ---
                const textX = startX - slotW / 2 + 110;
                const nameY = currentY + slotH / 2 - 30; // Base anchor point (moves block up/down)
                const maxTextW = slotW - 280;

                // 1. Name
                const nameText = this.add.text(textX, nameY, room.roomDef.name || type, {
                    fontSize: '18px',
                    fontFamily: 'Arial',
                    color: '#ffffff',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 3,
                    wordWrap: { width: maxTextW }
                }).setOrigin(0, 0.5).setResolution(2);
                scrollTarget.add(nameText);
                this.upgradeSlotElements.push(nameText);

                // 2. Level (Immediately below Name)
                const countStr = typeRooms.length > 1 ? ` (x${typeRooms.length})` : '';
                const levelText = this.add.text(textX, nameY + 30, `Level ${room.level}${countStr}`, {
                    fontSize: '12px',
                    fontFamily: 'Arial',
                    color: '#cccccc',
                    stroke: '#000000',
                    strokeThickness: 2
                }).setOrigin(0, 0.5).setResolution(2);
                scrollTarget.add(levelText);
                this.upgradeSlotElements.push(levelText);

                // --- Description + Stats (Bottom Section) ---
                // Combined Guide: "Description - Stats"
                const currentOutput = upgradeManager.getCurrentOutput(room.type, room.level);
                const nextOutput = upgradeManager.getCurrentOutput(room.type, room.level + 1);

                let resType = 'Resources';
                const roomDef = ECONOMY.ROOM_TYPES[room.type];
                if (roomDef.production) {
                    if (roomDef.production.power) resType = 'Energy';
                    else if (roomDef.resourceProducer && roomDef.resourceProducer.outputType) {
                        resType = roomDef.resourceProducer.outputType;
                        resType = resType.charAt(0).toUpperCase() + resType.slice(1);
                    } else {
                        const key = Object.keys(roomDef.production)[0];
                        if (key) resType = key.charAt(0).toUpperCase() + key.slice(1);
                    }
                }

                const desc = room.roomDef.description || 'Production';
                const statInfo = `${currentOutput.toFixed(1)}/s -> ${nextOutput.toFixed(1)}/s ${resType}`;
                const combinedStr = `${desc}   |   ${statInfo}`;

                // Left align with the card (under icon)
                const descTextX = startX - slotW / 2 + 20;

                // Description Line
                const descText = this.add.text(descTextX, nameY + 72.5, desc, {
                    fontSize: '14px',
                    fontFamily: 'Monospace',
                    color: '#aaddaa', // Light green
                    stroke: '#000000',
                    strokeThickness: 2,
                    wordWrap: { width: slotW - 30 }
                }).setOrigin(0, 0.5).setResolution(2);
                scrollTarget.add(descText);
                this.upgradeSlotElements.push(descText);

                // Stats Line (Next Line)
                const statsText = this.add.text(descTextX, nameY + 90, statInfo, {
                    fontSize: '14px',
                    fontFamily: 'Monospace',
                    color: '#aaddaa',
                    stroke: '#000000',
                    strokeThickness: 2,
                    wordWrap: { width: slotW - 30 }
                }).setOrigin(0, 0.5).setResolution(2);
                scrollTarget.add(statsText);
                this.upgradeSlotElements.push(statsText);

                // --- Upgrade Button (Image-based) ---
                const affordability = upgradeManager.canAffordUpgrade(room.key);
                const canAfford = affordability.canAfford;
                const failureReason = affordability.reason;
                const isMax = upgradeManager.isMaxLevel(room.key);
                const cost = upgradeManager.getUpgradeCost(room.type, room.level);

                if (isMax) {
                    const maxLabel = this.add.text(startX + slotW / 2 - 60, currentY + slotH / 2, 'MAX', {
                        fontSize: '16px',
                        fontFamily: 'Arial',
                        color: '#ffdd44',
                        fontStyle: 'bold',
                        stroke: '#000000',
                        strokeThickness: 3
                    }).setOrigin(0.5).setResolution(2);
                    scrollTarget.add(maxLabel);
                    this.upgradeSlotElements.push(maxLabel);
                } else {
                    const btnKey = canAfford ? 'ui_btn_upgrade_green' : 'ui_btn_upgrade_gray';
                    const btnW = 140;
                    const btnH = 110;
                    const btnX = startX + slotW / 2 - btnW / 2 - 10;
                    const btnY = currentY + slotH / 2 - 20;

                    // Create Container for unified animation (Button + Text)
                    const btnContainer = this.add.container(btnX, btnY);

                    const btn = this.add.image(0, 0, btnKey);
                    btn.setOrigin(0.5);
                    btn.setDisplaySize(btnW, btnH);

                    // Ensure interactive (on top layer checks handled by container add order)
                    // Use rectangle hit area for consistent behavior
                    btn.setInteractive(new Phaser.Geom.Rectangle(0, 0, btn.width, btn.height), Phaser.Geom.Rectangle.Contains);

                    // Cost Logic
                    let costText = '';
                    let costColor = '#dddddd';

                    if (!canAfford && failureReason === 'Insufficient Grid Capacity') {
                        costText = 'NEED POWER\n(Grid Full)';
                        costColor = '#ff5555';
                    } else if (cost) {
                        const lines = [];
                        if (cost.materials) lines.push(`${cost.materials} Scrap`);
                        if (cost.caps) lines.push(`${cost.caps} Money`);
                        if (cost.powerDelta) lines.push(`+${cost.powerDelta} Pwr`);
                        costText = lines.join('\n');
                    }

                    // "Upgrade" label at top
                    const upgradeLabel = this.add.text(0, -20, 'Upgrade', {
                        fontSize: '18px',
                        fontFamily: 'Arial',
                        color: '#ffffff',
                        fontStyle: 'bold',
                        stroke: '#000000',
                        strokeThickness: 3
                    }).setOrigin(0.5).setResolution(2);

                    // Cost label at bottom
                    const costLabel = this.add.text(0, 10, costText, {
                        fontSize: '14px',
                        fontFamily: 'Arial',
                        color: costColor,
                        stroke: '#000000',
                        strokeThickness: 2,
                        align: 'center',
                        wordWrap: { width: btnW - 10 }
                    }).setOrigin(0.5).setResolution(2);

                    // Add to Container
                    btnContainer.add([btn, upgradeLabel, costLabel]);
                    scrollTarget.add(btnContainer);
                    this.upgradeSlotElements.push(btnContainer);

                    // Interaction
                    btn.on('pointerover', () => {
                        // Optional hover
                    });
                    btn.on('pointerout', () => {
                        btn.clearTint();
                    });

                    btn.on('pointerdown', () => {
                        if (canAfford) {
                            // Press Effect: Darker Tint
                            btn.setTint(0x999999);

                            // Visual feedback (animate container)
                            this.tweens.add({
                                targets: btnContainer,
                                scaleX: 0.95,
                                scaleY: 0.95,
                                y: btnY + 4, // Move container down
                                duration: 80,
                                yoyo: true,
                                onComplete: () => {
                                    btn.clearTint(); // Restore brightness
                                    // Upgrade ALL machines of this type
                                    const success = upgradeManager.upgradeMachineType(room.type);
                                    if (success) {
                                        // Event 'machineUpgraded' is emitted by manager and handled globally
                                        // No need to call this.onMachineUpgraded manually (fixes double text)
                                        console.log(`Global upgrade triggered for ${room.type}`);
                                    }
                                }
                            });
                        } else {
                            // Disabled feedback (shake container)
                            this.tweens.add({
                                targets: btnContainer,
                                x: btnX + 5,
                                duration: 50,
                                yoyo: true,
                                repeat: 3,
                                onComplete: () => {
                                    btnContainer.x = btnX; // Reset position
                                }
                            });
                        }
                    });

                    this.upgradeButtons.push({
                        roomKey: room.key,
                        container: btnContainer,
                        btn: btn,
                        upgradeLabel: upgradeLabel,
                        costLabel: costLabel
                    });
                }


            }

            // Advance Y for next slot
            currentY += slotH + gap;
        });

        // Calculate scroll bounds
        // Add extra padding at bottom so last card isn't cut off
        const contentHeight = currentY + 100;
        this.upgradeScrollMax = Math.max(0, contentHeight - this.upgradeScrollAreaH);
    }



    /**
     * Event handler: called when a machine is successfully upgraded.
     * Rebuilds the upgrade slots to reflect the new state.
     */
    onMachineUpgraded(data) {
        console.log(`[UIScene] Machine upgraded: ${data.roomType} Lv.${data.oldLevel} → Lv.${data.newLevel}`);

        // Refresh the popup if it's visible
        if (this.upgradePopup && this.upgradePopup.visible) {
            this.refreshUpgradeSlots();
        }

        // Show floating feedback on the HUD
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const roomDef = ECONOMY.ROOM_TYPES[data.roomType];
        const name = roomDef ? roomDef.name : data.roomType;
        this.showFloatingMessage(width / 2, height / 2 - 100, `${name} → Lv.${data.newLevel}!`, 0x44ff44);
    }

    /**
     * Update upgrade button enabled/disabled states based on current resources.
     * Called on every economyTick — lightweight, only updates alpha/color.
     */
    updateUpgradeButtonStates() {
        if (!this.upgradePopup || !this.upgradePopup.visible) return;
        if (!this.upgradeButtons || this.upgradeButtons.length === 0) return;

        const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
        if (!gameScene || !gameScene.upgradeManager) return;

        const upgradeManager = gameScene.upgradeManager;

        this.upgradeButtons.forEach(ref => {
            const canAfford = upgradeManager.canAffordUpgrade(ref.roomKey);

            if (canAfford) {
                ref.btnContainer.setAlpha(1.0);
            } else {
                ref.btnContainer.setAlpha(0.5);
            }
        });
    }

    createCancelBuildButton() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.cancelBtnContainer = this.add.container(width / 2, height - 80);
        this.cancelBtnContainer.setVisible(false);
        this.cancelBtnContainer.setDepth(200);

        const bg = this.add.rectangle(0, 0, 200, 50, 0xff0000)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive();

        const text = this.add.text(0, 0, 'CANCEL BUILD', {
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        bg.on('pointerdown', () => {
            const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
            if (gameScene && gameScene.cancelBuildMode) {
                gameScene.cancelBuildMode();
            }
        });

        this.cancelBtnContainer.add([bg, text]);

        // Listeners to toggle visibility
        const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
        if (gameScene) {
            gameScene.events.on('START_BUILDING', () => this.cancelBtnContainer.setVisible(true));
            gameScene.events.on('STOP_BUILDING', () => this.cancelBtnContainer.setVisible(false));

            // Check initial state
            if (gameScene.isBuildingMode) {
                this.cancelBtnContainer.setVisible(true);
            }
        }
    }

    showFloatingMessage(x, y, message, color) {
        const text = this.add.text(x, y, message, {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(300);

        if (color) text.setTint(color);

        this.tweens.add({
            targets: text,
            y: y - 80,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }
}
