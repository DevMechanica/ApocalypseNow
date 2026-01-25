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
        const padding = 8;
        let x = padding;
        const y = padding;
        const barWidth = 60;
        const barHeight = 25;
        const spacing = 105;

        // Resource keys in display order
        const resourceKeys = ['caps', 'food', 'water', 'power', 'materials'];

        resourceKeys.forEach((key, index) => {
            const resDef = ECONOMY.RESOURCES[key];
            const containerX = x + (index * spacing);

            // Icon
            const icon = this.add.image(containerX + 12, y + 12, resDef.icon)
                .setDisplaySize(24, 24);

            // Bar Background
            this.add.rectangle(containerX + 28, y, barWidth, barHeight, 0x333333).setOrigin(0, 0);

            // Bar Fill
            const fill = this.add.rectangle(containerX + 28, y, barWidth, barHeight, resDef.color).setOrigin(0, 0);

            // Text
            const text = this.add.text(containerX + 32, y + 5, '', {
                fontSize: '11px',
                fontFamily: 'Arial',
                color: '#ffffff'
            });

            // Store references
            this['bar_' + key] = fill;
            this['text_' + key] = text;
        });

        // Initial update
        this.updateAllResources();
    }

    createButtons() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const sideY = 120;
        const btnSize = 45;
        const spacing = 55;

        const createSideBtn = (icon, index, callback) => {
            const btn = this.add.image(width - 35, sideY + (index * spacing), icon)
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

        // Build Button
        const buildBtn = this.add.image(width - 70, height - 70, 'icon_build')
            .setInteractive()
            .setDisplaySize(70, 70);

        buildBtn.on('pointerdown', () => {
            this.tweens.add({
                targets: buildBtn,
                y: height - 75,
                duration: 100,
                yoyo: true
            });

            if (this.buildPopup) {
                this.buildPopup.setVisible(!this.buildPopup.visible);
            }
        });

        // Floor indicator
        this.floorText = this.add.text(10, height - 30, 'Floor: 1', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });

        // Survivor count
        this.survivorText = this.add.text(10, height - 55, 'Survivors: 0/4', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#88ff88',
            stroke: '#000000',
            strokeThickness: 2
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

        // Update bar width (max 60px)
        if (max > 0) {
            const percent = Phaser.Math.Clamp(current / max, 0, 1);
            bar.width = 60 * percent;
        } else {
            bar.width = 60;
        }
    }
}
