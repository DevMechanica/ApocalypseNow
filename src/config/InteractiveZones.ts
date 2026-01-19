/**
 * Interactive Zones Configuration
 * Defines all interactable objects/areas in the game
 */

export interface LootItem {
  icon: string;
  name: string;
  count: number;
}

export interface InteractiveZone {
  name: string;
  xMinMap: number;
  xMaxMap: number;
  icon: string;
  action: string;
  type: 'door' | 'searchable' | 'action' | 'generator' | 'chest' | 'reactor';
  floor: number;
  
  // Optional properties based on type
  lockedMessage?: string;
  unlockMessage?: string;
  searchMessage?: string;
  hasKey?: boolean;
  requiresUnlock?: boolean;
  brokenMessage?: string;
  fixedMessage?: string;
  requiresZombieDefeated?: boolean;
  requiresCoreMessage?: string;
  insertMessage?: string;
  
  // Visual properties
  imageSrc?: string;
  width?: number;
  height?: number;
  yOffset?: number;
  
  // Loot for containers
  loot?: LootItem[];
}

export const INTERACTIVE_ZONES: InteractiveZone[] = [
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
  },
  {
    name: 'chest',
    xMinMap: 346,
    xMaxMap: 350,
    icon: '📦',
    action: 'Open Chest',
    type: 'chest',
    floor: 2,
    requiresZombieDefeated: true,
    lockedMessage: '💀 The zombie is guarding this chest! Defeat it first.',
    searchMessage: '📦 You found some supplies!',
    imageSrc: 'assets/objects/Gemini_Generated_Image_ircl2yircl2yircl.png',
    width: 200,
    height: 200,
    yOffset: 10,
    loot: [
      { icon: '🥫', name: 'Canned Food', count: 1 },
      { icon: '🔩', name: 'Screws', count: 2 },
      { icon: '⚛️', name: 'Reactor Core', count: 1 }
    ]
  },
  {
    name: 'reactor',
    xMinMap: 370,
    xMaxMap: 380,
    icon: '☢️',
    action: 'Insert Reactor Core',
    type: 'reactor',
    floor: 2,
    requiresCoreMessage: '⚠️ The reactor needs a core to function. Find one!',
    insertMessage: '☢️ Inserting Reactor Core...'
  }
];

/**
 * Get zones for specific floor
 */
export function getZonesForFloor(floor: number): InteractiveZone[] {
  return INTERACTIVE_ZONES.filter(zone => zone.floor === floor);
}
