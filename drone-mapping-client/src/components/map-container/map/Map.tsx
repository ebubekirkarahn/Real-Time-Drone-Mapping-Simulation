/**
 * @fileoverview OpenLayers Map wrapper component
 * 
 * This component initializes and manages an OpenLayers Map instance,
 * providing it to child components via React Context. It sets up:
 * - OSM base layer (dimmed to let drone tiles stand out)
 * - Initial view centered on the drone scanning area (Libya)
 * - Zoom controls
 * 
 * Component Architecture:
 * - Uses MapContext to share OlMap instance with children
 * - Children render only after map is initialized
 * - Proper cleanup on unmount (dispose map instance)
 * 
 * @module components/map-container/map/Map
 */

import '@/components/map-container/map/Map.scss';
import 'ol/ol.css';
import View from 'ol/View';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Map as OlMap } from 'ol';
import { MapContext } from '@/components/map-container/map/MapContext';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';

/**
 * Props for Map component
 * @interface IProps
 */
interface IProps {
  /** Initial map center as [longitude, latitude] in EPSG:4326 */
  center: [number, number];
  /** Initial zoom level */
  zoom: number;
}

/**
 * Map - OpenLayers map wrapper component with context provider
 * 
 * This component:
 * 1. Creates a map container div element
 * 2. Initializes OpenLayers Map with OSM base layer
 * 3. Provides map instance to children via MapContext
 * 4. Handles cleanup on unmount
 * 
 * The OSM base layer is rendered at 50% opacity so that drone-captured
 * GeoTIFF tiles (at 100% opacity) stand out visually.
 * 
 * @component
 * @param {PropsWithChildren<IProps>} props - Component props
 * @returns {JSX.Element} Map container with context provider
 * 
 * @example
 * <Map zoom={9} center={[33.51, 16.685]}>
 *   <DroneLayer tiles={tiles} titilerUrl={url} />
 *   <DroneIcon droneState={state} />
 * </Map>
 */
export const Map = (props: PropsWithChildren<IProps>) => {
  // Ref to the map container div element
  const mapRef = useRef<HTMLDivElement>(null);
  
  // State to hold the OpenLayers Map instance
  const [olMap, setOlMap] = useState<OlMap | null>(null);

  /**
   * Effect: Initialize OpenLayers Map
   * 
   * Runs once on mount to create and configure the map instance.
   * Cleanup function disposes the map on unmount.
   */
  useEffect(() => {
    if (!mapRef.current) return;

    // Convert center coordinates from EPSG:4326 (lon/lat) to EPSG:3857 (Web Mercator)
    const centerCoord = fromLonLat(props.center);

    /**
     * OSM (OpenStreetMap) base layer
     * 
     * Reduced opacity (0.5) so drone tiles appear more prominent
     * when overlaid on top of the base map
     */
    const osmLayer = new TileLayer({
      source: new OSM(),
      properties: { name: 'osm-basemap' },
      opacity: 0.5  // Dim basemap - drone tiles will be at 1.0 opacity
    });

    /**
     * Map View configuration
     * 
     * - center: Initial view centered on tile grid area
     * - zoom: Starting zoom level (9 shows full grid)
     * - maxZoom: Allow close inspection of tiles
     * - minZoom: Prevent zooming out too far
     */
    const view = new View({
      center: centerCoord,
      zoom: props.zoom,
      maxZoom: 22,
      minZoom: 5
    });

    /**
     * OpenLayers Map instance
     * 
     * - target: DOM element to render map into
     * - layers: Base layers (drone tiles added dynamically)
     * - view: View configuration
     * - controls: Only zoom controls (no attribution)
     */
    const map = new OlMap({
      target: mapRef.current,
      layers: [osmLayer],
      view: view,
      controls: defaultControls({
        zoom: true,
        attribution: false
      })
    });

    setOlMap(map);
    
    // Expose map globally for debugging (development only)
    (window as unknown as { olMap: OlMap }).olMap = map;

    // Cleanup: dispose map when component unmounts
    return () => {
      map.setTarget(undefined);
      map.dispose();
    };
  }, []);  // Empty deps - only run on mount

  return (
    <MapContext.Provider value={olMap!}>
      {/* Map container div - OpenLayers renders here */}
      <div ref={mapRef} className="Map">
        {/* Only render children after map is initialized */}
        {olMap && props.children}
      </div>
    </MapContext.Provider>
  );
};
