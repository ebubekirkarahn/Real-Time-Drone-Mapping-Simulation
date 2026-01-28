/**
 * @fileoverview Real-Time Tile Notification Service
 * 
 * This Node.js service provides real-time notifications when new drone tiles
 * become available. It acts as a bridge between the file system (where tiles
 * are generated) and web clients (that need to display them).
 * 
 * Architecture:
 * ┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
 * │  Drone Sim      │────>│  Notification Service│────>│  Web Clients    │
 * │  (copy_tiles)   │     │  (this service)      │     │  (React App)    │
 * └─────────────────┘     └──────────────────────┘     └─────────────────┘
 *        │                         │                           │
 *   Writes tiles            Watches for new          Receives real-time
 *   to volume               files with chokidar      updates via WebSocket
 * 
 * Key Features:
 * - File watching with chokidar for change detection
 * - WebSocket server for real-time client notifications
 * - REST API for tile metadata queries
 * - Automatic tile URL generation for TiTiler integration
 * 
 * Environment Variables:
 * - PORT: Server port (default: 3001)
 * - TILES_DIR: Directory to watch for tile files (default: /data/tiles)
 * - TITILER_URL: Internal TiTiler URL for Docker network (default: http://titiler:8000)
 * - TITILER_PUBLIC_URL: Public TiTiler URL for browser access (default: http://localhost:8000)
 * 
 * @module notification-service
 * @requires express
 * @requires ws
 * @requires chokidar
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const chokidar = require('chokidar');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// ============================================================
// SERVER INITIALIZATION
// ============================================================

/** Express application instance */
const app = express();

/** HTTP server wrapping Express for WebSocket support */
const server = http.createServer(app);

/** WebSocket server for real-time client communication */
const wss = new WebSocket.Server({ server });

// ============================================================
// CONFIGURATION - Environment Variables
// ============================================================

/** 
 * Server port for HTTP and WebSocket connections
 * @constant {number}
 */
const PORT = process.env.PORT || 3001;

/** 
 * Directory path to watch for new tile files
 * This is where the drone simulator writes tiles
 * @constant {string}
 */
const TILES_DIR = process.env.TILES_DIR || '/data/tiles';

/** 
 * TiTiler URL for internal Docker network communication
 * Used for server-side health checks and API calls
 * @constant {string}
 */
const TITILER_URL = process.env.TITILER_URL || 'http://titiler:8000';

/** 
 * TiTiler URL accessible from browser (outside Docker network)
 * This URL is sent to clients for tile image requests
 * @constant {string}
 */
const TITILER_PUBLIC_URL = process.env.TITILER_PUBLIC_URL || 'http://localhost:8000';

// ============================================================
// MIDDLEWARE CONFIGURATION
// ============================================================

/**
 * Enable CORS for all origins
 * Required for cross-origin WebSocket and REST API access
 */
app.use(cors());

/** Parse JSON request bodies */
app.use(express.json());

// ============================================================
// STATE MANAGEMENT
// ============================================================

/** 
 * Set of currently connected WebSocket clients
 * Used for broadcasting tile updates
 * @type {Set<WebSocket>}
 */
const clients = new Set();

/** 
 * Map storing metadata for all available tiles
 * Key: tile ID (e.g., "tile_0_0")
 * Value: tile metadata object with bounds, URLs, etc.
 * @type {Map<string, Object>}
 */
const tilesMetadata = new Map();

// ============================================================
// WEBSOCKET HANDLERS
// ============================================================

/**
 * Handle new WebSocket client connections
 * 
 * When a client connects:
 * 1. Add to clients set for broadcasting
 * 2. Send current tile state immediately
 * 3. Set up disconnect and error handlers
 */
wss.on('connection', (ws) => {
  // Add client to broadcast set
  clients.add(ws);

  // Send current state to newly connected client
  // This ensures the client has all existing tiles immediately
  const currentTiles = Array.from(tilesMetadata.values());
  ws.send(JSON.stringify({
    type: 'initial',
    tiles: currentTiles,
    titilerUrl: TITILER_PUBLIC_URL
  }));

  /**
   * Handle client disconnection
   * Remove from clients set to stop receiving broadcasts
   */
  ws.on('close', () => {
    clients.delete(ws);
  });

  /**
   * Handle WebSocket errors
   * Remove client to prevent broadcast failures
   */
  ws.on('error', () => {
    clients.delete(ws);
  });
});

// ============================================================
// BROADCAST UTILITIES
// ============================================================

/**
 * Broadcast a message to all connected WebSocket clients
 * 
 * Only sends to clients with OPEN readyState to avoid errors.
 * Used for real-time tile update notifications.
 * 
 * @param {Object} message - Message object to broadcast (will be JSON stringified)
 */
function broadcast(message) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// ============================================================
// TILE PROCESSING
// ============================================================

/**
 * Read and parse tile metadata from a JSON file
 * 
 * Each tile has an accompanying JSON file with geographic bounds
 * and other metadata needed for map display.
 * 
 * @param {string} jsonPath - Absolute path to the JSON metadata file
 * @returns {Object|null} Parsed metadata object or null if read fails
 */
function readTileMetadata(jsonPath) {
  try {
    const content = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Process a newly detected tile file
 * 
 * This function:
 * 1. Validates the file is a JSON metadata file
 * 2. Checks that the corresponding TIF file exists
 * 3. Reads and enriches the metadata with tile URLs
 * 4. Stores the tile and broadcasts to all clients
 * 
 * @param {string} filePath - Absolute path to the detected file
 */
function processNewTile(filePath) {
  const filename = path.basename(filePath);
  
  // Only process JSON metadata files (not TIF files)
  if (!filename.endsWith('.json')) {
    return;
  }

  // Extract tile ID from filename (e.g., "tile_0_0.json" -> "tile_0_0")
  const tileId = filename.replace('.json', '');
  const tifFilename = `${tileId}.tif`;
  const tifPath = path.join(path.dirname(filePath), tifFilename);

  // Ensure the corresponding TIF file exists before processing
  // The TIF file is the actual image data, JSON is just metadata
  if (!fs.existsSync(tifPath)) {
    return;
  }

  // Read and parse the metadata
  const metadata = readTileMetadata(filePath);
  if (!metadata) {
    return;
  }

  /**
   * Enrich metadata with TiTiler URLs for tile access
   * 
   * tileUrl: XYZ tile endpoint for map rendering
   * tilejsonUrl: TileJSON specification for layer configuration
   */
  const tileData = {
    ...metadata,
    id: tileId,
    // XYZ tile URL template for OpenLayers
    tileUrl: `${TITILER_PUBLIC_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=/data/${tifFilename}`,
    // TileJSON endpoint for metadata
    tilejsonUrl: `${TITILER_PUBLIC_URL}/cog/tilejson.json?url=/data/${tifFilename}`,
    // Timestamp for ordering and debugging
    timestamp: Date.now()
  };

  // Store in local cache
  tilesMetadata.set(tileId, tileData);

  // Broadcast new tile to all connected clients
  broadcast({
    type: 'new_tile',
    tile: tileData
  });
}

// ============================================================
// FILE WATCHER
// ============================================================

/**
 * Initialize the file system watcher using chokidar
 * 
 * Chokidar provides reliable cross-platform file watching with:
 * - Debouncing to handle incomplete writes
 * - Persistent watching for long-running service
 * - Event-based API for add/change/error events
 * 
 * On startup, also scans for existing tiles to handle service restarts
 */
function initializeWatcher() {
  // Scan existing files on startup
  // This handles cases where tiles exist before the service starts
  if (fs.existsSync(TILES_DIR)) {
    const files = fs.readdirSync(TILES_DIR);
    files.filter(f => f.endsWith('.json')).forEach(file => {
      processNewTile(path.join(TILES_DIR, file));
    });
  }

  /**
   * Configure chokidar watcher
   * 
   * Options explained:
   * - ignored: Skip hidden files (starting with .)
   * - persistent: Keep process running
   * - ignoreInitial: Don't trigger for existing files (we scan manually)
   * - awaitWriteFinish: Wait for file writes to complete before triggering
   *   - stabilityThreshold: File must be unchanged for 500ms
   *   - pollInterval: Check file every 100ms
   */
  const watcher = chokidar.watch(TILES_DIR, {
    ignored: /^\./,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  // Set up event handlers
  watcher
    .on('add', (filePath) => {
      processNewTile(filePath);
    })
    .on('change', (filePath) => {
      processNewTile(filePath);
    })
    .on('error', () => {
      // Error logged but watcher continues
    });
}

// ============================================================
// REST API ENDPOINTS
// ============================================================

/**
 * GET /api/tiles
 * 
 * Returns all available tiles with metadata
 * Useful for initial data load or debugging
 * 
 * @returns {Object} { count, tiles, titilerUrl }
 */
app.get('/api/tiles', (_req, res) => {
  const tiles = Array.from(tilesMetadata.values());
  res.json({
    count: tiles.length,
    tiles: tiles,
    titilerUrl: TITILER_URL
  });
});

/**
 * GET /api/tiles/:id
 * 
 * Returns metadata for a specific tile by ID
 * 
 * @param {string} id - Tile ID (e.g., "tile_0_0")
 * @returns {Object} Tile metadata or 404 error
 */
app.get('/api/tiles/:id', (req, res) => {
  const tile = tilesMetadata.get(req.params.id);
  if (tile) {
    res.json(tile);
  } else {
    res.status(404).json({ error: 'Tile not found' });
  }
});

/**
 * GET /health
 * 
 * Health check endpoint for Docker healthcheck and monitoring
 * Returns service status, tile count, and uptime
 * 
 * @returns {Object} { status, tilesCount, uptime }
 */
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    tilesCount: tilesMetadata.size,
    uptime: process.uptime()
  });
});

/**
 * GET /api/config
 * 
 * Returns service configuration for client setup
 * 
 * @returns {Object} { titilerUrl, wsUrl }
 */
app.get('/api/config', (_req, res) => {
  res.json({
    titilerUrl: TITILER_URL,
    wsUrl: `ws://localhost:${PORT}`
  });
});

// ============================================================
// SERVER STARTUP
// ============================================================

/**
 * Start the HTTP/WebSocket server
 * 
 * Binds to 0.0.0.0 to accept connections from any interface
 * (required for Docker container networking)
 */
server.listen(PORT, '0.0.0.0', () => {
  // Initialize file watcher after server is ready
  initializeWatcher();
});
