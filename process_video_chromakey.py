"""
Video Chroma Key Processor
Converts video with white background to WebM with alpha transparency.
Uses FFmpeg with chromakey filter.
"""

import subprocess
import os
import sys

def apply_chromakey_to_video(input_path, output_path=None, key_color="0xFFFFFF", similarity=0.3, blend=0.1):
    """
    Apply chromakey to remove white background from video and output WebM with alpha.
    
    Args:
        input_path: Path to input video (MP4)
        output_path: Path to output video (WebM with alpha). Defaults to same name with _alpha.webm
        key_color: Hex color to key out (default: white 0xFFFFFF)
        similarity: How similar colors must be to be keyed (0.0-1.0, lower = more strict)
        blend: Blend at edges (0.0-1.0)
    """
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return False
    
    if output_path is None:
        base, _ = os.path.splitext(input_path)
        output_path = f"{base}_alpha.webm"
    
    # FFmpeg command to apply chromakey and output VP9 with alpha
    # colorkey filter removes the specified color and makes it transparent
    cmd = [
        "ffmpeg",
        "-y",  # Overwrite output
        "-i", input_path,
        "-vf", f"colorkey={key_color}:{similarity}:{blend}",
        "-c:v", "libvpx-vp9",  # VP9 codec supports alpha
        "-pix_fmt", "yuva420p",  # Pixel format with alpha
        "-b:v", "2M",  # Bitrate
        "-an",  # No audio
        output_path
    ]
    
    print(f"Processing: {input_path}")
    print(f"Output: {output_path}")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"Success! Created: {output_path}")
            return True
        else:
            print(f"FFmpeg error: {result.stderr}")
            return False
    except FileNotFoundError:
        print("Error: FFmpeg not found. Please install FFmpeg and add it to PATH.")
        return False

def main():
    # Default: Process the garden video
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Garden video path
    garden_video = os.path.join(script_dir, "Objects", "Cutscenes", "Garden", "download (31).mp4")
    
    if len(sys.argv) > 1:
        # Process custom path
        garden_video = sys.argv[1]
    
    if os.path.exists(garden_video):
        print("="*50)
        print("Processing Garden Video")
        print("="*50)
        apply_chromakey_to_video(
            garden_video,
            key_color="0xFFFFFF",  # White
            similarity=0.3,  # Catch off-whites
            blend=0.1
        )
    else:
        print(f"Video not found: {garden_video}")
        print("Usage: python process_video_chromakey.py [path_to_video]")

if __name__ == "__main__":
    main()
