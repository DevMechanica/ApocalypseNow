import { ECONOMY } from '../config.js';

/**
 * ResourceProducer - Component responsible for generating resources over time.
 * Logic only - state is stored in the provided data object for persistence.
 * 
 * Upgrade Integration:
 * - Output scales with room level via getEffectiveAmount().
 * - Formula: baseAmount * (1 + (level - 1) * outputMultiplier)
 * - Level 1 = base output (no bonus).
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
     * Calculate the effective production amount factoring in room level.
     * Uses the upgrade multiplier from the room's config if available.
     * @returns {number} Effective output amount per production cycle
     */
    getEffectiveAmount() {
        const level = this.data.level || 1;
        if (level <= 1) return this.config.amount;

        // Look up the room type's upgrade multiplier
        const roomType = this.data.type;
        const roomDef = roomType ? ECONOMY.ROOM_TYPES[roomType] : null;
        const multiplier = (roomDef && roomDef.upgrade && roomDef.upgrade.outputMultiplier)
            ? roomDef.upgrade.outputMultiplier
            : (ECONOMY.UPGRADE ? ECONOMY.UPGRADE.outputMultiplierDefault : 0.25);

        return this.config.amount * (1 + ((level - 1) * multiplier));
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
        const effectiveAmount = this.getEffectiveAmount();

        if (autoCollect) {
            return {
                type: this.config.outputType,
                amount: effectiveAmount,
                source: this.parent
            };
        }

        // Manual collect
        if (this.data.storedResources < this.config.capacity) {
            this.data.storedResources = Math.min(this.data.storedResources + effectiveAmount, this.config.capacity);

            return {
                type: this.config.outputType,
                amount: effectiveAmount,
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
