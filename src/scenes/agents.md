# src/scenes/ Context

## Purpose
Handles the visual presentation and state inputs of the game using the Phaser 3 framework. Contains separate scenes for initialization, asset loading, the main game world, and the UI overlay.

## File Walkthrough
* `BootScene.js`: Minimal scene to initialize the game and immediately switch to Preloading.
* `PreloadScene.js`: Loads all assets (images, sprites) and displays a loading bar. Transition to GameScene upon completion.
* `GameScene.js`: The "World" view. Handles the map, player character, RTS movement logic, camera controls (pan/zoom), and physics bounds.
* `UIScene.js`: The HUD overlay. Manages resource bars, buttons, and popups (Build, Map, Settings). Runs in parallel with GameScene.

## Grid System (8-Slot)
Every bunker floor is divided into **8 horizontal slots**. All room/object assets must define their `width` in slots.

### Shared Configuration
Grid values are defined in **`grid_config.json`** at the project root. Both Python (`create_bunker_map.py`) and JavaScript (`config.js`, `GameScene.js`) read from this file.

> **⚠️ LOCKED VALUES**: These positioning constants have been calibrated and **MUST NOT be changed**.

### Key Values (Locked)
* **Slot Width**: Must be 1-8.
* **No Overlapping**: Object at Slot 0 (Width 4) blocks Slots 0-3. Next object starts at Slot 4.
* **Positioning Constants** (from `grid_config.json`):
    * `positionPaddingRatio = 0.12` (grid start offset within room) **LOCKED**
    * `floorLineOffset = 575` (floor line position in pixels) **LOCKED**
    * `roomHeight = 679` (scaled room height) **LOCKED**
    * `WALL_OFFSET_PX = -50` (wall line offset in GameScene.js) **LOCKED**
* **Source Image Constants**:
    * Canvas Width: 2784px
    * Room Width (scaled): 1948px
    * Room X (centered): 418px

## Art Style
* **Aesthetic**: Fallout-inspired post-apocalyptic bunker management.
* **Perspective**: Top-down 2D with layered depth (rooms stack vertically).
* **Background Removal**: Assets use **chroma key** (white background removal, threshold ~230-240).
* **Color Palette**: Muted, industrial tones. No overly vibrant colors.
* **Asset Requirements**: PNGs with white backgrounds. Script handles transparency.
* **Mixed Media**: Certain rooms (e.g. Hydroponic Garden) use looping video textures (.mp4) for enhanced visuals.

## Architecture & Data Flow
* **Inputs**:
    * User Input: Mouse clicks/Touch taps for movement (GameScene) and button interactions (UIScene).
    * events.emit('economyTick'): Listens for economy updates from the logic layer.
* **Outputs**:
    * Visual rendering of the game world and interface.
    * Registry Updates: Sets `uiBlocked` to prevent click-throughs.
    * Event Emission: Triggers scene launches or updates.
* **State**:
    * **Phaser Registry**: Shared state for cross-scene communication (`gameState`, `uiBlocked`).
    * **Scene Logic**: Local instance variables for things like `camera.zoom`, `selectedUnit`.

## Dependencies
* **Phaser**: The core engine powering these scenes.
* **../config.js**: access to `CONSTANTS` and `CONFIG`.
* **../economy.js**: `GameScene` initializes the `EconomyManager`.

## Coding Standards
* **Scene Separation**: Keep World logic in GameScene and HUD logic in UIScene.
* **Registry Communication**: Use `this.registry` to share data between scenes.
* **Responsive Layout**: Always calculate positions using `this.cameras.main.width/height`.
* **Input Management**: Explicitly block world input when interacting with UI (`uiBlocked`).
