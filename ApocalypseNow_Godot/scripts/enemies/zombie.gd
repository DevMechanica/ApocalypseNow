# Zombie Enemy Script
# Handles roaming AI, combat, and animations
extends CharacterBody2D

# Stats
@export var max_health: int = 100
@export var attack_damage: int = 10
@export var attack_cooldown: float = 2.0
@export var roam_speed: float = 30.0
@export var attack_range: float = 80.0

# Node references
@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var health_bar: ProgressBar = $HealthBar
@onready var attack_area: Area2D = $AttackArea

# State
var health: int
var state: String = "roaming"  # idle, roaming, attacking, dead
var direction: String = "right"
var roam_target: float = 0.0
var current_cooldown: float = 0.0
var is_moving: bool = false

# Movement constraints
var min_x: float = 0.0
var max_x: float = 500.0

# Signals
signal died
signal attacked_player(damage: int)

func _ready() -> void:
	health = max_health
	add_to_group("enemies")
	_pick_new_roam_target()
	_update_health_bar()

func _physics_process(delta: float) -> void:
	if state == "dead":
		return
	
	# Update attack cooldown
	if current_cooldown > 0:
		current_cooldown -= delta
	
	# Get player reference
	var player = _get_player()
	if player == null:
		_roam_behavior(delta)
		return
	
	var distance = global_position.distance_to(player.global_position)
	var vertical_dist = abs(global_position.y - player.global_position.y)
	
	# Attack if player is in range and on same Y level
	if distance < attack_range and vertical_dist < 30 and current_cooldown <= 0:
		_attack()
		is_moving = false
	else:
		_roam_behavior(delta)
	
	_update_animation()

# =====================================================
# ROAMING BEHAVIOR
# =====================================================
func _roam_behavior(delta: float) -> void:
	if state == "dead":
		return
	
	state = "roaming"
	is_moving = true
	
	# Check if reached target
	if abs(global_position.x - roam_target) < 5:
		_pick_new_roam_target()
	
	# Move toward roam target
	if global_position.x < roam_target:
		global_position.x += roam_speed * delta
		direction = "right"
	else:
		global_position.x -= roam_speed * delta
		direction = "left"

func _pick_new_roam_target() -> void:
	# Pick a random target within bounds
	var new_target = min_x + randf() * (max_x - min_x)
	
	# Ensure new target is some distance away
	while abs(new_target - global_position.x) < 20:
		new_target = min_x + randf() * (max_x - min_x)
	
	roam_target = new_target

func set_roam_bounds(min_bound: float, max_bound: float) -> void:
	min_x = min_bound
	max_x = max_bound
	_pick_new_roam_target()

# =====================================================
# COMBAT
# =====================================================
func _attack() -> void:
	state = "attacking"
	current_cooldown = attack_cooldown
	is_moving = false
	
	# Deal damage to player
	GameManager.damage_player(attack_damage)
	attacked_player.emit(attack_damage)
	print("🧟 Zombie attacks! Player health: %d" % GameManager.player_health)
	
	# Return to roaming after attack
	await get_tree().create_timer(0.5).timeout
	if state != "dead":
		state = "roaming"

func take_damage(amount: int) -> void:
	health -= amount
	_update_health_bar()
	print("💥 Zombie takes %d damage! Health: %d" % [amount, health])
	
	# Flash red
	modulate = Color.RED
	await get_tree().create_timer(0.1).timeout
	modulate = Color.WHITE
	
	if health <= 0:
		_die()

func _die() -> void:
	state = "dead"
	visible = false
	GameManager.zombie_defeated = true
	GameManager.in_combat = false
	GameManager.show_message("🎉 Zombie defeated! The chest is now accessible.")
	died.emit()
	
	print("💀 Zombie defeated!")
	queue_free()

func _update_health_bar() -> void:
	if health_bar:
		health_bar.value = float(health) / float(max_health) * 100.0
		
		# Change color based on health
		var health_percent = float(health) / float(max_health)
		if health_percent > 0.5:
			health_bar.modulate = Color.GREEN
		elif health_percent > 0.25:
			health_bar.modulate = Color.YELLOW
		else:
			health_bar.modulate = Color.RED

# =====================================================
# ANIMATION
# =====================================================
func _update_animation() -> void:
	if animated_sprite == null:
		return
	
	if state == "attacking":
		# Attack animation
		if animated_sprite.sprite_frames.has_animation("attack"):
			animated_sprite.play("attack")
	elif is_moving:
		# Walking animation
		if animated_sprite.sprite_frames.has_animation("walk"):
			animated_sprite.play("walk")
			animated_sprite.flip_h = (direction == "right")
	else:
		# Idle animation
		if animated_sprite.sprite_frames.has_animation("idle"):
			animated_sprite.play("idle")

# =====================================================
# UTILITY
# =====================================================
func _get_player() -> Node2D:
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		return players[0]
	return null
