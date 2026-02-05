# src/ Context

## Purpose
The core logic and configuration hub of the game. It handles the game loop entry point (`main.js`), the central economy simulation (`economy.js`), and stores all game balance constants (`config.js`).

## File Walkthrough
* `main.js`: Phaser entry point. Sets up the Game config (resolution, physics) and loads scenes.
* `config.js`: The "Source of Truth" for game balance.
    * `CONFIG`: Assets paths, speed values.
    * `CONSTANTS`: Scene keys.
    * `ECONOMY`: Resource definitions, room costs, survivor stats, threats, and biome data.
    * `INITIAL_GAME_STATE`: The template for what goes into the Registry.
* `economy.js`: The simulation engine.
    * `EconomyManager`: Handles the "Tick" loop (1s interval).
    * Calculates production vs consumption (food/water/power).
    * Updates the global `gameState` in the Registry.
    * Emits `economyTick` events to update the UI.
    * Manages building rooms (`buildRoom`) and assigning survivors (`assignSurvivor`).

## Architecture & Data Flow
* **Inputs**:
    * Time Daltas: `EconomyManager` runs on a timer.
    * User Actions: Calls from scenes to `buildRoom` or `assignSurvivor`.
* **Outputs**:
    * Global State: Modifies `gameState` in Phaser Registry.
    * Events: Emits events like `economyTick` for the UI to consume.
    * Console Logs: Debug info for actions.
* **State**:
    * **Phaser Registry**: The primary state container. The `EconomyManager` reads from and writes to `state.gameState`.
    * **Local State**: `EconomyManager` tracks `lastTick`.

## Dependencies
* **Phaser**: For the event system and time management.
* **Internal**: `config.js` is heavily used by `economy.js`.

## Coding Standards
* **Config-First**: All magic numbers (costs, rates, speeds) must be in `config.js`, not hardcoded in logic.
* **Grid Synchronization**: The grid placement logic in `GameScene.js` must stay in sync with `New_maps/create_bunker_map.py`. Use `grid_config.json` as the reference for all slot dimensions and asset offsets.
* **Registry as Database**: The `gameState` object in the registry is the canonical state. Logic functions read it, modify it, and write it back.
* **Manager Pattern**: Logic is encapsulated in Managers (e.g., `EconomyManager`) rather than being scattered in scenes.
