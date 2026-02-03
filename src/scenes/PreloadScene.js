import * as Phaser from 'phaser';
import { CONSTANTS, CONFIG } from '../config.js';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super(CONSTANTS.SCENES.PRELOAD);
    }

    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        // Progress events
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // Load Assets
        // Load Assets
        // Map Scenes (1-10)
        for (let i = 1; i <= 10; i++) {
            this.load.image(`scene_${i}`, `${CONFIG.mapPath}${i}.png`);
        }

        this.load.image('player', CONFIG.characterPath);

        // UI Icons
        // Need to load these from the ui_icons directory
        // Assuming relative path from index.html (root) which is where Phaser runs from
        this.load.image('icon_cash', 'ui_icons/icon_cash.png');
        this.load.image('icon_food', 'ui_icons/icon_food.png');
        this.load.image('icon_water', 'ui_icons/icon_water.png');
        this.load.image('icon_wheat', 'ui_icons/icon_wheat.png');
        this.load.image('icon_energy', 'ui_icons/icon_energy.png');
        this.load.image('icon_materials', 'ui_icons/icon_materials.png');
        this.load.image('icon_pause', 'ui_icons/icon_pause.png');
        this.load.image('icon_settings', 'ui_icons/icon_settings.png');
        this.load.image('icon_map', 'ui_icons/icon_map.png');
        this.load.image('icon_build', 'ui_icons/icon_build.png');
    }

    create() {
        console.log('PreloadScene complete');
        // Start the Game Scene
        // We also launch the UI Scene in parallel
        this.scene.start(CONSTANTS.SCENES.GAME);
    }
}
