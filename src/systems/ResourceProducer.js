/**
 * ResourceProducer - Component responsible for generating resources over time.
 * Logic only - state is stored in the provided data object for persistence.
 */
export class ResourceProducer {
    /**
     * @param {Object} config - Static configuration (outputType, amount, etc)
     * @param {Object} data - Persistent state object (from gameState.rooms)
     */
    constructor(config, data) {
        this.config = config;
        this.data = data;

        // Initialize data if missing
        if (typeof this.data.producerTimer === 'undefined') this.data.producerTimer = 0;
        if (typeof this.data.storedResources === 'undefined') this.data.storedResources = 0;

        // Validation
        if (!this.config.outputType) console.warn('ResourceProducer: Missing outputType');
        if (!this.config.amount) this.config.amount = 1;
        if (!this.config.interval) this.config.interval = 10000;
        if (!this.config.capacity) this.config.capacity = 10;

        this.parent = null;
    }

    setParent(parent) {
        this.parent = parent;
    }

    /**
     * Update loop
     * @param {number} delta - Time in seconds
     * @param {boolean} autoFarming - Global auto-farming setting
     */
    tick(delta, autoFarming = true) {
        // Effective autoCollect is either forced by config OR global setting
        const effectiveAutoCollect = this.config.autoCollect || autoFarming;

        // Check capacity if NOT auto-collecting
        if (this.data.storedResources >= this.config.capacity && !effectiveAutoCollect) {
            return null; // Full
        }

        // Advance timer
        this.data.producerTimer += delta * 1000; // ms

        if (this.data.producerTimer >= this.config.interval) {
            return this.produce(effectiveAutoCollect);
        }

        return null;
    }

    produce(autoCollect) {
        this.data.producerTimer = 0;

        if (autoCollect) {
            return {
                type: this.config.outputType,
                amount: this.config.amount,
                source: this.parent
            };
        }

        // Manual collect
        if (this.data.storedResources < this.config.capacity) {
            this.data.storedResources = Math.min(this.data.storedResources + this.config.amount, this.config.capacity);

            return {
                type: this.config.outputType,
                amount: this.config.amount,
                stored: this.data.storedResources,
                capacity: this.config.capacity,
                source: this.parent,
                requiresCollection: true,
                data: this.data
            };
        }

        return null;
    }

    collect() {
        // Manual collection method
        if (this.data.storedResources <= 0) return 0;

        const amount = this.data.storedResources;
        this.data.storedResources = 0;
        return amount;
    }
}
