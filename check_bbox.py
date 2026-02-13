from PIL import Image
import os

files = ['icon_cash.png', 'icon_energy.png']
base = 'd:/Programming/ApocalypseNow/ui_icons/'

with open('d:/Programming/ApocalypseNow/bbox_analysis.txt', 'w') as out:
    for f in files:
        try:
            img = Image.open(base + f)
            bbox = img.getbbox()
            height = bbox[3] - bbox[1]
            out.write(f'{f}: Size={img.size}, BBox={bbox}, ContentHeight={height}\n')
        except Exception as e:
            out.write(f'{f}: Error {e}\n')
