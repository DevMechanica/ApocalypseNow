/**
 * MAP_OBJECTS_CONFIG
 * Defines which objects are pre-placed on the map by create_bunker_map.py
 * This matches the Python script's place_object() calls
 */

export const MAP_OBJECTS_CONFIG = {
    // Scene 1 (Surface) - Floors 1-5 (Global floors 1-5)
    1: {
        // Floor 1 (i=0 in Python)
        1: [
            { slot: 0, width: 2.4, type: 'hydroponic_garden' },
            { slot: 2, width: 2.4, type: 'hydroponic_garden' },
            { slot: 4, width: 2.4, type: 'hydroponic_garden' },
            { slot: 6, width: 2.4, type: 'hydroponic_garden' }
        ],
        // Floor 2 (i=1 in Python)
        2: [
            { slot: 0, width: 2.4, type: 'hydroponic_garden' },
            { slot: 2, width: 2.4, type: 'hydroponic_garden' },
            { slot: 4, width: 2.4, type: 'hydroponic_garden' },
            { slot: 6, width: 2.4, type: 'water_purifier' }
        ],
        // Floor 3 (i=2 in Python)
        3: [
            { slot: 0, width: 4, type: 'salvage_station' },
            { slot: 4, width: 2.4, type: 'hydroponic_garden' },
            { slot: 6, width: 2.4, type: 'hydroponic_garden' }
        ],
        // Floor 4 (i=3 in Python)
        4: [
            { slot: 0, width: 4, type: 'salvage_station' }
        ],
        // Floor 5 is entrance (no objects)
        5: []
    }
};
