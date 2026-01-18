# Game Manager - Global Autoload Singleton
# Manages game state, inventory, and progression
extends Node

# =====================================================
# GAME STATE FLAGS
# =====================================================
var key_found: bool = false
var generator_room_unlocked: bool = false
var generator_fixed: bool = false
var zombie_defeated: bool = false
var reactor_core_inserted: bool = false

# Floor system
var current_floor: int = 1
var on_second_floor: bool = false
var on_third_floor: bool = false

# Combat state
var in_combat: bool = false

# Searched objects tracking
var searched_objects: Array[String] = []

# =====================================================
# PLAYER STATS
# =====================================================
var player_health: int = 100
var player_max_health: int = 100
var money: int = 100

# =====================================================
# INVENTORY SYSTEM
# =====================================================
var inventory: Dictionary = {}
# Structure: { "item_name": { "count": int, "icon": String } }

func add_item(item_name: String, count: int = 1, icon: String = "📦") -> void:
	if inventory.has(item_name):
		inventory[item_name]["count"] += count
	else:
		inventory[item_name] = { "count": count, "icon": icon }
	
	print("📦 Added %d x %s to inventory" % [count, item_name])
	item_added.emit(item_name, count, icon)

func remove_item(item_name: String, count: int = 1) -> bool:
	if not has_item(item_name, count):
		return false
	
	inventory[item_name]["count"] -= count
	if inventory[item_name]["count"] <= 0:
		inventory.erase(item_name)
	
	item_removed.emit(item_name, count)
	return true

func has_item(item_name: String, count: int = 1) -> bool:
	if not inventory.has(item_name):
		return false
	return inventory[item_name]["count"] >= count

func get_item_count(item_name: String) -> int:
	if not inventory.has(item_name):
		return 0
	return inventory[item_name]["count"]

# =====================================================
# SIGNALS
# =====================================================
signal item_added(item_name: String, count: int, icon: String)
signal item_removed(item_name: String, count: int)
signal floor_changed(new_floor: int)
signal player_damaged(damage: int, new_health: int)
signal player_died
signal message_shown(text: String)
signal zone_unlocked(zone_name: String)

# =====================================================
# FLOOR MANAGEMENT
# =====================================================
func set_floor(floor_num: int) -> void:
	current_floor = floor_num
	on_second_floor = (floor_num == 2)
	on_third_floor = (floor_num == 3)
	floor_changed.emit(floor_num)
	print("🏢 Changed to floor %d" % floor_num)

func get_floor_y_position() -> float:
	match current_floor:
		1: return 0.57
		2: return 0.563
		3: return 0.795
		_: return 0.57

# =====================================================
# PLAYER HEALTH
# =====================================================
func damage_player(amount: int) -> void:
	player_health = max(0, player_health - amount)
	player_damaged.emit(amount, player_health)
	
	if player_health <= 0:
		player_died.emit()
		print("💀 Player has died!")

func heal_player(amount: int) -> void:
	player_health = min(player_max_health, player_health + amount)

# =====================================================
# MESSAGING
# =====================================================
func show_message(text: String) -> void:
	message_shown.emit(text)
	print("💬 %s" % text)

# =====================================================
# OBJECT SEARCH TRACKING
# =====================================================
func mark_object_searched(object_name: String) -> void:
	if not searched_objects.has(object_name):
		searched_objects.append(object_name)

func is_object_searched(object_name: String) -> bool:
	return searched_objects.has(object_name)

# =====================================================
# GAME PROGRESSION
# =====================================================
func unlock_generator_room() -> void:
	generator_room_unlocked = true
	zone_unlocked.emit("generator_room")
	show_message("🔓 Generator room unlocked!")

func fix_generator() -> void:
	generator_fixed = true
	show_message("⚡ Generator fixed! Level 2 unlocked!")

func insert_reactor_core() -> void:
	if has_item("Reactor Core"):
		remove_item("Reactor Core")
		reactor_core_inserted = true
		show_message("☢️ Reactor core inserted!")

# =====================================================
# SAVE/LOAD (Future implementation)
# =====================================================
func save_game() -> Dictionary:
	return {
		"key_found": key_found,
		"generator_room_unlocked": generator_room_unlocked,
		"generator_fixed": generator_fixed,
		"zombie_defeated": zombie_defeated,
		"reactor_core_inserted": reactor_core_inserted,
		"current_floor": current_floor,
		"player_health": player_health,
		"money": money,
		"inventory": inventory,
		"searched_objects": searched_objects
	}

func load_game(data: Dictionary) -> void:
	key_found = data.get("key_found", false)
	generator_room_unlocked = data.get("generator_room_unlocked", false)
	generator_fixed = data.get("generator_fixed", false)
	zombie_defeated = data.get("zombie_defeated", false)
	reactor_core_inserted = data.get("reactor_core_inserted", false)
	current_floor = data.get("current_floor", 1)
	player_health = data.get("player_health", 100)
	money = data.get("money", 100)
	inventory = data.get("inventory", {})
	searched_objects = data.get("searched_objects", [])

func reset_game() -> void:
	key_found = false
	generator_room_unlocked = false
	generator_fixed = false
	zombie_defeated = false
	reactor_core_inserted = false
	current_floor = 1
	on_second_floor = false
	on_third_floor = false
	in_combat = false
	player_health = player_max_health
	money = 100
	inventory.clear()
	searched_objects.clear()
