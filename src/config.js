export const CONFIG = {
    // Map settings
    mapPath: 'New_maps/bunker_map_composite.png',

    // Character settings
    characterPath: 'characters/Gemini_Generated_Image_mq54v5mq54v5mq54.png',
    characterScale: 0.20, // Reduced from 0.25 to 0.20 per user request
    characterSpeed: 160,

    // Display
    aspectRatio: 9 / 16,

    // Resource defaults
    initialResources: {
        cash: { current: 12500, max: 0 },
        food: { current: 850, max: 1000 },
        wheat: { current: 470, max: 500 },
        energy: { current: 150, max: 200 }
    }
};

export const CONSTANTS = {
    SCENES: {
        BOOT: 'BootScene',
        PRELOAD: 'PreloadScene',
        GAME: 'GameScene',
        UI: 'UIScene'
    }
};
