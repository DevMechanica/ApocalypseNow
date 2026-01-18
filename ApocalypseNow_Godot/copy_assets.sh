#!/bin/bash
# Asset Copy Script for Apocalypse Now Godot Project
# Run this from the ApocalypseNow_Godot directory

ORIGINAL_DIR="../"
GODOT_DIR="./"

echo "📁 Copying assets from original project..."

# Create directories if they don't exist
mkdir -p assets/character
mkdir -p assets/zombie
mkdir -p assets/maps
mkdir -p assets/objects
mkdir -p assets/cutscenes
mkdir -p assets/fonts

# Copy character assets
echo "👤 Copying character assets..."
cp -r "${ORIGINAL_DIR}Character/Walking_Animations/"* assets/character/ 2>/dev/null || echo "  ⚠️ Character animations not found"
cp "${ORIGINAL_DIR}Screenshot 2026-01-02 154835.png" assets/character/punch.png 2>/dev/null || echo "  ⚠️ Punch sprite not found"

# Copy zombie assets
echo "🧟 Copying zombie assets..."
cp "${ORIGINAL_DIR}Zombie/zombie_idle.png" assets/zombie/ 2>/dev/null || echo "  ⚠️ Zombie idle not found"
cp -r "${ORIGINAL_DIR}Zombie/WalkingLeft/"* assets/zombie/ 2>/dev/null || echo "  ⚠️ Zombie walk not found"

# Copy map assets
echo "🗺️ Copying map assets..."
cp "${ORIGINAL_DIR}Maps/processed-image.png" assets/maps/bunker_background.png 2>/dev/null || echo "  ⚠️ Map background not found"
cp -r "${ORIGINAL_DIR}Maps/Generator_Room_Zoomed/"* assets/maps/ 2>/dev/null || echo "  ⚠️ Generator room images not found"

# Copy object assets
echo "📦 Copying object assets..."
cp "${ORIGINAL_DIR}Objects/"*.png assets/objects/ 2>/dev/null || echo "  ⚠️ Object images not found"

# Note about video conversion
echo ""
echo "📹 Note: Video files need to be converted to .ogv format for Godot."
echo "   Run the following commands to convert:"
echo ""
echo "   # Install FFmpeg if not already installed:"
echo "   sudo apt install ffmpeg"
echo ""
echo "   # Convert cutscene videos:"
for mp4 in ${ORIGINAL_DIR}Cutscenes/*.mp4; do
    if [ -f "$mp4" ]; then
        basename=$(basename "$mp4" .mp4)
        # Replace spaces and parentheses with underscores for safer filenames
        safe_name=$(echo "$basename" | tr ' ()' '___')
        echo "   ffmpeg -i \"$mp4\" -c:v libtheora -q:v 7 -c:a libvorbis -q:a 4 assets/cutscenes/${safe_name}.ogv"
    fi
done

echo ""
echo "✅ Asset copy complete!"
echo ""
echo "Next steps:"
echo "1. Convert videos to .ogv format using the commands above"
echo "2. Open the project in Godot 4.x"
echo "3. Let Godot import all assets"
echo "4. Run the game with F5"
