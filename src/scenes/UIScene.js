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
        this.createPausePopup();
        this.createMapPopup();
        this.createSettingsPopup();
        this.createTooltip();

        // Listen for economy updates
        const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
        if (gameScene) {
            gameScene.events.on('economyTick', this.updateAllResources, this);
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

        // 1. Character Button (Left) - NOW CENTERED
        const btnChar = setupBottomButton(0, 'btn_char');
        const btnUpgrades = setupBottomButton(0, 'btn_upgrades');
        const btnAchiev = setupBottomButton(0, 'btn_achiev');

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

        addBouncyClick(btnUpgrades, () => console.log('Upgrades Menu Clicked'));

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

        // Reposition build button to be consistent with bottom alignment
        // User feedback: "touch the most right" and "most down"
        // forceful alignment using Origin (1, 1) = Bottom Right
        buildBtn.setOrigin(1, 1);
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

    createBuildPopup() {
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
                // TODO: Implement room placement
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
}
