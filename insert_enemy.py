import sys

# Read the game.js file
with open('d:/Work/ApocalypseNow/game.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Read the Enemy class
with open('d:/Work/ApocalypseNow/enemy_class_temp.js', 'r', encoding='utf-8') as f:
    enemy_class = f.read()

# Find the line with "// Character Class with Directional Animations"
insert_index = None
for i, line in enumerate(lines):
    if '// Character Class with Directional Animations' in line:
        insert_index = i
        break

if insert_index is None:
    print("Could not find Character class marker")
    sys.exit(1)

# Insert the Enemy class before the Character class
lines.insert(insert_index, enemy_class + '\n')

# Write back
with open('d:/Work/ApocalypseNow/game.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Enemy class inserted at line {insert_index}")
