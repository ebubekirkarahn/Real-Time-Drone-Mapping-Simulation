/**
 * @fileoverview Custom React hook for real-time WebSocket tile communication
 * 
 * This hook manages the WebSocket connection to the notification service,
 * handles incoming tile data, and orchestrates the drone scanning animation.
 * 
 * Key Features:
 * - Automatic WebSocket connection with reconnection logic
 * - Real-time tile updates from the notification service
 * - Drone position tracking and scanning animation state
 * - Queue-based tile processing for smooth animations
 * 
 * @module hooks/useTileWebSocket
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { TileMetadata, WebSocketMessage } from '@/types/tile';

/**
 * Represents the current state of the drone on the map
 * 
 * @interface DroneState
 * @property {Object|null} position - Current longitude/latitude coordinates
 * @property {boolean} isScanning - Whether the drone is currently scanning a tile
 * @property {TileMetadata|null} targetTile - The tile currently being scanned
 */
export interface DroneState {
  position: { lon: number; lat: number } | null;
  isScanning: boolean;
  targetTile: TileMetadata | null;
}

/**
 * Custom hook for managing real-time tile updates via WebSocket
 * 
 * This hook connects to the notification service WebSocket server and:
 * 1. Receives initial tile state when connecting
 * 2. Receives real-time updates when new tiles become available
 * 3. Manages drone animation state for visual feedback
 * 4. Handles automatic reconnection on connection loss
 * 
 * @returns {Object} Hook state and data
 * @example
 * const { visibleTiles, isConnected, droneState } = useTileWebSocket();
 */
export const useTileWebSocket = () => {
  // ============================================================
  // CONFIGURATION - Environment variables with sensible defaults
  // ============================================================
  
  /** WebSocket server URL - connects to notification service */
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
  /** TiTiler server URL for fetching tile images */
  const DEFAULT_TITILER_URL = import.meta.env.VITE_TITILER_URL || 'http://localhost:8000';
  /** Duration of scanning animation in milliseconds */
  const SCANNING_DURATION = Number(import.meta.env.VITE_SCANNING_DURATION) || 2000;

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  
  /** All tiles received from server (includes pending ones) */
  const [tiles, setTiles] = useState<Map<string, TileMetadata>>(new Map());
  
  /** Tiles that have completed scanning animation and are visible on map */
  const [visibleTiles, setVisibleTiles] = useState<Map<string, TileMetadata>>(new Map());
  
  /** WebSocket connection status */
  const [isConnected, setIsConnected] = useState(false);
  
  /** TiTiler server URL (may be updated from server message) */
  const [titilerUrl, setTitilerUrl] = useState<string>(DEFAULT_TITILER_URL);
  
  /** Current drone state for visualization */
  const [droneState, setDroneState] = useState<DroneState>({
    position: null,
    isScanning: false,
    targetTile: null
  });
  
  // ============================================================
  // REFS - Persist across renders without causing re-renders
  // ============================================================
  
  /** WebSocket instance reference */
  const wsRef = useRef<WebSocket | null>(null);
  
  /** Reconnection timeout handle */
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  /** Queue of tiles waiting to be processed with scanning animation */
  const pendingTilesRef = useRef<TileMetadata[]>([]);
  
  /** Flag indicating if a tile is currently being processed */
  const processingRef = useRef<boolean>(false);

  // ============================================================
  // TILE PROCESSING - Queue-based animation system
  // ============================================================
  
  /**
   * Process the next tile in the pending queue
   * 
   * This function implements the drone scanning animation:
   * 1. Dequeue next tile from pending queue
   * 2. Calculate tile center coordinates
   * 3. Move drone to position and start scanning animation
   * 4. After SCANNING_DURATION, add tile to visible tiles
   * 5. Stop scanning and process next tile
   * 
   * @callback
   */
  const processNextTile = useCallback(() => {
    // Don't process if already processing or queue is empty
    if (processingRef.current || pendingTilesRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    const tile = pendingTilesRef.current.shift()!;

    /**
     * Calculate tile center from bounding box
     * 
     * Note: bbox format is [lat, lon, lat, lon] due to data source issue
     * bbox[0] = minLat, bbox[1] = minLon, bbox[2] = maxLat, bbox[3] = maxLon
     */
    const centerLon = (tile.bbox[1] + tile.bbox[3]) / 2;
    const centerLat = (tile.bbox[0] + tile.bbox[2]) / 2;

    console.log(`Drone flying to tile ${tile.id} at [${centerLon}, ${centerLat}]`);

    // Step 1: Move drone to tile position and start scanning animation
    setDroneState({
      position: { lon: centerLon, lat: centerLat },
      isScanning: true,
      targetTile: tile
    });

    // Step 2: After scanning duration, complete the tile
    setTimeout(() => {
      console.log(`Scanning complete for tile ${tile.id}, adding to map`);
      
      // Add tile to visible tiles (triggers layer creation in DroneLayer)
      setVisibleTiles(prev => {
        const newMap = new Map(prev);
        newMap.set(tile.id, tile);
        return newMap;
      });

      // Stop scanning animation
      setDroneState(prev => ({
        ...prev,
        isScanning: false
      }));

      // Step 3: Process next tile after a short delay (smoother animation)
      setTimeout(() => {
        processingRef.current = false;
        processNextTile();  // Recursive call for next tile
      }, 300);
    }, SCANNING_DURATION);
  }, []);

  // ============================================================
  // WEBSOCKET CONNECTION - Connect and handle messages
  // ============================================================
  
  /**
   * Establish WebSocket connection to notification service
   * 
   * Handles:
   * - Connection establishment
   * - Message parsing (initial state and new tiles)
   * - Automatic reconnection on disconnect
   * - Error handling
   * 
   * @callback
   */
  const connect = useCallback(() => {
    // Don't create duplicate connections
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    /**
     * Connection opened handler
     */
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    /**
     * Message received handler
     * 
     * Processes two message types:
     * 1. 'initial' - Contains all existing tiles (sent on connection)
     * 2. 'new_tile' - Contains a newly available tile
     */
    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        if (message.type === 'initial') {
          // ========================================
          // INITIAL STATE - Load all existing tiles
          // ========================================
          
          // Update TiTiler URL if provided by server
          if (message.titilerUrl) {
            setTitilerUrl(message.titilerUrl);
          }
          
          if (message.tiles && message.tiles.length > 0) {
            // Sort tiles by row, then col for consistent ordering
            const sorted = [...message.tiles].sort((a, b) => {
              if (a.row !== b.row) return a.row - b.row;
              return a.col - b.col;
            });
            
            // Store all tiles in state
            setTiles(new Map(sorted.map(tile => [tile.id, tile])));
            
            // Existing tiles are already scanned - show immediately (no animation)
            setVisibleTiles(new Map(sorted.map(tile => [tile.id, tile])));
            
            // Position drone at the last tile (most recently scanned)
            const lastTile = sorted[sorted.length - 1];
            if (lastTile) {
              // Calculate center coordinates
              const centerLon = (lastTile.bbox[1] + lastTile.bbox[3]) / 2;
              const centerLat = (lastTile.bbox[0] + lastTile.bbox[2]) / 2;
              setDroneState({
                position: { lon: centerLon, lat: centerLat },
                isScanning: false,
                targetTile: lastTile
              });
            }
          }
        } else if (message.type === 'new_tile' && message.tile) {
          // ========================================
          // NEW TILE - Add to queue for animation
          // ========================================
          
          // Add to all tiles state immediately
          setTiles(prev => {
            const newMap = new Map(prev);
            newMap.set(message.tile!.id, message.tile!);
            return newMap;
          });
          
          // Add to pending queue for scanning animation
          pendingTilesRef.current.push(message.tile);
          processNextTile();  // Start processing if not already running
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    /**
     * Connection closed handler
     * 
     * Implements automatic reconnection after 2 seconds
     */
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      // Attempt reconnection after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => connect(), 2000);
    };

    /**
     * Error handler
     */
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [processNextTile]);

  // ============================================================
  // LIFECYCLE - Connect on mount, cleanup on unmount
  // ============================================================
  
  useEffect(() => {
    // Establish WebSocket connection
    connect();
    
    // Cleanup on unmount
    return () => {
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      // Close WebSocket connection
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // ============================================================
  // RETURN VALUE - Expose state to consuming components
  // ============================================================
  
  return {
    /** All tiles received from server */
    tiles: Array.from(tiles.values()),
    /** Tiles currently visible on map (after animation) */
    visibleTiles: Array.from(visibleTiles.values()),
    /** WebSocket connection status */
    isConnected,
    /** TiTiler server URL for tile image requests */
    titilerUrl,
    /** Current drone state (position, scanning status) */
    droneState,
    /** Total tile count */
    tileCount: tiles.size,
    /** Visible tile count */
    visibleTileCount: visibleTiles.size
  };
};
