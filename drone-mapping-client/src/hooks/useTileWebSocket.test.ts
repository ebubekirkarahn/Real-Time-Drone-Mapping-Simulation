/**
 * @fileoverview Unit tests for useTileWebSocket hook
 * 
 * Tests the WebSocket connection management and tile state handling
 * for the real-time drone mapping application.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTileWebSocket } from '@/hooks/useTileWebSocket';
import type { TileMetadata } from '@/types/tile';

describe('useTileWebSocket', () => {
  let mockWebSocket: {
    onopen: ((event: Event) => void) | null;
    onclose: ((event: CloseEvent) => void) | null;
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    readyState: number;
    close: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create a controllable mock WebSocket
    mockWebSocket = {
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      readyState: WebSocket.CONNECTING,
      close: vi.fn(),
      send: vi.fn(),
    };

    // Override global WebSocket
    vi.stubGlobal('WebSocket', vi.fn(() => mockWebSocket));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test: Initial state before WebSocket connection
   */
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTileWebSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.tiles).toEqual([]);
    expect(result.current.visibleTiles).toEqual([]);
    expect(result.current.tileCount).toBe(0);
    expect(result.current.droneState.position).toBeNull();
  });

  /**
   * Test: WebSocket connection establishment
   */
  it('should set isConnected to true when WebSocket opens', async () => {
    const { result } = renderHook(() => useTileWebSocket());

    // Simulate WebSocket connection
    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  /**
   * Test: Handling initial tiles message
   */
  it('should handle initial tiles message correctly', async () => {
    const { result } = renderHook(() => useTileWebSocket());

    const mockTile: TileMetadata = {
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

    // Simulate connection and initial message
    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));
    });

    act(() => {
      const message = {
        type: 'initial',
        tiles: [mockTile],
        titilerUrl: 'http://localhost:8000',
      };
      mockWebSocket.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(message),
      }));
    });

    await waitFor(() => {
      expect(result.current.tiles.length).toBe(1);
      expect(result.current.tiles[0].id).toBe('tile_0_0');
    });
  });

  /**
   * Test: WebSocket disconnection handling
   */
  it('should set isConnected to false when WebSocket closes', async () => {
    const { result } = renderHook(() => useTileWebSocket());

    // Connect first
    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Then disconnect
    act(() => {
      mockWebSocket.readyState = WebSocket.CLOSED;
      mockWebSocket.onclose?.(new CloseEvent('close'));
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  /**
   * Test: Tile count tracking
   */
  it('should correctly track tile counts', async () => {
    const { result } = renderHook(() => useTileWebSocket());

    const mockTiles: TileMetadata[] = [
      {
        id: 'tile_0_0',
        filename: 'tile_0_0.tif',
        row: 0,
        col: 0,
        bounds: { min_lon: 17.08, min_lat: 32.99, max_lon: 17.18, max_lat: 33.10 },
        bbox: [17.08, 32.99, 17.18, 33.10],
        width: 1097,
        height: 1104,
        tileUrl: 'http://localhost:8000/cog/tiles/{z}/{x}/{y}',
        tilejsonUrl: 'http://localhost:8000/cog/tilejson.json',
        timestamp: Date.now(),
      },
      {
        id: 'tile_0_1',
        filename: 'tile_0_1.tif',
        row: 0,
        col: 1,
        bounds: { min_lon: 17.18, min_lat: 32.99, max_lon: 17.28, max_lat: 33.10 },
        bbox: [17.18, 32.99, 17.28, 33.10],
        width: 1097,
        height: 1104,
        tileUrl: 'http://localhost:8000/cog/tiles/{z}/{x}/{y}',
        tilejsonUrl: 'http://localhost:8000/cog/tilejson.json',
        timestamp: Date.now(),
      },
    ];

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));
    });

    act(() => {
      const message = {
        type: 'initial',
        tiles: mockTiles,
        titilerUrl: 'http://localhost:8000',
      };
      mockWebSocket.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(message),
      }));
    });

    await waitFor(() => {
      expect(result.current.tileCount).toBe(2);
    });
  });
});
