"""
Script to create a composite bunker map by:
1. Using the background image as the base
2. Placing the entrance/exit room at the top
3. Placing multiple normal rooms stacked vertically below
4. Using chroma key to remove white backgrounds from rooms
"""

from PIL import Image
import numpy as np

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

def create_bunker_map():
    # Load images
    background_path = r"d:\Work\ApocalypseNow\New_maps\Gemini_Generated_Image_i7kl4ci7kl4ci7kl.png"
    normal_room_path = r"d:\Work\ApocalypseNow\New_maps\EmptyRoomAsset_Office4.png"
    entrance_path = r"d:\Work\ApocalypseNow\New_maps\EmptyGarageAsset_Office3.png"
    garden_path = r"d:\Work\ApocalypseNow\Objects\Garden\hydroponic_garden.png"
    
    print("Loading images...")
    try:
        background = Image.open(background_path).convert('RGBA')
        normal_room = Image.open(normal_room_path)
        entrance = Image.open(entrance_path)
        garden = Image.open(garden_path).convert('RGBA')
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
    
    # Scale rooms to fit nicely on the background (about 90% of background width)
    scale_factor = (bg_width * 0.90) / room_width
    
    new_room_width = int(room_width * scale_factor)
    new_room_height = int(room_height * scale_factor)
    new_entrance_width = int(entrance_width * scale_factor)
    new_entrance_height = int(entrance_height * scale_factor)
    
    # Scale garden to fit inside room (about 20% of room width)
    # First remove white background from garden
    garden_transparent = remove_white_background(garden, threshold=240)
    # Crop to content bounds
    garden_bbox = garden_transparent.getbbox()
    if garden_bbox:
        garden_transparent = garden_transparent.crop(garden_bbox)
    garden_scale = (new_room_width * 0.20) / garden_transparent.width
    new_garden_width = int(garden_transparent.width * garden_scale)
    new_garden_height = int(garden_transparent.height * garden_scale)
    garden_scaled = garden_transparent.resize((new_garden_width, new_garden_height), Image.Resampling.LANCZOS)
    
    # Resize rooms
    entrance_scaled = entrance_transparent.resize((new_entrance_width, new_entrance_height), Image.Resampling.LANCZOS)
    normal_room_scaled = normal_room_transparent.resize((new_room_width, new_room_height), Image.Resampling.LANCZOS)
    
    # Check if we need to extend the background
    vertical_padding = -80  # Overlap rooms more to bring them closer together
    num_normal_rooms = 3
    
    total_needed_height = 30 + new_entrance_height + (num_normal_rooms * (new_room_height + vertical_padding)) + 50
    
    if total_needed_height > bg_height:
        # Extend background by tiling it
        new_bg_height = int(total_needed_height)
        extended_background = Image.new('RGBA', (bg_width, new_bg_height))
        
        # Tile the background
        for y in range(0, new_bg_height, bg_height):
            # Calculate height to paste (handle last tile which might be partial)
            paste_height = min(bg_height, new_bg_height - y)
            if paste_height < bg_height:
                extended_background.paste(background.crop((0, 0, bg_width, paste_height)), (0, y))
            else:
                extended_background.paste(background, (0, y))
        
        background = extended_background
        bg_height = new_bg_height
        print(f"Extended background to: {background.size}")
    
    # Create the composite image
    composite = background.copy()
    
    # Calculate x position to center rooms
    x_offset = (bg_width - new_entrance_width) // 2
    
    # Place entrance at the top with some padding
    y_position = 100  # Push rooms down from top
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
    
    # Place garden in the second room (index 1)
    if len(room_positions) > 1:
        room_x, room_y, room_w, room_h = room_positions[1]
        # Position garden on the left side of the room, on the floor
        garden_x = room_x + int(room_w * 0.15)
        # Floor is at about 85% of room height
        garden_y = room_y + int(room_h * 0.85) - new_garden_height
        composite.paste(garden_scaled, (garden_x, garden_y), garden_scaled)
        print(f"Placed garden at: ({garden_x}, {garden_y})")
    
    # Save the composite image
    output_path = r"d:\Work\ApocalypseNow\New_maps\bunker_map_composite.png"
    composite.save(output_path)
    print(f"\nComposite map saved to: {output_path}")
    print(f"Final image size: {composite.size}")

if __name__ == "__main__":
    create_bunker_map()
