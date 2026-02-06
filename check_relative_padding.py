import sys
from PIL import Image
sys.stdout.reconfigure(line_buffering=True)

try:
    ref = Image.open(r"d:\Programming\ApocalypseNow\Objects\Garden\hydroponic_plants_v2.png").convert("RGBA")
    anim = Image.open(r"d:\Programming\ApocalypseNow\Objects\Cutscenes\Garden\garden_anim.png").convert("RGBA").crop((0,0,921,1080))

    ref_box = ref.getbbox()
    anim_box = anim.getbbox()

    ref_pad = ref.size[1] - ref_box[3]
    anim_pad = anim.size[1] - anim_box[3]

    print(f"REF_PAD:{ref_pad}")
    print(f"ANIM_PAD:{anim_pad}")
    print(f"DIFF:{anim_pad - ref_pad}")
    
    # Centers
    ref_c = (ref_box[0] + ref_box[2])/2 - ref.size[0]/2
    anim_c = (anim_box[0] + anim_box[2])/2 - anim.size[0]/2
    print(f"REF_C:{ref_c}")
    print(f"ANIM_C:{anim_c}")
    print(f"C_DIFF:{ref_c - anim_c}")

except Exception as e:
    print(e)
