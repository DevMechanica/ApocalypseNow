import * as Phaser from 'phaser';
import { CONSTANTS, CONFIG } from '../config.js';

export class UIScene extends Phaser.Scene {
    constructor() {
        super(CONSTANTS.SCENES.UI);
    }

    create() {
        // Initialize Registry with default resources if not present
        if (!this.registry.get('resources')) {
            this.registry.set('resources', JSON.parse(JSON.stringify(CONFIG.initialResources)));
        }

        this.createResourceBars();
        this.createButtons();
        this.createBuildPopup();
        this.createPausePopup();
        this.createMapPopup();
        this.createSettingsPopup();

        // Listen for updates (if we emit them)
        this.registry.events.on('changedata', this.updateData, this);

        // Input Blocking Logic
        // When any GameObject in this scene is pressed, set blocked = true
        this.input.on('gameobjectdown', () => {
            this.registry.set('uiBlocked', true);
        });

        // When pointer releases anywhere, reset blocked = false
        this.input.on('pointerup', () => {
            this.registry.set('uiBlocked', false);
        });
    }

    createResourceBars() {
        // Top bar container-like layout
        const padding = 10;
        let x = padding;
        const y = padding;
        // Adjusted for 540px width
        // 4 items. Max width ~125px each.
        const barWidth = 80; // Reduced from 150
        const barHeight = 30;
        const spacing = 130; // Reduced from 160

        // Helper to create a single resource display
        const createRes = (key, iconKey, color, index) => {
            const containerX = x + (index * spacing);

            // Icon
            this.add.image(containerX + 15, y + 15, iconKey).setDisplaySize(30, 30);

            // Bar Background
            this.add.rectangle(containerX + 40, y, barWidth, barHeight, 0x333333).setOrigin(0, 0);

            // Bar Fill (Dynamic)
            const fill = this.add.rectangle(containerX + 40, y, barWidth, barHeight, color).setOrigin(0, 0);

            // Text
            const text = this.add.text(containerX + 50, y + 8, '', {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#ffffff'
            });

            // Store references to update later
            this['bar_' + key] = fill;
            this['text_' + key] = text;

            // Initial Update
            this.updateResourceUI(key);
        };

        createRes('cash', 'icon_cash', 0x4CAF50, 0);
        createRes('food', 'icon_food', 0x2196F3, 1);
        createRes('wheat', 'icon_wheat', 0xFFC107, 2);
        createRes('energy', 'icon_energy', 0x8BC34A, 3);
    }

    createButtons() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Sidebar (Right)
        // User Request: Pause -> Map -> Settings
        // Removing the top HUD Pause button and the top Settings button.

        const sideY = 150;
        const btnSize = 50;
        const spacing = 60;

        // Helper
        const createSideBtn = (icon, index, callback) => {
            const btn = this.add.image(width - 40, sideY + (index * spacing), icon)
                .setInteractive() // This will trigger the input blocking in create()
                .setDisplaySize(btnSize, btnSize);

            if (callback) {
                btn.on('pointerdown', callback);
            }
        };

        // 1. Pause (Index 0) - Moved from top right
        createSideBtn('icon_pause', 0, () => {
            if (this.pausePopup) this.pausePopup.setVisible(!this.pausePopup.visible);
        });

        // 2. Map (Index 1)
        createSideBtn('icon_map', 1, () => {
            if (this.mapPopup) this.mapPopup.setVisible(!this.mapPopup.visible);
        });

        // 3. Settings (Index 2) - Kept the bottom settings button
        createSideBtn('icon_settings', 2, () => {
            if (this.settingsPopup) this.settingsPopup.setVisible(!this.settingsPopup.visible);
        });

        // Build Button (Bottom Right/Center)
        const buildBtn = this.add.image(width - 80, height - 80, 'icon_build')
            .setInteractive()
            .setDisplaySize(80, 80);

        buildBtn.on('pointerdown', () => {
            console.log('Build clicked');
            this.tweens.add({
                targets: buildBtn,
                y: height - 85,
                duration: 100,
                yoyo: true
            });

            // Toggle Visibility
            if (this.buildPopup) {
                this.buildPopup.setVisible(!this.buildPopup.visible);
            }
        });
    }

    createPopupWindow(title) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Container
        const container = this.add.container(0, 0);
        container.setVisible(false);
        container.setDepth(100);

        // Background Overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setInteractive();

        overlay.on('pointerdown', () => {
            container.setVisible(false);
        });
        container.add(overlay);

        // Window Background
        const windowW = width * 0.9;
        const windowH = height * 0.6;
        const windowBg = this.add.rectangle(width / 2, height / 2, windowW, windowH, 0x1a2130)
            .setStrokeStyle(4, 0x4a5a75)
            .setInteractive();
        container.add(windowBg);

        // Title
        const titleText = this.add.text(width / 2, height / 2 - windowH / 2 + 30, title, {
            fontSize: '24px',
            fontFamily: 'Fredoka One',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(titleText);

        // Close Button
        const closeBtn = this.add.text(width / 2 + windowW / 2 - 30, height / 2 - windowH / 2 + 30, 'X', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ff4444',
            fontWeight: 'bold'
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
        const startX = width / 2 - windowW / 2 + 50;
        const startY = height / 2 - windowH / 2 + 80;
        const slotSize = 80;
        const gap = 20;

        for (let i = 0; i < 9; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const slotX = startX + col * (slotSize + gap);
            const slotY = startY + row * (slotSize + gap);

            const slot = this.add.rectangle(slotX, slotY, slotSize, slotSize, 0x2a3345)
                .setOrigin(0, 0)
                .setStrokeStyle(2, 0x3a455c);

            const placeholder = this.add.text(slotX + slotSize / 2, slotY + slotSize / 2, 'Empty', {
                fontSize: '12px',
                color: '#555555'
            }).setOrigin(0.5);

            this.buildPopup.add(slot);
            this.buildPopup.add(placeholder);
        }
    }

    createPausePopup() {
        const { container } = this.createPopupWindow('Pause');
        this.pausePopup = container;
    }

    createMapPopup() {
        const { container } = this.createPopupWindow('Map');
        this.mapPopup = container;
    }

    createSettingsPopup() {
        const { container } = this.createPopupWindow('Settings');
        this.settingsPopup = container;
    }

    updateData(parent, key, data) {
        if (key === 'resources') {
            ['cash', 'food', 'wheat', 'energy'].forEach(res => this.updateResourceUI(res));
        }
    }

    updateResourceUI(key) {
        const resources = this.registry.get('resources');
        if (!resources || !resources[key]) return;

        const data = resources[key];
        const bar = this['bar_' + key];
        const text = this['text_' + key];

        if (bar && text) {
            // Update Text
            if (key === 'cash') {
                text.setText(`$${data.current.toLocaleString()}`);
            } else {
                text.setText(`${data.current}/${data.max}`);
            }

            // Update Bar Width (Max 80)
            if (data.max > 0) {
                const percent = Phaser.Math.Clamp(data.current / data.max, 0, 1);
                bar.width = 80 * percent;
            } else {
                bar.width = 80; // Full if no max
            }
        }
    }
}
