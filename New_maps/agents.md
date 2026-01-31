# New_maps/ Context

## Purpose
An offline Python asset pipeline that generates high-resolution composite maps for the game. It combines background images, room assets, and objects into a single cohesive PNG used by the game engine.

## File Walkthrough
* `create_bunker_map.py`: The main script.
    * Loads source images (PNGs) using Pillow.
    * Loads source assets (some pre-processed with background removed).
    * Performs chroma keying on raw assets where needed.
    * Dynamically tiles the background if vertical space is needed.
    * Places rooms and objects (gardens, machines) on a grid system.
    * Exports `bunker_map_composite.png`.

## Architecture & Data Flow
* **Inputs**:
    * Source Assets: `Objects/`, `bunker_map_composite.png` (background), `EmptyRoomAsset_...png`.
* **Outputs**:
    * `bunker_map_composite.png`: The final image loaded by Phaser.
* **State**:
    * **Stateless**: The script is a linear pipeline. It does not maintain state between runs.

## Dependencies
* **Pillow (PIL)**: For all image manipulation.
* **NumPy**: Used for efficient pixel-level operations (chroma keying).

## Coding Standards
* **Procedural Pipeline**: Code is structured as a sequence of operations (Load -> Process -> Place -> Save).
* **Grid System**: Object placement uses standardized slot logic (`base_slot_width`) relative to room dimensions.
* **Hardcoded Paths**: Relative paths are used to locate assets in the parent directory.
