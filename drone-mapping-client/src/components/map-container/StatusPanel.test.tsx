/**
 * @fileoverview Unit tests for StatusPanel component
 * 
 * Tests the status panel UI component that displays connection status,
 * tile counts, and drone position information.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatusPanel from '@/components/map-container/StatusPanel';
import type { DroneState } from '@/hooks/useTileWebSocket';

describe('StatusPanel', () => {
  /**
   * Default props for StatusPanel component
   */
  const defaultProps = {
    isConnected: true,
    tileCount: 10,
    visibleTileCount: 5,
    droneState: {
      position: { lon: 33.05, lat: 17.13 },
      isScanning: false,
      targetTile: null,
    } as DroneState,
    followDrone: true,
    onFollowDroneChange: vi.fn(),
  };

  /**
   * Test: Renders connection status correctly
   */
  it('should display connected status when isConnected is true', () => {
    render(<StatusPanel {...defaultProps} />);
    
    expect(screen.getByText('● Connected')).toBeInTheDocument();
  });

  /**
   * Test: Renders disconnected status
   */
  it('should display disconnected status when isConnected is false', () => {
    render(<StatusPanel {...defaultProps} isConnected={false} />);
    
    expect(screen.getByText('○ Disconnected')).toBeInTheDocument();
  });

  /**
   * Test: Displays tile count correctly
   */
  it('should display correct tile counts', () => {
    render(<StatusPanel {...defaultProps} tileCount={50} visibleTileCount={25} />);
    
    expect(screen.getByText('25 / 50')).toBeInTheDocument();
  });

  /**
   * Test: Shows scanning status when drone is scanning
   */
  it('should display scanning status when drone is scanning', () => {
    const scanningDroneState: DroneState = {
      position: { lon: 33.05, lat: 17.13 },
      isScanning: true,
      targetTile: null,
    };

    render(<StatusPanel {...defaultProps} droneState={scanningDroneState} />);
    
    expect(screen.getByText('🔴 Scanning...')).toBeInTheDocument();
  });

  /**
   * Test: Shows idle status when drone is not scanning
   */
  it('should display idle status when drone is not scanning', () => {
    render(<StatusPanel {...defaultProps} />);
    
    expect(screen.getByText('🟢 Idle')).toBeInTheDocument();
  });

  /**
   * Test: Displays drone position coordinates
   */
  it('should display drone position coordinates', () => {
    const droneState: DroneState = {
      position: { lon: 33.0500, lat: 17.1300 },
      isScanning: false,
      targetTile: null,
    };

    render(<StatusPanel {...defaultProps} droneState={droneState} />);
    
    expect(screen.getByText('17.1300°N, 33.0500°E')).toBeInTheDocument();
  });

  /**
   * Test: Follow drone checkbox interaction
   */
  it('should call onFollowDroneChange when checkbox is clicked', () => {
    const onFollowDroneChange = vi.fn();
    
    render(
      <StatusPanel
        {...defaultProps}
        followDrone={true}
        onFollowDroneChange={onFollowDroneChange}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(onFollowDroneChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test: Progress bar reflects completion percentage
   */
  it('should display progress percentage', () => {
    render(<StatusPanel {...defaultProps} visibleTileCount={75} />);
    
    expect(screen.getByText('75% Complete')).toBeInTheDocument();
  });

  /**
   * Test: Shows current tile info when available
   */
  it('should display current tile filename when targetTile is set', () => {
    const droneState: DroneState = {
      position: { lon: 33.05, lat: 17.13 },
      isScanning: true,
      targetTile: {
        id: 'tile_3_5',
        filename: 'tile_3_5.tif',
        row: 3,
        col: 5,
        bounds: { min_lon: 17.08, min_lat: 32.99, max_lon: 17.18, max_lat: 33.10 },
        bbox: [17.08, 32.99, 17.18, 33.10],
        width: 1097,
        height: 1104,
        tileUrl: 'http://localhost:8000/cog/tiles/{z}/{x}/{y}',
        tilejsonUrl: 'http://localhost:8000/cog/tilejson.json',
        timestamp: Date.now(),
      },
    };

    render(<StatusPanel {...defaultProps} droneState={droneState} />);
    
    expect(screen.getByText('tile_3_5.tif')).toBeInTheDocument();
    expect(screen.getByText('Row 3, Col 5')).toBeInTheDocument();
  });
});
