"""
Turn a screen recording into something Claude can actually look at.

    python framegrab.py <video> [outdir]

Produces, in outdir (default: ./frames):
  contact.png      one grid of ~30 evenly spaced frames — the cheap overview
  scene-NN.png     full-resolution frames at detected scene changes (new screens,
                   modals opening, route transitions)
  motion/          a dense burst around a chosen timestamp, for reading the
                   shape of a single transition (see --motion)

Why two passes: scene frames tell me what the screens ARE, the motion burst
tells me how one of them MOVES. Reading every frame is neither possible nor
useful.
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path


def run(args):
    return subprocess.run(args, capture_output=True, text=True)


def probe(video):
    out = run(["ffprobe", "-v", "quiet", "-print_format", "json",
               "-show_format", "-show_streams", str(video)]).stdout
    d = json.loads(out)
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    num, den = (v.get("r_frame_rate") or "30/1").split("/")
    return {
        "duration": float(d["format"]["duration"]),
        "w": v["width"],
        "h": v["height"],
        "fps": round(float(num) / float(den), 2),
    }


def contact_sheet(video, info, out, cols=5, rows=6):
    """One image holding cols*rows evenly spaced frames."""
    n = cols * rows
    step = max(info["duration"] / n, 0.04)
    run(["ffmpeg", "-y", "-v", "error", "-i", str(video),
         "-vf", f"fps=1/{step:.4f},scale=480:-1,tile={cols}x{rows}",
         "-frames:v", "1", str(out)])
    return out


def scene_frames(video, out_dir, threshold=0.12, limit=24):
    """Full-res frames wherever the picture changes materially."""
    out_dir.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-v", "error", "-i", str(video),
         "-vf", f"select='gt(scene,{threshold})'", "-vsync", "vfr",
         "-frames:v", str(limit), str(out_dir / "scene-%02d.png")])
    return sorted(out_dir.glob("scene-*.png"))


def motion_burst(video, at, out_dir, span=1.2, fps=12):
    """Dense frames around one moment, to read a transition's shape."""
    out_dir.mkdir(parents=True, exist_ok=True)
    start = max(at - span / 4, 0)
    run(["ffmpeg", "-y", "-v", "error", "-ss", str(start), "-t", str(span),
         "-i", str(video), "-vf", f"fps={fps},scale=900:-1",
         str(out_dir / "m-%03d.png")])
    return sorted(out_dir.glob("m-*.png"))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found on PATH")

    video = Path(sys.argv[1])
    if not video.exists():
        sys.exit(f"no such file: {video}")

    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("frames")
    out.mkdir(parents=True, exist_ok=True)

    info = probe(video)
    print(f"{video.name}: {info['duration']:.1f}s  {info['w']}x{info['h']}  {info['fps']}fps")

    sheet = contact_sheet(video, info, out / "contact.png")
    print(f"contact sheet -> {sheet}")

    scenes = scene_frames(video, out)
    print(f"scene frames  -> {len(scenes)} in {out}")

    motion_at = None
    for a in sys.argv[3:]:
        if a.startswith("--motion="):
            motion_at = float(a.split("=", 1)[1])
    if motion_at is not None:
        frames = motion_burst(video, motion_at, out / "motion")
        print(f"motion burst  -> {len(frames)} frames around {motion_at}s")


if __name__ == "__main__":
    main()
