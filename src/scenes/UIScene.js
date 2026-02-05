import * as Phaser from 'phaser';
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

        this.createResourceBars();
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
        const barWidth = Math.max(35, Math.floor(screenWidth * 0.07));
        const barHeight = Math.max(16, Math.floor(screenWidth * 0.03));
        const fontSize = Math.max(9, Math.floor(screenWidth * 0.018));

        // Calculate spacing to fit all 5 resources on screen
        const resourceKeys = ['caps', 'food', 'water', 'power', 'materials'];
        const totalResourceWidth = iconSize + barWidth + padding;
        const availableWidth = screenWidth - (padding * 2);
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

            // Icon
            const icon = this.add.image(containerX + iconSize / 2, y + iconSize / 2, resDef.icon)
                .setDisplaySize(iconSize, iconSize);

            // Bar Background
            this.add.rectangle(containerX + iconSize + 4, y, barWidth, barHeight, 0x333333).setOrigin(0, 0);

            // Bar Fill
            const fill = this.add.rectangle(containerX + iconSize + 4, y, barWidth, barHeight, resDef.color).setOrigin(0, 0);

            // Text
            const text = this.add.text(containerX + iconSize + 6, y + 2, '', {
                fontSize: `${fontSize}px`,
                fontFamily: 'Arial',
                color: '#ffffff'
            });

            // Store references with max width for updates
            this['bar_' + key] = fill;
            this['bar_' + key + '_maxWidth'] = barWidth;
            this['text_' + key] = text;
        });

        // --- NEW PREMIUM TOGGLE SWITCH ---
        const materialsIndex = 4;
        const materialsX = padding + (materialsIndex * spacing);
        const toggleW = barWidth * 0.8;
        const toggleH = barHeight * 0.9;
        const toggleX = materialsX + iconSize + 4 + barWidth + 15;
        const barH = Math.max(iconSize, barHeight);

        const toggleBtn = this.add.container(toggleX + toggleW / 2, y + barH / 2);

        // Track Background (Capsule)
        const track = this.add.rectangle(0, 0, toggleW, toggleH, 0x111111)
            .setStrokeStyle(1.5, 0x444444);

        // Rounded corners for track (using graphics for better look if possible, but rectangle is fine for now)
        // We can simulate rounded corners with a rectangle and a stroke if we want, but Phaser 3.60+ has setRounded
        if (track.setPostPipeline) { // Simple check for newer phaser or just keep it simple
            // track.setInteractive();
        }

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
        track.setInteractive({ useHandCursor: true });

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

        // Sidebar buttons
        createSideBtn('icon_pause', 0, () => {
            if (this.pausePopup) this.pausePopup.setVisible(!this.pausePopup.visible);
        });

        createSideBtn('icon_map', 1, () => {
            if (this.mapPopup) this.mapPopup.setVisible(!this.mapPopup.visible);
        });

        createSideBtn('icon_settings', 2, () => {
            if (this.settingsPopup) this.settingsPopup.setVisible(!this.settingsPopup.visible);
        });

        // Build Button - responsive size
        const buildBtnSize = Math.max(50, Math.floor(width * 0.12));
        const buildMargin = Math.max(40, Math.floor(width * 0.08));
        const buildBtn = this.add.image(width - buildMargin, height - buildMargin, 'icon_build')
            .setInteractive()
            .setDisplaySize(buildBtnSize, buildBtnSize);

        buildBtn.on('pointerdown', () => {
            this.tweens.add({
                targets: buildBtn,
                y: height - buildMargin - 5,
                duration: 100,
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
        const navBtnSize = 50;
        const navX = width - 40;
        const navY_Up = height - 200;
        const navY_Down = height - 140;

        // Up Arrow
        const btnUp = this.add.rectangle(navX, navY_Up, navBtnSize, navBtnSize, 0x444444)
            .setStrokeStyle(2, 0x888888)
            .setInteractive();
        const textUp = this.add.text(navX, navY_Up, 'UP', { fontSize: '14px', fontStyle: 'bold' }).setOrigin(0.5);

        btnUp.on('pointerdown', () => {
            const gameScene = this.scene.get(CONSTANTS.SCENES.GAME);
            if (gameScene && gameScene.sceneId > 1) {
                this.startSceneTransition(gameScene.sceneId - 1, 'BOTTOM');
            }
        });

        // Down Arrow
        const btnDown = this.add.rectangle(navX, navY_Down, navBtnSize, navBtnSize, 0x444444)
            .setStrokeStyle(2, 0x888888)
            .setInteractive();
        const textDown = this.add.text(navX, navY_Down, 'DN', { fontSize: '14px', fontStyle: 'bold' }).setOrigin(0.5);

        btnDown.on('pointerdown', () => {
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
        Object.keys(ECONOMY.RESOURCES).forEach(key => {
            this.updateResourceUI(key, state);
        });

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
        const bar = this['bar_' + key];
        const text = this['text_' + key];
        const maxWidth = this['bar_' + key + '_maxWidth'] || 60;

        if (!bar || !text || !state) return;

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

        // Update bar width (use stored maxWidth)
        if (max > 0) {
            const percent = Phaser.Math.Clamp(current / max, 0, 1);
            bar.width = maxWidth * percent;
        } else {
            bar.width = maxWidth;
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
