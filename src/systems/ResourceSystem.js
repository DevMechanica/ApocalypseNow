import { ResourceProducer } from './ResourceProducer.js';
import { ECONOMY } from '../config.js';

export class ResourceSystem {
    constructor(scene) {
        this.scene = scene;
        this.producers = []; // List of active producer instances
    }

    init() {
        // Scan existing rooms and create producers
        const state = this.scene.registry.get('gameState');
        if (state && state.rooms) {
            Object.entries(state.rooms).forEach(([key, roomData]) => {
                this.registerRoom(key, roomData);
            });
        }
    }

    /**
     * Register a room as a producer if it has config
     */
    registerRoom(key, roomData) {
        const roomType = roomData.type;
        const roomDef = ECONOMY.ROOM_TYPES[roomType];

        if (roomDef && roomDef.resourceProducer) {
            const producer = new ResourceProducer(roomDef.resourceProducer, roomData);

            // Try to find the visual object to attach as parent (for floating text)
            // This relies on GameScene storing visual objects, or we just calculate position from key
            // Key is "floor_slot".
            // We can calculate position roughly if visual object missing.
            producer.setParent(this.getVisualSource(key, roomData));

            this.producers.push(producer);
        }
    }

    getVisualSource(key, roomData) {
        // Mock or try to find actual object
        // If we can't find the object, we return a mock object with x,y for floating text
        // But for now, let's assume we pass enough info or FloatingTextSystem handles it.
        // Actually, ResourceSystem logic shouldn't depend heavily on visuals.
        // But we need x,y for FloatingText.

        // Let's decode key: "floor_slot"
        const parts = key.split('_');
        if (parts.length === 2) {
            const floor = parseInt(parts[0]);
            const slot = parseFloat(parts[1]);
            const width = roomData?.width || 1; // Get width from room data

            // We can ask GameScene for position?
            if (this.scene.getSlotPosition) {
                return this.scene.getSlotPosition(floor, slot, width);
            }
        }
        return { x: 0, y: 0 }; // Fallback
    }

    /**
     * Update loop
     */
    update(delta) {
        const state = this.scene.registry.get('gameState');
        const autoFarming = state ? state.autoFarming : true;

        this.producers.forEach(producer => {
            const result = producer.tick(delta, autoFarming);

            if (result) {
                this.handleProduction(result);
            }
        });
    }

    /**
     * Manual collection from a specific room
     */
    collectFromRoom(key) {
        const producer = this.producers.find(p => p.data === this.scene.registry.get('gameState').rooms[key]);
        if (producer) {
            const amount = producer.collect();
            if (amount > 0) {
                this.handleProduction({
                    type: producer.config.outputType,
                    amount: amount,
                    source: producer.parent
                });
                return true;
            }
        }
        return false;
    }

    /**
     * Collect from all producers (used when switching to Auto mode)
     */
    collectAll() {
        const state = this.scene.registry.get('gameState');
        if (!state || !state.rooms) return;

        Object.keys(state.rooms).forEach(key => {
            this.collectFromRoom(key);
            // Also clear indicators in GameScene if they exist
            if (this.scene.clearHarvestIndicator) {
                this.scene.clearHarvestIndicator(key);
            }
        });
    }

    /**
     * Manual farming/active production from a specific room
     */
    farmFromRoom(key) {
        const state = this.scene.registry.get('gameState');
        const roomData = state.rooms[key];
        if (!roomData) return false;

        const producer = this.producers.find(p => p.data === roomData);
        if (producer) {
            // Force immediate production
            const result = producer.produce(true);
            if (result) {
                this.handleProduction(result);
                return true;
            }
        }
        return false;
    }

    handleProduction(result) {
        if (!result.requiresCollection) {
            const state = this.scene.registry.get('gameState');
            if (state && state.resources) {
                state.resources[result.type] = (state.resources[result.type] || 0) + result.amount;

                const max = state.resourceMax ? state.resourceMax[result.type] : Infinity;
                if (max > 0) {
                    state.resources[result.type] = Math.min(state.resources[result.type], max);
                }

                this.scene.registry.set('gameState', state);
                this.scene.events.emit('economyTick', state);
            }
        }

        // Fire event
        this.scene.events.emit('resourceProduced', {
            type: result.type,
            amount: result.amount,
            source: result.source || { x: 0, y: 0 }
        });

        // If manual collection is needed, fire an additional event for UI/Visuals
        if (result.requiresCollection) {
            this.scene.events.emit('manualHarvestReady', {
                key: Object.keys(this.scene.registry.get('gameState').rooms).find(k => this.scene.registry.get('gameState').rooms[k] === result.data),
                type: result.type,
                source: result.source
            });
        }
    }
}
