/**
 * EventBus - Pub/Sub messaging system for decoupled communication
 * Allows game components to communicate without direct dependencies
 */

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     */
    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler function to remove
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * Emit an event with optional data
     * @param {string} event - Event name
     * @param {*} data - Optional data to pass to handlers
     */
    emit(event, data = null) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for "${event}":`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event, or all events
     * @param {string} [event] - Optional event name
     */
    clear(event = null) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}

// Singleton instance for global event bus
export const eventBus = new EventBus();

// Event name constants to prevent typos
export const Events = {
    // Player events
    PLAYER_MOVED: 'player:moved',
    PLAYER_ATTACKED: 'player:attacked',
    PLAYER_DAMAGED: 'player:damaged',
    PLAYER_DIED: 'player:died',

    // Enemy events
    ENEMY_SPAWNED: 'enemy:spawned',
    ENEMY_DAMAGED: 'enemy:damaged',
    ENEMY_DIED: 'enemy:died',
    ENEMY_ATTACKED: 'enemy:attacked',

    // Zone events
    ZONE_ENTERED: 'zone:entered',
    ZONE_EXITED: 'zone:exited',
    ZONE_INTERACTED: 'zone:interacted',

    // Level events
    LEVEL_CHANGED: 'level:changed',
    FLOOR_CHANGED: 'floor:changed',
    DOOR_UNLOCKED: 'door:unlocked',
    GENERATOR_FIXED: 'generator:fixed',

    // Game state events
    GAME_STARTED: 'game:started',
    GAME_PAUSED: 'game:paused',
    GAME_RESUMED: 'game:resumed',
    GAME_OVER: 'game:over',

    // UI events
    MESSAGE_SHOW: 'ui:message:show',
    ACTION_BUTTON_UPDATE: 'ui:action:update',
    ACTION_BUTTON_HIDE: 'ui:action:hide',

    // Item events
    KEY_FOUND: 'item:key:found',

    // Input events
    CLICK: 'input:click',
    KEY_PRESS: 'input:keypress'
};

export default EventBus;
