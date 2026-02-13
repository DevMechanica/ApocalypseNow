from PIL import Image
import glob
import os

def check_padding():
    files = glob.glob("ui_icons/btn_*.png")
    for f in files:
        img = Image.open(f)
        bbox = img.getbbox()
        width, height = img.size
        
        if bbox:
            left, top, right, bottom = bbox
            content_width = right - left
            content_height = bottom - top
            
            h_padding = (left + (width - right)) / width * 100
            v_padding = (top + (height - bottom)) / height * 100
            
            print(f"{os.path.basename(f)}: Size({width}x{height}) Content({content_width}x{content_height}) Padding(H:{h_padding:.1f}%, V:{v_padding:.1f}%)")
        else:
            print(f"{os.path.basename(f)}: Empty image")

if __name__ == "__main__":
    check_padding()
