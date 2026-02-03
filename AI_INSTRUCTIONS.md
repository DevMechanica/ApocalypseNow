# AI / Developer Instructions

**READ THIS FILE FIRST BEFORE MAKING ANY CHANGES.**

This document outlines the core architecture and critical rules for operating with assets in the **ApocalypseNow** codebase. Failure to follow these rules will result in broken map generation and UI alignment issues.

---

## 1. Project Architecture
- **Game Engine**: Custom HTML5/JS (Phaser-based structure).
- **Frontend**: Located in `src/`.
    - `src/config.js`: Central configuration for game economy, rooms, and items.
    - `src/scenes/`: Game scenes (UI, Gameplay).
- **Map Generation**: Python script in `New_maps/create_bunker_map.py`. This script composites the visual bunker map used in the game.

---

## 2. The 8-Slot Grid System
The bunker rooms operate on a strict **8-Slot Grid System**. Every floor has a capacity of 8 slots.

### Asset Requirements
Every new asset (Machine, Room, Decoration) **MUST** be defined with a specific width in "slots".
- **Example**: `Hydroponic Garden` = **2 Slots**.
- **Example**: `Metal Scrap Machine` = **4 Slots**.

### Adding New Assets
When adding a new asset, you must update TWO locations:

#### A. Game Configuration (`src/config.js`)
You must define the `width` property in the `ROOM_TYPES` definition.
```javascript
my_new_machine: {
    name: 'My New Machine',
    category: 'production',
    width: 2, // MUST BE DEFINED (1-8)
    // ... other props
}
```

#### B. Map Generation (`New_maps/create_bunker_map.py`)
You must use the `place_object` function to add the asset to the visual map.
**DO NOT implemented manual scaling or positioning logic.** Use the helper function.

```python
place_object(
    composite=composite,       # Main image
    room_pos=room_positions[N], # Target room (0=Top, 1=Middle, etc.)
    asset_image=my_asset_img,  # PIL Image object
    start_slot=0,              # Starting Slot Index (0-7)
    slot_width_slots=2,        # Must match config width
    asset_name="My Machine"
)
```

### Positioning Rules (Enforced by Script)
The `place_object` function enforces specific padding rules to ensure a perfect "flush" fit with the bunker walls.

> **⚠️ DO NOT CHANGE THESE CONSTANTS.** These values have been carefully tuned to align assets with the game's dev mode floor/wall lines. Changing them will break visual alignment everywhere.

**Shared Configuration**: All positioning values are defined in `grid_config.json` at the project root. Both Python and JavaScript read from this file.

| Constant | Value | Description |
|----------|-------|-------------|
| `positionPaddingRatio` | 0.12 | Grid starts at 12% into room width |
| `floorLineOffset` | 575 | Floor line position within room (pixels) |
| `roomHeight` | 679 | Scaled room height (pixels) |
| `WALL_OFFSET_PX` | -50 | Wall line horizontal offset (in GameScene.js) |

**Y Offset Factor** is auto-calculated as `floorLineOffset / roomHeight` (≈0.847) to keep assets and floor lines perfectly synced.

---

## 3. General Guidelines
1.  **No Overlapping**: When placing objects in `create_bunker_map.py`, ensure that the slots do not overlap.
    - *Bad*: Object A at Slot 0 (Width 4), Object B at Slot 2 (Width 2). Overlap at slots 2-3.
    - *Good*: Object A at Slot 0 (Width 4), Object B at Slot 4 (Width 2).
2.  **Asset Labels**: Always label your assets with their slot width in comments or commit messages (e.g., "Added 4-wide Generator").
3.  **Visual Verification**: After adding an asset, ALWAYS run the python script and check the generated scene images to verify alignment.

---

## 4. Locked Values (Do Not Modify)
The following values have been calibrated and **MUST NOT be changed**:

- `grid_config.json` → `grid.positionPaddingRatio`: **0.12**
- `grid_config.json` → `scenes.*.floorLineOffset`: **575**
- `grid_config.json` → `scenes.*.roomHeight`: **679**
- `GameScene.js` → `WALL_OFFSET_PX`: **-50**

---
**Status**: The current system is "Locked & Optimized". Do not modify positioning constants.
