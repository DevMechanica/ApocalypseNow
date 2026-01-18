# Main Game Script
# Orchestrates all game systems and entities
extends Node2D

# Scene references
@onready var map_background: Sprite2D = $MapBackground
@onready var player: CharacterBody2D = $Player
@onready var camera: Camera2D = $Camera2D
@onready var hud: CanvasLayer = $HUD
@onready var interactive_zones: Node2D = $InteractiveZones
@onready var enemies: Node2D = $Enemies

# Map dimensions
var map_aspect: float = 9.0 / 16.0
var map_x_min: float = 304.0
var map_x_max: float = 427.0

# Current active zone
var current_zone: Area2D = null

# Debug mode
var debug_mode: bool = false

func _ready() -> void:
	# Setup map background
	_setup_map()
	
	# Setup player starting position
	_setup_player()
	
	# Setup interactive zones
	_setup_interactive_zones()
	
	# Setup enemies (only on floor 2)
	_setup_enemies()
	
	# Connect player signals
	player.arrived_at_target.connect(_on_player_arrived)
	
	print("🎮 Game started!")

func _process(_delta: float) -> void:
	# Update camera to follow player within map bounds
	_update_camera()

func _input(event: InputEvent) -> void:
	# Toggle debug mode with D key
	if event.is_action_pressed("debug"):
		debug_mode = !debug_mode
		print("🔧 Debug mode: %s" % debug_mode)
		queue_redraw()
	
	# Handle punch with click on enemy
	if event.is_action_pressed("click"):
		_handle_click(get_global_mouse_position())

# =====================================================
# SETUP
# =====================================================
func _setup_map() -> void:
	# Calculate map display size (9:16 aspect ratio, full height)
	var viewport_size = get_viewport_rect().size
	var draw_height = viewport_size.y
	var draw_width = draw_height * map_aspect
	var offset_x = (viewport_size.x - draw_width) / 2.0
	
	# Position and scale map background if texture is loaded
	if map_background and map_background.texture:
		var tex_size = map_background.texture.get_size()
		map_background.scale = Vector2(draw_width / tex_size.x, draw_height / tex_size.y)
		map_background.position = Vector2(offset_x + draw_width / 2.0, draw_height / 2.0)

func _setup_player() -> void:
	# Place player at center of map, on floor 1
	var viewport_size = get_viewport_rect().size
	var draw_height = viewport_size.y
	var draw_width = draw_height * map_aspect
	var offset_x = (viewport_size.x - draw_width) / 2.0
	
	var start_x = offset_x + draw_width * 0.5  # Center of map
	var start_y = viewport_size.y * GameManager.get_floor_y_position()
	
	player.global_position = Vector2(start_x, start_y)

func _setup_interactive_zones() -> void:
	# Create interactive zones based on configuration
	# These would ideally be placed in the editor or loaded from data
	
	# Door zone
	var door = _create_zone("door", "door", "🚪", "Unlock Door", 358, 360, 1)
	door.requires_key = true
	door.locked_message = "🔒 The door is locked. You need a key..."
	door.unlock_message = "🔓 You unlocked the door! The room is revealed..."
	
	# Shelf zone (has key)
	var shelf = _create_zone("shelf", "searchable", "📦", "Search Shelf", 380, 384, 1)
	shelf.has_key = true
	shelf.search_message = "🔑 You found a rusty key hidden behind old books!"
	
	# Bed zone
	var bed = _create_zone("bed", "bed", "🛏️", "Go to Sleep", 362, 376, 1)
	
	# Lantern zone
	var lantern = _create_zone("lantern", "lantern", "🏮", "Search Lantern", 350, 352, 1)
	lantern.search_message = "🏮 An old oil lantern. It flickers warmly but nothing useful here..."
	
	# Generator zone
	var generator = _create_zone("generator", "generator", "⚡", "Fix Generator", 344, 348, 1)
	generator.requires_unlock = true
	
	# Chest zone (floor 2)
	var chest = _create_zone("chest", "chest", "📦", "Open Chest", 346, 350, 2)
	chest.requires_zombie_defeated = true
	chest.locked_message = "💀 The zombie is guarding this chest! Defeat it first."
	chest.loot = [
		{"icon": "🥫", "name": "Canned Food", "count": 1},
		{"icon": "🔩", "name": "Screws", "count": 2},
		{"icon": "⚛️", "name": "Reactor Core", "count": 1}
	]
	
	# Reactor zone (floor 2)
	var reactor = _create_zone("reactor", "reactor", "☢️", "Insert Reactor Core", 370, 380, 2)

func _create_zone(zone_name: String, zone_type: String, icon: String, action: String, x_min_map: float, x_max_map: float, floor_num: int) -> Area2D:
	var zone_scene = preload("res://scenes/game/interactive_zone.tscn")
	var zone = zone_scene.instantiate()
	
	zone.zone_name = zone_name
	zone.zone_type = zone_type
	zone.icon = icon
	zone.action_text = action
	zone.floor_number = floor_num
	
	# Calculate screen position from map coordinates
	var viewport_size = get_viewport_rect().size
	var draw_height = viewport_size.y
	var draw_width = draw_height * map_aspect
	var offset_x = (viewport_size.x - draw_width) / 2.0
	
	var center_map_x = (x_min_map + x_max_map) / 2.0
	var percent = (center_map_x - map_x_min) / (map_x_max - map_x_min)
	var screen_x = offset_x + percent * draw_width
	
	var floor_y_percent = 0.57
	if floor_num == 2:
		floor_y_percent = 0.563
	elif floor_num == 3:
		floor_y_percent = 0.795
	
	zone.global_position = Vector2(screen_x, viewport_size.y * floor_y_percent)
	
	# Connect zone signals
	zone.zone_entered.connect(_on_zone_entered)
	zone.zone_exited.connect(_on_zone_exited)
	zone.zone_interacted.connect(_on_zone_interacted)
	
	interactive_zones.add_child(zone)
	
	# Hide zones on other floors
	zone.visible = (floor_num == GameManager.current_floor)
	
	return zone

func _setup_enemies() -> void:
	# Create zombie on floor 2
	var enemy_scene = preload("res://scenes/game/enemy.tscn")
	var zombie = enemy_scene.instantiate()
	
	# Calculate position
	var viewport_size = get_viewport_rect().size
	var draw_height = viewport_size.y
	var draw_width = draw_height * map_aspect
	var offset_x = (viewport_size.x - draw_width) / 2.0
	
	# Place zombie in center of floor 2
	var zombie_x = offset_x + draw_width * 0.5
	var zombie_y = viewport_size.y * 0.563  # Floor 2 Y
	
	zombie.global_position = Vector2(zombie_x, zombie_y)
	zombie.set_roam_bounds(offset_x + 50, offset_x + draw_width - 50)
	
	enemies.add_child(zombie)
	
	# Hide zombie initially (only visible on floor 2)
	zombie.visible = (GameManager.current_floor == 2)
	
	# Connect zombie signals
	zombie.died.connect(_on_zombie_died)

# =====================================================
# CAMERA
# =====================================================
func _update_camera() -> void:
	if camera and player:
		# Simple follow - could add smoothing later
		camera.global_position = player.global_position

# =====================================================
# INPUT HANDLING
# =====================================================
func _handle_click(click_pos: Vector2) -> void:
	# Check if clicking on an enemy
	var clicked_enemies = _get_enemies_at_position(click_pos)
	if clicked_enemies.size() > 0 and _is_player_close_to(clicked_enemies[0]):
		# Determine punch direction
		var dir = "right" if clicked_enemies[0].global_position.x > player.global_position.x else "left"
		player.punch(dir)

func _get_enemies_at_position(pos: Vector2) -> Array:
	var result = []
	for enemy in enemies.get_children():
		var distance = enemy.global_position.distance_to(pos)
		if distance < 50:
			result.append(enemy)
	return result

func _is_player_close_to(target: Node2D) -> bool:
	return player.global_position.distance_to(target.global_position) < 100

# =====================================================
# ZONE SIGNALS
# =====================================================
func _on_zone_entered(zone: Area2D) -> void:
	current_zone = zone
	if zone.can_interact():
		hud.show_action_button(zone)

func _on_zone_exited(zone: Area2D) -> void:
	if current_zone == zone:
		current_zone = null
		hud.hide_action_button()

func _on_zone_interacted(zone: Area2D) -> void:
	print("🎯 Interacted with zone: %s" % zone.zone_name)
	
	# Handle chest loot specifically
	if zone.zone_type == "chest" and zone.loot.size() > 0:
		_show_loot_ui(zone.loot)

func _on_player_arrived() -> void:
	# Check if player arrived at a zone
	if current_zone and current_zone.player_in_zone:
		if current_zone.can_interact():
			hud.show_action_button(current_zone)

func _on_zombie_died() -> void:
	# Check if chest is now accessible
	pass

# =====================================================
# LOOT UI
# =====================================================
func _show_loot_ui(loot: Array) -> void:
	# For now, just add items directly
	for item in loot:
		GameManager.add_item(item["name"], item["count"], item["icon"])
	
	GameManager.show_message("📦 Collected all items!")

# =====================================================
# FLOOR TRANSITIONS
# =====================================================
func change_floor(new_floor: int) -> void:
	GameManager.set_floor(new_floor)
	
	# Update zone visibility
	for zone in interactive_zones.get_children():
		zone.visible = (zone.floor_number == new_floor)
	
	# Update enemy visibility
	for enemy in enemies.get_children():
		enemy.visible = (new_floor == 2)  # Zombie only on floor 2

# =====================================================
# DEBUG DRAWING
# =====================================================
func _draw() -> void:
	if not debug_mode:
		return
	
	# Draw map bounds
	var viewport_size = get_viewport_rect().size
	var draw_height = viewport_size.y
	var draw_width = draw_height * map_aspect
	var offset_x = (viewport_size.x - draw_width) / 2.0
	
	# Map outline
	draw_rect(Rect2(offset_x, 0, draw_width, draw_height), Color.GREEN, false, 2.0)
	
	# Floor lines
	for floor_num in [1, 2, 3]:
		var y_percent = [0.57, 0.563, 0.795][floor_num - 1]
		var y = viewport_size.y * y_percent
		draw_line(Vector2(offset_x, y), Vector2(offset_x + draw_width, y), Color.YELLOW, 1.0)
		draw_string(ThemeDB.fallback_font, Vector2(offset_x + 5, y - 5), "Floor %d" % floor_num, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color.YELLOW)
