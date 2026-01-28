/**
 * @fileoverview StatusPanel component for drone mapping status overlay
 * 
 * This component displays real-time information about the drone mapping
 * simulation including connection status, progress, and drone position.
 * 
 * Features:
 * - WebSocket connection indicator
 * - Drone scanning status (idle/scanning)
 * - Tile progress counter
 * - Current tile information
 * - GPS coordinates display
 * - Follow drone toggle
 * - Visual progress bar
 * 
 * @module components/map-container/StatusPanel
 */

import React from 'react';
import type { DroneState } from '@/hooks/useTileWebSocket';
import '@/components/map-container/StatusPanel.scss';

/**
 * Props for StatusPanel component
 * @interface StatusPanelProps
 */
interface StatusPanelProps {
  /** Whether WebSocket is connected to notification service */
  isConnected: boolean;
  /** Total number of tiles received from server */
  tileCount: number;
  /** Number of tiles currently visible on map (after animation) */
  visibleTileCount: number;
  /** Current drone state including position and scanning status */
  droneState: DroneState;
  /** Whether camera should follow drone position */
  followDrone: boolean;
  /** Callback to toggle follow drone mode */
  onFollowDroneChange: (value: boolean) => void;
}

/**
 * StatusPanel - Overlay component showing drone mapping status
 * 
 * This component renders a floating panel in the corner of the map
 * that displays real-time status information. It provides:
 * 
 * 1. **Connection Status**: Visual indicator for WebSocket connection
 * 2. **Drone Status**: Shows if drone is actively scanning or idle
 * 3. **Progress Tracking**: Displays scanned tiles vs total
 * 4. **Current Tile**: Shows the file being processed and grid position
 * 5. **GPS Position**: Displays current drone coordinates
 * 6. **Follow Control**: Toggle to auto-center map on drone
 * 7. **Progress Bar**: Visual representation of completion percentage
 * 
 * @component
 * @param {StatusPanelProps} props - Component props
 * @returns {JSX.Element} Status panel overlay
 * 
 * @example
 * <StatusPanel
 *   isConnected={true}
 *   tileCount={50}
 *   visibleTileCount={25}
 *   droneState={droneState}
 *   followDrone={true}
 *   onFollowDroneChange={setFollowDrone}
 * />
 */
const StatusPanel: React.FC<StatusPanelProps> = ({
  isConnected,
  tileCount,
  visibleTileCount,
  droneState,
  followDrone,
  onFollowDroneChange
}) => {
  return (
    <div className="status-panel">
      {/* Header with title and connection indicator */}
      <div className="status-header">
        <h3>🚁 Drone Mapping</h3>
        <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>

      {/* Body with status information */}
      <div className="status-body">
        {/* Drone scanning status - shows idle (green) or scanning (red) */}
        <div className="stat-item">
          <span className="stat-label">Drone Status</span>
          <span className={`stat-value ${droneState.isScanning ? 'scanning' : 'idle'}`}>
            {droneState.isScanning ? '🔴 Scanning...' : '🟢 Idle'}
          </span>
        </div>

        {/* Tile count - visible tiles out of total received */}
        <div className="stat-item">
          <span className="stat-label">Tiles Scanned</span>
          <span className="stat-value">{visibleTileCount} / {tileCount}</span>
        </div>

        {/* Current tile info - only shown when drone has a target */}
        {droneState.targetTile && (
          <>
            {/* Current tile filename */}
            <div className="stat-item">
              <span className="stat-label">Current Tile</span>
              <span className="stat-value">{droneState.targetTile.filename}</span>
            </div>
            {/* Grid position (row, column) */}
            <div className="stat-item">
              <span className="stat-label">Grid Position</span>
              <span className="stat-value">
                Row {droneState.targetTile.row}, Col {droneState.targetTile.col}
              </span>
            </div>
          </>
        )}

        {/* GPS coordinates - displayed with 4 decimal precision */}
        {droneState.position && (
          <div className="stat-item">
            <span className="stat-label">Drone Position</span>
            <span className="stat-value coordinates">
              {droneState.position.lat.toFixed(4)}°N, {droneState.position.lon.toFixed(4)}°E
            </span>
          </div>
        )}

        {/* Follow drone toggle control */}
        <div className="controls">
          <label className="checkbox-control">
            <input
              type="checkbox"
              checked={followDrone}
              onChange={(e) => onFollowDroneChange(e.target.checked)}
            />
            <span>Follow Drone</span>
          </label>
        </div>
      </div>

      {/* Footer with progress bar */}
      <div className="status-footer">
        {/* Visual progress bar - width based on completion percentage */}
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(visibleTileCount / 100) * 100}%` }}
          />
        </div>
        <span className="progress-text">{visibleTileCount}% Complete</span>
      </div>
    </div>
  );
};

export default StatusPanel;
