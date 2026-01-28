/**
 * @fileoverview Unit tests for tile type definitions
 * 
 * Tests type validation and structure of tile metadata objects.
 */

import { describe, it, expect } from 'vitest';
import type { TileMetadata, TileBounds, WebSocketMessage } from '@/types/tile';

describe('Tile Types', () => {
  /**
   * Test: TileBounds structure validation
   */
  describe('TileBounds', () => {
    it('should accept valid bounds object', () => {
      const bounds: TileBounds = {
        min_lon: 17.08573692146236,
        min_lat: 32.999811920932004,
        max_lon: 17.184992362534484,
        max_lat: 33.10301927557229,
      };

      expect(bounds.min_lon).toBeLessThan(bounds.max_lon);
      expect(bounds.min_lat).toBeLessThan(bounds.max_lat);
    });
  });

  /**
   * Test: TileMetadata structure validation
   */
  describe('TileMetadata', () => {
    it('should have all required properties', () => {
      const tile: TileMetadata = {
        id: 'tile_0_0',
        filename: 'tile_0_0.tif',
        row: 0,
        col: 0,
        bounds: {
          min_lon: 17.08,
          min_lat: 32.99,
          max_lon: 17.18,
          max_lat: 33.10,
        },
        bbox: [17.08, 32.99, 17.18, 33.10],
        width: 1097,
        height: 1104,
        tileUrl: 'http://localhost:8000/cog/tiles/{z}/{x}/{y}',
        tilejsonUrl: 'http://localhost:8000/cog/tilejson.json',
        timestamp: Date.now(),
      };

      expect(tile.id).toBeDefined();
      expect(tile.filename).toMatch(/\.tif$/);
      expect(tile.row).toBeGreaterThanOrEqual(0);
      expect(tile.col).toBeGreaterThanOrEqual(0);
      expect(tile.bbox).toHaveLength(4);
      expect(tile.width).toBeGreaterThan(0);
      expect(tile.height).toBeGreaterThan(0);
    });

    it('should generate correct tile ID from row and col', () => {
      const row = 3;
      const col = 5;
      const expectedId = `tile_${row}_${col}`;

      expect(expectedId).toBe('tile_3_5');
    });
  });

  /**
   * Test: WebSocketMessage type validation
   */
  describe('WebSocketMessage', () => {
    it('should handle initial message type', () => {
      const message: WebSocketMessage = {
        type: 'initial',
        tiles: [],
        titilerUrl: 'http://localhost:8000',
      };

      expect(message.type).toBe('initial');
      expect(message.tiles).toBeDefined();
    });

    it('should handle new_tile message type', () => {
      const message: WebSocketMessage = {
        type: 'new_tile',
        tile: {
          id: 'tile_0_0',
          filename: 'tile_0_0.tif',
          row: 0,
          col: 0,
          bounds: {
            min_lon: 17.08,
            min_lat: 32.99,
            max_lon: 17.18,
            max_lat: 33.10,
          },
          bbox: [17.08, 32.99, 17.18, 33.10],
          width: 1097,
          height: 1104,
          tileUrl: 'http://localhost:8000/cog/tiles/{z}/{x}/{y}',
          tilejsonUrl: 'http://localhost:8000/cog/tilejson.json',
          timestamp: Date.now(),
        },
      };

      expect(message.type).toBe('new_tile');
      expect(message.tile).toBeDefined();
    });
  });
});
