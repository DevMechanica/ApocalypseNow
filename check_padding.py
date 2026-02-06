import sys
from PIL import Image

# Force unbuffered stdout
sys.stdout.reconfigure(line_buffering=True)

anim_path = r"d:\Programming\ApocalypseNow\Objects\Cutscenes\Garden\garden_anim.png"

try:
    img = Image.open(anim_path).convert("RGBA")
    # Crop first frame (921x1080)
    img = img.crop((0, 0, 921, 1080))
    
    bbox = img.getbbox()
    if bbox:
        # bbox is (left, top, right, bottom)
        # Coordinate system: (0,0) is Top-Left.
        # Height is 1080.
        # Bottom padding = Height - bbox[3]
        
        frame_height = 1080
        content_bottom = bbox[3]
        bottom_padding = frame_height - content_bottom
        
        print(f"Frame Height: {frame_height}")
        print(f"Content Bottom: {content_bottom}")
        print(f"Bottom Padding: {bottom_padding}")
        
        # Also check Top Padding for completeness
        print(f"Top Padding: {bbox[1]}")
        
        # And Side Padding (Center check)
        left_pad = bbox[0]
        right_pad = 921 - bbox[2]
        print(f"Side Padding: L={left_pad}, R={right_pad}")
        
    else:
        print("Empty image")

except Exception as e:
    print(e)
