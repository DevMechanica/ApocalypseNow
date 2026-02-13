import os
from PIL import Image
import colorsys

def get_dominant_hue(image_path):
    try:
        img = Image.open(image_path)
        img = img.resize((100, 100))
        img = img.convert('RGBA')
        
        hue_buckets = {
            "Red/Orange": 0, # 0-45, 315-360
            "Yellow": 0,     # 45-90
            "Green": 0,      # 90-150
            "Cyan": 0,       # 150-195
            "Blue": 0,       # 195-255
            "Purple": 0,     # 255-315
            "Pink": 0        # (part of red/purple boundary)
        }
        
        valid_pixels = 0
        
        for r, g, b, a in img.getdata():
            if a < 128: continue # Skip transparent
            
            # Normalize 0-1
            r_n, g_n, b_n = r/255.0, g/255.0, b/255.0
            h, s, v = colorsys.rgb_to_hsv(r_n, g_n, b_n)
            
            # Skip low saturation (grey/white/black)
            if s < 0.15: continue
            # Skip very dark
            if v < 0.2: continue
            
            h_deg = h * 360
            
            if 330 <= h_deg or h_deg < 45:
                hue_buckets["Red/Orange"] += 1
            elif 45 <= h_deg < 80: # Narrower yellow window
                hue_buckets["Yellow"] += 1
            elif 80 <= h_deg < 160:
                hue_buckets["Green"] += 1
            elif 160 <= h_deg < 200:
                hue_buckets["Cyan"] += 1
            elif 200 <= h_deg < 260:
                hue_buckets["Blue"] += 1
            elif 260 <= h_deg < 330:
                hue_buckets["Purple"] += 1
                
            valid_pixels += 1

        if valid_pixels == 0:
            return "Grey/White", 0
            
        best_bucket = max(hue_buckets, key=hue_buckets.get)
        confidence = hue_buckets[best_bucket] / valid_pixels
        
        return best_bucket, confidence

    except Exception as e:
        return f"Error: {e}", 0

files = [
    "Removal-279.png",
    "Removal-913.png",
    "06508040-6bbb-4dc7-8382-78993f04ef3a_removalai_preview.png",
    "3c1eaa1c-03d1-4e95-b28f-d6b28fb84dd6_removalai_preview.png",
    "998c8cbb-17a3-488b-b6cf-b4eddbdb80e1_removalai_preview.png"
]

# Mapping based on hue
# Caps -> Green
# Food -> Red/Orange
# Water -> Blue/Cyan
# Energy -> Yellow
# Materials -> Purple

print(f"{'File':<60} | {'Detected Hue':<15} | {'Confidence'}")
print("-" * 100)

with open("icon_map.txt", "w", encoding="utf-8") as out:
    out.write(f"{'File':<60} | {'Detected Hue':<15} | {'Confidence'}\n")
    out.write("-" * 100 + "\n")
    
    for f in files:
        if os.path.exists(f):
            hue, conf = get_dominant_hue(f)
            line = f"{f:<60} | {hue:<15} | {conf:.2f}\n"
            print(line.strip())
            out.write(line)
        else:
            print(f"{f:<60} | NOT FOUND")
