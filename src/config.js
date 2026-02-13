// =============================================================================
// GAME CONFIGURATION
// =============================================================================

export const CONFIG = {
    // Map settings
    mapPath: 'New_maps/scene_', // Base path for dynamic loading (e.g., scene_1.png)

    // Character settings
    characterPath: 'characters/Normal_optimized-removebg-preview.png',
    characterScale: 1.35,
    characterSpeed: 160,

    // Elevator Settings
    ELEVATOR: {
        xRatio: 0.5,
        width: 100,
        speed: 300,
        waitTime: 1000
    },

    // Display
    aspectRatio: 9 / 16,

    // Debugging
    devMode: false
};

export const CONSTANTS = {
    SCENES: {
        BOOT: 'BootScene',
        PRELOAD: 'PreloadScene',
        GAME: 'GameScene',
        UI: 'UIScene'
    },
    // New Scene Configuration
    SCENE_CONFIG: {
        1: { id: 1, name: 'Surface', asset: 'scene_1', startFloor: 1, endFloor: 5, bg: 'background_city' },
        2: { id: 2, name: 'Underground 01', asset: 'scene_2', startFloor: 6, endFloor: 10, bg: 'underground_dirt' },
        3: { id: 3, name: 'Underground 02', asset: 'scene_3', startFloor: 11, endFloor: 15, bg: 'underground_dirt' },
        4: { id: 4, name: 'Underground 03', asset: 'scene_4', startFloor: 16, endFloor: 20, bg: 'underground_dirt' },
        5: { id: 5, name: 'Underground 04', asset: 'scene_5', startFloor: 21, endFloor: 25, bg: 'underground_dirt' },
        6: { id: 6, name: 'Underground 05', asset: 'scene_6', startFloor: 26, endFloor: 30, bg: 'underground_dirt' },
        7: { id: 7, name: 'Underground 06', asset: 'scene_7', startFloor: 31, endFloor: 35, bg: 'underground_dirt' },
        8: { id: 8, name: 'Underground 07', asset: 'scene_8', startFloor: 36, endFloor: 40, bg: 'underground_dirt' },
        9: { id: 9, name: 'Underground 08', asset: 'scene_9', startFloor: 41, endFloor: 45, bg: 'underground_dirt' },
        10: { id: 10, name: 'Deep Underground', asset: 'scene_10', startFloor: 46, endFloor: 50, bg: 'underground_dirt' }
    }
};

// =============================================================================
// GAME ECONOMY
// =============================================================================

export const ECONOMY = {
    // -------------------------------------------------------------------------
    // UPGRADE SYSTEM
    // -------------------------------------------------------------------------
    UPGRADE: {
        maxLevel: 10,                   // Maximum upgrade level for any machine
        costCurrency: 'caps',           // Primary currency for upgrades
        secondaryCurrency: 'materials', // Secondary currency for upgrades
        costScalingDefault: 1.5,        // Default: NextCost = BaseCost * (Factor ^ Level)
        outputMultiplierDefault: 0.25   // Default: Output = Base * (1 + Level * Multiplier)
    },

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
            sprite: 'room_garden', // Linked to PreloadScene
            width: 2,
            bestStat: 'agility',
            buildCost: { materials: 100, caps: 50 },
            powerCost: 5,
            maxWorkers: 2,
            production: { food: 5 },  // Per minute base (Legacy)
            resourceProducer: {
                outputType: 'food',
                amount: 1,
                interval: 10000, // 10s
                capacity: 18
            },
            upgrade: {
                baseCost: { caps: 75, materials: 40 },
                costScaling: 1.5,
                outputMultiplier: 0.25
            },
            description: 'Grows food using water and power'
        },
        water_purifier: {
            name: 'Water Purifier',
            category: 'production',
            sprite: 'room_water',
            width: 2,
            bestStat: 'agility',
            buildCost: { materials: 80, caps: 40 },
            powerCost: 8,
            maxWorkers: 2,
            production: { water: 6 },
            resourceProducer: {
                outputType: 'water',
                amount: 1,
                interval: 15000, // 15s
                capacity: 16
            },
            upgrade: {
                baseCost: { caps: 60, materials: 35 },
                costScaling: 1.5,
                outputMultiplier: 0.25
            },
            description: 'Purifies contaminated water'
        },
        power_generator: {
            name: 'Power Generator',
            category: 'production',
            sprite: 'room_generator',
            bestStat: 'strength',
            buildCost: { materials: 120, caps: 60 },
            powerCost: 0,  // Produces power
            maxWorkers: 2,
            production: { power: 10 },
            resourceProducer: {
                outputType: 'power',
                amount: 5,
                interval: 10000, // 10s
                capacity: 50
            },
            upgrade: {
                baseCost: { caps: 100, materials: 55 },
                costScaling: 1.6,
                outputMultiplier: 0.30
            },
            description: 'Generates electricity'
        },
        salvage_station: {
            name: 'Salvage Station',
            category: 'production',
            sprite: 'room_generator', // Placeholder
            width: 4,
            bestStat: 'agility',
            buildCost: { materials: 60, caps: 30 },
            powerCost: 3,
            maxWorkers: 3,
            production: { materials: 3, caps: 1 },
            resourceProducer: {
                outputType: 'materials',
                amount: 1,
                interval: 12000, // 12s
                capacity: 20
            },
            upgrade: {
                baseCost: { caps: 50, materials: 25 },
                costScaling: 1.4,
                outputMultiplier: 0.20
            },
            description: 'Breaks down junk into materials'
        },

        // UTILITY ROOMS
        living_quarters: {
            name: 'Living Quarters',
            category: 'utility',
            sprite: 'room_generator', // Placeholder
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
            sprite: 'room_generator', // Placeholder
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
            sprite: 'room_generator', // Placeholder
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
            sprite: 'room_generator', // Placeholder
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
            sprite: 'room_generator', // Placeholder
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
            sprite: 'room_generator', // Placeholder
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
            sprite: 'room_generator', // Placeholder
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
            sprite: 'room_generator', // Placeholder
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
            sprite: 'room_generator', // Placeholder
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
        bossFloors: [10, 20, 30, 40, 50],
        // Dimensions (Source Image Pixels)
        // *** SYNC WITH grid_config.json - These values must match! ***
        // After changes, run: python New_maps/create_bunker_map.py
        height: 519,  // grid_config.json -> floor.effectiveHeight

        padding: {
            left: 0.15,      // Left Wall (matches Python room_x / canvas_w = 418/2784)
            right: 0.15      // Right Wall (room is centered, symmetric padding)
        },

        // Scene-specific Y positioning
        // *** SYNC WITH grid_config.json -> scenes ***
        sceneConfig: {
            surface: {
                firstRoomY: 600,       // grid_config.json -> scenes.surface.firstRoomY
                floorLineOffset: 575   // grid_config.json -> scenes.surface.floorLineOffset
            },
            underground: {
                firstRoomY: 100,       // grid_config.json -> scenes.underground.firstRoomY
                floorLineOffset: 575   // grid_config.json -> scenes.underground.floorLineOffset
            }
        },

        // Grid Alignment Offsets (Source Pixels)
        // *** SYNC WITH grid_config.json ***
        slotSpacingFactor: 0.77,
        assetOffsets: {
            salvage_station: { x: -60, y: -220 },
            water_purifier: { x: 0, y: -180 },
            hydroponic_garden: { x: 0, y: -120 },
            default: { x: 0, y: -150 }
        }
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
    lastHorde: 0,

    // Settings
    autoFarming: true
};
