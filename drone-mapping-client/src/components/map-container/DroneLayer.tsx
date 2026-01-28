/**
 * @fileoverview DroneLayer component for rendering GeoTIFF tiles on the map
 * 
 * This component manages OpenLayers TileLayer instances for each tile received
 * from the drone simulation. It handles:
 * - Dynamic layer creation for new tiles
 * - Coordinate transformation (EPSG:4326 → EPSG:3857)
 * - Fade-in animation for visual appeal
 * - Efficient incremental updates (only processes new tiles)
 * - **Zoom-dependent detail loading via XYZ tiles**
 * 
 * @module components/map-container/DroneLayer
 */

import { useContext, useEffect, useRef } from 'react';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { transformExtent } from 'ol/proj';
import { MapContext } from '@/components/map-container/map/MapContext';
import type { TileMetadata } from '@/types/tile';

/**
 * Props for DroneLayer component
 * @interface DroneLayerProps
 */
interface DroneLayerProps {
  /** Array of tile metadata objects to display on map */
  tiles: TileMetadata[];
  /** Base URL of the TiTiler server for tile image requests */
  titilerUrl: string;
}

/**
 * DroneLayer - Renders GeoTIFF tiles from drone scanning on OpenLayers map
 * 
 * This component creates TileLayer instances for each tile and positions them
 * correctly using the tile's bounding box coordinates. Key features:
 * 
 * 1. **Incremental Processing**: Only processes newly added tiles using
 *    a processed count ref, avoiding re-processing existing tiles
 * 
 * 2. **Coordinate Transformation**: Converts bbox from EPSG:4326 (lat/lon)
 *    to EPSG:3857 (Web Mercator) for OpenLayers display
 * 
 * 3. **TiTiler XYZ Integration**: Uses TiTiler's /cog/tiles/{z}/{x}/{y}
 *    endpoint for zoom-dependent detail loading from COG files
 * 
 * 4. **Fade-in Animation**: New tiles appear with smooth opacity transition
 * 
 * @component
 * @param {DroneLayerProps} props - Component props
 * @returns {null} Renders nothing (manages OpenLayers layers directly)
 * 
 * @example
 * <DroneLayer 
 *   tiles={visibleTiles} 
 *   titilerUrl="http://localhost:8080" 
 * />
 */
const DroneLayer: React.FC<DroneLayerProps> = ({ tiles, titilerUrl }) => {
  // Access OpenLayers map from context
  const map = useContext(MapContext);
  
  // Map to track created layers by tile ID (prevents duplicates)
  const layersRef = useRef<Map<string, TileLayer<XYZ>>>(new Map());
  
  // Track how many tiles have been processed (for incremental updates)
  const processedCountRef = useRef<number>(0);

  /**
   * Effect: Add new tiles to the map
   * 
   * This effect runs when tiles array changes, but only processes
   * tiles that were added since the last run (incremental update).
   */
  useEffect(() => {
    if (!map) return;

    // Only process tiles that were added after the last processed index
    const newTiles = tiles.slice(processedCountRef.current);
    
    newTiles.forEach(tile => {
      // Safety check: skip if layer already exists for this tile
      if (layersRef.current.has(tile.id)) {
        return;
      }

      /**
       * Coordinate transformation
       * 
       * Note: bbox format in JSON is [lat, lon, lat, lon] due to data source
       * We need to convert to [minLon, minLat, maxLon, maxLat] for transformExtent
       */
      const extent = transformExtent(
        [tile.bbox[1], tile.bbox[0], tile.bbox[3], tile.bbox[2]], 
        'EPSG:4326',  // Source: WGS84 lat/lon
        'EPSG:3857'   // Target: Web Mercator
      );
      
      /**
       * Construct TiTiler XYZ tile URL
       * 
       * TiTiler's /cog/tiles/{z}/{x}/{y} endpoint generates tiles dynamically
       * based on zoom level, providing appropriate detail for each zoom.
       * Parameters:
       * - url: Path to the GeoTIFF file (mounted in /data volume)
       * - {z}/{x}/{y}: Standard XYZ tile coordinates (filled by OpenLayers)
       */
      const xyzUrl = `${titilerUrl}/cog/tiles/{z}/{x}/{y}?url=/data/${tile.filename}`;
      
      /**
       * Create OpenLayers TileLayer with XYZ source
       * 
       * - extent: Limits tile requests to this GeoTIFF's geographic bounds
       * - minZoom/maxZoom: Controls zoom range for tile requests
       * - opacity: 0 initially for fade-in animation
       * - zIndex: Ensures proper layer ordering (row/col based)
       * 
       * Unlike ImageStatic, XYZ source requests new tiles when zoom changes,
       * allowing TiTiler to serve appropriate detail level from the COG.
       */
      const tileLayer = new TileLayer({
        extent: extent,  // Only load tiles within this drone tile's bounds
        source: new XYZ({
          url: xyzUrl,
          crossOrigin: 'anonymous',
          minZoom: 0,
          maxZoom: 18,
          tileSize: 256
        }),
        opacity: 0,
        zIndex: 10 + tile.row * 10 + tile.col  // Deterministic z-order
      });

      // Add layer to map
      map.addLayer(tileLayer);
      layersRef.current.set(tile.id, tileLayer);

      /**
       * Fade-in animation
       * 
       * Gradually increases opacity from 0 to 1 over ~500ms
       * Creates smooth visual transition as tiles appear
       */
      let opacity = 0;
      const fadeIn = setInterval(() => {
        opacity += 0.1;
        if (opacity >= 1.0) {
          opacity = 1.0;
          clearInterval(fadeIn);
        }
        tileLayer.setOpacity(opacity);
      }, 50);
    });
    
    // Update processed count for next incremental update
    processedCountRef.current = tiles.length;
  }, [map, tiles, titilerUrl]);

  /**
   * Effect: Cleanup on unmount
   * 
   * Removes all layers from map and clears the layer reference map
   * when component is unmounted
   */
  useEffect(() => {
    return () => {
      if (!map) return;
      layersRef.current.forEach(layer => {
        map.removeLayer(layer);
      });
      layersRef.current.clear();
    };
  }, [map]);

  // This component doesn't render DOM elements - it manages OpenLayers layers
  return null;
};

export default DroneLayer;
