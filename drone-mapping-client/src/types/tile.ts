/**
 * @fileoverview Type definitions for tile data structures
 * 
 * These interfaces define the shape of tile metadata received from
 * the notification service and used throughout the application.
 * 
 * @module types/tile
 */

/**
 * Geographic bounds of a tile in WGS84 coordinates (EPSG:4326)
 * 
 * @interface TileBounds
 * @property {number} min_lon - Western boundary (minimum longitude)
 * @property {number} min_lat - Southern boundary (minimum latitude)
 * @property {number} max_lon - Eastern boundary (maximum longitude)
 * @property {number} max_lat - Northern boundary (maximum latitude)
 */
export interface TileBounds {
  min_lon: number;
  min_lat: number;
  max_lon: number;
  max_lat: number;
}

/**
 * Complete metadata for a single tile
 * 
 * This interface represents all information needed to display a tile
 * on the map and track its origin in the tile grid.
 * 
 * @interface TileMetadata
 * @property {string} id - Unique identifier (e.g., "tile_0_0")
 * @property {string} filename - Original filename (e.g., "tile_0_0.tif")
 * @property {number} row - Grid row position (0-9)
 * @property {number} col - Grid column position (0-9)
 * @property {TileBounds} bounds - Geographic bounds as named properties
 * @property {[number, number, number, number]} bbox - Bounds as array [minLat, minLon, maxLat, maxLon]
 * @property {number} width - Tile width in pixels
 * @property {number} height - Tile height in pixels
 * @property {string} tileUrl - TiTiler XYZ tile URL template
 * @property {string} tilejsonUrl - TileJSON metadata URL
 * @property {number} timestamp - Unix timestamp when tile was processed
 */
export interface TileMetadata {
  id: string;
  filename: string;
  row: number;
  col: number;
  bounds: TileBounds;
  bbox: [number, number, number, number];
  width: number;
  height: number;
  tileUrl: string;
  tilejsonUrl: string;
  timestamp: number;
}

/**
 * WebSocket message structure from notification service
 * 
 * Two message types:
 * - 'initial': Sent when client connects, contains all existing tiles
 * - 'new_tile': Sent when a new tile becomes available
 * 
 * @interface WebSocketMessage
 * @property {'initial' | 'new_tile'} type - Message type identifier
 * @property {TileMetadata[]} [tiles] - Array of tiles (for 'initial' type)
 * @property {TileMetadata} [tile] - Single tile (for 'new_tile' type)
 * @property {string} [titilerUrl] - TiTiler server URL (for 'initial' type)
 */
export interface WebSocketMessage {
  type: 'initial' | 'new_tile';
  tiles?: TileMetadata[];
  tile?: TileMetadata;
  titilerUrl?: string;
}

/**
 * Configuration response from notification service
 * 
 * @interface NotificationConfig
 * @property {string} titilerUrl - TiTiler server URL for tile requests
 * @property {string} wsUrl - WebSocket server URL for real-time updates
 */
export interface NotificationConfig {
  titilerUrl: string;
  wsUrl: string;
}
