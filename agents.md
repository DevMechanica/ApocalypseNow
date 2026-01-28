# ApocalypseNow Project Context

## Global Tech Stack
* **Phaser 3**: Core game engine for rendering, input, and physics.
* **Vanilla JavaScript (ES6 Modules)**: No build tools (like Webpack) are strictly enforced in the source; modules are imported natively.
* **Python (PIL/NumPy)**: Used for offline asset generation and map composition.

## Directory Context Map
Future Agents: Read the specific `agents.md` in these folders for deep context.

| Directory | Purpose Summary | Context File |
| :--- | :--- | :--- |
| `src/scenes/` | Visuals, Input, and UI Scenes (Phaser). | [Context](src/scenes/agents.md) |
| `src/` | Core logic, Economy Simulation, and Config. | [Context](src/agents.md) |
| `New_maps/` | Offline Python pipeline for generating map images. | [Context](New_maps/agents.md) |
| `Objects/` | *Asset Directory*. Contains PNGs for rooms and items. | *Assets Only* |
| `characters/` | *Asset Directory*. Contains character sprites. | *Assets Only* |

## Global Rules
1.  **Separation of Concerns**: Logic (src/) is separated from Visuals (src/scenes/) and Assets (Objects/).
2.  **Config Driven**: Hardcoded values are forbidden; use `src/config.js`.
3.  **Registry State**: The game state lives in the Phaser Registry, not in individual class instances, to allow easy saving/sharing.
4.  **Offline Pipeline**: Map generation is an offline process; the game loads the *result* (PNG), it does not generate maps at runtime.
