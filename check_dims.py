from PIL import Image
import os

def get_dims(path):
    try:
        img = Image.open(path)
        return img.size
    except Exception as e:
        return None

base = r"c:\Projects\ApocalypseNow\New_maps"
files = [
    "bunker_map_composite.png",
    "Gemini_Generated_Image_d0xhhqd0xhhqd0xh.png", # Bg
    "Gemini_Generated_Image_q4a9qjq4a9qjq4a9.png", # Entrance
    "Gemini_Generated_Image_9allzy9allzy9all.png"  # Room
]

for f in files:
    full_path = os.path.join(base, f)
    dims = get_dims(full_path)
    print(f"{f}: {dims}")
