from PIL import Image
import os

folder = 'd:/Programming/ApocalypseNow/ui_icons'
files = ['icon_cash.png', 'icon_food.png', 'icon_water.png', 'icon_energy.png', 'icon_materials.png']

for f in files:
    try:
        img = Image.open(os.path.join(folder, f))
        print(f"{f}: {img.size[0]}x{img.size[1]}")
    except:
        print(f"{f}: ERROR")
