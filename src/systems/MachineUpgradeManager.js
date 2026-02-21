import { ECONOMY } from '../config.js';

/**
 * MachineUpgradeManager
 * 
 * Pure logic controller for the machine upgrade system.
 * Handles cost calculation, output scaling, and atomic upgrade transactions.
 * 
 * Design:
 * - 3-Tier Upgrade System (100-Level Cap):
 *   - Tier 1 (Lvl 1-25): Fast progress. Cost = BaseScrap * (1.1 ^ L). Materials only.
 *   - Tier 2 (Lvl 26-75): Economic friction. Cost = BaseScrap * (1.2 ^ L) + BaseMoney * L * 5. No Energy increase.
 *   - Tier 3 (Lvl 76-100): Infrastructure Bottleneck. High scaling costs + Energy Gate.
 * 
 * - Energy Gate:
 *   - Upgrade fails if (TotalCapacity - CurrentLoad) < NewEnergyLoad_Increase.
 * 
 * - Event-driven: Emits 'machineUpgraded' event on successful upgrade.
 * - Atomic transactions: Final resource validation before deduction.
 */
export class MachineUpgradeManager {
    /**
     * @param {Phaser.Scene} scene - The GameScene instance (for Registry and event access)
     */
    constructor(scene) {
        this.scene = scene;
        this.upgradeConfig = ECONOMY.UPGRADE;
    }

    /**
     * Returns a list of all constructed rooms that support upgrades.
     * Each entry: { key, type, level, roomDef, upgradeDef }
     * @returns {Array<Object>}
     */
    getUpgradeableRooms() {
        const state = this.scene.registry.get('gameState');
        if (!state || !state.rooms) return [];

        const upgradeable = [];
        Object.entries(state.rooms).forEach(([key, room]) => {
            const roomDef = ECONOMY.ROOM_TYPES[room.type];
            if (roomDef && roomDef.upgrade) {
                upgradeable.push({
                    key: key,
                    type: room.type,
                    level: room.level || 1,
                    roomDef: roomDef,
                    upgradeDef: roomDef.upgrade
                });
            }
        });
        return upgradeable;
    }

    /**
     * Calculate the dynamic power load for a room at a specific level.
     *
     * Logic:
     * - Tier 1 & 2 (Lvl 1-75): Base Power Cost (No increase).
     * - Tier 3 (Lvl 76+): Power Load increases exponentially.
     *   Formula: BasePower * (1.5 ^ (Level - 75))
     *
     * @param {string} roomType
     * @param {number} level
     * @returns {number} Current power draw
     */
    getPowerLoad(roomType, level) {
        const roomDef = ECONOMY.ROOM_TYPES[roomType];
        if (!roomDef) return 0;

        const basePower = roomDef.powerCost || 0;
        if (basePower === 0) return 0; // Generators don't consume power

        if (level <= 75) {
            return basePower;
        } else {
            // Tier 3: Energy Gate
            return Math.ceil(basePower * Math.pow(1.5, level - 75));
        }
    }

    /**
     * Calculate the cost for upgrading a room to the next level.
     * 
     * 3-Tier System (100-Level Cap):
     * - Tier 1 (1-25): Materials only. Scrap = BaseScrap * 1.1^L
     * - Tier 2 (26-75): Materials + Caps. Scrap = BaseScrap * 1.2^L, Caps = BaseMoney * L * 5
     * - Tier 3 (76-100): Materials + Caps + Energy Gate. Scrap = BaseScrap * 1.3^L, Caps = BaseMoney * 1.3^L
     *
     * @param {string} roomType - The room type key
     * @param {number} currentLevel - Current level of the room
     * @returns {Object|null} { caps: number, materials: number, powerDelta: number }
     */
    getUpgradeCost(roomType, currentLevel) {
        const roomDef = ECONOMY.ROOM_TYPES[roomType];
        if (!roomDef || !roomDef.upgrade) return null;

        const upgrade = roomDef.upgrade;
        const baseCost = upgrade.baseCost || { materials: 100, caps: 50 };

        // Base values
        const baseScrap = baseCost.materials || 0;
        const baseMoney = baseCost.caps || 0;

        let cost = { materials: 0, caps: 0, powerDelta: 0 };

        // --- TIER 1: EARLY GAME (Levels 1-25) ---
        if (currentLevel <= 25) {
            // Strategy: Fast, satisfying progress. Materials only.
            cost.materials = Math.ceil(baseScrap * Math.pow(1.1, currentLevel));
            cost.caps = 0;
        }
        // --- TIER 2: MID GAME (Levels 26-75) ---
        else if (currentLevel <= 75) {
            // Strategy: Economic friction. Materials + Caps.
            cost.materials = Math.ceil(baseScrap * Math.pow(1.2, currentLevel));
            cost.caps = Math.ceil(baseMoney * currentLevel * 5);
        }
        // --- TIER 3: LATE GAME (Levels 76-100) ---
        else {
            // Strategy: Infrastructure Bottleneck. Materials + Caps + Energy Gate.
            cost.materials = Math.ceil(baseScrap * Math.pow(1.3, currentLevel));
            cost.caps = Math.ceil(baseMoney * Math.pow(1.3, currentLevel));

            // ENERGY GATE
            const currentLoad = this.getPowerLoad(roomType, currentLevel);
            const nextLoad = this.getPowerLoad(roomType, currentLevel + 1);
            cost.powerDelta = nextLoad - currentLoad;
        }

        return cost;
    }

    /**
     * Calculate the current production output for a room at a given level.
     * Formula: baseAmount * (1 + (level - 1) * outputMultiplier)
     * Level 1 = base output (no bonus).
     * 
     * @param {string} roomType - The room type key
     * @param {number} level - Current level (1-based)
     * @returns {number} The effective output amount per cycle
     */
    getCurrentOutput(roomType, level) {
        const roomDef = ECONOMY.ROOM_TYPES[roomType];
        if (!roomDef) return 0;

        // Get base amount from resourceProducer or production object
        let baseAmount = 0;
        if (roomDef.resourceProducer) {
            baseAmount = roomDef.resourceProducer.amount;
        } else if (roomDef.production) {
            // Legacy/Fallback: sum of first production value
            baseAmount = Object.values(roomDef.production)[0] || 0;
        }

        const multiplier = (roomDef.upgrade && roomDef.upgrade.outputMultiplier)
            || this.upgradeConfig.outputMultiplierDefault;

        return baseAmount * (1 + (level - 1) * multiplier);
    }

    /**
     * Check if the player can afford the upgrade for a specific room.
     * CHECKS:
     * 1. Resource Wallet (Scrap/Money)
     * 2. Grid Capacity (Energy Gate)
     * 
     * @param {string} roomKey - The room key in gameState.rooms (e.g., "1_0")
     * @returns {object} { canAfford: boolean, reason: string }
     */
    canAffordUpgrade(roomKey) {
        const state = this.scene.registry.get('gameState');
        if (!state || !state.rooms[roomKey]) return { canAfford: false, reason: 'Room not found' };

        const room = state.rooms[roomKey];
        const cost = this.getUpgradeCost(room.type, room.level);

        // 1. Check Resources
        if (state.resources.materials < cost.materials) return { canAfford: false, reason: 'Not enough Scrap' };
        if (state.resources.caps < cost.caps) return { canAfford: false, reason: 'Not enough Caps' };

        // 2. Check Grid Capacity (Energy Gate)
        if (cost.powerDelta > 0) {
            // Grid Capacity Logic
            // We need separate capacity vs load tracking in EconomyManager.
            // state.netPower = Production - Consumption.
            // Available Power Buffer = max(0, netPower).

            const netAvailable = Math.max(0, state.netPower || 0); // Available buffer
            if (netAvailable < cost.powerDelta) {
                return { canAfford: false, reason: 'Insufficient Grid Capacity' };
            }
        }

        return { canAfford: true, reason: 'OK' };
    }

    /**
     * Check if a room is at max level.
     * 
     * @param {string} roomKey - The room key
     * @returns {boolean}
     */
    isMaxLevel(roomKey) {
        const state = this.scene.registry.get('gameState');
        if (!state || !state.rooms[roomKey]) return false;

        const room = state.rooms[roomKey];
        return room.level >= 100;
    }

    /**
     * Attempt to upgrade a room. Atomic transaction:
     * 1. Final validation (resources exist, level < max, Grid Check)
     * 2. Deduct cost
     * 3. Increment level
     * 4. Recalculate output (via ResourceProducer)
     * 5. Fire 'machineUpgraded' event
     * 
     * @param {string} roomKey - The room key (e.g., "1_0")
     * @returns {boolean} true if upgrade succeeded, false otherwise
     */
    /**
     * Upgrade ALL rooms of a specific type.
     * Cost is paid ONCE for the technology upgrade, affecting all machines.
     * 
     * @param {string} roomType - The type of room to upgrade (e.g., 'room_garden')
     * @returns {boolean} true if upgrade succeeded
     */
    upgradeMachineType(roomType) {
        const state = this.scene.registry.get('gameState');
        if (!state || !state.rooms) return false;

        // Find all rooms of this type
        const roomsOfType = Object.values(state.rooms).filter(r => r.type === roomType);
        const representativeRoom = roomsOfType[0];

        if (!representativeRoom) return false;

        // Check Max Level (on representative)
        if (this.isMaxLevel(representativeRoom.id)) return false; // Use ID if available, or just check level directly

        // Atomic Check (Cost based on current level of TYPE)
        // Ensure all rooms are synced? Assuming they are for now.
        const currentLevel = representativeRoom.level || 1;
        const affordability = this.canAffordUpgrade(Object.keys(state.rooms).find(key => state.rooms[key] === representativeRoom));

        // Actually, canAffordUpgrade uses roomKey. Let's make a simpler check.
        const cost = this.getUpgradeCost(roomType, currentLevel);

        // 1. Check Resources
        if (state.resources.materials < cost.materials) {
            console.log('Upgrade Failed: Not enough Scrap');
            return false;
        }
        if (state.resources.caps < cost.caps) {
            console.log('Upgrade Failed: Not enough Caps');
            return false;
        }

        // 2. Grid Capacity check
        if (cost.powerDelta > 0) {
            const netAvailable = Math.max(0, state.netPower || 0);
            if (netAvailable < cost.powerDelta * roomsOfType.length) {
                // Option: Check for Total Delta or Single Delta? 
                // User likely wants "Tech Upgrade" -> usually implies single investment. 
                // BUT if it increases power draw of 10 machines, grid might crash.
                // Decision: Check if grid can handle the load increase of ALL machines.
                console.log('Upgrade Failed: Insufficient Grid Capacity for all machines');
                return false;
            }
        }

        // Deduct Resources (Single Cost)
        state.resources.materials -= cost.materials;
        state.resources.caps -= cost.caps;

        // Apply Upgrade to ALL instances
        roomsOfType.forEach(room => {
            room.level = currentLevel + 1;
        });

        // Update Registry
        this.scene.registry.set('gameState', state);

        // Emit Event (Once for the Type)
        this.scene.events.emit('machineUpgraded', {
            type: roomType,
            roomType: roomType, // For compatibility
            newLevel: currentLevel + 1,
            count: roomsOfType.length
        });

        console.log(`Upgraded ${roomsOfType.length} ${roomType}s to Level ${currentLevel + 1}.`);
        return true;
    }
}
