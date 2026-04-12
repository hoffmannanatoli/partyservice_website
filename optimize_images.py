#!/usr/bin/env python3
"""
optimize_images.py — Web image optimizer for Hoffmann's Partyservice

Converts photos to WebP, resizes per section, removes exact duplicates.
Output mirrors the input folder structure inside an '<folder>_web' directory.

Usage:
    python optimize_images.py <folder_path>            — process whole folder
    python optimize_images.py <file_path>              — process single file
    python optimize_images.py <path> --dry-run
    python optimize_images.py <path> --output path/to/output
    python optimize_images.py <path> --preset hero     — override preset

Section presets (detected from subfolder names):
    hero/         1920×1080  q82  — full-width background slides
    profil/        900× 900  q85  — portrait photo
    logos/         600× 600  q90  — logo (PNG kept as PNG)
    impressionen/  960× 720  q82  — gallery strip thumbnails
    menues/*       720× 540  q82  — menu category cards
    (other)        900× 675  q82  — fallback
"""

import argparse
import hashlib
import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

# ── Section presets: (max_width, max_height, webp_quality, keep_png) ─────────
PRESETS = {
    "hero":         (1920, 1080, 82, False),
    "profil":       ( 900,  900, 85, False),
    "logos":        ( 600,  600, 90, True),   # keep PNG for transparency
    "impressionen": ( 960,  720, 82, False),
    "menues":       ( 720,  540, 82, False),
}
DEFAULT_PRESET = (900, 675, 82, False)

SUPPORTED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}


def get_preset(rel_path: Path):
    """Pick preset based on first meaningful folder component in the path."""
    parts = [p.lower() for p in rel_path.parts]
    for part in parts:
        if part in PRESETS:
            return PRESETS[part]
        # catch menues/suppen, menues/fleisch, etc.
        if part == "menues" or (len(parts) > 1 and parts[0] == "menues"):
            return PRESETS["menues"]
    return DEFAULT_PRESET


def file_hash(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def optimize(src: Path, dst: Path, preset: tuple, dry_run: bool) -> str:
    """Resize and convert one image. Returns a status string."""
    max_w, max_h, quality, keep_png = preset

    if dry_run:
        orig_size = src.stat().st_size
        out_ext = ".png" if (keep_png and src.suffix.lower() == ".png") else ".webp"
        return f"[dry-run] {orig_size//1024}KB → ~?KB  ({src.suffix.lower()} → {out_ext}, max {max_w}×{max_h})"

    dst.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(src) as img:
        img = ImageOps.exif_transpose(img)  # fix rotation

        # Determine output format
        is_png = src.suffix.lower() == ".png"
        use_png = keep_png and is_png
        out_ext = ".png" if use_png else ".webp"
        dst = dst.with_suffix(out_ext)

        # Resize (only shrink, never enlarge)
        img.thumbnail((max_w, max_h), Image.LANCZOS)

        orig_size = src.stat().st_size

        if use_png:
            img.save(dst, format="PNG", optimize=True)
        else:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.save(dst, format="WEBP", quality=quality, method=6)

        new_size = dst.stat().st_size
        saved = (1 - new_size / orig_size) * 100 if orig_size else 0
        return f"{'↓' if saved > 0 else '→'} {orig_size//1024}KB → {new_size//1024}KB ({saved:+.0f}%)"


def main():
    parser = argparse.ArgumentParser(description="Optimize images for web.")
    parser.add_argument("path", help="Input file or folder to process")
    parser.add_argument("--output", help="Output file or folder (default: auto)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without doing it")
    parser.add_argument("--preset", choices=list(PRESETS.keys()), help="Force a specific preset (overrides folder detection)")
    args = parser.parse_args()

    src_path = Path(args.path).resolve()

    # ── Single file mode ──────────────────────────────────────────────────
    if src_path.is_file():
        if src_path.suffix.lower() not in SUPPORTED_EXT:
            sys.exit(f"Error: unsupported file type '{src_path.suffix}'")

        # Determine preset
        if args.preset:
            preset = PRESETS[args.preset]
        else:
            preset = get_preset(src_path.relative_to(src_path.parent))
            # Try to detect from parent folder name
            parent_name = src_path.parent.name.lower()
            if parent_name in PRESETS:
                preset = PRESETS[parent_name]

        # Determine output path
        if args.output:
            dst = Path(args.output).resolve()
        else:
            out_dir = src_path.parent.parent / (src_path.parent.name + "_web")
            dst = out_dir / src_path.name

        print(f"\nFile   : {src_path}")
        print(f"Output : {dst}")
        print(f"Preset : {preset}")
        print(f"Mode   : {'DRY RUN' if args.dry_run else 'LIVE'}\n")

        try:
            status = optimize(src_path, dst, preset, args.dry_run)
            print(f"  {src_path.name}  {status}")
        except Exception as e:
            sys.exit(f"ERROR: {e}")
        return

    # ── Folder mode ───────────────────────────────────────────────────────
    src_root = src_path
    if not src_root.is_dir():
        sys.exit(f"Error: '{src_root}' is not a file or directory.")

    dst_root = Path(args.output).resolve() if args.output else src_root.parent / (src_root.name + "_web")

    if args.preset:
        print(f"Note: --preset is ignored in folder mode (detected per subfolder).")

    print(f"\nSource : {src_root}")
    print(f"Output : {dst_root}")
    print(f"Mode   : {'DRY RUN' if args.dry_run else 'LIVE'}\n")

    # ── Collect all image files ────────────────────────────────────────────
    all_files = [
        p for p in src_root.rglob("*")
        if p.is_file()
        and p.suffix.lower() in SUPPORTED_EXT
        and "deprecated" not in p.parts
    ]

    if not all_files:
        sys.exit("No supported image files found.")

    # ── Duplicate detection (MD5, scoped per folder) ──────────────────────
    print("Scanning for duplicates...")
    seen_hashes: dict[Path, dict[str, Path]] = {}  # folder → {hash: first_file}
    duplicates: list[Path] = []

    for f in all_files:
        folder = f.parent
        if folder not in seen_hashes:
            seen_hashes[folder] = {}
        h = file_hash(f)
        if h in seen_hashes[folder]:
            duplicates.append(f)
            print(f"  DUPLICATE: {f.relative_to(src_root)}")
            print(f"    (same as {seen_hashes[folder][h].relative_to(src_root)})")
        else:
            seen_hashes[folder][h] = f

    if duplicates:
        if not args.dry_run:
            answer = input(f"\nDelete {len(duplicates)} duplicate(s)? [y/N] ").strip().lower()
            if answer == "y":
                for d in duplicates:
                    d.unlink()
                    print(f"  Deleted: {d.relative_to(src_root)}")
        else:
            print(f"  [dry-run] would delete {len(duplicates)} duplicate(s)")
    else:
        print("  No duplicates found.")

    # Remove duplicates from processing list
    unique_files = [f for f in all_files if f not in duplicates]

    # ── Convert ───────────────────────────────────────────────────────────
    print(f"\nConverting {len(unique_files)} image(s)...\n")
    converted = skipped = errors = 0

    for src in unique_files:
        rel = src.relative_to(src_root)
        preset = get_preset(rel)
        dst = dst_root / rel

        try:
            status = optimize(src, dst, preset, args.dry_run)
            print(f"  {rel}  {status}")
            converted += 1
        except Exception as e:
            print(f"  ERROR {rel}: {e}")
            errors += 1

    print(f"\nDone — {converted} converted, {len(duplicates)} duplicates, {errors} errors.")
    if not args.dry_run:
        print(f"Output saved to: {dst_root}")


if __name__ == "__main__":
    main()
