"""
Video to Sprite Sheet Converter with Chroma Key
Extracts frames from video, removes white background, creates a sprite sheet.
This allows the garden animation to work with proper transparency in Phaser.
"""

import imageio.v3 as iio
import numpy as np
from PIL import Image
import os
import sys
import math

def remove_white_background(frame, threshold=230):
    """
    Remove white/near-white pixels from a frame using advanced detection.
    Returns RGBA image with transparent background.
    """
    # Convert to PIL Image
    img = Image.fromarray(frame)
    img = img.convert('RGBA')
    data = np.array(img).astype(np.float32)
    
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    
    # Method 1: High threshold for pure white
    pure_white_mask = (r > threshold) & (g > threshold) & (b > threshold)
    
    # Method 2: Luminance-based detection for near-white
    luminance = 0.299 * r + 0.587 * g + 0.114 * b
    bright_mask = luminance > (threshold - 10)
    
    # Method 3: Color variance - white pixels have low variance between channels
    mean_color = (r + g + b) / 3
    variance = np.abs(r - mean_color) + np.abs(g - mean_color) + np.abs(b - mean_color)
    low_variance_mask = variance < 15  # Low color variance
    
    # Combine: Remove pixels that are bright AND have low color variance
    white_mask = pure_white_mask | (bright_mask & low_variance_mask)
    
    # Method 4: Partial transparency for edge pixels (near-white)
    edge_luminance_mask = (luminance > (threshold - 30)) & (luminance <= threshold)
    edge_mask = edge_luminance_mask & low_variance_mask & ~white_mask
    
    # Apply full transparency to white pixels
    data[white_mask, 3] = 0
    
    # Apply partial transparency to edge pixels (fade them out)
    if np.any(edge_mask):
        fade_factor = (threshold - luminance[edge_mask]) / 30.0
        data[edge_mask, 3] = data[edge_mask, 3] * np.clip(fade_factor, 0, 1)
    
    return Image.fromarray(data.astype(np.uint8))

def video_to_spritesheet(input_path, output_path=None, frame_skip=2, max_frames=30, cols=8, threshold=230):
    """
    Convert video to sprite sheet with transparent background.
    
    Args:
        input_path: Path to input video
        output_path: Path to output sprite sheet PNG
        frame_skip: Skip every N frames (reduces sprite sheet size)
        max_frames: Maximum frames to extract
        threshold: White detection threshold (0-255)
    """
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return None
    
    if output_path is None:
        base, _ = os.path.splitext(input_path)
        output_path = f"{base}_spritesheet.png"
    
    print(f"Reading video: {input_path}")
    
    try:
        # Read all frames
        frames = iio.imread(input_path, plugin='pyav')
    except Exception as e:
        print(f"Error reading video: {e}")
        print("Trying fallback reader...")
        try:
            frames = list(iio.imiter(input_path))
        except Exception as e2:
            print(f"Fallback also failed: {e2}")
            return None
    
    total_frames = len(frames)
    print(f"Total frames in video: {total_frames}")
    
    # Sample frames
    frame_indices = list(range(0, total_frames, frame_skip))[:max_frames]
    print(f"Extracting {len(frame_indices)} frames...")
    
    # Calculate crop dimensions
    # Crop 26% from left and right to remove more black bars/width
    # Target is to get closer to the subject
    
    # Read first frame to get dimensions
    first_frame = frames[0]
    height, width = first_frame.shape[:2]
    crop_x = int(width * 0.26)
    crop_w = int(width * 0.48)
    print(f"Cropping frames: x={crop_x}, w={crop_w} (Original: {width}x{height})")
    
    processed_frames = []
    for i, idx in enumerate(frame_indices):
        frame = frames[idx]
        
        # Crop frame
        # Array slicing: [y:y+h, x:x+w]
        cropped_frame = frame[:, crop_x:crop_x+crop_w]
        
        # Remove white background
        processed = remove_white_background(cropped_frame, threshold)
        processed_frames.append(processed)
        
        if (i + 1) % 10 == 0:
            print(f"  Processed {i + 1}/{len(frame_indices)} frames")
    
    if not processed_frames:
        print("No frames extracted!")
        return None
    
    # Calculate sprite sheet dimensions
    frame_w, frame_h = processed_frames[0].size
    num_frames = len(processed_frames)
    
    # Arrange in a grid (prefer more columns than rows for horizontal scrolling)
    # With cropped frames (narrower), we might fit more per row, but keeping 8 max is fine
    cols = min(num_frames, 8)  # Max 8 columns
    rows = math.ceil(num_frames / cols)
    
    print(f"Creating sprite sheet: {cols}x{rows} grid, {frame_w}x{frame_h} per frame")
    
    # Create sprite sheet
    sheet_w = cols * frame_w
    sheet_h = rows * frame_h
    spritesheet = Image.new('RGBA', (sheet_w, sheet_h), (0, 0, 0, 0))
    
    for i, frame in enumerate(processed_frames):
        col = i % cols
        row = i // cols
        x = col * frame_w
        y = row * frame_h
        spritesheet.paste(frame, (x, y))
    
    # Save
    spritesheet.save(output_path, 'PNG')
    print(f"Sprite sheet saved: {output_path}")
    print(f"Dimensions: {sheet_w}x{sheet_h}")
    print(f"Frame size: {frame_w}x{frame_h}")
    print(f"Frames: {num_frames}")
    print(f"Columns: {cols}, Rows: {rows}")
    
    # Create metadata JSON for Phaser
    meta_path = output_path.replace('.png', '_meta.json')
    import json
    meta = {
        "frameWidth": frame_w,
        "frameHeight": frame_h,
        "totalFrames": num_frames,
        "columns": cols,
        "rows": rows,
        "fps": 12  # Suggested playback FPS
    }
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"Metadata saved: {meta_path}")
    
    return output_path

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Default: Garden video
    garden_video = os.path.join(script_dir, "Objects", "Cutscenes", "Garden", "download (31).mp4")
    garden_output = os.path.join(script_dir, "Objects", "Cutscenes", "Garden", "garden_anim.png")
    
    if len(sys.argv) > 1:
        garden_video = sys.argv[1]
    
    if os.path.exists(garden_video):
        print("="*60)
        print("Converting Garden Video to Sprite Sheet")
        print("="*60)

        result = video_to_spritesheet(
            garden_video,
            output_path=garden_output,
            frame_skip=3,  # Every 3rd frame
            max_frames=100,  # Increased to capture full loop
            threshold=250   # Higher threshold to remove artifacts
        )
        
        if result:
            print("\n" + "="*60)
            print("SUCCESS! To use in Phaser:")
            print("="*60)
            print("""
1. In preload():
   this.load.spritesheet('garden_anim', 'Objects/Cutscenes/Garden/download (31)_spritesheet.png', {
       frameWidth: <frameWidth from meta>,
       frameHeight: <frameHeight from meta>
   });

2. In create():
   this.anims.create({
       key: 'garden_loop',
       frames: this.anims.generateFrameNumbers('garden_anim', { start: 0, end: <totalFrames-1> }),
       frameRate: 12,
       repeat: -1
   });
   
   const garden = this.add.sprite(x, y, 'garden_anim');
   garden.play('garden_loop');
""")
    else:
        print(f"Video not found: {garden_video}")
        print("Usage: python video_to_spritesheet.py [path_to_video]")

if __name__ == "__main__":
    main()
