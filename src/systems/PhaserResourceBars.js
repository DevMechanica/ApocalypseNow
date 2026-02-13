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
        const safeWidth = width * 0.98;
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
        // Adjusted from 85 to 65 to move start left (User Request)
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

        // Adjust font size relative to bar height
        // Taller bars get slightly larger text, smaller get smaller
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

        // Store references
        this.barElements[key] = {
            glowGraphics: glowGraphics,
            fillGraphics: fillGraphics,
            text: text,

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

            // Only redraw if percentage changed significantly (prevent unnecessary draw calls)
            if (Math.abs(percentage - el.lastPercentage) < 0.001) return;
            el.lastPercentage = percentage;

            const fillW = Math.max(0, el.barAreaWidth * percentage);

            // Redraw Graphics
            const g = el.fillGraphics;
            const glow = el.glowGraphics;

            g.clear();
            glow.clear();

            if (fillW > 0) {
                // Color Helpers
                const baseColorObj = Phaser.Display.Color.IntegerToColor(el.baseColor);
                const baseColor = baseColorObj.color;

                // Lighten/Darken returns explicit object, we need color property for fillStyle? 
                // Phaser.Display.Color methods modify IN PLACE. So we must clone.
                const lighterColor = baseColorObj.clone().lighten(15).color;
                const darkerColor = baseColorObj.clone().darken(15).color;

                const r = el.cornerRadius;
                const x = el.fillStartX;
                const y = el.barAreaY;
                const h = el.barAreaHeight;

                // --- GLOW (Behind) ---
                const glowPadding = 3;
                glow.fillStyle(baseColor, 0.3);
                // Clamp radius for glow if small
                glow.fillRoundedRect(x - glowPadding, y - glowPadding, fillW + (glowPadding * 2), h + (glowPadding * 2), r);


                // --- FILL LAYERS ---

                // 1. Base Fill
                g.fillStyle(baseColor, 0.9);
                g.fillRoundedRect(x, y, fillW, h, r);

                // 2. Top Highlight (Lighter)
                g.fillStyle(lighterColor, 0.4);
                // Reduce height for highlight
                g.fillRoundedRect(x, y, fillW, h * 0.35, r);

                // 3. Bottom Shadow (Darker)
                g.fillStyle(darkerColor, 0.3);
                g.fillRoundedRect(x, y + (h * 0.65), fillW, h * 0.35, r);

                // 4. Shine (Glossy Top Edge)
                g.fillStyle(0xffffff, 0.25);
                // Inset slightly
                if (fillW > 4 && h > 4) {
                    g.fillRoundedRect(x + 2, y + 2, fillW - 4, h * 0.2, r / 2);
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
