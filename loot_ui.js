
// Loot UI Manager
const LootUI = {
    active: false,
    items: [],
    flyingItems: [],

    // UI Configuration
    width: 300,
    height: 200,
    x: 0,
    y: 0,

    // Assets
    bgImage: null, // Could be generated or stylized rect

    init() {
        // Calculate position (bottom center)
        this.x = (CONFIG.canvasWidth - this.width) / 2;
        this.y = CONFIG.canvasHeight - this.height - 100; // 100px from bottom
    },

    open(zone) {
        if (!zone.loot) return;

        console.log('📦 Opening loot:', zone.loot);
        this.active = true;
        this.items = [...zone.loot]; // Copy items
        this.zoneName = zone.name;

        // Play open sound if available
    },

    close() {
        this.active = false;
        this.items = [];
    },

    takeAll() {
        if (this.items.length === 0) return;

        console.log('🎒 Taking all items...');

        // Create flying animations for each item
        this.items.forEach((item, index) => {
            // Start position (relative to UI)
            const startX = this.x + 40;
            const startY = this.y + 60 + (index * 50);

            // Target position (Inventory icon - assume top right for now)
            const targetX = CONFIG.canvasWidth - 60;
            const targetY = 60;

            this.flyingItems.push({
                icon: item.icon,
                x: startX,
                y: startY,
                targetX: targetX,
                targetY: targetY,
                progress: 0,
                speed: 1.5 + Math.random() * 0.5 // Randomize speed slightly
            });

            // Log collection
            console.log(`Received: ${item.count}x ${item.name}`);
        });

        // Clear items and close UI
        this.items = [];
        this.close();

        // Show notification
        showMessage('Items added to inventory!');
    },

    update(deltaTime) {
        // Update flying items
        for (let i = this.flyingItems.length - 1; i >= 0; i--) {
            const item = this.flyingItems[i];
            item.progress += item.speed * deltaTime;

            // Ease in-out
            const t = item.progress;
            const ease = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

            item.currentX = item.x + (item.targetX - item.x) * ease;
            item.currentY = item.y + (item.targetY - item.y) * ease;

            if (item.progress >= 1) {
                this.flyingItems.splice(i, 1);
            }
        }
    },

    draw(ctx) {
        // Draw flying items (always on top)
        this.flyingItems.forEach(item => {
            ctx.font = '24px Arial';
            ctx.fillText(item.icon, item.currentX, item.currentY);
        });

        if (!this.active) return;

        // Recalculate position in case of resize
        this.x = (CONFIG.canvasWidth - this.width) / 2;
        this.y = CONFIG.canvasHeight - this.height - 100;

        // --- Draw Modal Background ---
        ctx.save();

        // Shadow/Glow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 20;

        // Main Box - Dark, grungy
        ctx.fillStyle = '#1a1815'; // Dark brownish gray
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Border - Tan/Rusty
        ctx.strokeStyle = '#8c7b64';
        ctx.lineWidth = 4;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Inner "Paper" texture approximation
        ctx.fillStyle = '#262420';
        ctx.fillRect(this.x + 10, this.y + 10, this.width - 20, this.height - 20);

        // Header
        ctx.fillStyle = '#cebba1'; // Old paper color text
        ctx.font = 'bold 20px Courier New';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText('STASH CONTENTS', this.x + this.width / 2, this.y + 35);

        // Divider
        ctx.beginPath();
        ctx.moveTo(this.x + 20, this.y + 45);
        ctx.lineTo(this.x + this.width - 20, this.y + 45);
        ctx.strokeStyle = '#5c5244';
        ctx.lineWidth = 2;
        ctx.stroke();

        // --- Draw Items ---
        ctx.textAlign = 'left';
        ctx.font = '18px Courier New';

        this.items.forEach((item, index) => {
            const itemY = this.y + 80 + (index * 40);

            // Icon
            ctx.font = '24px Arial';
            ctx.fillText(item.icon, this.x + 30, itemY);

            // Text
            ctx.font = '18px Courier New';
            ctx.fillStyle = '#ddd';
            ctx.fillText(`${item.count}x ${item.name}`, this.x + 70, itemY);
        });

        // --- Draw "Take All" Button ---
        const btnHeight = 40;
        const btnWidth = this.width - 40;
        const btnX = this.x + 20;
        const btnY = this.y + this.height - 60;

        // Store button rect for click detection
        this.takeAllBtn = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };

        ctx.fillStyle = '#4a6b32'; // Muted green
        ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

        // Button Border
        ctx.strokeStyle = '#6d8c54';
        ctx.lineWidth = 2;
        ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);

        // Button Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('TAKE ALL', btnX + btnWidth / 2, btnY + 25);

        ctx.restore();
    },

    handleClick(clickX, clickY) {
        if (!this.active) return false;

        // Check "Take All" button
        if (this.takeAllBtn &&
            clickX >= this.takeAllBtn.x &&
            clickX <= this.takeAllBtn.x + this.takeAllBtn.width &&
            clickY >= this.takeAllBtn.y &&
            clickY <= this.takeAllBtn.y + this.takeAllBtn.height) {

            this.takeAll();
            return true;
        }

        // Close if clicked outside
        if (clickX < this.x || clickX > this.x + this.width ||
            clickY < this.y || clickY > this.y + this.height) {
            this.close();
        }

        return true; // Consume click if UI is open
    }
};
