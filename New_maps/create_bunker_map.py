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
    
    Args:
        composite: The main composite image.
        room_pos: Tuple (x, y, w, h) of the target room.
        asset_image: The PIL Image of the asset to place.
        start_slot: The starting slot index (0-7).
        slot_width_slots: How many slots wide the object is.
        asset_name: Name for logging.
    """
    room_x, room_y, room_w, room_h = room_pos
    
    # Standardized Constants based on user preference
    ROOM_SLOTS = 8
    SIZE_PADDING_RATIO = 0.20  # Increased to shrink assets (was 0.15)
    POS_PADDING_RATIO = 0.14   # Re-adjusted to shift left (was 0.18)
    Y_OFFSET_FACTOR = 0.788 # Vertical position on floor (increased to move assets down)
    
    # Calculate usable width and slot size based on size padding
    # Note: We use the SIZE padding for calculating the base slot width to maintain size consistency
    usable_width_size = room_w * (1 - (SIZE_PADDING_RATIO * 2))
    base_slot_width = usable_width_size / ROOM_SLOTS
    
    # Calculate target width for the object
    # We use 0.95 scale factor to leave a small gap between objects
    target_width = int(base_slot_width * slot_width_slots * 0.95)
    
    # Scale object
    scale = target_width / asset_image.width
    new_width = int(asset_image.width * scale)
    new_height = int(asset_image.height * scale)
    asset_scaled = asset_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Calculate X Position
    # We use POS padding for the starting offset
    x_start_offset = room_w * POS_PADDING_RATIO
    
    # Calculate global X position
    # The grid starts at room_x + x_start_offset
    # Logic: Start at offset -> move N slots over. 
    # To be consistent with "flush" logic, the slot width for POSITIONING might need to match or be independent.
    # Here we use the same base_slot_width for spacing steps.
    slot_x_start = room_x + x_start_offset + (start_slot * base_slot_width)
    
    # Center the object within its assigned slots
    center_offset = ((base_slot_width * slot_width_slots) - new_width) / 2
    final_x = int(slot_x_start + center_offset)
    
    # Calculate Y Position
    final_y = room_y + int(room_h * Y_OFFSET_FACTOR) - new_height
    
    composite.paste(asset_scaled, (final_x, final_y), asset_scaled)
    print(f"Placed {asset_name} ({slot_width_slots} slots) at: ({final_x}, {final_y})")


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
    
    print("Loading images...")
    try:
        background = Image.open(background_path).convert('RGBA')
        normal_room = Image.open(normal_room_path)
        entrance = Image.open(entrance_path)
        garden = Image.open(garden_path).convert('RGBA')
        scrap_machine = Image.open(scrap_machine_path).convert('RGBA')
        # Water purifier - load if exists, otherwise skip
        water_purifier = None
        if os.path.exists(water_purifier_path):
            water_purifier = Image.open(water_purifier_path).convert('RGBA')
    except Exception as e:
        print(f"Error loading images: {e}")
        return

    print(f"Original Background size: {background.size}")
    # UPSCALING MAP RESOLUTION
    # We double the background size so that high-res assets (plants, machines)
    # retain their detail when composited.
    bg_w, bg_h = background.size
    background = background.resize((bg_w * 3, bg_h * 3), Image.Resampling.LANCZOS)
    print(f"Upscaled Background size: {background.size}")
    
    # Remove white backgrounds from rooms
    print("Processing rooms (removing backgrounds using FLOOD FILL)...")
    entrance_transparent = remove_background_floodfill(entrance.convert('RGBA'))
    normal_room_transparent = remove_background_floodfill(normal_room.convert('RGBA'))
    
    # Calculate room dimensions and scaling
    bg_width, bg_height = background.size
    room_width, room_height = normal_room_transparent.size
    entrance_width, entrance_height = entrance_transparent.size
    
    # Scale rooms to fit nicely on the background (about 70% of background width)
    scale_factor = (bg_width * 0.70) / room_width
    
    # Scale entrance separately (smaller than rooms - 50% of bg width)
    entrance_scale_factor = (bg_width * 0.70) / entrance_width
    
    new_room_width = int(room_width * scale_factor)
    new_room_height = int(room_height * scale_factor)
    new_entrance_width = int(entrance_width * entrance_scale_factor)
    new_entrance_height = int(entrance_height * entrance_scale_factor)
    
    # Crop Object transparent backgrounds (Using GLOBAL removal)
    garden_transparent = remove_white_global(garden, threshold=240)
    if garden_transparent.getbbox():
        garden_transparent = garden_transparent.crop(garden_transparent.getbbox())
        
    scrap_machine_transparent = remove_white_global(scrap_machine, threshold=200)
    if scrap_machine_transparent.getbbox():
        scrap_machine_transparent = scrap_machine_transparent.crop(scrap_machine_transparent.getbbox())
    
    # Process water purifier if loaded
    water_purifier_transparent = None
    if water_purifier is not None:
        water_purifier_transparent = remove_white_global(water_purifier, threshold=240)
        if water_purifier_transparent.getbbox():
            water_purifier_transparent = water_purifier_transparent.crop(water_purifier_transparent.getbbox())
    
    # Resize rooms
    entrance_scaled = entrance_transparent.resize((new_entrance_width, new_entrance_height), Image.Resampling.LANCZOS)
    normal_room_scaled = normal_room_transparent.resize((new_room_width, new_room_height), Image.Resampling.LANCZOS)
    
    # Check if we need to extend the background
    vertical_padding = -150 # Overlap rooms more to bring them closer together
    num_normal_rooms = 3
    initial_y_offset = 900 # Move rooms down to touch the floor
    
    total_needed_height = initial_y_offset + new_entrance_height + (num_normal_rooms * (new_room_height + vertical_padding)) + 50
    
    if total_needed_height > bg_height:
        # Extend background by stretching it (Resize) instead of tiling
        # This preserves the look of the mountains/sky as one continuous image
        new_bg_height = int(total_needed_height)
        background = background.resize((bg_width, new_bg_height), Image.Resampling.LANCZOS)
        bg_height = new_bg_height
        print(f"Extended background (stretched) to: {background.size}")
    
    # Create the composite image
    composite = background.copy()
    
    # Calculate x position to center rooms
    x_offset = (bg_width - new_entrance_width) // 2
    
    # Place entrance at the top with some padding
    y_position = initial_y_offset  # Push rooms down from top
    composite.paste(entrance_scaled, (x_offset, y_position), entrance_scaled)
    print(f"Placed entrance at: ({x_offset}, {y_position})")
    
    # Track room positions for placing objects
    room_positions = []
    
    # Place normal rooms below, stacked vertically
    y_position = y_position + new_entrance_height + vertical_padding
    
    for i in range(num_normal_rooms):
        room_x_offset = (bg_width - new_room_width) // 2
        composite.paste(normal_room_scaled, (room_x_offset, int(y_position)), normal_room_scaled)
        room_positions.append((room_x_offset, int(y_position), new_room_width, new_room_height))
        print(f"Placed normal room {i+1} at: ({room_x_offset}, {int(y_position)})")
        y_position += new_room_height + vertical_padding
    
    # --- ASSET PLACEMENT ---

    # Place 4 gardens in Room 1 (Index 0) - "First Floor"
    if len(room_positions) > 0:
        for i in range(3):
            place_object(
                composite=composite,
                room_pos=room_positions[0],
                asset_image=garden_transparent,
                start_slot=i*2,  # 0, 2, 4
                slot_width_slots=2,
                asset_name=f"Garden {i+1} (Floor 1)"
            )
    
    # Place 4 gardens in Room 2 (Index 1)
    if len(room_positions) > 1:
        # Garden is 2 slots wide
        for i in range(2):
            place_object(
                composite=composite,
                room_pos=room_positions[1],
                asset_image=garden_transparent,
                start_slot=i*2,  # 0, 2
                slot_width_slots=2,
                asset_name=f"Garden {i+1} (Floor 2)"
            )
        
        # Place water purifiers in slots 4 (2 slots wide)
        if water_purifier_transparent is not None:
            for i in range(1):
                place_object(
                    composite=composite,
                    room_pos=room_positions[1],
                    asset_image=water_purifier_transparent,
                    start_slot=4 + i*2,  # 4
                    slot_width_slots=2,
                    asset_name=f"Water Purifier {i+1} (Floor 2)"
                )
        
        # Place additional garden at slot 6 (testing 4x 2-slot fit)
        place_object(
            composite=composite,
            room_pos=room_positions[1],
            asset_image=garden_transparent,
            start_slot=6,
            slot_width_slots=2,
            asset_name="Garden 4 (Floor 2)"
        )
            
    # Place scrap machine in Room 3 (Index 2)
    if len(room_positions) > 2:
        # Machine is 4 slots wide, placing at slot 2 (centered-ish)
        place_object(
            composite=composite,
            room_pos=room_positions[2],
            asset_image=scrap_machine_transparent,
            start_slot=0,
            slot_width_slots=4,
            asset_name="Scrap Machine"
        )

        # Place Garden in Room 3 (Index 2) - "Floor 3"
        place_object(
            composite=composite,
            room_pos=room_positions[2],
            asset_image=garden_transparent,
            start_slot=4,
            slot_width_slots=2,
            asset_name="Garden (Floor 3)"
        )
    
    # Save the composite image
    output_path = os.path.join(script_dir, "bunker_map_composite.png")
    composite.save(output_path)
    print(f"\nComposite map saved to: {output_path}")
    print(f"Final image size: {composite.size}")

if __name__ == "__main__":
    create_bunker_map()
