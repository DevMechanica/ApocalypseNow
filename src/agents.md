# src/ Context

## Purpose
The core logic and configuration hub of the game. It handles the game loop entry point (`main.js`), the central economy simulation (`economy.js`), and stores all game balance constants (`config.js`).

## File Walkthrough
* `main.js`: Phaser entry point. Sets up the Game config (resolution, physics) and loads scenes.
* `config.js`: The "Source of Truth" for game balance.
    * `CONFIG`: Assets paths, speed values.
    * `CONSTANTS`: Scene keys.
    * `ECONOMY`: Resource definitions, room costs, **upgrade tuning** (`ECONOMY.UPGRADE`), survivor stats, threats, and biome data. Each production room has an `upgrade` block with `baseCost`, `costScaling`, and `outputMultiplier`.
    * `INITIAL_GAME_STATE`: The template for what goes into the Registry.
* `economy.js`: The simulation engine.
    * `EconomyManager`: Handles the "Tick" loop (1s interval).
    * Calculates production vs consumption (food/water/power).
    * Updates the global `gameState` in the Registry.
    * Emits `economyTick` events to update the UI.
    * Manages building rooms (`buildRoom`) and assigning survivors (`assignSurvivor`).

### Systems (`systems/`)
* `MachineUpgradeManager.js`: Upgrade logic controller. Handles cost scaling (`baseCost * scaling^level`), output calculation (`baseAmount * (1 + (level-1) * multiplier)`), and atomic upgrade transactions. Emits `machineUpgraded` events.
* `ResourceProducer.js`: Per-room production component. Uses `getEffectiveAmount()` to scale output by room level.
* `ResourceSystem.js`: Registry of all `ResourceProducer` instances. Handles tick distribution and collection.
* `FloatingTextSystem.js`: Animated floating text feedback.

## Architecture & Data Flow
* **Inputs**:
    * Time Daltas: `EconomyManager` runs on a timer.
    * User Actions: Calls from scenes to `buildRoom` or `assignSurvivor`.
* **Outputs**:
    * Global State: Modifies `gameState` in Phaser Registry.
    * Events: Emits events like `economyTick` for the UI to consume.
    * Events: `MachineUpgradeManager` emits `machineUpgraded` on successful upgrade.
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
