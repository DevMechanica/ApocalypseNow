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
        // this.load.image('icon_build', 'ui_icons/icon_build.png'); // Replaced by btn_build

        // New Right-Side Buttons (Anonymous for now)
        this.load.image('btn_side_1', 'ui_icons/btn_side_1.png');
        this.load.image('btn_side_2', 'ui_icons/btn_side_2.png');
        this.load.image('btn_side_3', 'ui_icons/btn_side_3.png');
        this.load.image('btn_side_4', 'ui_icons/btn_side_4.png');

        // New Floor Navigation Arrows
        this.load.image('btn_arrow_up', 'ui_icons/btn_arrow_up.png');
        this.load.image('btn_arrow_down', 'ui_icons/btn_arrow_down.png');

        // New UI Buttons
        this.load.image('btn_build', 'ui_icons/btn_build.png');
        this.load.image('btn_achiev_active', 'ui_icons/btn_achievements_active.png');
        this.load.image('btn_achiev_inactive', 'ui_icons/btn_achievements_inactive.png');
        this.load.image('btn_char_active', 'ui_icons/btn_characters_active.png');
        this.load.image('btn_char_inactive', 'ui_icons/btn_characters_inactive.png');
        this.load.image('btn_upgrades_active', 'ui_icons/btn_upgrades_active.png');
        this.load.image('btn_upgrades_inactive', 'ui_icons/btn_upgrades_inactive.png');

        // Industrial UI Assets
        this.load.image('ui_upgrade_panel', 'Objects/Upgrade_menu/upgrade-menu-background-transparent.png');

        // Room sprites
        this.load.image('room_garden', 'Objects/Garden/hydroponic_garden.png');
        this.load.image('room_water', 'Objects/WaterPurifier/water_purifier.png');
        this.load.image('room_generator', 'Objects/Machines/scrap-v4.png');

        // Video Assets
        // Note: Filename contains spaces/parentheses. Ensure server serves this correctly.
        this.load.video('elevator_video', 'cutscenes/elevator_cutscene.mp4');

        // Garden Animation - Sprite sheet with transparency (replaces video for proper alpha support)
        this.load.spritesheet('garden_anim', 'Objects/Cutscenes/Garden/garden_anim.png', {
            frameWidth: 921,
            frameHeight: 1080
        });
    }

    create() {
        console.log('PreloadScene complete');
        // Start the Game Scene
        // We also launch the UI Scene in parallel
        this.scene.start(CONSTANTS.SCENES.GAME);
    }
}
