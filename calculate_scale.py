import os, sys
from PIL import Image

# Force unbuffered stdout
sys.stdout.reconfigure(line_buffering=True)

def get_bbox(path, w=0, h=0):
    try:
        img = Image.open(path).convert("RGBA")
        if w and h: img = img.crop((0,0,w,h))
        return img.size, img.getbbox()
    except: return None, None

ref_path = r"d:\Programming\ApocalypseNow\Objects\Garden\hydroponic_plants_v2.png"
anim_path = r"d:\Programming\ApocalypseNow\Objects\Cutscenes\Garden\garden_anim.png"

# REF
ref_size, ref_bbox = get_bbox(ref_path)
if ref_bbox:
    ref_content_w = ref_bbox[2] - ref_bbox[0]
    ref_ratio = ref_content_w / ref_size[0]
    print(f"REF: {ref_size[0]} {ref_content_w} {ref_ratio:.5f}")

# ANIM
anim_size, anim_bbox = get_bbox(anim_path, 921, 1080)
if anim_bbox:
    anim_content_w = anim_bbox[2] - anim_bbox[0]
    anim_ratio = anim_content_w / anim_size[0]
    print(f"ANIM: {anim_size[0]} {anim_content_w} {anim_ratio:.5f}")

if ref_bbox and anim_bbox:
    factor = ref_ratio / anim_ratio
    print(f"FACTOR: {factor:.5f}")
