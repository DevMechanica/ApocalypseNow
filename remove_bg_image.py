
import sys
import os
import numpy as np
from PIL import Image

def remove_white_background(input_path, output_path, threshold=230):
    """
    Remove white/near-white pixels from an image.
    """
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False

    print(f"Processing: {input_path}")
    
    try:
        img = Image.open(input_path).convert("RGBA")
        data = np.array(img).astype(np.float32)
        
        r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
        
        # Method: Luminance-based detection for near-white
        # White is (255,255,255). We want to remove pixels close to this.
        
        # Calculate distance from white
        # dist = sqrt((r-255)^2 + (g-255)^2 + (b-255)^2)
        # But simple thresholding on checks is often enough and faster
        
        # Mask for pixels brighter than threshold in all channels
        white_mask = (r > threshold) & (g > threshold) & (b > threshold)
        
        # Apply transparency
        data[white_mask, 3] = 0
        
        # Optional: Soft edge (anti-aliasing for edges)
        # Pixels slightly below threshold make semi-transparent
        edge_threshold = threshold - 20
        edge_mask = (r > edge_threshold) & (g > edge_threshold) & (b > edge_threshold) & (~white_mask)
        
        if np.any(edge_mask):
             # Linear fade opacity based on brightness
             # Brightness approx average of channels
             brightness = (r[edge_mask] + g[edge_mask] + b[edge_mask]) / 3
             alpha_factor = (255 - brightness) / (255 - edge_threshold)
             # Clamp
             alpha_factor = np.clip(alpha_factor, 0, 1)
             data[edge_mask, 3] = data[edge_mask, 3] * alpha_factor

        # Save
        result = Image.fromarray(data.astype(np.uint8))
        result.save(output_path, "PNG")
        print(f"Success! Saved to: {output_path}")
        return True
        
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_bg_image.py <input_file> [output_file]")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not output_file:
        base, ext = os.path.splitext(input_file)
        output_file = f"{base}_transparent.png"
        
    remove_white_background(input_file, output_file)
