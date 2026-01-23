from PIL import Image
import os

def split_icons():
    base_dir = r"C:\Users\boyan.iliev\.gemini\antigravity\brain\d0a3be16-dc5a-4276-8a26-a3e49aebb2d6"
    output_dir = r"d:\Work\ApoNow2\ui_icons"
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # File paths
    resource_sheet = os.path.join(base_dir, "hud_resource_icons_1769189876958.png")
    action_sheet = os.path.join(base_dir, "hud_action_icons_1769189904725.png")

    def process_sheet(path, names):
        try:
            img = Image.open(path).convert("RGBA")
            width, height = img.size
            cell_w = width // 2
            cell_h = height // 2
            
            # 2x2 grid
            coords = [
                (0, 0, cell_w, cell_h),          # Top-Left
                (cell_w, 0, width, cell_h),      # Top-Right
                (0, cell_h, cell_w, height),     # Bottom-Left
                (cell_w, cell_h, width, height)  # Bottom-Right
            ]
            
            for i, name in enumerate(names):
                if i >= len(coords): break
                box = coords[i]
                icon = img.crop(box)
                
                # Trim black borders/background roughly? 
                # Ideally we want to make black transparent.
                # Let's do a simple black removal
                data = icon.getdata()
                new_data = []
                for item in data:
                    # If pixel is very dark, make transparent
                    if item[0] < 30 and item[1] < 30 and item[2] < 30:
                        new_data.append((0, 0, 0, 0))
                    else:
                        new_data.append(item)
                icon.putdata(new_data)
                
                # Auto-crop to content
                bbox = icon.getbbox()
                if bbox:
                    icon = icon.crop(bbox)
                
                save_path = os.path.join(output_dir, f"{name}.png")
                icon.save(save_path)
                print(f"Saved {save_path}")
                
        except Exception as e:
            print(f"Error processing {path}: {e}")

    # Resource names (TL, TR, BL, BR based on image usually)
    # Image 1: Coin(TL), Bread(TR), Wheat(BL), Energy(BR)
    process_sheet(resource_sheet, ["icon_cash", "icon_food", "icon_wheat", "icon_energy"])
    
    # Image 2: Hammer(TL), Pause(TR), Settings(BL), Map(BR)
    # Actually checking the generated image 2: Hammer(TL), Pause(TR), Settings(BL), Map(BR) seems likely
    process_sheet(action_sheet, ["icon_build", "icon_pause", "icon_settings", "icon_map"])

if __name__ == "__main__":
    split_icons()
