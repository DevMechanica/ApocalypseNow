# Interactive Zone Script
# Handles all interactable objects in the game
extends Area2D

# Zone configuration
@export var zone_name: String = "unnamed"
@export_enum("door", "chest", "searchable", "generator", "reactor", "bed", "shelf", "lantern") var zone_type: String = "searchable"
@export var action_text: String = "Interact"
@export var icon: String = "📦"
@export var floor_number: int = 1

# Requirements
@export var requires_key: bool = false
@export var requires_zombie_defeated: bool = false
@export var requires_unlock: bool = false

# Messages
@export_multiline var locked_message: String = "🔒 This is locked."
@export_multiline var search_message: String = "You searched this object."
@export_multiline var unlock_message: String = "🔓 Unlocked!"

# Special properties
@export var has_key: bool = false
var loot: Array = []  # Changed from Array[Dictionary] to plain Array

# Visual (optional custom image)
@export var custom_image: Texture2D
@export var image_width: float = 100.0
@export var image_height: float = 100.0

# State
var is_searched: bool = false
var is_unlocked: bool = false
var player_in_zone: bool = false

# Signals
signal zone_entered(zone: Area2D)
signal zone_exited(zone: Area2D)
signal zone_interacted(zone: Area2D)

func _ready() -> void:
	# Connect area signals
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	
	# Set up visual if custom image provided
	if custom_image:
		var sprite = Sprite2D.new()
		sprite.texture = custom_image
		sprite.scale = Vector2(image_width / custom_image.get_width(), image_height / custom_image.get_height())
		add_child(sprite)
	
	# Check if already searched (from saved state)
	var gm = get_node_or_null("/root/GameManager")
	if gm and gm.has_method("is_object_searched"):
		is_searched = gm.is_object_searched(zone_name)

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		player_in_zone = true
		zone_entered.emit(self)

func _on_body_exited(body: Node2D) -> void:
	if body.is_in_group("player"):
		player_in_zone = false
		zone_exited.emit(self)

# =====================================================
# INTERACTION HANDLING
# =====================================================
func interact() -> void:
	match zone_type:
		"door":
			_interact_door()
		"chest":
			_interact_chest()
		"searchable":
			_interact_searchable()
		"generator":
			_interact_generator()
		"reactor":
			_interact_reactor()
		"bed":
			_interact_bed()
		"shelf":
			_interact_shelf()
		"lantern":
			_interact_lantern()
	
	zone_interacted.emit(self)

func can_interact() -> bool:
	var gm = get_node_or_null("/root/GameManager")
	if gm == null:
		return true
	
	# Check floor
	if floor_number != gm.current_floor:
		return false
	
	# Check requirements
	if requires_key and not gm.key_found:
		return false
	
	if requires_zombie_defeated and not gm.zombie_defeated:
		return false
	
	if requires_unlock and not gm.generator_room_unlocked:
		return false
	
	return true

func get_action_text() -> String:
	return action_text

func get_icon() -> String:
	return icon

# =====================================================
# SPECIFIC INTERACTIONS
# =====================================================
func _interact_door() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if gm == null:
		return
	
	if not gm.key_found:
		gm.show_message(locked_message)
		return
	
	gm.unlock_generator_room()
	gm.show_message(unlock_message)
	is_unlocked = true

func _interact_chest() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if gm == null:
		return
	
	if requires_zombie_defeated and not gm.zombie_defeated:
		gm.show_message("💀 The zombie is guarding this chest! Defeat it first.")
		return
	
	if is_searched:
		gm.show_message("📦 This chest is empty.")
		return
	
	# Open loot UI
	is_searched = true
	gm.mark_object_searched(zone_name)
	gm.show_message(search_message)
	
	# Emit signal for loot UI to handle
	print("📦 Chest opened with loot: %s" % [loot])

func _interact_searchable() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if gm == null:
		return
	
	if is_searched:
		gm.show_message("You already searched this.")
		return
	
	is_searched = true
	gm.mark_object_searched(zone_name)
	gm.show_message(search_message)
	
	# Grant key if this object has one
	if has_key:
		gm.key_found = true
		gm.show_message("🔑 You found a rusty key!")

func _interact_generator() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if gm == null:
		return
	
	if not gm.generator_room_unlocked:
		gm.show_message("🚪 You need to unlock the door first.")
		return
	
	if gm.generator_fixed:
		gm.show_message("⚡ The generator is already working.")
		return
	
	# Start generator puzzle
	gm.show_message("⚙️ The generator is broken. You need to fix it!")
	print("⚡ Starting generator puzzle...")

func _interact_reactor() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if gm == null:
		return
	
	if not gm.has_item("Reactor Core"):
		gm.show_message("⚠️ The reactor needs a core to function. Find one!")
		return
	
	gm.insert_reactor_core()

func _interact_bed() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if gm:
		gm.show_message("🛏️ You feel tired... Time to rest.")

func _interact_shelf() -> void:
	_interact_searchable()

func _interact_lantern() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if gm == null:
		return
	
	if is_searched:
		gm.show_message("🏮 Just an old lantern...")
		return
	
	is_searched = true
	gm.mark_object_searched(zone_name)
	gm.show_message("🏮 An old oil lantern. It flickers warmly but nothing useful here...")
