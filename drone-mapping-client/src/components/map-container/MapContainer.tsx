/**
 * @fileoverview Main container component for the drone mapping interface
 * 
 * This component orchestrates the map display, drone visualization, and status panel.
 * It serves as the primary composition root for all map-related components.
 * 
 * Component Hierarchy:
 * MapContainer
 * ├── Map (OpenLayers base)
 * │   ├── DroneLayer (tile images)
 * │   └── DroneIcon (animated marker)
 * └── StatusPanel (overlay UI)
 * 
 * @module components/map-container/MapContainer
 */

import React, { useState } from 'react';
import { Map } from '@/components/map-container/map/Map';
import DroneLayer from '@/components/map-container/DroneLayer';
import DroneIcon from '@/components/map-container/DroneIcon';
import StatusPanel from '@/components/map-container/StatusPanel';
import { useTileWebSocket } from '@/hooks/useTileWebSocket';
import '@/components/map-container/MapContainer.scss';

/**
 * MapContainer - Main container for real-time drone mapping visualization
 * 
 * This component:
 * 1. Connects to WebSocket via useTileWebSocket hook
 * 2. Renders OpenLayers map with drone tiles
 * 3. Shows animated drone icon at current scanning position
 * 4. Displays status panel with connection info and progress
 * 
 * @component
 * @returns {JSX.Element} Complete mapping interface
 */
const MapContainer: React.FC = () => {
  // Get real-time tile data and connection state from WebSocket hook
  const { 
    visibleTiles,      // Tiles currently visible on map (after scan animation)
    isConnected,       // WebSocket connection status
    titilerUrl,        // TiTiler server URL for tile requests
    droneState,        // Current drone position and scanning state
    tileCount,         // Total tiles received
    visibleTileCount   // Tiles currently displayed
  } = useTileWebSocket();
  
  // Toggle for camera following drone position
  const [followDrone, setFollowDrone] = useState(true);

  /**
   * Map center coordinates (Libya region)
   * 
   * Note: The bbox in JSON files uses [lat, lon, lat, lon] format
   * Actual grid covers approximately:
   * - Longitude: 32.99° to 34.03° E
   * - Latitude: 16.19° to 17.18° N
   * - Center: [33.51, 16.685]
   */
  return (
    <div className="map-container">
      {/* OpenLayers map with initial view centered on tile grid */}
      <Map zoom={9} center={[33.51, 16.685]}>
        {/* Layer showing GeoTIFF tiles from TiTiler */}
        <DroneLayer tiles={visibleTiles} titilerUrl={titilerUrl} />
        
        {/* Animated drone marker showing current position */}
        <DroneIcon droneState={droneState} followDrone={followDrone} />
      </Map>
      
      {/* Overlay panel with status information */}
      <StatusPanel
        isConnected={isConnected}
        tileCount={tileCount}
        visibleTileCount={visibleTileCount}
        droneState={droneState}
        followDrone={followDrone}
        onFollowDroneChange={setFollowDrone}
      />
    </div>
  );
};

export default MapContainer;
