export class FloatingTextSystem {
    constructor(scene) {
        this.scene = scene;
        this.scene.events.on('resourceProduced', this.spawnText, this);
    }

    spawnText(data) {
        // data = { type, amount, source }
        if (!data || !data.source || !data.amount) return;

        const { x, y } = data.source;
        // Adjust y to appear above the object
        const startY = y - 50; // Higher up for better machine clearance

        // Create a unit container for the icon and text
        const container = this.scene.add.container(x, startY);

        // Text (TYPE +Amount)
        const text = this.scene.add.text(0, 0, `${data.type.toUpperCase()} +${data.amount}`, {
            fontFamily: 'Arial',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0, 0.5);
        container.add(text);

        text.x = 0;
        text.setOrigin(0.5);

        // Animation: Float up and fade out
        this.scene.tweens.add({
            targets: container,
            y: startY - 40,
            alpha: 0,
            duration: 4000,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                container.destroy();
            }
        });
    }
}
