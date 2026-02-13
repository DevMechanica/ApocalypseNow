import { ECONOMY } from '../config.js';

/**
 * MachineUpgradeManager
 * 
 * Pure logic controller for the machine upgrade system.
 * Handles cost calculation, output scaling, and atomic upgrade transactions.
 * 
 * Design:
 * - Config-driven: All tuning values come from ECONOMY.UPGRADE and per-room upgrade blocks.
 * - Event-driven: Emits 'machineUpgraded' event on successful upgrade.
 * - Atomic transactions: Final resource validation before deduction prevents exploits.
 * - No polling: UI listens to events, not update loops.
 */
export class MachineUpgradeManager {

    /**
     * @param {Phaser.Scene} scene - The GameScene instance (for Registry and event access)
     */
    constructor(scene) {
        if (!scene) {
            throw new Error('[MachineUpgrade] Scene reference is required');
        }
        this.scene = scene;
        this.upgradeConfig = ECONOMY.UPGRADE;

        console.log('[MachineUpgrade] Manager initialized');
    }

    // =========================================================================
    // QUERIES
    // =========================================================================

    /**
     * Returns a list of all constructed rooms that support upgrades.
     * Each entry: { key, type, level, roomDef, upgradeDef }
     * @returns {Array<Object>}
     */
    getUpgradeableRooms() {
        const state = this.scene.registry.get('gameState');
        if (!state || !state.rooms) return [];

        const result = [];

        Object.entries(state.rooms).forEach(([key, roomData]) => {
            const roomDef = ECONOMY.ROOM_TYPES[roomData.type];
            if (!roomDef || !roomDef.upgrade) return; // Skip non-upgradeable rooms

            result.push({
                key: key,
                type: roomData.type,
                level: roomData.level || 1,
                roomDef: roomDef,
                upgradeDef: roomDef.upgrade
            });
        });

        return result;
    }

    /**
     * Calculate the cost for upgrading a room to the next level.
     * Formula: baseCost * (costScaling ^ currentLevel)
     * 
     * @param {string} roomType - The room type key (e.g., 'hydroponic_garden')
     * @param {number} currentLevel - Current level of the room
     * @returns {Object|null} { caps: number, materials: number } or null if not upgradeable
     */
    getUpgradeCost(roomType, currentLevel) {
        const roomDef = ECONOMY.ROOM_TYPES[roomType];
        if (!roomDef || !roomDef.upgrade) return null;

        const upgrade = roomDef.upgrade;
        const scaling = upgrade.costScaling || this.upgradeConfig.costScalingDefault;

        const cost = {};
        const baseCost = upgrade.baseCost || {};

        // Apply exponential scaling to each currency
        Object.entries(baseCost).forEach(([currency, base]) => {
            cost[currency] = Math.ceil(base * Math.pow(scaling, currentLevel));
        });

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
        if (!roomDef || !roomDef.resourceProducer) return 0;

        const baseAmount = roomDef.resourceProducer.amount;
        const multiplier = (roomDef.upgrade && roomDef.upgrade.outputMultiplier)
            ? roomDef.upgrade.outputMultiplier
            : this.upgradeConfig.outputMultiplierDefault;

        // Level 1 = base, Level 2 = base * (1 + multiplier), etc.
        return baseAmount * (1 + ((level - 1) * multiplier));
    }

    /**
     * Check if the player can afford the upgrade for a specific room.
     * 
     * @param {string} roomKey - The room key in gameState.rooms (e.g., "1_0")
     * @returns {boolean}
     */
    canAffordUpgrade(roomKey) {
        const state = this.scene.registry.get('gameState');
        if (!state || !state.rooms[roomKey]) return false;

        const roomData = state.rooms[roomKey];
        const level = roomData.level || 1;

        // Max level check
        if (level >= this.upgradeConfig.maxLevel) return false;

        const cost = this.getUpgradeCost(roomData.type, level);
        if (!cost) return false;

        // Validate all currencies
        return Object.entries(cost).every(([currency, amount]) => {
            return (state.resources[currency] || 0) >= amount;
        });
    }

    /**
     * Check if a room is at max level.
     * 
     * @param {string} roomKey - The room key
     * @returns {boolean}
     */
    isMaxLevel(roomKey) {
        const state = this.scene.registry.get('gameState');
        if (!state || !state.rooms[roomKey]) return true;

        const level = state.rooms[roomKey].level || 1;
        return level >= this.upgradeConfig.maxLevel;
    }

    // =========================================================================
    // TRANSACTIONS
    // =========================================================================

    /**
     * Attempt to upgrade a room. Atomic transaction:
     * 1. Final validation (resources exist, level < max)
     * 2. Deduct cost
     * 3. Increment level
     * 4. Recalculate output (via ResourceProducer)
     * 5. Fire 'machineUpgraded' event
     * 
     * @param {string} roomKey - The room key (e.g., "1_0")
     * @returns {boolean} true if upgrade succeeded, false otherwise
     */
    upgradeRoom(roomKey) {
        // --- Step 1: FINAL VALIDATION ---
        const state = this.scene.registry.get('gameState');
        if (!state || !state.rooms[roomKey]) {
            console.warn(`[MachineUpgrade] Room "${roomKey}" not found in gameState`);
            return false;
        }

        const roomData = state.rooms[roomKey];
        const currentLevel = roomData.level || 1;
        const roomDef = ECONOMY.ROOM_TYPES[roomData.type];

        if (!roomDef || !roomDef.upgrade) {
            console.warn(`[MachineUpgrade] Room type "${roomData.type}" is not upgradeable`);
            return false;
        }

        if (currentLevel >= this.upgradeConfig.maxLevel) {
            console.warn(`[MachineUpgrade] Room "${roomKey}" is already at max level (${currentLevel})`);
            return false;
        }

        const cost = this.getUpgradeCost(roomData.type, currentLevel);
        if (!cost) {
            console.warn(`[MachineUpgrade] Could not calculate upgrade cost for "${roomKey}"`);
            return false;
        }

        // Final resource check (prevents double-click exploit)
        const canAfford = Object.entries(cost).every(([currency, amount]) => {
            return (state.resources[currency] || 0) >= amount;
        });

        if (!canAfford) {
            console.warn(`[MachineUpgrade] Insufficient resources for "${roomKey}" upgrade`);
            return false;
        }

        // --- Step 2: DEDUCT COST ---
        Object.entries(cost).forEach(([currency, amount]) => {
            state.resources[currency] = (state.resources[currency] || 0) - amount;
        });

        // --- Step 3: INCREMENT LEVEL ---
        const newLevel = currentLevel + 1;
        roomData.level = newLevel;

        // --- Step 4: RECALCULATE OUTPUT ---
        const newOutput = this.getCurrentOutput(roomData.type, newLevel);

        // Update the ResourceProducer's effective amount if the ResourceSystem is available
        if (this.scene.economy && this.scene.economy.resourceSystem) {
            const producer = this.scene.economy.resourceSystem.producers.find(
                p => p.data === roomData
            );
            if (producer) {
                // Override the config amount with the upgraded value
                producer.config.amount = newOutput;
                console.log(`[MachineUpgrade] Producer output updated: ${newOutput.toFixed(2)}`);
            }
        }

        // --- Step 5: PERSIST & FIRE EVENT ---
        this.scene.registry.set('gameState', state);

        const nextCost = this.getUpgradeCost(roomData.type, newLevel);

        this.scene.events.emit('machineUpgraded', {
            roomKey: roomKey,
            roomType: roomData.type,
            oldLevel: currentLevel,
            newLevel: newLevel,
            newOutput: newOutput,
            costPaid: cost,
            nextCost: nextCost
        });

        console.log(`[MachineUpgrade] ✅ "${roomDef.name}" upgraded: Lv.${currentLevel} → Lv.${newLevel} | Output: ${newOutput.toFixed(2)} | Next Cost: ${JSON.stringify(nextCost)}`);

        return true;
    }
}
