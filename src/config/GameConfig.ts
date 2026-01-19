/**
 * Game Configuration
 * Ported from original game.js CONFIG object
 */

export const CONFIG = {
  character: {
    speed: 200,      // pixels per second
    size: 48,        // character size in pixels
    punchDuration: 0.3,  // seconds
    punchRange: 100,     // pixels
    punchDamage: 25
  },
  enemy: {
    speed: 30,           // roam speed
    attackRange: 80,
    attackDamage: 10,
    attackCooldown: 2,   // seconds
    health: 100
  },
  game: {
    fps: 60,
    mapZoom: 0.6,
    showWalkableAreas: false
  },
  player: {
    maxHealth: 100,
    startingMoney: 100
  }
};

// Map coordinate system (original uses 304-427 range)
export const MAP_COORDS = {
  X_MIN: 304,
  X_MAX: 427,
  // Floor Y positions as percentage of canvas height
  FLOOR_1_Y: 0.563,
  FLOOR_2_Y: 0.66,
  FLOOR_3_Y: 0.795,
  // Stairs position in map coordinates
  STAIRS_X: 335
};

// Floor grid layouts for build mode
export const FLOOR_GRIDS: Record<number, FloorGrid> = {
  1: { cols: 5, rows: 2, startMapX: 355, yPercent: 0.50, tileSize: 30 },
  2: { cols: 5, rows: 2, startMapX: 355, yPercent: 0.61, tileSize: 30 },
  3: { cols: 5, rows: 2, startMapX: 355, yPercent: 0.75, tileSize: 30 }
};

export interface FloorGrid {
  cols: number;
  rows: number;
  startMapX: number;
  yPercent: number;
  tileSize: number;
}

// Buildable items for Build Mode
export interface BuildableItem {
  id: string;
  name: string;
  icon: string;
  cost: Record<string, number>;
  size: number;
  category: string;
}

export const BUILDABLE_ITEMS: BuildableItem[] = [
  { id: 'chest', name: 'Chest', icon: '📦', cost: { Metal: 5 }, size: 1, category: 'storage' },
  { id: 'lamp', name: 'Lamp', icon: '💡', cost: { Metal: 2 }, size: 1, category: 'utility' },
  { id: 'turret', name: 'Turret', icon: '🔫', cost: { Metal: 20, Screws: 5 }, size: 1, category: 'defense' },
  { id: 'bed', name: 'Bed', icon: '🛏️', cost: { Metal: 10 }, size: 1, category: 'utility' },
  { id: 'workbench', name: 'Workbench', icon: '🔧', cost: { Metal: 15 }, size: 1, category: 'production' },
  { id: 'barrel', name: 'Barrel', icon: '🛢️', cost: { Metal: 3 }, size: 1, category: 'storage' }
];

// Animation configuration
export const ANIMATION = {
  characterFrameDelay: 0.15,  // seconds between frames
  videoStartOffset: 0.4,      // seconds into video to start playing
  enemyFrameDelay: 0.3
};

// Asset paths (relative to project root, inside assets/ folder)
export const ASSETS = {
  maps: {
    video: 'assets/cutscenes/download (38).mp4',
    level2: 'assets/maps/Gemini_Generated_Image_1cg9221cg9221cg9.png',
    level3: 'assets/maps/Gemini_Generated_Image_gmqmqogmqmqogmqm.png',
    generatorRoom: 'assets/maps/generator_room_zoomed/Gemini_Generated_Image_o2k7ho2k7ho2k7ho.png',
    generatorPanel: 'assets/maps/generator_room_zoomed/Gemini_Generated_Image_yu3eniyu3eniyu3e.png'
  },
  character: {
    front: [
      'assets/character/walking_animations/walking_front/Gemini_Generated_Image_528t6j528t6j528t_1.jpg',
      'assets/character/walking_animations/walking_front/Gemini_Generated_Image_528t6j528t6j528t_2.jpg',
      'assets/character/walking_animations/walking_front/Gemini_Generated_Image_528t6j528t6j528t_3.jpg'
    ],
    left: 'assets/character/walking_animations/walking_left/download (40).mp4',
    right: 'assets/character/walking_animations/walking_right/walking_right_flipped.mp4',
    punch: 'assets/character/punch.png'
  },
  zombie: {
    idle: 'assets/zombie/zombie_idle.png',
    walk: 'assets/zombie/walking_left/zombie_walk.mp4'
  },
  cutscenes: {
    intro: [
      'assets/cutscenes/download (35).mp4',
      'assets/cutscenes/download (37).mp4'
    ],
    reactor: 'assets/cutscenes/download (56).mp4'
  },
  objects: {
    chest: 'assets/objects/Gemini_Generated_Image_ircl2yircl2yircl.png'
  }
};
