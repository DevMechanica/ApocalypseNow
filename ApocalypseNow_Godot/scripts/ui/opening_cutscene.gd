# Opening Cutscene Script
# Plays the intro video (boy entering hatch) then goes to game
extends Control

@onready var video_player: VideoStreamPlayer = $VideoPlayer
@onready var progress_bar: ColorRect = $ProgressBar
@onready var subtitle: Label = $Subtitle
@onready var skip_button: Button = $SkipButton

# Single intro video - boy entering hatch
const INTRO_VIDEO_PATH = "res://assets/cutscenes/download__35_.ogv"

func _ready() -> void:
	# Start with fade in
	modulate.a = 0.0
	var tween = create_tween()
	tween.tween_property(self, "modulate:a", 1.0, 0.5)
	tween.tween_callback(_play_intro)

func _play_intro() -> void:
	var video_stream = load(INTRO_VIDEO_PATH)
	if video_stream:
		video_player.stream = video_stream
		video_player.play()
		subtitle.text = "A lone survivor enters the hatch..."
		subtitle.modulate.a = 1.0
		print("🎬 Playing intro cutscene")
	else:
		print("⚠️ Intro video not found, skipping to game...")
		_go_to_game()

func _process(_delta: float) -> void:
	if video_player.is_playing():
		_update_progress()
		_update_subtitle()

func _update_progress() -> void:
	if video_player.stream == null or video_player.get_stream_length() <= 0:
		return
	
	var progress = video_player.stream_position / video_player.get_stream_length()
	progress_bar.anchor_right = progress

func _update_subtitle() -> void:
	# Show subtitle for first 3 seconds
	var current_time = video_player.stream_position
	var should_show = current_time <= 3.0
	
	if should_show and subtitle.modulate.a < 1.0:
		subtitle.modulate.a = 1.0
	elif not should_show and subtitle.modulate.a > 0.0:
		var tween = create_tween()
		tween.tween_property(subtitle, "modulate:a", 0.0, 0.5)

func _on_video_finished() -> void:
	_end_cutscenes()

func _on_skip_button_pressed() -> void:
	_end_cutscenes()

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("skip"):
		_end_cutscenes()

func _end_cutscenes() -> void:
	set_process_input(false)
	skip_button.disabled = true
	
	var tween = create_tween()
	tween.tween_property(self, "modulate:a", 0.0, 1.0)
	tween.tween_callback(_go_to_game)

func _go_to_game() -> void:
	get_tree().change_scene_to_file("res://scenes/game/game.tscn")
