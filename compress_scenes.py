"""
Convert scene_*.png to scene_*.webp at high quality (95).
Keeps original PNGs in a backup folder.
WebP at quality 95 is visually lossless and typically 60-80% smaller.
"""
from PIL import Image
import os
import shutil

MAP_DIR = 'New_maps'
BACKUP_DIR = 'New_maps/png_originals'
QUALITY = 95

os.makedirs(BACKUP_DIR, exist_ok=True)

for i in range(1, 11):
    png_path = os.path.join(MAP_DIR, f'scene_{i}.png')
    webp_path = os.path.join(MAP_DIR, f'scene_{i}.webp')
    backup_path = os.path.join(BACKUP_DIR, f'scene_{i}.png')

    if not os.path.exists(png_path):
        print(f'SKIP: {png_path} not found')
        continue

    png_size = os.path.getsize(png_path) / (1024 * 1024)
    print(f'Converting {png_path} ({png_size:.1f} MB)...')

    img = Image.open(png_path)
    img.save(webp_path, 'WEBP', quality=QUALITY, method=6)

    webp_size = os.path.getsize(webp_path) / (1024 * 1024)
    ratio = (1 - webp_size / png_size) * 100

    # Backup original
    shutil.copy2(png_path, backup_path)

    print(f'  -> {webp_path} ({webp_size:.1f} MB) — {ratio:.0f}% smaller')

print('\nDone! Originals backed up to:', BACKUP_DIR)
