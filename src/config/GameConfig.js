/**
 * Game Configuration
 * Central source of truth for all game constants
 */

export const CONFIG = {
    // Canvas settings
    canvas: {
        width: window.innerWidth,
        height: window.innerHeight
    },

    // Character settings
    character: {
        speed: 200,          // pixels per second
        size: 48,            // sprite size
        punchDuration: 0.3,  // seconds
        punchDamage: 25
    },

    // Enemy settings
    enemy: {
        size: 48,
        attackRange: 80,
        attackDamage: 10,
        attackCooldown: 2,   // seconds
        roamSpeed: 30        // pixels per second
    },

    // Player settings
    player: {
        maxHealth: 100,
        initialHealth: 100
    },

    // Rendering
    fps: 60,
    mapZoom: 0.6,

    // Debug
    showWalkableAreas: false
};

/**
 * Map coordinate system
 * User coordinates are based on the MAP IMAGE
 */
export const MAP_COORDS = {
    xMin: 304,  // Left edge of map
    xMax: 427   // Right edge of map
};

/**
 * Animation settings
 */
export const ANIMATION = {
    characterFrameDelay: 0.15,  // seconds between frames
    enemyFrameDelay: 0.3,
    videoStartOffset: 0.4       // seconds to skip at video start
};

/**
 * Asset paths
 */
export const ASSETS = {
    character: {
        front: [
            'Character/Walking_Animations/Walkind_front/Gemini_Generated_Image_528t6j528t6j528t_1.jpg',
            'Character/Walking_Animations/Walkind_front/Gemini_Generated_Image_528t6j528t6j528t_2.jpg',
            'Character/Walking_Animations/Walkind_front/Gemini_Generated_Image_528t6j528t6j528t_3.jpg'
        ],
        left: 'Character/Walking_Animations/Walking_left/download (40).mp4',
        right: 'Character/Walking_Animations/Walking_right/walking_right_flipped.mp4',
        punch: 'Screenshot 2026-01-02 154835.png'
    },
    zombie: {
        idle: 'Zombie/zombie_idle.png',
        walkLeft: 'Zombie/WalkingLeft/zombie_walk.mp4'
    },
    maps: {
        background: 'Maps/processed-image.png'
    }
};

export default CONFIG;
