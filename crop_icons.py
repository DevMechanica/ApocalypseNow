from PIL import Image
import glob
import os

def crop_images():
    files = glob.glob("ui_icons/btn_*.png")
    print(f"Found {len(files)} images to process.")
    for f in files:
        try:
            img = Image.open(f)
            bbox = img.getbbox()
            if bbox:
                original_size = img.size
                cropped = img.crop(bbox)
                cropped.save(f)
                print(f"Cropped {os.path.basename(f)}: {original_size} -> {cropped.size}")
            else:
                print(f"Skipped {os.path.basename(f)} (empty)")
        except Exception as e:
            print(f"Error processing {f}: {e}")

if __name__ == "__main__":
    crop_images()
