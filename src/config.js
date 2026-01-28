// =============================================================================
// GAME CONFIGURATION
// =============================================================================

export const CONFIG = {
    // Map settings
    mapPath: 'New_maps/bunker_map_composite.png',

    // Character settings
    characterPath: 'characters/Normal_optimized.png',
    characterScale: 0.35, // Resized asset (324px) scaled to 35%
    characterSpeed: 160,

    // Display
    aspectRatio: 9 / 16
};

export const CONSTANTS = {
    SCENES: {
        BOOT: 'BootScene',
        PRELOAD: 'PreloadScene',
        GAME: 'GameScene',
        UI: 'UIScene'
    }
};

// =============================================================================
// GAME ECONOMY
// =============================================================================

export const ECONOMY = {
    // -------------------------------------------------------------------------
    // RESOURCES
    // -------------------------------------------------------------------------
    RESOURCES: {
        caps: {
            name: 'Caps',
            icon: 'icon_cash',
            color: 0x4CAF50,
            initial: 500,
            max: 0,  // 0 = unlimited
            description: 'Currency for trading and upgrades'
        },
        food: {
            name: 'Food',
            icon: 'icon_food',
            color: 0x2196F3,
            initial: 100,
            max: 500,
            description: 'Essential for survivor health'
        },
        water: {
            name: 'Water',
            icon: 'icon_water',
            color: 0x00BCD4,
            initial: 100,
            max: 500,
            description: 'Required for hydroponics and drinking'
        },
        power: {
            name: 'Power',
            icon: 'icon_energy',
            color: 0xFFC107,
            initial: 50,
            max: 200,
            description: 'Keeps the lights and machines running'
        },
        materials: {
            name: 'Materials',
            icon: 'icon_materials',
            color: 0x795548,
            initial: 200,
            max: 1000,
            description: 'Building and upgrades'
        }
    },

    // -------------------------------------------------------------------------
    // SURVIVORS
    // -------------------------------------------------------------------------
    SURVIVOR_STATS: ['strength', 'intelligence', 'agility', 'endurance'],

    SURVIVOR_TEMPLATE: {
        name: 'Survivor',
        level: 1,
        stats: {
            strength: 1,      // Combat, power generation
            intelligence: 1,  // Research, medical, tech
            agility: 1,       // Production speed, salvage
            endurance: 1      // Work duration before rest
        },
        happiness: 100,
        health: 100,
        assigned: null,  // Room ID
        isResting: false
    },

    SURVIVOR_UPKEEP: {
        food: 1,   // Per minute
        water: 1   // Per minute
    },

    SURVIVOR_ARRIVAL_INTERVAL: [300, 600],  // 5-10 minutes (seconds)

    // -------------------------------------------------------------------------
    // ROOMS
    // -------------------------------------------------------------------------
    ROOM_TYPES: {
        // PRODUCTION ROOMS
        hydroponic_garden: {
            name: 'Hydroponic Garden',
            category: 'production',
            width: 2,
            bestStat: 'agility',
            buildCost: { materials: 100, caps: 50 },
            powerCost: 5,
            maxWorkers: 2,
            production: { food: 5 },  // Per minute base
            description: 'Grows food using water and power'
        },
        water_purifier: {
            name: 'Water Purifier',
            category: 'production',
            width: 2,
            bestStat: 'agility',
            buildCost: { materials: 80, caps: 40 },
            powerCost: 8,
            maxWorkers: 2,
            production: { water: 6 },
            description: 'Purifies contaminated water'
        },
        power_generator: {
            name: 'Power Generator',
            category: 'production',
            bestStat: 'strength',
            buildCost: { materials: 120, caps: 60 },
            powerCost: 0,  // Produces power
            maxWorkers: 2,
            production: { power: 10 },
            description: 'Generates electricity'
        },
        salvage_station: {
            name: 'Salvage Station',
            category: 'production',
            width: 4,
            bestStat: 'agility',
            buildCost: { materials: 60, caps: 30 },
            powerCost: 3,
            maxWorkers: 3,
            production: { materials: 3, caps: 1 },
            description: 'Breaks down junk into materials'
        },

        // UTILITY ROOMS
        living_quarters: {
            name: 'Living Quarters',
            category: 'utility',
            bestStat: 'endurance',
            buildCost: { materials: 50, caps: 20 },
            powerCost: 2,
            maxWorkers: 0,
            capacity: 4,  // Survivor capacity
            production: {},
            description: 'Housing for survivors'
        },
        storage: {
            name: 'Storage',
            category: 'utility',
            bestStat: 'endurance',
            buildCost: { materials: 40, caps: 15 },
            powerCost: 1,
            maxWorkers: 1,
            storageBonus: { food: 100, water: 100, materials: 200 },
            production: {},
            description: 'Increases resource capacity'
        },
        medbay: {
            name: 'Medbay',
            category: 'utility',
            bestStat: 'intelligence',
            buildCost: { materials: 150, caps: 100 },
            powerCost: 10,
            maxWorkers: 2,
            healRate: 5,  // HP per minute
            production: {},
            description: 'Heals injured survivors'
        },

        // DEFENSE ROOMS
        armory: {
            name: 'Armory',
            category: 'defense',
            bestStat: 'strength',
            buildCost: { materials: 200, caps: 150 },
            powerCost: 5,
            maxWorkers: 2,
            combatBonus: 10,
            production: {},
            description: 'Equips survivors for combat'
        },
        turret_room: {
            name: 'Turret Room',
            category: 'defense',
            bestStat: 'strength',
            buildCost: { materials: 300, caps: 200 },
            powerCost: 15,
            maxWorkers: 1,
            damage: 20,  // DPS during attacks
            production: {},
            description: 'Automated defense'
        },
        blast_door: {
            name: 'Blast Door',
            category: 'defense',
            bestStat: 'strength',
            buildCost: { materials: 250, caps: 100 },
            powerCost: 0,
            maxWorkers: 0,
            defenseHP: 500,
            production: {},
            description: 'Slows enemy advance'
        },

        // SPECIAL ROOMS
        research_lab: {
            name: 'Research Lab',
            category: 'special',
            bestStat: 'intelligence',
            buildCost: { materials: 400, caps: 300 },
            powerCost: 20,
            maxWorkers: 3,
            researchSpeed: 1.5,
            production: {},
            description: 'Unlocks new technologies'
        },
        radio_room: {
            name: 'Radio Room',
            category: 'special',
            bestStat: 'intelligence',
            buildCost: { materials: 100, caps: 80 },
            powerCost: 8,
            maxWorkers: 1,
            survivorBonus: 1.5,  // Increases arrival rate
            production: {},
            description: 'Attracts survivors'
        },
        trading_post: {
            name: 'Trading Post',
            category: 'special',
            bestStat: 'intelligence',
            buildCost: { materials: 150, caps: 120 },
            powerCost: 5,
            maxWorkers: 2,
            tradeBonus: 0.2,  // 20% better prices
            production: {},
            description: 'Trade resources for caps'
        }
    },

    // -------------------------------------------------------------------------
    // FLOORS & PROGRESSION
    // -------------------------------------------------------------------------
    FLOOR: {
        maxFloors: 50,
        slotsPerFloor: 8,
        excavationBaseCost: 100,
        excavationMultiplier: 1.5,  // Cost = base * (multiplier ^ floor)
        bossFloors: [10, 20, 30, 40, 50]
    },

    // -------------------------------------------------------------------------
    // THREATS
    // -------------------------------------------------------------------------
    THREATS: {
        scout: {
            name: 'Scout',
            interval: 600,  // 10 minutes (seconds)
            enemyCount: [1, 2],
            enemyHP: 20,
            enemyDamage: 5,
            rewards: { caps: 10, materials: 5 }
        },
        raid: {
            name: 'Raid',
            interval: 7200,  // 2 hours
            enemyCount: [5, 10],
            enemyHP: 40,
            enemyDamage: 10,
            rewards: { caps: 50, materials: 30 }
        },
        horde: {
            name: 'Horde',
            interval: 28800,  // 8 hours
            enemyCount: [20, 35],
            enemyHP: 60,
            enemyDamage: 15,
            rewards: { caps: 200, materials: 100 }
        }
    },

    // -------------------------------------------------------------------------
    // BIOMES
    // -------------------------------------------------------------------------
    BIOMES: {
        urban_ruins: {
            name: 'Urban Ruins',
            unlockFloor: 0,  // Starting biome
            background: 'bg_urban',
            specialResource: 'scrap_metal',
            enemyType: 'zombie',
            colorTint: 0x888888,
            description: 'The starting bunker in a ruined city'
        },
        arctic_base: {
            name: 'Arctic Base',
            unlockFloor: 50,
            background: 'bg_arctic',
            specialResource: 'ice_cores',
            enemyType: 'frozen_creature',
            colorTint: 0x88CCFF,
            description: 'An abandoned military base in frozen tundra'
        },
        desert_bunker: {
            name: 'Desert Bunker',
            unlockFloor: 50,
            background: 'bg_desert',
            specialResource: 'solar_crystals',
            enemyType: 'raider',
            colorTint: 0xFFCC88,
            description: 'A hidden shelter under desert sands'
        },
        underground_caves: {
            name: 'Underground Caves',
            unlockFloor: 50,
            background: 'bg_caves',
            specialResource: 'rare_minerals',
            enemyType: 'mutant_insect',
            colorTint: 0x664488,
            description: 'Deep cave system with bioluminescence'
        },
        underwater_lab: {
            name: 'Underwater Lab',
            unlockFloor: 50,
            background: 'bg_underwater',
            specialResource: 'coral_tech',
            enemyType: 'sea_mutant',
            colorTint: 0x0088AA,
            description: 'A submerged research facility'
        },
        volcano_facility: {
            name: 'Volcano Facility',
            unlockFloor: 50,
            background: 'bg_volcano',
            specialResource: 'obsidian',
            enemyType: 'fire_elemental',
            colorTint: 0xFF4400,
            description: 'Geothermal power plant inside a volcano'
        }
    }
};

// =============================================================================
// INITIAL GAME STATE (for new games)
// =============================================================================

export const INITIAL_GAME_STATE = {
    // Resources
    resources: {
        caps: ECONOMY.RESOURCES.caps.initial,
        food: ECONOMY.RESOURCES.food.initial,
        water: ECONOMY.RESOURCES.water.initial,
        power: ECONOMY.RESOURCES.power.initial,
        materials: ECONOMY.RESOURCES.materials.initial
    },
    resourceMax: {
        caps: ECONOMY.RESOURCES.caps.max,
        food: ECONOMY.RESOURCES.food.max,
        water: ECONOMY.RESOURCES.water.max,
        power: ECONOMY.RESOURCES.power.max,
        materials: ECONOMY.RESOURCES.materials.max
    },

    // Progression
    currentFloor: 1,
    currentBiome: 'urban_ruins',
    unlockedBiomes: ['urban_ruins'],

    // Survivors
    survivors: [],
    survivorCapacity: 4,  // Starting capacity

    // Rooms (keyed by floor_slot, e.g., "1_0", "1_1", "2_0")
    rooms: {},

    // Time tracking
    lastUpdate: Date.now(),
    playTime: 0,

    // Threats
    lastScout: 0,
    lastRaid: 0,
    lastHorde: 0
};
