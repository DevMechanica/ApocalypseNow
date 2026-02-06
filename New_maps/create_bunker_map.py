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
    print(f"Generating {scene_data['name']}...")
    
    # Unpack Assets
    room_img = assets.get('normal_room_scaled', assets['normal_room'])
    entrance_img = assets.get('entrance_scaled', assets['entrance'])
    
    # 1. Setup Canvas & Background
    full_bg = None
    TARGET_WIDTH = 0
    canvas_h = 0
    
    # Check for Cached Underground BG
    if scene_data['type'] == 'underground' and 'ug_bg_scaled' in assets:
        # Use Cached Background (Clone it)
        full_bg = assets['ug_bg_scaled'].copy()
        TARGET_WIDTH, canvas_h = full_bg.size
        
        # Dimensions are pre-calculated
        new_room_w, new_room_h = room_img.size
        effective_floor_h = new_room_h + VERTICAL_PADDING
        
        top_margin = 100
        current_y = top_margin
        
        # Room Center X
        room_x = (TARGET_WIDTH - new_room_w) // 2
        
    else:
        # Surface or standard fallback
        bg_base = assets['background_city']
        TARGET_WIDTH = bg_base.width
        
        # Calculate Dimensions on the fly (if not cached, though we expect cached)
        new_room_w, new_room_h = room_img.size
        new_entrance_w, new_entrance_h = entrance_img.size
        
        effective_floor_h = new_room_h + VERTICAL_PADDING
        
        num_floors = scene_data['floors']
        total_content_height = (num_floors * effective_floor_h)
        canvas_h = max(bg_base.height, total_content_height + 500)
        
        # Create Canvas
        full_bg = Image.new('RGBA', (TARGET_WIDTH, canvas_h), (30, 25, 20, 255))
        full_bg.paste(bg_base, (0, 0))
        
        top_margin = 100
        current_y = top_margin
        
        room_x = (TARGET_WIDTH - new_room_w) // 2
        
    # 2. Place Floors
    if scene_data['type'] == 'surface':
        start_y = 600
        new_entrance_w, new_entrance_h = entrance_img.size
        entrance_x = (TARGET_WIDTH - new_entrance_w) // 2
        
        for i in range(scene_data['floors']):
            is_ground_floor = (i == scene_data['floors'] - 1)
            
            if is_ground_floor:
                # Place Entrance
                pos_y = start_y + (i * effective_floor_h)
                full_bg.paste(entrance_img, (entrance_x, pos_y), entrance_img)
            else:
                # Place Normal Room
                pos_y = start_y + (i * effective_floor_h)
                full_bg.paste(room_img, (room_x, pos_y), room_img)
                
                # Objects (Same logic as before)
                if i == 0:
                    # if 'garden' in assets:
                    #      place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 0, 2, "Plant 1")
                    #      place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 2, 2, "Plant 2")
                    #      place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 4, 2, "Plant 3")
                    #      place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 6, 2, "Plant 4")
                    pass
                if i == 1:
                    # if 'garden' in assets:
                    #      place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 0, 2, "Plant 1")
                    #      place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 2, 2, "Plant 2")
                    #      place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 4, 2, "Plant 3")
                    if 'water_purifier' in assets:
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['water_purifier'], 6, 2, "Water Purifier")
                if i == 2:
                    if 'scrap_machine' in assets:
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['scrap_machine'], 0, 4, "Scrap Machine")
                    # if 'garden' in assets:
                    #      place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 4, 2, "Plant 1")
                    #      place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['garden'], 6, 2, "Plant 2")
                if i == 3:
                     if 'scrap_machine' in assets:
                         place_object(full_bg, (room_x, pos_y, new_room_w, new_room_h), assets['scrap_machine'], 0, 4, "Scrap Machine")

    else:
        # Underground
        for i in range(scene_data['floors']):
            # Already resized cached room
            full_bg.paste(room_img, (room_x, current_y), room_img)
            current_y += effective_floor_h

    # Save
    output_filename = f"scene_{scene_data['id']}.png"
    output_path = os.path.join(output_dir, output_filename)
    full_bg.save(output_path, compress_level=1) # Optimization: Faster save
    print(f"Saved: {output_filename}")

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

        # obj_garden_path = os.path.join(project_root, "Objects", "Cutscenes", "Garden", "download (31).mp4")
        # if os.path.exists(obj_garden_path):
        #     if obj_garden_path.endswith('.mp4'):
        #         print(f"Video asset detected for Garden: {obj_garden_path} - Skipping static bake.")
        #         # parsed_assets['garden'] will remain unset, so it won't be drawn
        #     else:
        #         try:
        #             img = Image.open(obj_garden_path).convert('RGBA')
        #             assets['garden'] = remove_background_floodfill(img)
        #         except: pass
            
        
    except Exception as e:
        print(f"Failed to load assets: {e}")
        return

    # Pre-Process Common Assets to avoid redundant resizing
    print("Pre-processing Shared Assets...")
    
    # Calculate Standard Dimensions (based on Surface/Scene 1 logic which defines scale)
    # We assume usage of Background City width
    ref_bg_width = assets['background_city'].width
    
    # Calculate Scaled Room Dimensions (Same for all scenes)
    room_w, room_h = assets['normal_room'].size
    scale_factor = (ref_bg_width * 0.70) / room_w
    new_room_w = int(room_w * scale_factor)
    new_room_h = int(room_h * scale_factor)
    assets['normal_room_scaled'] = assets['normal_room'].resize((new_room_w, new_room_h), Image.Resampling.LANCZOS)
    
    entrance_w, entrance_h = assets['entrance'].size
    entrance_scale = (ref_bg_width * 0.70) / entrance_w
    new_entrance_w = int(entrance_w * entrance_scale)
    new_entrance_h = int(entrance_h * entrance_scale)
    assets['entrance_scaled'] = assets['entrance'].resize((new_entrance_w, new_entrance_h), Image.Resampling.LANCZOS)
    
    # Pre-calculate Underground Background (Shared by Scenes 2-10)
    # They all have 5 floors
    ug_floors = 5
    vertical_padding = VERTICAL_PADDING
    effective_floor_h = new_room_h + vertical_padding
    
    # Underground Height Calculation - MATCH SURFACE BACKGROUND HEIGHT
    # Use the same dimensions as the surface background for consistent zoom
    surface_bg_w, surface_bg_h = assets['background_city'].size
    
    print(f"Pre-generating Underground Background ({surface_bg_w}x{surface_bg_h}) - matching surface...")
    
    # Simply stretch the dirt texture to match surface dimensions exactly
    # This avoids tiling artifacts/seams
    dirt_tex = assets['dirt_texture']
    assets['ug_bg_scaled'] = dirt_tex.resize((surface_bg_w, surface_bg_h), Image.Resampling.LANCZOS)
    assets['ug_dims'] = (surface_bg_w, surface_bg_h) # Cache dims

    # Generate Layouts in Parallel
    print("\nStarting Parallel Generation...")
    
    import concurrent.futures
    
    with concurrent.futures.ThreadPoolExecutor() as executor:
        # Submit all tasks
        futures = [executor.submit(generate_scene, config, assets, script_dir) for config in SCENE_CONFIGS]
        
        # Wait for completion
        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()
            except Exception as e:
                print(f"Scene generation failed: {e}")

if __name__ == "__main__":
    main()
