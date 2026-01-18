# HUD Script
# Manages in-game UI elements
extends CanvasLayer

@onready var info_panel: PanelContainer = $InfoPanel
@onready var position_label: Label = $InfoPanel/VBoxContainer/PositionLabel
@onready var status_label: Label = $InfoPanel/VBoxContainer/StatusLabel
@onready var health_bar: ProgressBar = $HealthBar
@onready var action_button: Button = $ActionButton
@onready var message_label: Label = $MessageLabel

# Current zone reference
var current_zone: Area2D = null

func _ready() -> void:
	# Connect to game manager signals
	GameManager.message_shown.connect(_on_message_shown)
	GameManager.player_damaged.connect(_on_player_damaged)
	GameManager.floor_changed.connect(_on_floor_changed)
	
	# Hide action button initially
	action_button.visible = false
	message_label.modulate.a = 0.0
	
	_update_health_bar()

func _process(_delta: float) -> void:
	_update_position_display()

# =====================================================
# POSITION & STATUS DISPLAY
# =====================================================
func _update_position_display() -> void:
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		var player = players[0]
		# Convert to map coordinates for display
		var map_x = _screen_to_map_x(player.global_position.x)
		position_label.text = "Position: %d, %d" % [roundi(map_x), roundi(player.global_position.y)]
		
		# Update status based on player state
		if player.is_moving:
			status_label.text = "Status: Moving %s" % player.direction
		elif player.is_punching:
			status_label.text = "Status: Attacking!"
		else:
			status_label.text = "Status: Idle"

func _screen_to_map_x(screen_x: float) -> float:
	var viewport_size = get_viewport().get_visible_rect().size
	var map_aspect = 9.0 / 16.0
	var draw_height = viewport_size.y
	var draw_width = draw_height * map_aspect
	var offset_x = (viewport_size.x - draw_width) / 2.0
	
	var map_x_min = 304.0
	var map_x_max = 427.0
	var map_range = map_x_max - map_x_min
	var percent = (screen_x - offset_x) / draw_width
	return map_x_min + percent * map_range

# =====================================================
# HEALTH BAR
# =====================================================
func _update_health_bar() -> void:
	health_bar.value = float(GameManager.player_health) / float(GameManager.player_max_health) * 100.0
	
	# Change color based on health
	var health_percent = float(GameManager.player_health) / float(GameManager.player_max_health)
	if health_percent > 0.5:
		health_bar.modulate = Color.GREEN
	elif health_percent > 0.25:
		health_bar.modulate = Color.YELLOW
	else:
		health_bar.modulate = Color.RED

func _on_player_damaged(_damage: int, _new_health: int) -> void:
	_update_health_bar()
	
	# Flash red on damage
	var original_modulate = health_bar.modulate
	health_bar.modulate = Color.RED
	await get_tree().create_timer(0.1).timeout
	_update_health_bar()

# =====================================================
# ACTION BUTTON
# =====================================================
func show_action_button(zone: Area2D) -> void:
	current_zone = zone
	action_button.text = "%s %s" % [zone.get_icon(), zone.get_action_text()]
	action_button.visible = true

func hide_action_button() -> void:
	current_zone = null
	action_button.visible = false

func _on_action_button_pressed() -> void:
	if current_zone and current_zone.has_method("interact"):
		current_zone.interact()

# =====================================================
# MESSAGES
# =====================================================
func _on_message_shown(text: String) -> void:
	message_label.text = text
	
	# Fade in
	var tween = create_tween()
	tween.tween_property(message_label, "modulate:a", 1.0, 0.3)
	tween.tween_interval(3.0)
	tween.tween_property(message_label, "modulate:a", 0.0, 0.5)

# =====================================================
# FLOOR DISPLAY
# =====================================================
func _on_floor_changed(new_floor: int) -> void:
	var floor_names = ["", "First Floor", "Second Floor", "Third Floor"]
	if new_floor < floor_names.size():
		_on_message_shown("🏢 %s" % floor_names[new_floor])
