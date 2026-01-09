# 🎮 Apocalypse Now - Character Setup Guide

## What We've Built

I've created a complete point-and-click game system with:

1. **Sprite Extractor** (`sprite-extractor.html`) - Extract animation frames from your cutscene
2. **Game Engine** (`index.html` + `game.js`) - Playable character with click-to-move
3. **Opening Cutscenes** (`opening-cutscene.html`) - Your intro sequence

## 🚀 Quick Start (3 Steps)

### Step 1: Extract Character Sprites

1. Open `sprite-extractor.html` in your browser
2. Click "Select Video File" and choose `Cutscenes/download (35).mp4`
3. Adjust settings:
   - **Start Time:** Find where the character is clearly visible
   - **End Time:** Capture a walking/movement cycle
   - **Frame Rate:** 10 FPS (good starting point)
   - **Sprite Size:** 128x128 (recommended)
4. Click **"Create Spritesheet"** to download `character_spritesheet.png`
5. Save it to the `assets/` folder

### Step 2: Enable Sprites in Game

1. Open `game.js`
2. Find line 162 (around the TODO comment)
3. Uncomment this line:
   ```javascript
   character.loadSprites('assets/character_spritesheet.png', 8);
   ```
4. Update the frame count (8) to match how many frames you extracted

### Step 3: Play!

1. Open `index.html` in your browser
2. Click anywhere on the screen
3. Watch your character move to that location! 🎉

## 🎨 Current Features

- ✅ **Point-and-click movement** - Click anywhere to move
- ✅ **Smooth pathfinding** - Character moves in straight lines
- ✅ **Visual feedback** - Click indicators and path lines
- ✅ **Status display** - Position and movement status
- ✅ **Placeholder character** - Works immediately (yellow circle)
- ⏳ **Sprite animations** - Ready once you extract them

## 🔧 Customization

### Change Character Speed
In `game.js`, edit line 3:
```javascript
characterSpeed: 200, // Try 300 for faster, 100 for slower
```

### Change Character Size
In `game.js`, edit line 5:
```javascript
characterSize: 64, // Try 32, 64, 128, 256
```

### Extract Different Animation Types

You can extract multiple sprite sets for different actions:
- **Walking:** Extract frames of the character walking
- **Idle:** Extract frames of the character standing
- **Running:** Extract faster movement frames

Just save them as different spritesheets and load them based on character state!

## 📁 Project Structure

```
ApocalypseNow/
├── index.html              # Main game
├── game.js                 # Game logic
├── sprite-extractor.html   # Tool to extract sprites
├── opening-cutscene.html   # Intro cutscenes
├── assets/                 # Put sprites here
│   └── character_spritesheet.png (you'll create this)
└── Cutscenes/
    ├── download (35).mp4
    ├── download (37).mp4
    └── download (38).mp4
```

## 🎯 Next Steps

1. **Test the game now** - It already works with a placeholder character
2. **Extract sprites** - Use the sprite extractor when ready
3. **Add more features:**
   - Multiple characters
   - Obstacles/collision detection
   - Map backgrounds
   - Inventory system
   - Dialogue system

## 💡 Tips

- The game works **right now** with a placeholder (yellow circle)
- You can play and test before extracting sprites
- Extract 8-12 frames for smooth walking animation
- Use the sprite extractor's preview to find the best part of the video
- Can extract sprites from any of the 3 cutscenes!

---

**Ready to play?** Just open `index.html` in your browser! 🚀
