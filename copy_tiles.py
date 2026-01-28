#!/usr/bin/env python3
"""
Script to copy tiles from source to tileserver volume one by one,
simulating real-time drone tile generation.
"""

import time
import os
import shutil
import json
import argparse
import re


def parse_tile_filename(filename: str):
    """
    Parse tile filename to extract row and column.
    Expected format: tile_row_col.tif
    """
    match = re.match(r"tile_(\d+)_(\d+)\.tif", filename)
    if match:
        return int(match.group(1)), int(match.group(2))
    return None, None


def copy_tiles(source_dir: str, dest_dir: str, delay: float = 2.0):
    """
    Copy tiles and their metadata from source to destination.

    Args:
        source_dir: Source directory containing tiles and metadata
        dest_dir: Destination directory (tileserver volume)
        delay: Delay in seconds between copying each tile
    """
    os.makedirs(dest_dir, exist_ok=True)

    # Find all tile files and sort them by row, then column
    tile_files = []
    for filename in os.listdir(source_dir):
        row, col = parse_tile_filename(filename)
        if row is not None:
            tile_files.append((row, col, filename))

    # Sort by row, then column
    tile_files.sort(key=lambda x: (x[0], x[1]))

    total_tiles = len(tile_files)

    print(f"Source: {source_dir}")
    print(f"Destination: {dest_dir}")
    print(f"Found {total_tiles} tiles")
    print("-" * 50)

    for i, (row, col, filename) in enumerate(tile_files):
        source_tif = os.path.join(source_dir, filename)
        source_json = os.path.join(source_dir, f"tile_{row}_{col}.json")

        dest_tif = os.path.join(dest_dir, filename)
        dest_json = os.path.join(dest_dir, f"tile_{row}_{col}.json")

        # Copy tile
        shutil.copy2(source_tif, dest_tif)

        # Copy metadata if it exists
        if os.path.exists(source_json):
            shutil.copy2(source_json, dest_json)

            # Read metadata to print bounds
            with open(source_json) as f:
                metadata = json.load(f)
            bounds = metadata.get("bounds", {})
            print(f"[{i + 1}/{total_tiles}] Copied: {filename}")
            print(f"    Bounds: [{bounds.get('min_lon', 'N/A')}, {bounds.get('min_lat', 'N/A')}, {bounds.get('max_lon', 'N/A')}, {bounds.get('max_lat', 'N/A')}]")
        else:
            print(f"[{i + 1}/{total_tiles}] Copied: {filename} (no metadata)")

        # Wait before next tile (except for the last one)
        if i + 1 < total_tiles:
            time.sleep(delay)

    print("-" * 50)
    print(f"Done! Copied {total_tiles} tiles.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Copy tiles to tileserver volume"
    )
    parser.add_argument("source", help="Source directory containing tiles")
    parser.add_argument("dest", help="Destination directory (tileserver volume)")
    parser.add_argument("-d", "--delay", type=float, default=2.0,
                        help="Delay in seconds between tiles (default: 2.0)")

    args = parser.parse_args()

    copy_tiles(args.source, args.dest, args.delay)
