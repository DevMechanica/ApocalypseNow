# Player Character Script
# Handles click-to-move, animations, and combat
extends CharacterBody2D

# Movement settings
@export var speed: float = 200.0
@export var character_size: float = 48.0

# Node references
@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var collision_shape: CollisionShape2D = $CollisionShape2D
@onready var interaction_area: Area2D = $InteractionArea

# State
var target_position: Vector2
var is_moving: bool = false
var direction: String = "front"  # front, left, right
var is_punching: bool = false
var punch_duration: float = 0.3
var punch_timer: float = 0.0
var is_visible_character: bool = true

# Movement constraints (map coordinates)
var map_x_min: float = 304.0
var map_x_max: float = 427.0

# Signals
signal arrived_at_target
signal started_moving
signal punched(direction: String)

func _ready() -> void:
	target_position = global_position
	
	# Connect to game manager signals
	GameManager.floor_changed.connect(_on_floor_changed)

func _physics_process(delta: float) -> void:
	# Handle punch timer
	if is_punching:
		punch_timer += delta
		if punch_timer >= punch_duration:
			is_punching = false
			punch_timer = 0.0
		return  # Don't move while punching
	
	if is_moving:
		_move_toward_target(delta)
		_update_animation()

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("click"):
		var click_pos = get_global_mouse_position()
		set_target(click_pos)

# =====================================================
# MOVEMENT
# =====================================================
func set_target(pos: Vector2) -> void:
	# Constrain to movement bounds
	target_position = _constrain_position(pos)
	is_moving = true
	_update_direction()
	started_moving.emit()
	print("🚶 Moving to: %s" % target_position)

func _move_toward_target(delta: float) -> void:
	var direction_vector = target_position - global_position
	var distance = direction_vector.length()
	
	if distance < 5.0:
		# Arrived at destination
		global_position = target_position
		is_moving = false
		direction = "front"
		_play_idle_animation()
		arrived_at_target.emit()
		return
	
	# Move toward target
	var move_distance = speed * delta
	var ratio = min(move_distance / distance, 1.0)
	global_position += direction_vector * ratio

func _constrain_position(pos: Vector2) -> Vector2:
	var constrained = pos
	
	# Get current floor Y position
	var floor_y = _get_floor_y()
	constrained.y = floor_y
	
	# Constrain X to map bounds (convert from screen to map coords)
	var screen_min_x = _map_to_screen_x(map_x_min)
	var screen_max_x = _map_to_screen_x(map_x_max)
	
	# Account for generator room lock
	if not GameManager.generator_room_unlocked:
		screen_min_x = _map_to_screen_x(358.0)  # Door position
	
	constrained.x = clamp(constrained.x, screen_min_x, screen_max_x)
	
	return constrained

func _get_floor_y() -> float:
	var viewport_height = get_viewport_rect().size.y
	return viewport_height * GameManager.get_floor_y_position()

func _map_to_screen_x(map_x: float) -> float:
	var viewport_size = get_viewport_rect().size
	var map_aspect = 9.0 / 16.0
	var draw_height = viewport_size.y
	var draw_width = draw_height * map_aspect
	var offset_x = (viewport_size.x - draw_width) / 2.0
	
	var map_range = map_x_max - map_x_min
	var percent = (map_x - map_x_min) / map_range
	return offset_x + percent * draw_width

func _screen_to_map_x(screen_x: float) -> float:
	var viewport_size = get_viewport_rect().size
	var map_aspect = 9.0 / 16.0
	var draw_height = viewport_size.y
	var draw_width = draw_height * map_aspect
	var offset_x = (viewport_size.x - draw_width) / 2.0
	
	var map_range = map_x_max - map_x_min
	var percent = (screen_x - offset_x) / draw_width
	return map_x_min + percent * map_range

# =====================================================
# DIRECTION & ANIMATION
# =====================================================
func _update_direction() -> void:
	var dx = target_position.x - global_position.x
	var dy = target_position.y - global_position.y
	
	if abs(dx) > abs(dy):
		# Moving more horizontally
		if dx < 0:
			direction = "left"
		else:
			direction = "right"
	else:
		direction = "front"
	
	_play_walk_animation()

func _update_animation() -> void:
	if animated_sprite == null:
		return
	
	# Play appropriate animation based on direction
	match direction:
		"left":
			if animated_sprite.sprite_frames.has_animation("walk_left"):
				animated_sprite.play("walk_left")
			elif animated_sprite.sprite_frames.has_animation("walk_side"):
				animated_sprite.flip_h = true
				animated_sprite.play("walk_side")
		"right":
			if animated_sprite.sprite_frames.has_animation("walk_right"):
				animated_sprite.play("walk_right")
			elif animated_sprite.sprite_frames.has_animation("walk_side"):
				animated_sprite.flip_h = false
				animated_sprite.play("walk_side")
		"front":
			if animated_sprite.sprite_frames.has_animation("walk_front"):
				animated_sprite.play("walk_front")
			else:
				animated_sprite.play("idle")

func _play_walk_animation() -> void:
	_update_animation()

func _play_idle_animation() -> void:
	if animated_sprite and animated_sprite.sprite_frames.has_animation("idle"):
		animated_sprite.play("idle")
		animated_sprite.flip_h = false

# =====================================================
# COMBAT
# =====================================================
func punch(target_dir: String = "") -> void:
	if is_punching:
		return
	
	is_punching = true
	punch_timer = 0.0
	is_moving = false
	
	if target_dir != "":
		direction = target_dir
	
	print("🥊 PUNCH!")
	punched.emit(direction)
	
	# Play punch animation
	if animated_sprite and animated_sprite.sprite_frames.has_animation("punch"):
		animated_sprite.play("punch")
	
	# Deal damage to nearby enemies
	_attack_nearby_enemies()

func _attack_nearby_enemies() -> void:
	var attack_damage = 25
	var attack_range = 80.0
	
	# Find enemies in range
	var enemies = get_tree().get_nodes_in_group("enemies")
	for enemy in enemies:
		var distance = global_position.distance_to(enemy.global_position)
		if distance <= attack_range:
			if enemy.has_method("take_damage"):
				enemy.take_damage(attack_damage)
				print("💥 Hit enemy for %d damage!" % attack_damage)

# =====================================================
# FLOOR CHANGES
# =====================================================
func _on_floor_changed(new_floor: int) -> void:
	# Update Y position for new floor
	target_position.y = _get_floor_y()
	global_position.y = _get_floor_y()

func set_visibility(visible: bool) -> void:
	is_visible_character = visible
	self.visible = visible
