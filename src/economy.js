import { ECONOMY, INITIAL_GAME_STATE } from './config.js';
import { ResourceSystem } from './systems/ResourceSystem.js';

/**
 * EconomyManager - Handles idle resource production, survivor upkeep, and game ticks
 */
export class EconomyManager {
    constructor(scene) {
        this.scene = scene;
        this.tickInterval = 1000;  // 1 second ticks
        this.lastTick = Date.now();
        this.resourceSystem = new ResourceSystem(scene);
    }

    /**
     * Initialize game state in registry
     */
    init() {
        if (!this.scene.registry.get('gameState')) {
            this.scene.registry.set('gameState', JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));
        }
        this.resourceSystem.init();
        this.startTicking();
    }

    /**
     * Start the economy tick loop
     */
    startTicking() {
        this.scene.time.addEvent({
            delay: this.tickInterval,
            callback: this.tick,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * Main economy tick - called every second
     */
    tick() {
        const state = this.scene.registry.get('gameState');
        if (!state) return;

        // Calculate time delta (for offline progression)
        const now = Date.now();
        const delta = (now - state.lastUpdate) / 1000;  // seconds
        state.lastUpdate = now;
        state.playTime += delta;

        // Process production from rooms
        // this.processRoomProduction(state, delta); // Legacy method
        this.resourceSystem.update(delta);

        // Process survivor upkeep
        this.processSurvivorUpkeep(state, delta);

        // Calculate net power
        this.calculatePower(state);

        // Clamp resources to max
        this.clampResources(state);

        // Update registry (triggers UI update)
        this.scene.registry.set('gameState', state);

        // Emit event for UI updates
        this.scene.events.emit('economyTick', state);
    }

    /**
     * Process resource production from all rooms
     */
    processRoomProduction(state, delta) {
        const minuteDelta = delta / 60;  // Convert to minutes

        Object.entries(state.rooms).forEach(([key, room]) => {
            const roomDef = ECONOMY.ROOM_TYPES[room.type];
            if (!roomDef || !roomDef.production) return;

            // Check if room has power (or is a power generator)
            if (roomDef.powerCost > 0 && state.resources.power < roomDef.powerCost) {
                return;  // No power, no production
            }

            // Calculate efficiency based on workers
            const workerCount = room.workers ? room.workers.length : 0;
            const efficiency = Math.min(workerCount / Math.max(roomDef.maxWorkers, 1), 1);

            // Apply production
            Object.entries(roomDef.production).forEach(([resource, rate]) => {
                const produced = rate * efficiency * minuteDelta * (room.level || 1);
                state.resources[resource] = (state.resources[resource] || 0) + produced;
            });
        });
    }

    /**
     * Process survivor food/water consumption
     */
    processSurvivorUpkeep(state, delta) {
        const minuteDelta = delta / 60;
        const survivorCount = state.survivors.length;

        if (survivorCount === 0) return;

        // Consume food and water
        const foodCost = ECONOMY.SURVIVOR_UPKEEP.food * survivorCount * minuteDelta;
        const waterCost = ECONOMY.SURVIVOR_UPKEEP.water * survivorCount * minuteDelta;

        state.resources.food = Math.max(0, state.resources.food - foodCost);
        state.resources.water = Math.max(0, state.resources.water - waterCost);

        // Check starvation (affects happiness/health)
        if (state.resources.food <= 0 || state.resources.water <= 0) {
            state.survivors.forEach(survivor => {
                survivor.happiness = Math.max(0, survivor.happiness - 1 * minuteDelta);
                if (state.resources.food <= 0 && state.resources.water <= 0) {
                    survivor.health = Math.max(0, survivor.health - 0.5 * minuteDelta);
                }
            });
        }
    }

    /**
     * Calculate net power (production - consumption)
     */
    calculatePower(state) {
        let powerProduction = 0;
        let powerConsumption = 0;

        Object.entries(state.rooms).forEach(([key, room]) => {
            const roomDef = ECONOMY.ROOM_TYPES[room.type];
            if (!roomDef) return;

            if (roomDef.production && roomDef.production.power) {
                const workerCount = room.workers ? room.workers.length : 0;
                const efficiency = Math.min(workerCount / Math.max(roomDef.maxWorkers, 1), 1);
                powerProduction += roomDef.production.power * efficiency * (room.level || 1);
            }

            powerConsumption += roomDef.powerCost || 0;
        });

        // Net power is production minus consumption
        state.netPower = powerProduction - powerConsumption;
    }

    /**
     * Clamp resources to their max values
     */
    clampResources(state) {
        Object.keys(state.resources).forEach(resource => {
            const max = state.resourceMax[resource];
            if (max > 0) {
                state.resources[resource] = Math.min(state.resources[resource], max);
            }
        });
    }

    /**
     * Add a room to a floor slot
     */
    buildRoom(floor, slot, roomType) {
        const state = this.scene.registry.get('gameState');
        const roomDef = ECONOMY.ROOM_TYPES[roomType];

        if (!roomDef) {
            console.error(`Unknown room type: ${roomType}`);
            return false;
        }

        // Check costs
        for (const [resource, cost] of Object.entries(roomDef.buildCost)) {
            if ((state.resources[resource] || 0) < cost) {
                console.log(`Not enough ${resource} to build ${roomDef.name}`);
                return false;
            }
        }

        // Deduct costs
        for (const [resource, cost] of Object.entries(roomDef.buildCost)) {
            state.resources[resource] -= cost;
        }

        // Add room
        const key = `${floor}_${slot}`;
        state.rooms[key] = {
            type: roomType,
            level: 1,
            workers: [],
            health: 100
        };

        this.scene.registry.set('gameState', state);
        console.log(`Built ${roomDef.name} at floor ${floor}, slot ${slot}`);

        // Create visual sprite if GameScene has the method
        if (this.scene.createRoomVisual) {
            this.scene.createRoomVisual(floor, slot, roomType);
        }

        // Register with resource system
        this.resourceSystem.registerRoom(key, state.rooms[key]);

        return true;
    }

    /**
     * Add a survivor to the bunker
     */
    addSurvivor(survivorData = null) {
        const state = this.scene.registry.get('gameState');

        if (state.survivors.length >= state.survivorCapacity) {
            console.log('No room for more survivors');
            return false;
        }

        const survivor = survivorData || this.generateRandomSurvivor();
        state.survivors.push(survivor);

        this.scene.registry.set('gameState', state);
        console.log(`New survivor joined: ${survivor.name}`);
        return true;
    }

    /**
     * Generate a random survivor with stats
     */
    generateRandomSurvivor() {
        const names = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn'];
        const survivor = JSON.parse(JSON.stringify(ECONOMY.SURVIVOR_TEMPLATE));

        survivor.name = names[Math.floor(Math.random() * names.length)];
        survivor.id = `survivor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Randomize stats (1-10)
        ECONOMY.SURVIVOR_STATS.forEach(stat => {
            survivor.stats[stat] = Math.floor(Math.random() * 10) + 1;
        });

        return survivor;
    }

    /**
     * Assign survivor to a room
     */
    assignSurvivor(survivorId, roomKey) {
        const state = this.scene.registry.get('gameState');
        const survivor = state.survivors.find(s => s.id === survivorId);
        const room = state.rooms[roomKey];

        if (!survivor || !room) {
            console.error('Invalid survivor or room');
            return false;
        }

        const roomDef = ECONOMY.ROOM_TYPES[room.type];
        if (room.workers.length >= roomDef.maxWorkers) {
            console.log('Room is full');
            return false;
        }

        // Remove from current assignment
        if (survivor.assigned) {
            const oldRoom = state.rooms[survivor.assigned];
            if (oldRoom) {
                oldRoom.workers = oldRoom.workers.filter(id => id !== survivorId);
            }
        }

        // Assign to new room
        survivor.assigned = roomKey;
        room.workers.push(survivorId);

        this.scene.registry.set('gameState', state);
        return true;
    }

    /**
     * Calculate excavation cost for a floor
     */
    getExcavationCost(floor) {
        const base = ECONOMY.FLOOR.excavationBaseCost;
        const mult = ECONOMY.FLOOR.excavationMultiplier;
        return Math.floor(base * Math.pow(mult, floor - 1));
    }

    /**
     * Excavate a new floor
     */
    excavateFloor() {
        const state = this.scene.registry.get('gameState');
        const nextFloor = state.currentFloor + 1;

        if (nextFloor > ECONOMY.FLOOR.maxFloors) {
            console.log('Maximum floor reached! Time to move to a new biome.');
            return false;
        }

        const cost = this.getExcavationCost(nextFloor);
        if (state.resources.materials < cost) {
            console.log(`Not enough materials. Need ${cost}`);
            return false;
        }

        state.resources.materials -= cost;
        state.currentFloor = nextFloor;

        this.scene.registry.set('gameState', state);
        console.log(`Excavated floor ${nextFloor}! Cost: ${cost} materials`);
        return true;
    }
}
