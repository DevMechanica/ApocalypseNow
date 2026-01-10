/**
 * Level Data Configuration
 * Map coordinates, interactive zones, and floor positions
 */

/**
 * Floor Y positions (as percentage of canvas height)
 */
export const FLOORS = {
    first: 0.563,   // Bunker first floor
    second: 0.66    // Lower bunker floor
};

/**
 * Movement constraints per level
 */
export const MOVEMENT_CONSTRAINTS = {
    // Level 1 - before generator room unlocked
    level1Locked: {
        xMinMap: 358,
        xMaxMap: 384
    },
    // Level 1 - after generator room unlocked
    level1Unlocked: {
        xMinMap: 344,
        xMaxMap: 384
    },
    // Level 2
    level2: {
        xMinMap: 344,
        xMaxMap: 384
    }
};

/**
 * Interactive zones configuration
 * Uses MAP coordinates (304-427 range)
 */
export const INTERACTIVE_ZONES = [
    {
        name: 'door',
        xMinMap: 358,
        xMaxMap: 360,
        icon: '🚪',
        action: 'Unlock Door',
        type: 'door',
        floor: 1,
        lockedMessage: '🔒 The door is locked. You need a key...',
        unlockMessage: '🔓 You unlocked the door! The room is revealed...'
    },
    {
        name: 'lantern',
        xMinMap: 350,
        xMaxMap: 352,
        icon: '🏮',
        action: 'Search Lantern',
        type: 'searchable',
        floor: 1,
        searchMessage: 'An old oil lantern. It flickers warmly but nothing useful here...'
    },
    {
        name: 'bed',
        xMinMap: 362,
        xMaxMap: 376,
        icon: '🛏️',
        action: 'Go to Sleep',
        type: 'action',
        floor: 1
    },
    {
        name: 'shelf',
        xMinMap: 380,
        xMaxMap: 384,
        icon: '📦',
        action: 'Search Shelf',
        type: 'searchable',
        floor: 1,
        searchMessage: '🔑 You found a rusty key hidden behind old books!',
        hasKey: true
    },
    {
        name: 'generator',
        xMinMap: 344,
        xMaxMap: 348,
        icon: '⚡',
        action: 'Fix Generator',
        type: 'generator',
        floor: 1,
        requiresUnlock: true,
        brokenMessage: '⚙️ The generator is broken. You need to fix it to restore power!',
        fixedMessage: '💡 Generator is working! Level 2 unlocked!'
    }
];

/**
 * Stair positions for floor transitions
 */
export const STAIRS = {
    xMapPosition: 335  // Map X coordinate of stairs
};

/**
 * Walkable areas (polygon definitions)
 */
export const WALKABLE_AREAS = [
    {
        name: 'Main Floor',
        points: [
            { x: 100, y: 100 },
            { x: window.innerWidth - 100, y: 100 },
            { x: window.innerWidth - 100, y: window.innerHeight - 100 },
            { x: 100, y: window.innerHeight - 100 }
        ]
    }
];

/**
 * Enemy spawn configuration
 */
export const ENEMY_SPAWNS = {
    level2: {
        xMapPosition: 370,
        floor: 'second'
    }
};

export default {
    FLOORS,
    MOVEMENT_CONSTRAINTS,
    INTERACTIVE_ZONES,
    STAIRS,
    WALKABLE_AREAS,
    ENEMY_SPAWNS
};
