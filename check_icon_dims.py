import os
from PIL import Image

folder = 'd:/Programming/ApocalypseNow/ui_icons'
files = ['icon_cash.png', 'icon_food.png', 'icon_water.png', 'icon_energy.png', 'icon_materials.png']

print(f"{'File':<20} {'Size':<10} {'BBox':<20} {'Content Height'}")
print("-" * 65)

for f in files:
    path = os.path.join(folder, f)
    if os.path.exists(path):
        img = Image.open(path)
        bbox = img.getbbox()
        if bbox:
            content_width = bbox[2] - bbox[0]
            content_height = bbox[3] - bbox[1]
            print(f"{f:<20} {str(img.size):<10} {str(bbox):<20} {content_height}")
        else:
             print(f"{f:<20} {str(img.size):<10} {'Empty':<20} 0")
    else:
        print(f"{f:<20} Not Found")
