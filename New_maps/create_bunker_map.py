"""
Script to create a composite bunker map by:
1. Using the background image as the base
2. Placing the entrance/exit room at the top
3. Placing multiple normal rooms stacked vertically below
4. Using chroma key to remove white backgrounds from rooms
"""

from PIL import Image
import numpy as np
import os

def remove_white_background(image, threshold=240):
    """
    Remove white/near-white background from an image using chroma key.
    Returns an RGBA image with transparent background.
    """
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Convert to numpy array
    data = np.array(image)
    
    # Find pixels where R, G, B are all above threshold (white/near-white)
    # This identifies the white background
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    white_mask = (r > threshold) & (g > threshold) & (b > threshold)
    
    # Set alpha to 0 for white pixels (make them transparent)
    data[:, :, 3] = np.where(white_mask, 0, 255)
    
    return Image.fromarray(data)

def create_textured_slab(width, height, texture_source):
    """
    Creates a procedural floor slab/beam image using a texture from an existing image.
    
    Args:
        width: Target width of the slab.
        height: Target height of the slab.
        texture_source: PIL Image to sample texture from (e.g., a room image).
    """
    # 1. Extract a CLEAN strip from the texture source to use as base
    # We want to avoid features like doors or lights.
    # A safe bet is the wall section (top 20%) but only a small horizontal slice.
    # The room likely has clean concrete on the far left or slightly left of center.
    src_w, src_h = texture_source.size
    
    # Target the upper-middle wall section
    crop_y_start = int(src_h * 0.20)  # Start at 20% from top
    crop_height = 40
    
    # Define a "safe patch" width. 
    # Left side (x=50) usually has clean wall before the first door/feature.
    patch_x_start = 50
    patch_width = 100  # Take a 100px wide sample
    if patch_x_start + patch_width > src_w:
        patch_width = src_w - patch_x_start
        
    patch = texture_source.crop((patch_x_start, crop_y_start, patch_x_start + patch_width, crop_y_start + crop_height))
    
    # 2. Tile the patch to fill the target width
    # Create the base slab image
    slab = Image.new('RGBA', (width, height))
    
    # Resize patch to target height first
    patch_resized = patch.resize((patch_width, height), Image.Resampling.LANCZOS)
    
    # Tile it horizontally
    for x in range(0, width, patch_width):
        # Calculate width to paste (handle last chunk being smaller)
        paste_w = min(patch_width, width - x)
        if paste_w < patch_width:
            chunk = patch_resized.crop((0, 0, paste_w, height))
            slab.paste(chunk, (x, 0))
        else:
            slab.paste(patch_resized, (x, 0))
    
    # 3. Apply color correction to ensure it matches the gray-green concrete
    data = np.array(slab)
    
    # Ensure we have alpha channel to work with
    if len(data.shape) == 2:  # Grayscale
        data = np.dstack((data, data, data, np.full((height, width), 255, dtype=np.uint8)))
    elif data.shape[2] == 3:  # RGB
        data = np.dstack((data, np.full((height, width), 255, dtype=np.uint8)))
    
    # Cast to float for color manipulation
    data_float = data.astype(np.float32)
    
    # Slightly desaturate to match the concrete wall look (reduce color variance)
    gray = 0.299 * data_float[:,:,0] + 0.587 * data_float[:,:,1] + 0.114 * data_float[:,:,2]
    desaturation_factor = 0.3  # Blend 30% toward grayscale
    for i in range(3):
        data_float[:,:,i] = data_float[:,:,i] * (1 - desaturation_factor) + gray * desaturation_factor
    
    # Apply a slight tint toward the gray-green concrete color (matching room walls)
    # Target color: approximately (140, 150, 145) - the grayish-green of the walls
    target_r, target_g, target_b = 140, 150, 145
    tint_strength = 0.2
    data_float[:,:,0] = data_float[:,:,0] * (1 - tint_strength) + target_r * tint_strength
    data_float[:,:,1] = data_float[:,:,1] * (1 - tint_strength) + target_g * tint_strength
    data_float[:,:,2] = data_float[:,:,2] * (1 - tint_strength) + target_b * tint_strength
    
    # Convert to int16 for shading operations
    data_int = np.clip(data_float, 0, 255).astype(np.int16)
    
    # Highlight top 2 pixels (lighter edge)
    data_int[0:2, :, 0:3] = np.clip(data_int[0:2, :, 0:3] + 30, 0, 255)
    
    # Shadow bottom 2 pixels (darker edge)
    data_int[-2:, :, 0:3] = np.clip(data_int[-2:, :, 0:3] - 30, 0, 255)
    
    # Subtle vertical panel lines (every 80px for larger, more industrial spacing)
    for x in range(0, width, 80):
        if x + 2 < width:
            data_int[:, x:x+2, 0:3] = np.clip(data_int[:, x:x+2, 0:3] - 20, 0, 255)
    
    # Convert back to uint8
    data = data_int.astype(np.uint8)
            
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
    Y_OFFSET_FACTOR = 0.77     # Vertical position on floor
    
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
    normal_room_path = os.path.join(script_dir, "image copy.png")
    entrance_path = os.path.join(script_dir, "EmptyGarageAsset_Office5.png")
    garden_path = os.path.join(project_root, "Objects", "Garden", "hydroponic_garden.png")
    scrap_machine_path = os.path.join(project_root, "Objects", "Machines", "metal_scrap_machine.png")
    water_purifier_path = os.path.join(project_root, "Objects", "WaterPurifier", "water_purifier.png")
    
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

    print(f"Background size: {background.size}")
    
    # Remove white backgrounds from rooms
    print("Removing white backgrounds...")
    entrance_transparent = remove_white_background(entrance, threshold=230)
    normal_room_transparent = remove_white_background(normal_room, threshold=230)
    
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
    
    # Crop Object transparent backgrounds
    garden_transparent = remove_white_background(garden, threshold=240)
    if garden_transparent.getbbox():
        garden_transparent = garden_transparent.crop(garden_transparent.getbbox())
        
    scrap_machine_transparent = scrap_machine # Already RGBA?
    # Actually scrap machine was loaded as RGBA but might need white removal or crop?
    # Original code just did crop. Let's assume it has transparency or needs cropping.
    # Original code: scrap_machine.getbbox() -> crop.
    if scrap_machine.getbbox():
        scrap_machine_transparent = scrap_machine.crop(scrap_machine.getbbox())
    
    # Process water purifier if loaded
    water_purifier_transparent = None
    if water_purifier is not None:
        water_purifier_transparent = remove_white_background(water_purifier, threshold=240)
        if water_purifier_transparent.getbbox():
            water_purifier_transparent = water_purifier_transparent.crop(water_purifier_transparent.getbbox())
    
    # Resize rooms
    entrance_scaled = entrance_transparent.resize((new_entrance_width, new_entrance_height), Image.Resampling.LANCZOS)
    normal_room_scaled = normal_room_transparent.resize((new_room_width, new_room_height), Image.Resampling.LANCZOS)
    
    # Resize rooms
    entrance_scaled = entrance_transparent.resize((new_entrance_width, new_entrance_height), Image.Resampling.LANCZOS)
    normal_room_scaled = normal_room_transparent.resize((new_room_width, new_room_height), Image.Resampling.LANCZOS)
    
    # --- SLAB CREATION ---
    slab_height = 1
    # Slab Width: Scaled down to not protrude past walls (88%)
    slab_width = int(new_room_width * 0.90)
    
    # Use custom slab image provided by user
    print("Loading custom slab image: image.png")
    custom_slab_path = os.path.join(script_dir, "image.png")
    
    if os.path.exists(custom_slab_path):
        custom_slab = Image.open(custom_slab_path).convert('RGBA')
        
        # Remove white background
        custom_slab_transparent = remove_white_background(custom_slab, threshold=240)
        
        # Crop to content
        if custom_slab_transparent.getbbox():
            custom_slab_transparent = custom_slab_transparent.crop(custom_slab_transparent.getbbox())
            
        # Resize to target dimensions
        slab_image = custom_slab_transparent.resize((slab_width, slab_height), Image.Resampling.LANCZOS)
        print(f"Created slab from custom image: {slab_image.size}")
    else:
        # Fallback to texture generation if image not found (just in case)
        print("Custom slab image not found, falling back to textured generation.")
        slab_image = create_textured_slab(slab_width, slab_height, normal_room_scaled)
        print(f"Created fallback slab image: {slab_image.size}")

    # Check if we need to extend the background
    vertical_padding = -39 # Increased overlap (was -25) to move rooms closer
    num_normal_rooms = 3
    
    total_needed_height = 500 + new_entrance_height + (num_normal_rooms * (new_room_height + vertical_padding)) + 50
    
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
    # Y Position: Shifted UP to compensate for increased spacing (was 500)
    # Goal: Keep bottom room fixed.
    y_position = 460  
    composite.paste(entrance_scaled, (x_offset, y_position), entrance_scaled)
    print(f"Placed entrance at: ({x_offset}, {y_position})")
    
    # Track room positions for placing objects
    room_positions = []
    
    # Place normal rooms below, stacked vertically
    y_position = y_position + new_entrance_height + vertical_padding
    
    for i in range(num_normal_rooms):
        room_x_offset = (bg_width - new_room_width) // 2
        composite.paste(normal_room_scaled, (room_x_offset, int(y_position)), normal_room_scaled)
        
        # --- PLACE SLAB OVERLAY ---
        # We want the slab between THIS room (i) and the PREVIOUS room (i-1).
        
        # Intersection math:
        # Overlap Zone = [y_position, y_position + abs(vertical_padding)]
        # We assume vertical_padding is negative (-30).
        # So overlap height is 30.
        # Slab Y = y_position + (abs(vertical_padding) - slab_height) / 2
        
        # OFFSETS for visual alignment (User req: "move a bit top and bit right")
        SLAB_OFFSET_Y = -6  # Move UP (Reduced from -12)
        SLAB_OFFSET_X = 8   # Move RIGHT (Reduced from 16)
        
        overlap_height = abs(vertical_padding)
        slab_y_offset = (overlap_height - slab_height) // 2
        final_slab_y = int(y_position + slab_y_offset + SLAB_OFFSET_Y)
        
        # Center Slab Horizontally + Offset
        slab_x_offset = room_x_offset + (new_room_width - slab_width) // 2 + SLAB_OFFSET_X
        
        composite.paste(slab_image, (slab_x_offset, final_slab_y), slab_image)
        
        room_positions.append((room_x_offset, int(y_position), new_room_width, new_room_height))
        print(f"Placed normal room {i+1} at: ({room_x_offset}, {int(y_position)}) with Slab at {final_slab_y}")
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
