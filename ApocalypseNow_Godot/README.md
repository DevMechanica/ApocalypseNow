# Apocalypse Now - Godot 4.x

A survival horror point-and-click game recreated in Godot 4.x.

## 🎮 Game Features

- **Main Menu** with animated particles and flickering title
- **Opening Cutscenes** with sequential video playback and subtitles
- **Click-to-Move** gameplay with directional character animations
- **Interactive Objects** - doors, chests, shelves, generators, and more
- **Combat System** - fight zombies with punch attacks
- **Inventory System** - collect and manage items
- **Multi-Floor Navigation** - explore 3 floors of the bunker
- **Puzzle Mechanics** - fix the generator to unlock new areas

## 📁 Project Structure

```
ApocalypseNow_Godot/
├── project.godot           # Godot project configuration
├── icon.svg                # Project icon
├── assets/                 # Game assets
│   ├── character/          # Player animations
│   ├── zombie/             # Enemy animations
│   ├── maps/               # Background images
│   ├── objects/            # Interactable object sprites
│   └── cutscenes/          # Video files (.ogv format)
├── scenes/                 # Scene files (.tscn)
│   ├── main_menu/          # Main menu scene
│   ├── cutscene/           # Opening cutscene scene
│   ├── game/               # Core game scenes (player, enemy, zones)
│   └── ui/                 # UI scenes (HUD, loot, inventory)
├── scripts/                # GDScript files
│   ├── autoloads/          # Global managers (GameManager)
│   ├── player/             # Player script
│   ├── enemies/            # Enemy scripts
│   ├── interactions/       # Interactive zone scripts
│   ├── game/               # Main game orchestration
│   └── ui/                 # UI scripts
└── resources/              # Resource files (.tres)
```

## 🚀 Getting Started

### Prerequisites
- Godot 4.2 or later

### Setup

1. **Open the project in Godot**
   - Launch Godot Engine
   - Click "Import"
   - Navigate to `ApocalypseNow_Godot/` folder
   - Select `project.godot`
   - Click "Import & Edit"

2. **Copy assets from the original project**
   
   Copy the following from the parent `ApocalypseNow/` folder:
   - `Character/` → `assets/character/`
   - `Zombie/` → `assets/zombie/`
   - `Maps/processed-image.png` → `assets/maps/bunker_background.png`
   - `Objects/` → `assets/objects/`
   
   **For videos**: Godot prefers `.ogv` format. You can convert MP4 to OGV using FFmpeg:
   ```bash
   ffmpeg -i input.mp4 -c:v libtheora -q:v 7 -c:a libvorbis -q:a 4 output.ogv
   ```

3. **Run the game**
   - Press F5 or click the Play button
   - The game starts at the Main Menu

## 🎯 Controls

| Input | Action |
|-------|--------|
| Click/Tap | Move to location |
| Click on Object | Show interaction button |
| Click on Enemy (when close) | Punch attack |
| D | Toggle debug mode |
| Escape/Space | Skip cutscene |

## 🏗️ Architecture

### GameManager (Autoload)
Global singleton managing:
- Game state flags (key_found, generator_fixed, etc.)
- Player health and stats
- Inventory system
- Floor/level management
- Signal broadcasts

### Scene Flow
```
MainMenu → OpeningCutscene → Game
```

### Interactive Zones
All interactable objects use the `InteractiveZone` scene with configurable properties:
- `zone_type`: door, chest, searchable, generator, reactor, bed, etc.
- `requirements`: requires_key, requires_zombie_defeated, etc.
- `loot`: Array of items for chests

## 🔧 Customization

### Adding New Interactive Zones
1. Instance `scenes/game/interactive_zone.tscn`
2. Configure in the Inspector:
   - Set `zone_name`, `zone_type`, `icon`, `action_text`
   - Set requirements if needed
   - Add loot items for chests
3. Position in the game scene

### Adding New Enemies
1. Instance `scenes/game/enemy.tscn`
2. Configure stats: `max_health`, `attack_damage`, `roam_speed`
3. Call `set_roam_bounds()` to define patrol area

## 📝 Notes

- The game uses placeholder visuals until proper assets are imported
- Videos should be converted to `.ogv` format for Godot compatibility
- The project is configured for mobile (landscape orientation)
- Touch input is automatically emulated from mouse

## 🎨 Asset Credits

Original assets from the JavaScript version of "Apocalypse Now".

---

Created with Godot Engine 4.x
