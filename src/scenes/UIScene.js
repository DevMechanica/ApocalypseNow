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
            console.log('Pause clicked');
        });

        // 2. Map (Index 1)
        createSideBtn('icon_map', 1, () => {
            console.log('Map clicked');
        });

        // 3. Settings (Index 2) - Kept the bottom settings button
        createSideBtn('icon_settings', 2, () => {
            console.log('Settings clicked');
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
        });
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
