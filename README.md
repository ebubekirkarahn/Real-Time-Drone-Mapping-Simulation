# Real-Time Drone Mapping Simulation Challenge

## Overview

This project simulates a real-time drone mapping scenario where orthophoto tiles are progressively generated as a drone flies over terrain. Your task is to build a tile server solution that can serve these dynamically appearing tiles to a web map client in real-time.

## The Scenario

Imagine a drone flying over an area, capturing imagery and generating orthophoto tiles in real-time. As the drone progresses:

1. New GeoTIFF tiles appear in the `tileserver_volume/` directory
2. Each tile comes with a JSON metadata file containing its geographic bounds
3. A web client needs to display these tiles on a map as they become available
4. The map should update in real-time, showing the growing coverage area

## What's Provided

### Source Data

- **`main.tif`** - A 10980x10980 pixel GeoTIFF (Sentinel-2 imagery)

- **`tiff_source/`** - Pre-split tiles (100 tiles in a 10x10 grid)
  - Each tile: 1098x1098 pixels (~3.6 MB)
  - Naming convention: `tile_{row}_{col}.tif`

### Drone Simulator

The `copy-tiles` service simulates drone tile generation:

```bash
# Start the simulation
docker compose up

# The simulator will:
# 1. Copy tiles from tiff_source/ to tileserver_volume/
# 2. Copy metadata JSON for each tile
# 3. Add a 2-second delay between tiles
```

**Files:**
- `copy_tiles.py` - Tile and metadata copying script   
- `Dockerfile` - Container definition
- `docker-compose.yml` - Service orchestration

### Metadata Format

For each tile, a JSON file is generated with geographic bounds:

```json
{
  "filename": "tile_0_0.tif",
  "row": 0,
  "col": 0,
  "bounds": {
    "min_lon": 17.08573692146236,
    "min_lat": 32.999811920932004,
    "max_lon": 17.184992362534484,
    "max_lat": 33.10301927557229
  },
  "bbox": [
    17.08573692146236,
    32.999811920932004,
    17.184992362534484,
    33.10301927557229
  ],
  "width": 1097,
  "height": 1104
}
```

## Your Challenge

Build a complete solution that enables real-time visualization of the growing drone map.

### Required Components

#### 1. Tile Server (XYZ Format) (Implement in this repository, update and add services to the docker-compose.yml if needed)

Implement a tile server that serves the GeoTIFFs from the tileserver_volume as XYZ map tiles. Options include:

- **[TiTiler](https://developmentseed.org/titiler/)**
- **[GeoServer](https://geoserver.org/)**
- **Custom solution**

#### 2. Change Detection & Notification (Implement in this repository, update and add services to the docker-compose.yml if needed)

Implement a mechanism to detect new tiles in tileserver_volume and notify clients:

- Watch `tileserver_volume/` for new `.tif` or `.json` files
- Broadcast tile availability in a way that webclient could be notified 

#### 3. Web Client (Seperate Repository)

Build a vitejs react app for the client side in a seperate repository that:

- Displays the XYZ tile layer
- Updates the map view as new tiles become available without flickering
- displays a plane icon that moves based on available metadata (plane moves as the map grows)
- Dockerize it
- Should be up on "docker-compose up" when run in its own repository 

Library:
- [OpenLayers](https://openlayers.org/)


## Getting Started

### Prerequisites

- Docker and Docker Compose

### Running the Simulation

```bash
# 1. Open the repository
cd rt-drone-mapping-simulation

# 2. Start the drone simulation
docker compose up -d

# 3. Watch tiles appear in tileserver_volume/
ls -la tileserver_volume/

```

## Project Structure

```
rt-drone-mapping-simulation/
├── README.md
├── docker-compose.yml      # Service orchestration
├── Dockerfile              # Drone simulator container
├── copy_tiles.py           # Tile copying + metadata generation
├── main.tif                # Source orthophoto (10980x10980)
├── tiff_source/            # Pre-split tiles (100 tiles)
│   ├── tile_0_0.tif
│   ├── tile_0_1.tif
│   └── ...
└── tileserver_volume/      # Output directory (your tile server reads from here)
    ├── tile_0_0.tif
    ├── tile_0_0.json
    └── ...
```

## Evaluation Criteria

Your solution will be evaluated on:

1. **Functionality** - Does it work end-to-end?
2. **Architecture** - Is the solution well-structured and maintainable?
3. **Real-time Performance** - How quickly do new tiles appear on the map?
4. **Code Quality** - Is the code clean, documented, and tested?
5. **User Experience** - Is the map interface intuitive and responsive?

## Resources

- [TiTiler Documentation](https://developmentseed.org/titiler/)
- [GeoServer Documentation](https://docs.geoserver.org/)
- [OpenLayers Tutorial](https://openlayers.org/doc/tutorials/)

## Questions?

If you have questions about the challenge requirements, please reach out to us.

Good luck!