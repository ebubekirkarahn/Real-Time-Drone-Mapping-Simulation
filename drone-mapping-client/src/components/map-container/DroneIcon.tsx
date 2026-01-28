/**
 * @fileoverview DroneIcon component for animated drone marker on map
 * 
 * This component renders an animated drone icon on the OpenLayers map
 * that shows the current position and scanning state of the drone.
 * 
 * Features:
 * - Custom SVG drone icon (blue for idle, red for scanning)
 * - Animated scanning radius circle
 * - Smooth position transitions
 * - Optional camera following
 * 
 * Visual States:
 * - Idle: Blue drone with green center light, subtle green pulse
 * - Scanning: Red drone with pulsing scan radius, red dashed circle
 * 
 * @module components/map-container/DroneIcon
 */

import { useContext, useEffect, useRef, useState } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Icon, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { MapContext } from '@/components/map-container/map/MapContext';
import type { DroneState } from '@/hooks/useTileWebSocket';

/**
 * Props for DroneIcon component
 * @interface DroneIconProps
 */
interface DroneIconProps {
  /** Current drone state from WebSocket hook */
  droneState: DroneState;
  /** Whether to center map on drone position changes */
  followDrone?: boolean;
}

/**
 * SVG drone icon - Normal/Idle state
 * 
 * Visual design:
 * - Blue square body with rounded corners
 * - Gray arms extending to 4 rotors
 * - Gray rotor circles at each corner
 * - Green center light indicating idle status
 * - 45° rotation for quadcopter appearance
 */
const DRONE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="48" height="48">
  <g transform="rotate(45, 32, 32)">
    <rect x="24" y="24" width="16" height="16" rx="3" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>
    <line x1="32" y1="8" x2="32" y2="24" stroke="#374151" stroke-width="3" stroke-linecap="round"/>
    <line x1="32" y1="40" x2="32" y2="56" stroke="#374151" stroke-width="3" stroke-linecap="round"/>
    <line x1="8" y1="32" x2="24" y2="32" stroke="#374151" stroke-width="3" stroke-linecap="round"/>
    <line x1="40" y1="32" x2="56" y2="32" stroke="#374151" stroke-width="3" stroke-linecap="round"/>
    <circle cx="32" cy="8" r="6" fill="#6b7280" opacity="0.8"/>
    <circle cx="32" cy="56" r="6" fill="#6b7280" opacity="0.8"/>
    <circle cx="8" cy="32" r="6" fill="#6b7280" opacity="0.8"/>
    <circle cx="56" cy="32" r="6" fill="#6b7280" opacity="0.8"/>
    <circle cx="32" cy="32" r="4" fill="#22c55e"/>
  </g>
</svg>
`;

/**
 * SVG drone icon - Scanning state
 * 
 * Visual design:
 * - Red square body indicating active scanning
 * - Red rotors for visual distinction
 * - Yellow/amber center light as warning indicator
 * - Same 45° rotation as idle state
 */
const DRONE_SCANNING_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="48" height="48">
  <g transform="rotate(45, 32, 32)">
    <rect x="24" y="24" width="16" height="16" rx="3" fill="#dc2626" stroke="#b91c1c" stroke-width="2"/>
    <line x1="32" y1="8" x2="32" y2="24" stroke="#374151" stroke-width="3" stroke-linecap="round"/>
    <line x1="32" y1="40" x2="32" y2="56" stroke="#374151" stroke-width="3" stroke-linecap="round"/>
    <line x1="8" y1="32" x2="24" y2="32" stroke="#374151" stroke-width="3" stroke-linecap="round"/>
    <line x1="40" y1="32" x2="56" y2="32" stroke="#374151" stroke-width="3" stroke-linecap="round"/>
    <circle cx="32" cy="8" r="6" fill="#ef4444" opacity="0.9"/>
    <circle cx="32" cy="56" r="6" fill="#ef4444" opacity="0.9"/>
    <circle cx="8" cy="32" r="6" fill="#ef4444" opacity="0.9"/>
    <circle cx="56" cy="32" r="6" fill="#ef4444" opacity="0.9"/>
    <circle cx="32" cy="32" r="4" fill="#fbbf24"/>
  </g>
</svg>
`;

/**
 * DroneIcon - Animated drone marker component for OpenLayers map
 * 
 * This component creates and manages OpenLayers vector features to display
 * an animated drone icon on the map. Key features:
 * 
 * 1. **Dynamic SVG Icon**: Switches between idle (blue) and scanning (red)
 *    based on drone state
 * 
 * 2. **Scan Radius Animation**: Shows expanding/pulsing circle when scanning
 * 
 * 3. **Position Updates**: Smoothly updates drone position from WebSocket data
 * 
 * 4. **Camera Following**: Optionally animates map view to follow drone
 * 
 * @component
 * @param {DroneIconProps} props - Component props
 * @returns {null} Renders nothing (manages OpenLayers features directly)
 * 
 * @example
 * <DroneIcon droneState={droneState} followDrone={true} />
 */
const DroneIcon: React.FC<DroneIconProps> = ({ droneState, followDrone = true }) => {
  // Access OpenLayers map from context
  const map = useContext(MapContext);
  
  // Refs to OpenLayers objects (persist across renders)
  const layerRef = useRef<VectorLayer<Feature> | null>(null);
  const featureRef = useRef<Feature<Point> | null>(null);
  const scanAreaRef = useRef<Feature<Point> | null>(null);
  
  // Animated scan radius (cycles 10-80 pixels when scanning)
  const [scanRadius, setScanRadius] = useState(10);

  /**
   * Default drone position (center of tile grid in Libya)
   * 
   * Note: bbox in JSON files uses [lat, lon, lat, lon] format
   * tile_0_0 bbox: [17.08, 32.99, 17.18, 33.10]
   * So actual starting position: lon ~33.05, lat ~17.135
   */
  const DEFAULT_POSITION = fromLonLat([33.05, 17.135]);

  /**
   * Effect: Scanning animation
   * 
   * When drone is scanning, animate the scan radius from 10 to 80 pixels
   * in a loop, creating an expanding circle effect
   */
  useEffect(() => {
    if (!droneState.isScanning) {
      setScanRadius(10);
      return;
    }
    
    const interval = setInterval(() => {
      setScanRadius(prev => prev >= 80 ? 10 : prev + 3);
    }, 50);
    return () => clearInterval(interval);
  }, [droneState.isScanning]);

  /**
   * Effect: Initialize OpenLayers vector layer and features
   * 
   * Creates:
   * - VectorSource to hold features
   * - Drone feature (Point geometry with icon style)
   * - Scan area feature (Point geometry with circle style)
   * - VectorLayer to render features on map
   */
  useEffect(() => {
    if (!map) return;

    const source = new VectorSource();
    
    // Create drone feature at default position (Libya)
    const droneFeature = new Feature({
      geometry: new Point(DEFAULT_POSITION)
    });

    // Create scan area feature (same position as drone)
    const scanAreaFeature = new Feature({
      geometry: new Point(DEFAULT_POSITION)
    });

    // Hide drone initially until we get real position from WebSocket
    if (!droneState.position) {
      droneFeature.setStyle(new Style({})); // Empty style = invisible
      scanAreaFeature.setStyle(new Style({}));
    }

    source.addFeatures([scanAreaFeature, droneFeature]);
    
    // Create vector layer with high z-index to appear above tiles
    const layer = new VectorLayer({
      source,
      zIndex: 1000  // Ensure drone appears above all tile layers
    });

    map.addLayer(layer);
    layerRef.current = layer;
    featureRef.current = droneFeature;
    scanAreaRef.current = scanAreaFeature;

    // Cleanup: remove layer when component unmounts
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map]);

  /**
   * Effect: Update drone icon style based on scanning state
   * 
   * Switches between DRONE_SVG (blue) and DRONE_SCANNING_SVG (red)
   * based on droneState.isScanning
   */
  useEffect(() => {
    if (!featureRef.current) return;

    const svg = droneState.isScanning ? DRONE_SCANNING_SVG : DRONE_SVG;
    const droneStyle = new Style({
      image: new Icon({
        src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
        scale: 1,
        anchor: [0.5, 0.5]  // Center the icon on the point
      })
    });
    featureRef.current.setStyle(droneStyle);
  }, [droneState.isScanning]);

  /**
   * Effect: Update scan area animation circle
   * 
   * When scanning: Red expanding circle with dashed stroke
   * When idle: Green subtle pulse circle
   */
  useEffect(() => {
    if (!scanAreaRef.current) return;

    if (droneState.isScanning) {
      // Scanning state: expanding red circle with fading opacity
      const scanStyle = new Style({
        image: new CircleStyle({
          radius: scanRadius,
          fill: new Fill({ color: `rgba(239, 68, 68, ${0.3 - (scanRadius / 80) * 0.25})` }),
          stroke: new Stroke({ color: '#ef4444', width: 2, lineDash: [5, 5] })
        })
      });
      scanAreaRef.current.setStyle(scanStyle);
    } else {
      // Idle state: subtle green pulse
      const pulseStyle = new Style({
        image: new CircleStyle({
          radius: 15,
          fill: new Fill({ color: 'rgba(34, 197, 94, 0.2)' }),
          stroke: new Stroke({ color: '#22c55e', width: 2 })
        })
      });
      scanAreaRef.current.setStyle(pulseStyle);
    }
  }, [scanRadius, droneState.isScanning]);

  /**
   * Effect: Update drone position on map
   * 
   * When droneState.position changes:
   * 1. Update drone feature geometry to new coordinates
   * 2. Update scan area feature geometry
   * 3. Ensure drone is visible with correct style
   * 4. Animate map view to follow drone (if enabled)
   */
  useEffect(() => {
    if (!map || !featureRef.current || !scanAreaRef.current) return;

    // If no position yet, hide drone
    if (!droneState.position) {
      featureRef.current.setStyle(new Style({}));
      scanAreaRef.current.setStyle(new Style({}));
      return;
    }

    // Convert lon/lat to Web Mercator projection
    const position = fromLonLat([droneState.position.lon, droneState.position.lat]);
    console.log('Updating drone position to:', droneState.position, 'Projected:', position);

    // Update feature geometries
    featureRef.current.getGeometry()?.setCoordinates(position);
    scanAreaRef.current.getGeometry()?.setCoordinates(position);

    // Ensure drone is visible with correct style
    const svg = droneState.isScanning ? DRONE_SCANNING_SVG : DRONE_SVG;
    featureRef.current.setStyle(new Style({
      image: new Icon({
        src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
        scale: 1,
        anchor: [0.5, 0.5]
      })
    }));

    // Animate map to follow drone if enabled
    if (followDrone) {
      map.getView().animate({
        center: position,
        duration: 500  // Smooth 500ms animation
      });
    }
  }, [map, droneState.position, droneState.isScanning, followDrone]);

  // This component doesn't render DOM elements - it manages OpenLayers features
  return null;
};

export default DroneIcon;
