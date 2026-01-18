# Main Menu Script
# Handles menu button interactions and transitions
extends Control

@onready var title: Label = $MenuContainer/Title

# Flicker effect timer
var flicker_timer: float = 0.0
var flicker_interval: float = 3.0
var is_flickering: bool = false

func _ready() -> void:
	# Try to reset game state if GameManager exists
	if Engine.has_singleton("GameManager") or has_node("/root/GameManager"):
		var gm = get_node_or_null("/root/GameManager")
		if gm and gm.has_method("reset_game"):
			gm.reset_game()
	
	# Start fade in
	modulate.a = 0.0
	var tween = create_tween()
	tween.tween_property(self, "modulate:a", 1.0, 0.5)
	
	print("Main menu ready!")

func _process(delta: float) -> void:
	# Title flicker effect
	if title == null:
		return
	flicker_timer += delta
	if flicker_timer >= flicker_interval and not is_flickering:
		_flicker_title()
		flicker_timer = 0.0
		flicker_interval = randf_range(2.0, 5.0)

func _flicker_title() -> void:
	if title == null:
		return
	is_flickering = true
	
	var tween = create_tween()
	tween.tween_property(title, "modulate:a", 0.7, 0.05)
	tween.tween_property(title, "modulate:a", 1.0, 0.05)
	tween.tween_property(title, "modulate:a", 0.8, 0.03)
	tween.tween_property(title, "modulate:a", 1.0, 0.05)
	tween.tween_callback(func(): is_flickering = false)

func _on_start_button_pressed() -> void:
	print("Start button pressed!")
	# Fade out and transition to cutscene
	var tween = create_tween()
	tween.tween_property(self, "modulate:a", 0.0, 0.5)
	tween.tween_callback(_go_to_cutscene)

func _go_to_cutscene() -> void:
	get_tree().change_scene_to_file("res://scenes/cutscene/opening_cutscene.tscn")

func _on_controls_button_pressed() -> void:
	print("Controls button pressed!")
	# Show controls popup
	var dialog = AcceptDialog.new()
	dialog.title = "Controls"
	dialog.dialog_text = """🎮 CONTROLS

• Click/Tap anywhere to move
• Click on objects to interact
• Press D to toggle debug mode
• Click enemies (when close) to attack"""
	dialog.ok_button_text = "Got it!"
	add_child(dialog)
	dialog.popup_centered()
	dialog.confirmed.connect(dialog.queue_free)

func _on_credits_button_pressed() -> void:
	print("Credits button pressed!")
	# Show credits popup
	var dialog = AcceptDialog.new()
	dialog.title = "Credits"
	dialog.dialog_text = """📜 CREDITS

Apocalypse Now
A Survival Horror Game

Developed with ❤️

Original concept and assets by the developer.
Recreated in Godot 4.x"""
	dialog.ok_button_text = "Close"
	add_child(dialog)
	dialog.popup_centered()
	dialog.confirmed.connect(dialog.queue_free)
