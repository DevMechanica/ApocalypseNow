from PIL import Image
import os
import glob

def check_resolutions(directory="ui_icons"):
    files = sorted(glob.glob(os.path.join(directory, "*.png")))
    print(f"Checking {len(files)} images in {directory}...")
    
    for file in files:
        try:
            img = Image.open(file)
            w, h = img.size
            ratio = w / h if h > 0 else 0
            print(f"{os.path.basename(file)}: {w}x{h} (Aspect: {ratio:.2f})")
        except Exception as e:
            print(f"Error reading {file}: {e}")

if __name__ == "__main__":
    check_resolutions("d:\\Programming\\ApocalypseNow\\ui_icons")
