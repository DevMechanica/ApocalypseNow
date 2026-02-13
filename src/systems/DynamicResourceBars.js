export class DynamicResourceBars {
    constructor(scene) {
        this.scene = scene;
        this.barElements = {};
        this.config = {
            caps: { color: '#4ade80', label: 'Caps', icon: 'icon_cash' },
            food: { color: '#fb923c', label: 'Food', icon: 'icon_food' },
            water: { color: '#60a5fa', label: 'Water', icon: 'icon_water' },
            power: { color: '#fbbf24', label: 'Energy', icon: 'icon_energy' },
            materials: { color: '#c084fc', label: 'Materials', icon: 'icon_materials' }
        };
    }

    create() {
        this.injectCSS();
        this.createDOMStructure();
    }

    injectCSS() {
        if (document.getElementById('dynamic-resource-bars-style')) return;

        const style = document.createElement('style');
        style.id = 'dynamic-resource-bars-style';
        style.innerHTML = `
            .resource-bars-container {
                display: flex;
                flex-direction: row;
                justify-content: center;
                align-items: center;
                gap: 4px; /* Tight gap to fit 5 bars */
                pointer-events: one;
                width: 98%;
                max-width: 720px; /* Match game max width */
                padding: 4px;
            }

            .resource-bar-wrapper {
                position: relative;
                flex: 1; /* Distribute space equally */
                min-width: 0; /* Allow shrinking below content size */
                aspect-ratio: 9 / 1; /* Maintain wide aspect ratio */
                background-size: 100% 100%;
                background-repeat: no-repeat;
                background-position: center;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
            }

            /* Container for the fill, positioned to respect the empty bar area */
            .bar-fill-container {
                position: absolute;
                top: 15%;
                bottom: 15%;
                left: 14%; /* Skip icon */
                right: 3%;
                border-radius: 2px;
                overflow: hidden;
            }

            .bar-fill {
                height: 100%;
                width: 0%;
                transition: width 0.5s ease-out;
                opacity: 0.8;
                box-shadow: inset 0 0 5px rgba(0,0,0,0.2);
            }

            .resource-text {
                position: absolute;
                top: 0;
                left: 14%;
                right: 3%;
                bottom: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Segoe UI', Impact, sans-serif;
                font-size: 10px; /* Smaller font for smaller bars */
                font-weight: bold;
                color: #ffffff;
                text-shadow: 1px 1px 1px black, 0 0 2px black;
                z-index: 5;
                white-space: nowrap; /* Prevent text wrapping */
            }
        `;
        document.head.appendChild(style);
    }

    createDOMStructure() {
        const container = document.createElement('div');
        container.className = 'resource-bars-container';

        Object.keys(this.config).forEach(key => {
            const config = this.config[key];
            // Use the renamed file as background
            const bgImage = `ui_icons/${config.icon}.png`; // Correct logic

            const barHTML = `
                <div class="resource-bar-wrapper" id="bar-${key}" style="background-image: url('${bgImage}');">
                    <div class="bar-fill-container">
                        <div class="bar-fill" style="background-color: ${config.color};"></div>
                    </div>
                    <div class="resource-text">
                        <span class="current-value">0</span>
                        <span class="separator">/</span>
                        <span class="max-value">0</span>
                    </div>
                </div>
            `;

            const wrapper = document.createElement('div');
            wrapper.innerHTML = barHTML;
            container.appendChild(wrapper.firstElementChild);

            // Store references
            this.barElements[key] = {
                fill: container.querySelector(`#bar-${key} .bar-fill`),
                current: container.querySelector(`#bar-${key} .current-value`),
                max: container.querySelector(`#bar-${key} .max-value`)
            };
        });

        const width = this.scene.cameras.main.width;
        // Moved down to 120 as requested
        this.domObject = this.scene.add.dom(width / 2, 120, container);
        this.domObject.setOrigin(0.5, 0);
        this.domObject.setScrollFactor(0);
    }

    update(state) {
        if (!state || !state.resources) return;

        Object.keys(this.config).forEach(key => {
            const el = this.barElements[key];
            if (!el) return;

            const current = Math.floor(state.resources[key] || 0);
            const max = state.resourceMax[key] || 0;

            if (el.current) el.current.textContent = current.toLocaleString();
            if (el.max) el.max.textContent = max > 0 ? max.toLocaleString() : '∞';

            if (el.fill) {
                let percentage = 0;
                if (max > 0) {
                    percentage = Math.min((current / max) * 100, 100);
                } else {
                    percentage = 100; // Full for unlimited
                }
                el.fill.style.width = `${percentage}%`;
            }
        });
    }

    destroy() {
        if (this.domObject) this.domObject.destroy();
    }
}
