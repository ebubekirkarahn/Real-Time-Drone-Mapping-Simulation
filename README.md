# Real-Time Drone Mapping Solution

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Choices](#technology-choices)
4. [Services Deep Dive](#services-deep-dive)
5. [Data Flow](#data-flow)
6. [Setup & Running](#setup--running)
7. [Testing](#testing)
8. [Interview Discussion Points](#interview-discussion-points)

---

## Overview

This solution implements a **real-time drone mapping visualization system** that simulates a drone flying over terrain, capturing imagery, and displaying the growing map coverage in real-time on a web interface.

### Key Features

- ✅ **Real-time tile updates** via WebSocket (no polling)
- ✅ **Smooth animations** - drone icon moves and "scans" each tile
- ✅ **No flickering** - tiles fade in with opacity animation
- ✅ **Auto-reconnection** - WebSocket reconnects on connection loss
- ✅ **Fully containerized** - `docker compose up` runs everything
- ✅ **Type-safe** - Full TypeScript implementation
- ✅ **Tested** - Unit tests with Vitest + React Testing Library

### Screenshots

```
┌─────────────────────────────────────────────────────────────┐
│  🗺️ Drone Mapping Client                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌─────┬─────┬─────┬─────┐    ┌─────────────────────────┐ │
│    │ ░░░ │ ░░░ │ ░░░ │     │    │ 🚁 Drone Mapping        │ │
│    ├─────┼─────┼─────┼─────┤    │ ● Connected             │ │
│    │ ░░░ │ ░░░ │ ░░░ │     │    │                         │ │
│    ├─────┼─────┼─────┼─────┤    │ Drone: 🟢 Idle          │ │
│    │ ░░░ │ ░░░ │ 🚁  │     │    │ Tiles: 25/100           │ │
│    ├─────┼─────┼─────┼─────┤    │ Position: 17.13°N       │ │
│    │     │     │     │     │    │           33.05°E       │ │
│    └─────┴─────┴─────┴─────┘    │                         │ │
│                                 │ ▓▓▓▓▓▓▓▓░░░░ 25%        │ │
│                                 └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Docker Network                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────┐                      ┌──────────────────────┐    │
│   │   copy-tiles     │                      │       titiler        │    │
│   │  (Python Script) │                      │   (Tile Server)      │    │
│   │                  │                      │                      │    │
│   │  Simulates drone │  writes tiles        │  Serves GeoTIFFs as  │    │
│   │  flight, copies  │ ─────────────────┐   │  XYZ map tiles       │    │
│   │  tiles with 2s   │                  │   │                      │    │
│   │  delay           │                  │   │  Port: 8000          │    │
│   └──────────────────┘                  │   └──────────────────────┘    │
│                                         │              ▲                 │
│                                         ▼              │                 │
│                              ┌──────────────────┐      │ tile requests   │
│                              │ tileserver_volume│      │                 │
│                              │   (Shared Vol)   │      │                 │
│                              │                  │      │                 │
│                              │  tile_X_Y.tif    │      │                 │
│                              │  tile_X_Y.json   │      │                 │
│                              └──────────────────┘      │                 │
│                                         │              │                 │
│                              watches    │              │                 │
│                              for new    │              │                 │
│                              files      ▼              │                 │
│   ┌──────────────────┐      ┌──────────────────────┐   │                 │
│   │   web-client     │◄─────│ notification-service │   │                 │
│   │  (React + OL)    │  WS  │    (Node.js)         │   │                 │
│   │                  │      │                      │   │                 │
│   │  Displays map    │      │  File watcher        │   │                 │
│   │  with tiles and  │      │  WebSocket server    │   │                 │
│   │  drone animation │      │  REST API            │   │                 │
│   │                  │      │                      │   │                 │
│   │  Port: 3000      │      │  Port: 3001          │───┘                 │
│   └──────────────────┘      └──────────────────────┘                     │
│            │                                                             │
└────────────┼─────────────────────────────────────────────────────────────┘
             │
             ▼
      ┌─────────────┐
      │   Browser   │
      │             │
      │ localhost:  │
      │   3000      │
      └─────────────┘
```

### Service Responsibilities

| Service | Role | Port |
|---------|------|------|
| **copy-tiles** | Simulates drone by copying tiles with delay | - |
| **titiler** | Serves GeoTIFF as XYZ tiles | 8000 |
| **notification-service** | Watches files, broadcasts via WebSocket | 3001 |
| **web-client** | React app displaying real-time map | 3000 |

---

## Technology Choices

### TiTiler - Dynamic Tile Server

**Why TiTiler over alternatives?**

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **TiTiler** ✓ | Dynamic, no pre-rendering, COG native, fast | Requires GDAL knowledge | **Selected** |
| GeoServer | Feature-rich, enterprise | Heavy, complex setup, slow startup | Rejected |
| MapServer | Lightweight | Older, less modern API | Rejected |
| Custom | Full control | Development time, reinventing wheel | Rejected |

**TiTiler Key Features Used:**
- `/cog/preview.png` - Full tile image for map display
- `/cog/tiles/{z}/{x}/{y}` - XYZ tile endpoint (available but using preview for simplicity)
- Dynamic URL-based file access via query parameters

### WebSocket for Real-time Updates

**Why WebSocket over alternatives?**

| Option | Latency | Scalability | Complexity |
|--------|---------|-------------|------------|
| **WebSocket** ✓ | ~50ms | Good | Medium |
| HTTP Polling | 1-5s | Poor | Low |
| Server-Sent Events | ~50ms | Good | Low |
| Long Polling | 100ms-1s | Medium | Medium |

**Decision:** WebSocket provides bidirectional communication and lowest latency. SSE could work but WebSocket is more versatile for future features.

### Chokidar for File Watching

**Why Chokidar?**

- Cross-platform (Windows, Linux, macOS)
- Handles rapid file changes with debouncing
- `awaitWriteFinish` ensures complete file writes
- Widely used and battle-tested in production

### OpenLayers for Mapping

**Why OpenLayers over alternatives?**

| Library | Tile Layer Support | Vector Layers | Learning Curve |
|---------|-------------------|---------------|----------------|
| **OpenLayers** ✓ | Excellent | Excellent | Medium |
| Leaflet | Good | Good | Low |
| MapLibre | Excellent | Vector-focused | Medium |

**Decision:** OpenLayers provides best control over layers and animations, which is essential for the drone visualization.

---

## Services Deep Dive

### 1. TiTiler Service

```yaml
titiler:
  image: ghcr.io/developmentseed/titiler:0.18.5
  environment:
    # GDAL optimizations for performance
    - GDAL_CACHEMAX=200              # 200MB raster cache
    - GDAL_DISABLE_READDIR_ON_OPEN=EMPTY_DIR  # Skip directory listing
    - VSI_CACHE=TRUE                  # Enable virtual file system cache
```

**GDAL Environment Variables Explained:**

| Variable | Purpose | Value |
|----------|---------|-------|
| `GDAL_CACHEMAX` | Decoded raster data cache size (MB) | 200 |
| `GDAL_DISABLE_READDIR_ON_OPEN` | Skip directory listing for faster access | EMPTY_DIR |
| `GDAL_HTTP_MERGE_CONSECUTIVE_RANGES` | Combine HTTP range requests | YES |
| `VSI_CACHE` | Cache remote file contents | TRUE |
| `VSI_CACHE_SIZE` | VSI cache size (bytes) | 5000000 |

### 2. Notification Service

```javascript
// Key design decisions:

// 1. WebSocket for real-time push
wss.on('connection', (ws) => {
  // Send current state immediately to new clients
  ws.send(JSON.stringify({ type: 'initial', tiles: currentTiles }));
});

// 2. Chokidar for reliable file watching
const watcher = chokidar.watch(TILES_DIR, {
  awaitWriteFinish: {
    stabilityThreshold: 500,  // Wait 500ms for file to stabilize
    pollInterval: 100         // Check every 100ms
  }
});

// 3. Separate internal/external URLs for Docker networking
const TITILER_URL = 'http://titiler:8000';        // Docker internal
const TITILER_PUBLIC_URL = 'http://localhost:8000'; // Browser access
```

### 3. Web Client

**Component Architecture:**

```
src/
├── App.tsx                    # Root component
├── hooks/
│   └── useTileWebSocket.ts    # WebSocket connection & state management
├── components/
│   └── map-container/
│       ├── MapContainer.tsx   # Main container with map + status panel
│       ├── map/
│       │   ├── Map.tsx        # OpenLayers map initialization
│       │   └── MapContext.ts  # React context for map instance
│       ├── DroneLayer.tsx     # Tile layer management
│       ├── DroneIcon.tsx      # Animated drone marker
│       └── StatusPanel.tsx    # Connection status & progress
└── types/
    └── tile.ts                # TypeScript interfaces
```

**Key Implementation Details:**

```typescript
// 1. Queue-based tile processing for smooth animations
const processNextTile = useCallback(() => {
  const tile = pendingTilesRef.current.shift();
  
  // Move drone to tile position
  setDroneState({ position: tileCenter, isScanning: true });
  
  // After scanning duration, reveal tile
  setTimeout(() => {
    setVisibleTiles(prev => new Map(prev).set(tile.id, tile));
    setDroneState(prev => ({ ...prev, isScanning: false }));
  }, SCANNING_DURATION);
}, []);

// 2. Fade-in animation for tiles
let opacity = 0;
const fadeIn = setInterval(() => {
  opacity += 0.1;
  imageLayer.setOpacity(opacity);
  if (opacity >= 1) clearInterval(fadeIn);
}, 50);
```

---

## Data Flow

### Tile Generation Flow

```
1. copy-tiles starts
   │
   ├── Reads tile_0_0.tif from /data/source
   │
   ├── Copies to /data/dest/tile_0_0.tif
   │
   ├── Copies metadata to /data/dest/tile_0_0.json
   │
   ├── Waits 2 seconds
   │
   └── Repeats for next tile...
```

### Real-time Update Flow

```
1. New file appears in tileserver_volume
   │
2. Chokidar detects file (notification-service)
   │
3. Service reads JSON metadata
   │
4. Enriches with TiTiler URLs
   │
5. Broadcasts via WebSocket: { type: 'new_tile', tile: {...} }
   │
6. Web client receives message
   │
7. Adds to pending queue
   │
8. Drone animation plays:
   │   ├── Move drone to tile center
   │   ├── Show scanning animation (2s)
   │   └── Fade in tile on map
   │
9. Tile visible on map
```

---

## Setup & Running

### Prerequisites

- Docker Desktop
- Docker Compose V2

### Quick Start

```bash
# Clone and navigate
cd rt-drone-mapping-simulation

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Access the application
open http://localhost:3000
```

### Service URLs

| Service | URL |
|---------|-----|
| Web Client | http://localhost:3000 |
| TiTiler API | http://localhost:8000/docs |
| Notification API | http://localhost:3001/api/tiles |
| WebSocket | ws://localhost:3001 |

### Development

```bash
# Web client development (outside Docker)
cd drone-mapping-client
npm install
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

---

## Testing

### Test Coverage

```bash
cd drone-mapping-client
npm run test:coverage
```

### Test Structure

```
src/
├── hooks/
│   └── useTileWebSocket.test.ts    # Hook unit tests
├── components/
│   └── map-container/
│       └── StatusPanel.test.tsx     # Component tests
└── types/
    └── tile.test.ts                 # Type validation tests
```

### Test Examples

```typescript
// Hook test - WebSocket connection
it('should set isConnected to true when WebSocket opens', async () => {
  const { result } = renderHook(() => useTileWebSocket());
  
  act(() => {
    mockWebSocket.onopen(new Event('open'));
  });

  expect(result.current.isConnected).toBe(true);
});

// Component test - Status display
it('should display correct tile counts', () => {
  render(<StatusPanel tileCount={50} visibleTileCount={25} />);
  
  expect(screen.getByText('25 / 50')).toBeInTheDocument();
});
```

---

## Interview Discussion Points

### 1. Why this Architecture?

**Microservices approach:**
- Each service has a single responsibility
- Independent scaling (e.g., multiple TiTiler instances)
- Easy to swap components (replace TiTiler with GeoServer)
- Containerized for consistent environments

### 2. Scalability Considerations

**Current limitations & solutions:**

| Limitation | Solution |
|------------|----------|
| Single WebSocket server | Use Redis pub/sub for multi-instance |
| All tiles in memory | Use LRU cache or external store |
| Single TiTiler | Load balancer with multiple instances |

### 3. Real-world Enhancements

If this were production:

1. **Authentication** - JWT tokens for WebSocket
2. **Tile caching** - CDN in front of TiTiler
3. **Progress persistence** - Store in database
4. **Error recovery** - Handle partial tile uploads
5. **Monitoring** - Prometheus metrics, Grafana dashboards

### 4. Alternative Approaches Considered

**Server-Sent Events vs WebSocket:**
- SSE is simpler but unidirectional
- WebSocket chosen for potential future features (client commands)

**Polling vs Push:**
- Polling simpler but higher latency
- Push essential for "real-time" requirement

### 5. Code Quality Decisions

- **TypeScript** - Type safety catches errors at compile time
- **ESLint strict rules** - Consistent code style
- **Path aliases (@/)** - Clean imports
- **Environment variables** - Configuration flexibility
- **JSDoc comments** - Self-documenting code

---

## Conclusion

This solution demonstrates:

1. ✅ **End-to-end functionality** - All components work together
2. ✅ **Clean architecture** - Microservices with clear responsibilities
3. ✅ **Real-time performance** - WebSocket + smooth animations
4. ✅ **Code quality** - TypeScript, tests, linting, documentation
5. ✅ **User experience** - Intuitive map interface with visual feedback

The architecture is designed to be **maintainable**, **extensible**, and **production-ready** with minimal additional work.
