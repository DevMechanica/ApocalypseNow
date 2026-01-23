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
    background_path = r"d:\Work\ApocalypseNow\Maps\New_maps\Gemini_Generated_Image_d0xhhqd0xhhqd0xh.png"
    normal_room_path = r"d:\Work\ApocalypseNow\Maps\New_maps\Gemini_Generated_Image_9allzy9allzy9all.png"
    entrance_path = r"d:\Work\ApocalypseNow\Maps\New_maps\Gemini_Generated_Image_q4a9qjq4a9qjq4a9.png"
    
    print("Loading images...")
    try:
        background = Image.open(background_path).convert('RGBA')
        normal_room = Image.open(normal_room_path)
        entrance = Image.open(entrance_path)
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
    
    # Resize rooms
    entrance_scaled = entrance_transparent.resize((new_entrance_width, new_entrance_height), Image.Resampling.LANCZOS)
    normal_room_scaled = normal_room_transparent.resize((new_room_width, new_room_height), Image.Resampling.LANCZOS)
    
    # Check if we need to extend the background
    vertical_padding = -60  # Reduced padding to overlap slightly/connect rooms
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
    y_position = 30
    composite.paste(entrance_scaled, (x_offset, y_position), entrance_scaled)
    print(f"Placed entrance at: ({x_offset}, {y_position})")
    
    # Place normal rooms below, stacked vertically
    y_position = y_position + new_entrance_height + vertical_padding
    
    for i in range(num_normal_rooms):
        room_x_offset = (bg_width - new_room_width) // 2
        composite.paste(normal_room_scaled, (room_x_offset, int(y_position)), normal_room_scaled)
        print(f"Placed normal room {i+1} at: ({room_x_offset}, {int(y_position)})")
        y_position += new_room_height + vertical_padding
    
    # Save the composite image
    output_path = r"d:\Work\ApocalypseNow\Maps\New_maps\bunker_map_composite.png"
    composite.save(output_path)
    print(f"\nComposite map saved to: {output_path}")
    print(f"Final image size: {composite.size}")

if __name__ == "__main__":
    create_bunker_map()
