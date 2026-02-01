"""
Script to create a composite bunker map by:
1. Using the background image as the base
2. Placing the entrance/exit room at the top
3. Placing multiple normal rooms stacked vertically below
4. Using chroma key to remove white backgrounds from rooms
"""

from PIL import Image, ImageDraw
import numpy as np
import os

def remove_background_floodfill(image, threshold=200):
    """
    Remove contiguous white background using flood fill from corners.
    Best for Rooms to preserve internal white walls/lights.
    """
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    width, height = image.size
    seed_points = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
    
    for point in seed_points:
        try:
            ImageDraw.floodfill(image, point, (255, 255, 255, 0), thresh=threshold)
        except Exception as e:
            pass
            
    return image

def remove_white_global(image, threshold=240):
    """
    Remove white/near-white background globally using chroma key.
    Best for Objects (Plants, Machines) to remove white inside sprites.
    """
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    data = np.array(image)
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    white_mask = (r > threshold) & (g > threshold) & (b > threshold)
    data[:, :, 3] = np.where(white_mask, 0, 255)
    
    return Image.fromarray(data)

def place_object(composite, room_pos, asset_image, start_slot, slot_width_slots, asset_name="Object"):
    """
    Places an object in a room based on the standardized grid system.
    """
    room_x, room_y, room_w, room_h = room_pos
    
    # Standardized Constants based on user preference
    ROOM_SLOTS = 8
    SIZE_PADDING_RATIO = 0.20
    POS_PADDING_RATIO = 0.14
    Y_OFFSET_FACTOR = 0.788
    
    usable_width_size = room_w * (1 - (SIZE_PADDING_RATIO * 2))
    base_slot_width = usable_width_size / ROOM_SLOTS
    
    target_width = int(base_slot_width * slot_width_slots * 0.95)
    
    scale = target_width / asset_image.width
    new_width = int(asset_image.width * scale)
    new_height = int(asset_image.height * scale)
    asset_scaled = asset_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    x_start_offset = room_w * POS_PADDING_RATIO
    slot_x_start = room_x + x_start_offset + (start_slot * base_slot_width)
    
    center_offset = ((base_slot_width * slot_width_slots) - new_width) / 2
    final_x = int(slot_x_start + center_offset)
    
    final_y = room_y + int(room_h * Y_OFFSET_FACTOR) - new_height
    
    composite.paste(asset_scaled, (final_x, final_y), asset_scaled)
    print(f"Placed {asset_name} ({slot_width_slots} slots) at: ({final_x}, {final_y})")

def create_concrete_separator(width, height=80):
    """Generates a procedural concrete separator texture (Deterministic)."""
    # Base grey (Deterministic)
    img = Image.new('RGBA', (width, height), (85, 85, 90, 255))
    draw = ImageDraw.Draw(img)
        
    # Draw top and bottom dark lines for definition
    draw.line((0, 0, width, 0), fill=(40, 40, 40, 255), width=3)
    draw.line((0, height-1, width, height-1), fill=(30, 30, 30, 255), width=3)
    
    return img

def create_bunker_map():
    # Load images
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    background_path = os.path.join(script_dir, "background_city.png")
    normal_room_path = os.path.join(script_dir, "image.png")
    entrance_path = os.path.join(script_dir, "image copy.png")
    garden_path = os.path.join(project_root, "Objects", "Garden", "hydroponic_plants_v2.png")
    scrap_machine_path = os.path.join(project_root, "Objects", "Machines", "scrap-v4.png")
    water_purifier_path = os.path.join(project_root, "Objects", "WaterPurifier", "water_purifier_v2_1769543600142.png")
    dirt_texture_path = os.path.join(script_dir, "underground_dirt.png")
    
    print("Loading images...")
    try:
        background = Image.open(background_path).convert('RGBA')
        normal_room = Image.open(normal_room_path)
        entrance = Image.open(entrance_path)
        garden = Image.open(garden_path).convert('RGBA')
        scrap_machine = Image.open(scrap_machine_path).convert('RGBA')
        
        water_purifier = None
        if os.path.exists(water_purifier_path):
            water_purifier = Image.open(water_purifier_path).convert('RGBA')
            
        dirt_texture = Image.open(dirt_texture_path).convert('RGBA')
    except Exception as e:
        print(f"Error loading images: {e}")
        return

    print(f"Original Background size: {background.size}")
    
    # Upscale Background
    bg_w, bg_h = background.size
    background = background.resize((bg_w * 3, bg_h * 3), Image.Resampling.LANCZOS)
    print(f"Upscaled Background size: {background.size}")
    
    # Process Rooms
    print("Processing rooms...")
    entrance_transparent = remove_background_floodfill(entrance.convert('RGBA'))
    # Reverting crop to preserve Grid System coordinate alignment
    # if entrance_transparent.getbbox():
    #    entrance_transparent = entrance_transparent.crop(entrance_transparent.getbbox())
        
    normal_room_transparent = remove_background_floodfill(normal_room.convert('RGBA'))
    # Reverting crop to preserve Grid System coordinate alignment 
    # if normal_room_transparent.getbbox():
    #    normal_room_transparent = normal_room_transparent.crop(normal_room_transparent.getbbox())
    
    # Dimensions
    bg_width, bg_height = background.size
    room_width, room_height = normal_room_transparent.size
    entrance_width, entrance_height = entrance_transparent.size
    
    # Scaling ratios
    scale_factor = (bg_width * 0.70) / room_width
    entrance_scale_factor = (bg_width * 0.70) / entrance_width
    
    new_room_width = int(room_width * scale_factor)
    new_room_height = int(room_height * scale_factor)
    new_entrance_width = int(entrance_width * entrance_scale_factor)
    new_entrance_height = int(entrance_height * entrance_scale_factor)
    
    # Process Objects
    garden_transparent = remove_white_global(garden, threshold=240)
    if garden_transparent.getbbox():
        garden_transparent = garden_transparent.crop(garden_transparent.getbbox())
        
    scrap_machine_transparent = remove_white_global(scrap_machine, threshold=200)
    if scrap_machine_transparent.getbbox():
        scrap_machine_transparent = scrap_machine_transparent.crop(scrap_machine_transparent.getbbox())
    
    water_purifier_transparent = None
    if water_purifier is not None:
        water_purifier_transparent = remove_white_global(water_purifier, threshold=240)
        if water_purifier_transparent.getbbox():
            water_purifier_transparent = water_purifier_transparent.crop(water_purifier_transparent.getbbox())
            
    # Resize Rooms
    entrance_scaled = entrance_transparent.resize((new_entrance_width, new_entrance_height), Image.Resampling.LANCZOS)
    normal_room_scaled = normal_room_transparent.resize((new_room_width, new_room_height), Image.Resampling.LANCZOS)
    
    # --- LEVEL 2 LAYOUT PREPARATION ---
    
    num_normal_rooms = 6
    separator_height = 80
    # Precise offsets tuned based on feedback:
    # Shift down -80 (pull up more to touch separator)
    # Vertical padding -160 (reduce overlap)
    shift_down_underground = -55 
    vertical_padding = -160
    
    # 1. Surface Canvas Height (City BG)
    surface_height = bg_height
    
    # 2. Underground Canvas Height
    # Includes Separator + All Rooms + Padding
    underground_height = separator_height + (num_normal_rooms * (new_room_height + vertical_padding)) + 300
    
    total_canvas_height = surface_height + underground_height
    print(f"Total Canvas Height: {total_canvas_height}")
    
    # Create Full Canvas (Dark dirt base)
    full_bg = Image.new('RGBA', (bg_width, int(total_canvas_height)), (30, 25, 20, 255))
    
    # A. PASTE CITY SKYLINE (Top)
    # Re-open original to prevent image object issues, or use previously resized 'background'
    full_bg.paste(background, (0, 0))
    
    # B. PASTE CONCRETE SEPARATOR
    separator_img = create_concrete_separator(bg_width, separator_height)
    separator_y = bg_height
    # full_bg.paste(separator_img, (0, separator_y)) <--- Moved to end
    print(f"Calculated Separator Y={separator_y}")
    
    # C. STRETCH UNDERGROUND DIRT (Below Separator)
    dirt_start_y = separator_y + separator_height
    dirt_fill_height = int(total_canvas_height) - dirt_start_y
    
    # Stretch texture to fill the entire underground width and remaining height
    dirt_texture_stretched = dirt_texture.resize((bg_width, dirt_fill_height), Image.Resampling.LANCZOS)
    full_bg.paste(dirt_texture_stretched, (0, dirt_start_y))
        
    composite = full_bg
    
    # --- PLACE ROOMS ---
    
    # 1. Entrance (Surface Level)
    # Align bottom of entrance to bottom of City BG (surface_height)
    # Added +50 to account for bottom transparency
    entrance_y = surface_height - new_entrance_height + 95

    x_offset = (bg_width - new_entrance_width) // 2
    
    composite.paste(entrance_scaled, (x_offset, entrance_y), entrance_scaled)
    print(f"Placed Entrance at Y={entrance_y} (Bottom aligned to Surface Ground)")
    
    # 2. Underground Rooms
    room_positions = []
    # Start below the separator
    current_y = separator_y + separator_height + shift_down_underground
    
    for i in range(num_normal_rooms):
        room_x_offset = (bg_width - new_room_width) // 2
        composite.paste(normal_room_scaled, (room_x_offset, int(current_y)), normal_room_scaled)
        
        room_positions.append((room_x_offset, int(current_y), new_room_width, new_room_height))
        print(f"Placed Room {i+1} at Y={int(current_y)}")
        current_y += new_room_height + vertical_padding
        
    # --- PLACE ASSETS ---
    
    # Room 1: Gardens
    if len(room_positions) > 0:
        for i in range(3):
            place_object(composite, room_positions[0], garden_transparent, i*2, 2, f"Garden {i+1} (Floor 1)")
            
    # Room 2: Gardens + Purifier + Extra
    if len(room_positions) > 1:
        for i in range(2):
            place_object(composite, room_positions[1], garden_transparent, i*2, 2, f"Garden {i+1} (Floor 2)")
        if water_purifier_transparent:
            place_object(composite, room_positions[1], water_purifier_transparent, 4, 2, "Water Purifier (Floor 2)")
        place_object(composite, room_positions[1], garden_transparent, 6, 2, "Garden 4 (Floor 2)")
        
    # Room 3: Scrap Machine + Garden
    if len(room_positions) > 2:
        place_object(composite, room_positions[2], scrap_machine_transparent, 0, 4, "Scrap Machine")
        place_object(composite, room_positions[2], garden_transparent, 4, 2, "Garden (Floor 3)")
        
    # Level 2 (Floors 4, 5, 6)
    if len(room_positions) > 3:
        for floor_idx in range(3, len(room_positions)):
            for i in range(3):
                place_object(composite, room_positions[floor_idx], garden_transparent, i*2, 2, f"Garden {i+1} (Floor {floor_idx+1})")
                
    # --- FINAL LAYERING ---
    # Paste Separator last so it covers any room overlap
    composite.paste(separator_img, (0, separator_y))
    print(f"Placed Separator (Overlay) at Y={separator_y}")

    # Save
    output_path = os.path.join(script_dir, "bunker_map_composite.png")
    composite.save(output_path)
    print(f"\nSaved to: {output_path}")

if __name__ == "__main__":
    create_bunker_map()
