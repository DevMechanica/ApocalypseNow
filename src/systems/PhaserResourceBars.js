import * as Phaser from 'phaser';

export class PhaserResourceBars {
    constructor(scene) {
        this.scene = scene;
        this.barElements = {};

        // Configuration with specific source heights (from assets) 
        // AND specific target display heights (per user request)
        this.config = {
            caps: {
                color: 0x4ade80, label: 'Caps', icon: 'icon_cash',
                height: 51,
                displayHeight: 35 // Sleek
            },
            food: {
                color: 0xfb923c, label: 'Food', icon: 'icon_food',
                height: 45,
                displayHeight: 30 // Sleek
            },
            water: {
                color: 0x60a5fa, label: 'Water', icon: 'icon_water',
                height: 45,
                displayHeight: 30
            },
            power: {
                color: 0xfbbf24, label: 'Energy', icon: 'icon_energy',
                height: 49,
                displayHeight: 33 // Taller/Prominent
            },
            materials: {
                color: 0xc084fc, label: 'Materials', icon: 'icon_materials',
                height: 45,
                displayHeight: 30
            }
        };
        this.barContainer = null;
    }

    create() {
        const width = this.scene.cameras.main.width;
        // Container for the whole top bar
        // Adjusted from 70 to 40 to move bars UP (User Request)
        this.barContainer = this.scene.add.container(width / 2, 40);
        this.barContainer.setScrollFactor(0); // Fix to camera

        const keys = Object.keys(this.config);
        const totalBars = keys.length;

        // Base "Sleek" Width target
        const baseBarWidth = 180;

        // Calculate Screen Scale
        const spacing = 5;
        const totalSpacing = spacing * (totalBars - 1);
        const safeWidth = width * 0.90; // 5% padding each side to avoid touching edges
        const availableWidthPerBar = (safeWidth - totalSpacing) / totalBars;

        // Global width scale (how much to shrink the *width* to fit screen)
        const globalWidthScale = availableWidthPerBar / baseBarWidth;

        // Calculate total display width for centering
        // Since we are scaling width uniformly, we can just use the availableWidthPerBar
        const totalRowDisplayWidth = (availableWidthPerBar * totalBars) + totalSpacing;
        let startX = -(totalRowDisplayWidth / 2);

        keys.forEach((key, index) => {
            const config = this.config[key];
            const sourceH = config.height;
            const targetH = config.displayHeight;

            // 1. Calculate Vertical Scale
            // We want the bar to *visually* be targetH pixels tall.
            // But the internal coordinate system is scaled by globalWidthScale.
            // So we need to compute the *local* height that, when scaled, equals targetH.

            // Actually, let's keep it simple:
            // We apply a uniform X/Y scale to the container based on width.
            // This means the "natural" height of the container will be scaled down.
            // To achieve specific target heights, we might need non-uniform scaling 
            // OR simply adjust the "native" height we create the NineSlice with.

            // Approach: Create NineSlice at the *Aspect Corrected* dimensions relative to baseBarWidth
            // If baseWidth is 180, and we want a 4:1 look, height is 45.
            // If we want it taller, we increase height relative to width.

            // Let's assume globalWidthScale is applied to the container.
            // Unscaled Width = 180.
            // Unscaled Target Height = targetH / globalWidthScale.

            const localHeight = targetH / globalWidthScale;

            // 2. Position
            // Center the bar in its slot
            const currentBarDisplayWidth = baseBarWidth * globalWidthScale;
            const x = startX + (currentBarDisplayWidth / 2);
            startX += currentBarDisplayWidth + spacing;

            // 3. Vertical Centering
            // Since bars have different heights, we create them at y=0 (centered vertical anchor)

            this.createSingleBar(key, config, x, 0, baseBarWidth, localHeight, globalWidthScale);
        });
    }



    createSingleBar(key, config, x, y, width, height, scale) {
        const container = this.scene.add.container(x, y);
        container.setScale(scale);

        // 1. NineSlice Background (Base Layer)
        // Slices: left 85 (Protect Icon), Right 25, Top 10, Bottom 10
        const bg = this.scene.add.nineslice(
            0, 0,
            config.icon,
            0,
            width, height,
            85, 25, 10, 10
        );
        container.add(bg);

        // 2. Graphics Layers for Seamless Fill
        // Glow (Behind Fill)
        const glowGraphics = this.scene.add.graphics();
        glowGraphics.setBlendMode(Phaser.BlendModes.ADD);
        container.add(glowGraphics);

        // Fill (Main Content)
        const fillGraphics = this.scene.add.graphics();
        container.add(fillGraphics);

        // Calculate precise Dimensions
        const iconWidth = 45;
        const paddingRight = 15;
        const paddingTop = 10;
        const paddingBottom = 12;

        const fillStartX = (-width / 2) + iconWidth;
        const barAreaWidth = width - iconWidth - paddingRight;

        const barAreaY = (-height / 2) + paddingTop;
        const barAreaHeight = Math.max(0, height - paddingTop - paddingBottom);
        const cornerRadius = 10;

        // 3. Text
        const textX = 0; // Center text in the container
        const textY = 0;
        const fontSize = Math.floor(height * 0.55); // 55% of height

        const text = this.scene.add.text(textX, textY, '0/0', {
            fontFamily: 'Segoe UI, Impact, sans-serif',
            fontSize: `${fontSize}px`,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        });
        text.setOrigin(0.5, 0.5);

        container.add(text);

        // --- NEW COUNTERS (Caps Only) ---
        let dayText, waveText;

        if (key === 'caps') {
            const counterScale = 0.8;

            // Images are 290x600 with huge empty padding. Crop to content only.
            // day_counter content: Y 210-358 (148px with margin)
            // wave_counter content: Y 255-345 (90px with margin)
            const dayCropY = 210;
            const dayCropH = 148;
            const waveCropY = 255;
            const waveCropH = 90;

            // Day Counter - 2px below bar bottom
            const dayY = (height / 2) + 2;
            const dayVisH = dayCropH * counterScale;
            const dayBg = this.scene.add.image(0, dayY - dayCropY * counterScale, 'day_counter')
                .setOrigin(0.5, 0)
                .setScale(counterScale)
                .setCrop(0, dayCropY, 290, dayCropH);

            dayText = this.scene.add.text(0, dayY + dayVisH / 2, 'Day 1', {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
                fontStyle: 'bold'
            }).setOrigin(0.5, 0.5);

            container.add([dayBg, dayText]);

            // Wave Counter - 3px below day counter
            const waveY = dayY + dayVisH + 3;
            const waveVisH = waveCropH * counterScale;
            const waveBg = this.scene.add.image(0, waveY - waveCropY * counterScale, 'until_wave_counter')
                .setOrigin(0.5, 0)
                .setScale(counterScale)
                .setCrop(0, waveCropY, 290, waveCropH);

            waveText = this.scene.add.text(0, waveY + waveVisH / 2, '00:00', {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#ff4444',
                stroke: '#000000',
                strokeThickness: 3,
                fontStyle: 'bold'
            }).setOrigin(0.5, 0.5);

            container.add([waveBg, waveText]);
        }

        // Store references
        this.barElements[key] = {
            glowGraphics: glowGraphics,
            fillGraphics: fillGraphics,
            text: text,
            dayText: dayText, // Undefined for non-caps
            waveText: waveText,

            // Dimensions for updating
            fillStartX: fillStartX,
            barAreaY: barAreaY,
            barAreaWidth: barAreaWidth,
            barAreaHeight: barAreaHeight,
            cornerRadius: cornerRadius,
            baseColor: config.color,

            // Caching
            lastPercentage: -1
        };

        this.barContainer.add(container);
    }

    update(state) {
        if (!state || !state.resources) return;

        Object.keys(this.config).forEach(key => {
            const el = this.barElements[key];
            if (!el) return;

            const current = Math.floor(state.resources[key] || 0);
            const max = state.resourceMax[key] || 0;

            // Update Text
            const maxText = max > 0 ? max.toLocaleString() : '∞';
            el.text.setText(`${current.toLocaleString()}/${maxText}`);

            // Calc Percentage
            let percentage = 0;
            if (max > 0) {
                percentage = Phaser.Math.Clamp(current / max, 0, 1);
            } else {
                percentage = 1;
            }

            // Update Counters (Caps Only)
            if (key === 'caps' && el.dayText && el.waveText) {
                // Day Calculation (20 mins = 1200s per day)
                const secondsPerDay = 1200;
                const currentDay = Math.floor(state.playTime / secondsPerDay) + 1;
                el.dayText.setText(`Day ${currentDay}`);

                // Wave Calculation (Simulated for now)
                // Find nearest threat time
                // state.lastScout (timestamp in s) + interval
                const now = state.playTime;

                // Hardcoded intervals from config (should import, but using safe defaults matching config)
                const scoutInt = 600;
                const raidInt = 7200;

                // Time until next
                const nextScout = (state.lastScout + scoutInt) - now;
                const nextRaid = (state.lastRaid + raidInt) - now;

                // Get minimum positive time
                const times = [nextScout, nextRaid].filter(t => t > 0);
                const nextWave = times.length > 0 ? Math.min(...times) : 0;

                // Format MM:SS
                const mins = Math.floor(nextWave / 60);
                const secs = Math.floor(nextWave % 60);
                const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

                el.waveText.setText(timeStr);

                // Color change if imminent
                if (nextWave < 60) el.waveText.setColor('#ff0000');
                else el.waveText.setColor('#ffffff');
            }

            // Only redraw if percentage changed significantly (prevent unnecessary draw calls)
            if (Math.abs(percentage - el.lastPercentage) < 0.001) return;
            el.lastPercentage = percentage;

            const fillW = Math.max(0, el.barAreaWidth * percentage);

            // Redraw Graphics
            const g = el.fillGraphics;
            const glow = el.glowGraphics;

            g.clear();
            glow.clear();

            // Draw dark inset track (always visible, gives depth)
            const r = el.cornerRadius;
            const x = el.fillStartX;
            const y = el.barAreaY;
            const h = el.barAreaHeight;
            const fullW = el.barAreaWidth;

            glow.fillStyle(0x000000, 0.45);
            glow.fillRoundedRect(x, y, fullW, h, r);
            // Inner border for inset look
            glow.lineStyle(1, 0x000000, 0.3);
            glow.strokeRoundedRect(x, y, fullW, h, r);

            if (fillW > 0) {
                const baseColorObj = Phaser.Display.Color.IntegerToColor(el.baseColor);
                const baseColor = baseColorObj.color;
                const darkerColor = baseColorObj.clone().darken(30).color;
                const darkestColor = baseColorObj.clone().darken(50).color;

                // 1. Dark base layer (bottom shadow)
                g.fillStyle(darkestColor, 0.9);
                g.fillRoundedRect(x, y, fillW, h, r);

                // 2. Main fill (slightly inset for bevel effect)
                g.fillStyle(darkerColor, 1.0);
                g.fillRoundedRect(x, y + 1, fillW, h - 2, r);

                // 3. Lighter top half for metallic gradient
                g.fillStyle(baseColor, 0.85);
                g.fillRoundedRect(x, y + 1, fillW, h * 0.5, r);

                // 4. Bright highlight strip at top
                g.fillStyle(0xffffff, 0.15);
                if (fillW > 4 && h > 6) {
                    g.fillRoundedRect(x + 2, y + 2, fillW - 4, h * 0.22, r / 2);
                }

                // 5. Subtle edge highlight on right side of fill
                if (fillW > 3) {
                    g.fillStyle(0xffffff, 0.1);
                    g.fillRect(x + fillW - 2, y + 2, 2, h - 4);
                }
            }
        });
    }

    destroy() {
        if (this.barContainer) {
            this.barContainer.destroy();
        }
    }
}
