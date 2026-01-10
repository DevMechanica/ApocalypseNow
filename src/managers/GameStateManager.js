/**
 * GameStateManager - State machine for game flow
 */

import { eventBus, Events } from '../core/EventBus.js';

export const GameStates = {
    LOADING: 'loading',
    PLAYING: 'playing',
    PAUSED: 'paused',
    CUTSCENE: 'cutscene',
    GAME_OVER: 'gameover'
};

export class GameStateManager {
    constructor() {
        this.currentState = GameStates.LOADING;
        this.previousState = null;
        
        // Game progress state
        this.gameData = {
            currentLevel: 1,
            keyFound: false,
            generatorRoomUnlocked: false,
            generatorFixed: false,
            isClimbing: false,
            onSecondFloor: false,
            climbTargetX: null,
            searchedObjects: new Set()
        };

        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        eventBus.on(Events.KEY_FOUND, () => {
            this.gameData.keyFound = true;
        });

        eventBus.on(Events.DOOR_UNLOCKED, () => {
            this.gameData.generatorRoomUnlocked = true;
        });

        eventBus.on(Events.GENERATOR_FIXED, () => {
            this.gameData.generatorFixed = true;
        });

        eventBus.on(Events.LEVEL_CHANGED, (data) => {
            this.gameData.currentLevel = data.level;
        });

        eventBus.on(Events.FLOOR_CHANGED, (data) => {
            this.gameData.onSecondFloor = data.onSecondFloor;
        });

        eventBus.on(Events.GAME_OVER, () => {
            this.setState(GameStates.GAME_OVER);
        });
    }

    /**
     * Set the current game state
     * @param {string} newState
     */
    setState(newState) {
        if (this.currentState === newState) return;

        this.previousState = this.currentState;
        this.currentState = newState;

        console.log(`🎮 State: ${this.previousState} → ${newState}`);

        eventBus.emit('state:changed', {
            previous: this.previousState,
            current: this.currentState
        });
    }

    /**
     * Get current state
     * @returns {string}
     */
    getState() {
        return this.currentState;
    }

    /**
     * Check if in a specific state
     * @param {string} state
     * @returns {boolean}
     */
    isState(state) {
        return this.currentState === state;
    }

    /**
     * Check if game is playing
     * @returns {boolean}
     */
    isPlaying() {
        return this.currentState === GameStates.PLAYING;
    }

    /**
     * Get game data
     * @returns {Object}
     */
    getGameData() {
        return this.gameData;
    }

    /**
     * Mark an object as searched
     * @param {string} objectName
     */
    markSearched(objectName) {
        this.gameData.searchedObjects.add(objectName);
    }

    /**
     * Check if object was searched
     * @param {string} objectName
     * @returns {boolean}
     */
    wasSearched(objectName) {
        return this.gameData.searchedObjects.has(objectName);
    }

    /**
     * Reset game state
     */
    reset() {
        this.gameData = {
            currentLevel: 1,
            keyFound: false,
            generatorRoomUnlocked: false,
            generatorFixed: false,
            isClimbing: false,
            onSecondFloor: false,
            climbTargetX: null,
            searchedObjects: new Set()
        };
        this.setState(GameStates.PLAYING);
    }
}

export default GameStateManager;
