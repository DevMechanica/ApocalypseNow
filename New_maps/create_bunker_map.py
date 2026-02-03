"""
Script to create distributed scene maps for a 50-floor bunker system.
Generates 6 distinct Scene Assets:
- Scene 1 (Surface): 5 Floors (4 Above Ground + 1 Ground/Entrance)
- Scene 2-5 (Underground): 10 Floors each
- Scene 6 (Deep): 5 Floors
"""

from PIL import Image, ImageDraw
import numpy as np
import os
import json

# --- LOAD SHARED GRID CONFIG ---
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
config_path = os.path.join(project_root, "grid_config.json")

with open(config_path, 'r') as f:
    GRID_CONFIG = json.load(f)

# Extract values from shared config
FLOOR_HEIGHT_PX = GRID_CONFIG['floor']['effectiveHeight']
VERTICAL_PADDING = GRID_CONFIG['floor']['verticalPadding']
POS_PADDING_RATIO = GRID_CONFIG['grid']['positionPaddingRatio']
GRID_SLOTS = GRID_CONFIG['grid']['slots']
ASSET_SCALE_FACTOR = GRID_CONFIG['grid'].get('assetScaleFactor', 1.0)
SLOT_SPACING_FACTOR = GRID_CONFIG['grid'].get('slotSpacingFactor', 1.0)  # <1.0 = tighter spacing
ASSET_Y_OFFSETS = GRID_CONFIG.get('assetYOffsets', {})
ASSET_X_OFFSETS = GRID_CONFIG.get('assetXOffsets', {})
ASSET_SCALES = GRID_CONFIG.get('assetScales', {})

# Scene-specific positioning
SURFACE_FIRST_ROOM_Y = GRID_CONFIG['scenes']['surface']['firstRoomY']
SURFACE_FLOOR_LINE_OFFSET = GRID_CONFIG['scenes']['surface']['floorLineOffset']
SURFACE_ROOM_HEIGHT = GRID_CONFIG['scenes']['surface']['roomHeight']
UNDERGROUND_FIRST_ROOM_Y = GRID_CONFIG['scenes']['underground']['firstRoomY']
UNDERGROUND_FLOOR_LINE_OFFSET = GRID_CONFIG['scenes']['underground']['floorLineOffset']
UNDERGROUND_ROOM_HEIGHT = GRID_CONFIG['scenes']['underground']['roomHeight']

# AUTO-CALCULATE Y offset factor from floorLineOffset / roomHeight
# This ensures assets and dev floor lines are always in sync!
ROOM_Y_OFFSET_FACTOR = SURFACE_FLOOR_LINE_OFFSET / SURFACE_ROOM_HEIGHT

print(f"Loaded grid config: FLOOR_HEIGHT={FLOOR_HEIGHT_PX}, Y_OFFSET_FACTOR={ROOM_Y_OFFSET_FACTOR:.3f} (auto-calculated)")

# --- SCENE CONFIGS ---
SCENE_CONFIGS = [
    { "id": 1, "name": "Surface", "floors": 5, "type": "surface", "bg_image": "background_city.png", "base_y_offset": 0 },
    { "id": 2, "name": "Underground_01", "floors": 5, "type": "underground", "bg_image": "underground_dirt.png" },
    { "id": 3, "name": "Underground_02", "floors": 5, "type": "underground", "bg_image": "underground_dirt.png" },
    { "id": 4, "name": "Underground_03", "floors": 5, "type": "underground", "bg_image": "underground_dirt.png" },
    { "id": 5, "name": "Underground_04", "floors": 5, "type": "underground", "bg_image": "underground_dirt.png" },
    { "id": 6, "name": "Underground_05", "floors": 5, "type": "underground", "bg_image": "underground_dirt.png" },
    { "id": 7, "name": "Underground_06", "floors": 5, "type": "underground", "bg_image": "underground_dirt.png" },
    { "id": 8, "name": "Underground_07", "floors": 5, "type": "underground", "bg_image": "underground_dirt.png" },
    { "id": 9, "name": "Underground_08", "floors": 5, "type": "underground", "bg_image": "underground_dirt.png" },
    { "id": 10, "name": "Deep_Underground", "floors": 5, "type": "underground", "bg_image": "underground_dirt.png" }
]

# Layout Constants (derived from shared config)
SEPARATOR_HEIGHT = 80

def remove_background_floodfill(image, threshold=150):
    """Remove contiguous white background using flood fill + pixel cleanup."""
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    width, height = image.size
    
    # Step 1: Flood fill from corners
    seed_points = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
    for point in seed_points:
        try:
            ImageDraw.floodfill(image, point, (255, 255, 255, 0), thresh=threshold)
        except Exception as e:
            pass
    
    # Step 2: Pixel-by-pixel white removal for remaining white pixels
    data = np.array(image)
    # Find very white pixels (R, G, B all > 240)
    white_mask = (data[:, :, 0] > 240) & (data[:, :, 1] > 240) & (data[:, :, 2] > 240)
    data[white_mask, 3] = 0  # Set alpha to 0 for white pixels
    
    return Image.fromarray(data)

def place_object(composite, room_rect, asset_image, start_slot, slot_width_slots, asset_name="Unknown"):
    """
    Places an object into the scene composite at a specific room position and slot.
    Grid System: Uses shared config from grid_config.json
    """
    rx, ry, rw, rh = room_rect
    
    # Use global config values (loaded from grid_config.json)
    pos_padding_ratio = POS_PADDING_RATIO
    y_offset_factor = ROOM_Y_OFFSET_FACTOR
    num_slots = GRID_SLOTS
    asset_scale = ASSET_SCALE_FACTOR
    slot_spacing = SLOT_SPACING_FACTOR
    
    # Determine Per-Asset Scale
    individual_scale = 1.0
    name_lower = asset_name.lower()
    if "scrap" in name_lower:
        individual_scale = ASSET_SCALES.get('scrap_machine', 1.0)
    # Add other conditions if needed
    
    final_scale_factor = asset_scale * individual_scale
    
    # Grid Calculations
    grid_start_x = rx + (rw * pos_padding_ratio)
    available_width = rw * (1.0 - (pos_padding_ratio * 2))
    slot_px = available_width / float(num_slots)
    
    # Target Attributes - apply scale factor to make assets larger and reduce gaps
    base_target_w = slot_px * slot_width_slots
    target_w = base_target_w * final_scale_factor
    
    # Scale Asset
    scale = target_w / asset_image.width
    target_h = asset_image.height * scale
    
    # Calculate Draw Position
    # slot_spacing < 1.0 places assets closer together (tighter grid)
    spacing_slot_px = slot_px * slot_spacing
    slot_center_offset = (target_w - base_target_w) / 2
    
    # Determine Y and X Offsets based on asset type
    y_offset_px = 0
    x_offset_px = 0
    name_lower = asset_name.lower()
    
    # Check for offsets in ASSET_Y_OFFSETS and ASSET_X_OFFSETS
    # Map "Plant 1", "Plant 2" -> "garden"
    asset_key = None
    if "plant" in name_lower or "garden" in name_lower:
        asset_key = 'garden'
    elif "water" in name_lower and "purifier" in name_lower:
        asset_key = 'water_purifier'
    elif "scrap" in name_lower:
        asset_key = 'scrap_machine'
        
    if asset_key:
        y_offset_px = ASSET_Y_OFFSETS.get(asset_key, 0)
        x_offset_px = ASSET_X_OFFSETS.get(asset_key, 0)
        
    draw_x = int(grid_start_x + (start_slot * spacing_slot_px) - slot_center_offset + x_offset_px)
    draw_y = int(ry + (rh * y_offset_factor) - target_h + y_offset_px)
    
    # Debug output
    print(f"  -> {asset_name}: room=({rx},{ry},{rw},{rh}), grid_start={grid_start_x:.0f}, slot_px={slot_px:.0f}")
    if y_offset_px != 0 or x_offset_px != 0:
        print(f"     [OffsetApplied] {asset_name}: X={x_offset_px}px, Y={y_offset_px}px")
    print(f"     asset_size={target_w:.0f}x{target_h:.0f}, placed at ({draw_x}, {draw_y})")
    
    # Resize and Paste
    asset_resized = asset_image.resize((int(target_w), int(target_h)), Image.Resampling.LANCZOS)
    composite.paste(asset_resized, (draw_x, draw_y), asset_resized)



def generate_scene(scene_data, assets, output_dir):
    """Generates a single scene image based on configuration."""
    print(f"\n--- Generating Scene {scene_data['id']}: {scene_data['name']} ---")
    
    # Unpack Assets
    bg_base = assets['background_city'] if scene_data['type'] == 'surface' else assets['dirt_texture']
    room_img = assets['normal_room']
    entrance_img = assets['entrance']
    
    # 1. Calculate Canvas Dimensions
    # Base layout:
    # Scene 1: 4 Rooms (Sky) + 1 Entrance (Ground) + Padding
    # Others: N Rooms (Stacked)
    
    room_w, room_h = room_img.size
    entrance_w, entrance_h = entrance_img.size
    
    # Target Width (Based on Background City Width for consistency)
    TARGET_WIDTH = assets['background_city'].width # Keep 3x upscaled width from main
    
    # Calculate Spacing
    # We want a consistent "Floor Height" for the grid.
    # New Room Height (Scaled)
    # Scale Image to fit 70% of width
    scale_factor = (TARGET_WIDTH * 0.70) / room_w
    new_room_w = int(room_w * scale_factor)
    new_room_h = int(room_h * scale_factor)
    
    # Entrance Scale
    entrance_scale = (TARGET_WIDTH * 0.70) / entrance_w
    new_entrance_w = int(entrance_w * entrance_scale)
    new_entrance_h = int(entrance_h * entrance_scale)
    
    effective_floor_h = new_room_h + VERTICAL_PADDING
    print(f"Effective Floor Height (Visual) px: {effective_floor_h}")
    
    # Canvas Height
    num_floors = scene_data['floors']
    
    # Extra padding for aesthetics
    top_margin = 100
    bottom_margin = 100
    
    # Default calculation
    total_content_height = (num_floors * effective_floor_h)
    
    if scene_data['type'] == 'surface':
        # Scene 1 needs extra height for the skyline
        canvas_h = max(bg_base.height, total_content_height + 500)
    else:
        # Underground: Trim bottom gap
        # The room assets have some transparent padding at the bottom which creates a visual gap.
        # We need to shrink the canvas height to cut this off.
        # Based on visual feedback, we'll reduce the canvas height.
        
        last_room_y = top_margin + ((num_floors - 1) * effective_floor_h)
        
        # We add the full room height, THEN subtract the transparency padding.
        # If effective height is 519 and room height is ~679, there is overlap.
        # But if the image has blank space at bottom, we need to cut it.
        # Let's try cutting 80px from the bottom.
        trim_bottom = 90 
        
        canvas_h = last_room_y + new_room_h - trim_bottom
        print(f"Underground Canvas Height (Trimmed): {canvas_h}")

    print(f"Canvas Size: {TARGET_WIDTH}x{canvas_h}")
    
    # Create Canvas
    full_bg = Image.new('RGBA', (TARGET_WIDTH, canvas_h), (30, 25, 20, 255))
    
    # 2. Draw Background
    if scene_data['type'] == 'surface':
        # Tile or stretch logic? For surface, just paste at top (Skyline)
        # If canvas is taller than BG, we might need to fill color or tile.
        # But usually City BG is quite tall.
        full_bg.paste(bg_base, (0, 0))
    else:
        # Stretched Dirt (User Request)
        # Resize dirt to fill entire width and height
        dirt_scaled = bg_base.resize((TARGET_WIDTH, canvas_h), Image.Resampling.LANCZOS)
        full_bg.paste(dirt_scaled, (0, 0))
            
    # 3. Place Floors
    # Center X
    room_x = (TARGET_WIDTH - new_room_w) // 2
    entrance_x = (TARGET_WIDTH - new_entrance_w) // 2
    
    # Start Y
    # For Surface: 
    # Floor 0 (Top), 1, 2, 3 (Above Ground) -> Normal Rooms
    # Floor 4 (Ground) -> Entrance Room
    # We need to align Floor 4 (Ground) such that it looks like it's on the "Ground".
    # In Scene 1 config, let's say "Ground" is at specific Y.
    
    current_y = top_margin
    
    if scene_data['type'] == 'surface':
        # Alignment Strategy: Place Bottom Floor (Entrance) at a fixed "Ground Level" 
        # and stack upwards.
        # Ground Level in City BG is roughly at bottom of image? 
        # Use simple top-down for now, but assume Floor index 4 is Entrance.
        
        # Start from top? 
        # 4 Floors above ground = 0, 1, 2, 3.
        # 1 Floor ground = 4.
        
        start_y = 600 # Moved down from 200 to align better with background and grid
        
        for i in range(num_floors):
            is_ground_floor = (i == num_floors - 1) # Last one is ground
            
            if is_ground_floor:
                # Place Entrance
                # Resize
                img = entrance_img.resize((new_entrance_w, new_entrance_h), Image.Resampling.LANCZOS)
                # Adjust Y to align bottom with previous room's expected bottom?
                # Actually just stack linearly for now.
                pos_y = start_y + (i * effective_floor_h)
                full_bg.paste(img, (entrance_x, pos_y), img)
                print(f"Placed Entrance (Floor {i+1}) at Y={pos_y}")
            else:
                # Place Normal Room (Above Ground)
                img = room_img.resize((new_room_w, new_room_h), Image.Resampling.LANCZOS)
                pos_y = start_y + (i * effective_floor_h)
                full_bg.paste(img, (room_x, pos_y), img)
                print(f"Placed Room (Floor {i+1}) at Y={pos_y}")
                
                # TEST ASSETS (User Request)
                # Floor 1 (Index 0): 4 Plants (2 slots each) -> Slots 0, 2, 4, 6
                if i == 0:
                    if 'garden' in assets:
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 0, 2, "Plant 1")
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 2, 2, "Plant 2")
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 4, 2, "Plant 3")
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 6, 2, "Plant 4")

                # Floor 2 (Index 1): 3 Plants + 1 Purifier -> Slots 0, 2, 4 + 6
                if i == 1:
                    if 'garden' in assets:
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 0, 2, "Plant 1")
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 2, 2, "Plant 2")
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 4, 2, "Plant 3")
                    if 'water_purifier' in assets:
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['water_purifier'], 6, 2, "Water Purifier")

                # Floor 3 (Index 2): Scrap Machine + 2 Plants -> Slots 0 (width 4) + 4, 6
                if i == 2:
                    if 'scrap_machine' in assets:
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['scrap_machine'], 0, 4, "Scrap Machine")
                    if 'garden' in assets:
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 4, 2, "Plant 1")
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 6, 2, "Plant 2")

                # Floor 4 (Index 3): Scrap Machine Only -> Slot 0
                if i == 3:
                     if 'scrap_machine' in assets:
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['scrap_machine'], 0, 4, "Scrap Machine")

    else:
        # Underground: Just stack top to bottom
        # Separator removed by user request
            
        for i in range(num_floors):
            img = room_img.resize((new_room_w, new_room_h), Image.Resampling.LANCZOS)
            full_bg.paste(img, (room_x, current_y), img)
            print(f"Placed Room (Floor {i+1}) at Y={current_y}")
            current_y += effective_floor_h

    # Save
    output_filename = f"scene_{scene_data['id']}.png"
    output_path = os.path.join(output_dir, output_filename)
    full_bg.save(output_path)
    print(f"Saved: {output_path}")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Paths
    paths = {
        'bg_city': os.path.join(script_dir, "background_city.png"),
        'normal_room': os.path.join(script_dir, "image.png"),
        'entrance': os.path.join(script_dir, "image copy.png"),
        'dirt': os.path.join(script_dir, "underground_dirt.png")
    }
    
    # Load Assets Once
    assets = {}
    print("Loading Base Assets...")
    
    try:
        # Background
        bg = Image.open(paths['bg_city']).convert('RGBA')
        # Upscale Background immediately to define canvas width standard
        bg_w, bg_h = bg.size
        assets['background_city'] = bg.resize((bg_w * 3, bg_h * 3), Image.Resampling.LANCZOS)
        
        # Dirt
        dt = Image.open(paths['dirt']).convert('RGBA')
        assets['dirt_texture'] = dt # Will be resized in generator
        
        # Rooms (Strip Backgrounds)
        print("Processing Room Assets (Chroma Key)...")
        entr = Image.open(paths['entrance']).convert('RGBA')
        assets['entrance'] = remove_background_floodfill(entr)
        
        norm = Image.open(paths['normal_room']).convert('RGBA')
        assets['normal_room'] = remove_background_floodfill(norm)
        
        # Load Objects (Machines)
        print("Loading Object Assets...")
        # Paths relative to project root - using updated asset versions
        obj_scrap_path = os.path.join(project_root, "Objects", "Machines", "scrap-v3.png")
        if os.path.exists(obj_scrap_path):
            try:
                img = Image.open(obj_scrap_path).convert('RGBA')
                assets['scrap_machine'] = remove_background_floodfill(img)
            except: pass
            
        obj_water_path = os.path.join(project_root, "Objects", "WaterPurifier", "water_purifier_v2_1769543600142.png")
        if os.path.exists(obj_water_path):
            try:
                img = Image.open(obj_water_path).convert('RGBA')
                assets['water_purifier'] = remove_background_floodfill(img)
            except: pass

        obj_garden_path = os.path.join(project_root, "Objects", "Garden", "hydroponic_plants_v2.png")
        if os.path.exists(obj_garden_path):
            try:
                img = Image.open(obj_garden_path).convert('RGBA')
                assets['garden'] = remove_background_floodfill(img)
            except: pass
            
        
    except Exception as e:
        print(f"Failed to load assets: {e}")
        return

    # Generate Layouts
    for config in SCENE_CONFIGS:
        generate_scene(config, assets, script_dir)

if __name__ == "__main__":
    main()
