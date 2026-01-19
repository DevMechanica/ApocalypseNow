import { LootItem } from '../config/InteractiveZones';

/**
 * GameState - Shared game state management
 */
export interface PlacedItem {
  id: string;
  floor: number;
  gridX: number;
  gridY: number;
}

export interface InventoryItem {
  count: number;
  icon: string;
}

export interface GameStateData {
  // Quest flags
  keyFound: boolean;
  searchedObjects: Set<string>;
  currentLevel: number;
  generatorRoomUnlocked: boolean;
  generatorFixed: boolean;
  zombieDefeated: boolean;
  reactorCoreInserted: boolean;
  
  // Floor state
  isClimbing: boolean;
  onSecondFloor: boolean;
  onThirdFloor: boolean;
  climbTargetX: number | null;
  
  // Combat
  playerHealth: number;
  playerMaxHealth: number;
  inCombat: boolean;
  
  // Generator puzzle
  generatorPuzzleActive: boolean;
  showingPanel: boolean;
  circuitBreakers: boolean[];
  
  // Placed items
  placedItems: PlacedItem[];
  
  // Currency
  money: number;
  
  // Inventory
  inventory: Record<string, InventoryItem>;
  
  // Map state - separate canvases for progressive floor reveals
  floor2LitCanvas: HTMLCanvasElement | null;  // Floor 2 lit overlay (after generator fixed)
  mapFrameCanvas: HTMLCanvasElement | null;   // Full level 3 map (after reactor inserted)
}

class GameStateManager {
  private state: GameStateData = {
    keyFound: false,
    searchedObjects: new Set(),
    currentLevel: 1,
    generatorRoomUnlocked: false,
    generatorFixed: false,
    zombieDefeated: false,
    reactorCoreInserted: false,
    
    isClimbing: false,
    onSecondFloor: false,
    onThirdFloor: false,
    climbTargetX: null,
    
    playerHealth: 100,
    playerMaxHealth: 100,
    inCombat: false,
    
    generatorPuzzleActive: false,
    showingPanel: false,
    circuitBreakers: [false, false, false, false, false],
    
    placedItems: [],
    money: 100,
    
    inventory: {},
    floor2LitCanvas: null,
    mapFrameCanvas: null
  };

  get(): GameStateData {
    return this.state;
  }

  reset(): void {
    this.state = {
      keyFound: false,
      searchedObjects: new Set(),
      currentLevel: 1,
      generatorRoomUnlocked: false,
      generatorFixed: false,
      zombieDefeated: false,
      reactorCoreInserted: false,
      
      isClimbing: false,
      onSecondFloor: false,
      onThirdFloor: false,
      climbTargetX: null,
      
      playerHealth: 100,
      playerMaxHealth: 100,
      inCombat: false,
      
      generatorPuzzleActive: false,
      showingPanel: false,
      circuitBreakers: [false, false, false, false, false],
      
      placedItems: [],
      money: 100,
      
      inventory: {},
      floor2LitCanvas: null,
      mapFrameCanvas: null
    };
  }

  // Convenience methods
  getCurrentFloor(): number {
    if (this.state.onThirdFloor) return 3;
    if (this.state.onSecondFloor) return 2;
    return 1;
  }

  addToInventory(name: string, count: number, icon: string): void {
    if (!this.state.inventory[name]) {
      this.state.inventory[name] = { count: 0, icon };
    }
    this.state.inventory[name].count += count;
  }

  removeFromInventory(name: string, count: number): boolean {
    if (this.state.inventory[name] && this.state.inventory[name].count >= count) {
      this.state.inventory[name].count -= count;
      if (this.state.inventory[name].count <= 0) {
        delete this.state.inventory[name];
      }
      return true;
    }
    return false;
  }

  hasItem(name: string): boolean {
    return !!this.state.inventory[name] && this.state.inventory[name].count > 0;
  }

  takeDamage(amount: number): boolean {
    this.state.playerHealth -= amount;
    if (this.state.playerHealth <= 0) {
      this.state.playerHealth = 0;
      return true; // Player died
    }
    return false;
  }
}

// Singleton export
export const gameState = new GameStateManager();
