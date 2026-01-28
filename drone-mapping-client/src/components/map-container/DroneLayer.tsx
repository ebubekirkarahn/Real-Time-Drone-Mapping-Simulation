/**
 * @fileoverview DroneLayer component for rendering GeoTIFF tiles on the map
 * 
 * This component manages OpenLayers ImageLayer instances for each tile received
 * from the drone simulation. It handles:
 * - Dynamic layer creation for new tiles
 * - Coordinate transformation (EPSG:4326 → EPSG:3857)
 * - Fade-in animation for visual appeal
 * - Efficient incremental updates (only processes new tiles)
 * 
 * @module components/map-container/DroneLayer
 */

import { useContext, useEffect, useRef } from 'react';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
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
 * This component creates ImageLayer instances for each tile and positions them
 * correctly using the tile's bounding box coordinates. Key features:
 * 
 * 1. **Incremental Processing**: Only processes newly added tiles using
 *    a processed count ref, avoiding re-processing existing tiles
 * 
 * 2. **Coordinate Transformation**: Converts bbox from EPSG:4326 (lat/lon)
 *    to EPSG:3857 (Web Mercator) for OpenLayers display
 * 
 * 3. **TiTiler Integration**: Constructs preview URLs using TiTiler's
 *    COG (Cloud Optimized GeoTIFF) endpoint
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
  const layersRef = useRef<Map<string, ImageLayer<ImageStatic>>>(new Map());
  
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
       * Construct TiTiler preview URL
       * 
       * TiTiler's /cog/preview endpoint generates a PNG preview of the GeoTIFF
       * Parameters:
       * - url: Path to the GeoTIFF file (mounted in /data volume)
       * - width/height: Output image dimensions
       */
      const previewUrl = `${titilerUrl}/cog/preview.png?url=/data/${tile.filename}&width=${tile.width}&height=${tile.height}`;
      
      /**
       * Create OpenLayers ImageLayer with static image source
       * 
       * - imageExtent: Positions the image at correct geographic coordinates
       * - opacity: 0 initially for fade-in animation
       * - zIndex: Ensures proper layer ordering (row/col based)
       */
      const imageLayer = new ImageLayer({
        source: new ImageStatic({
          url: previewUrl,
          imageExtent: extent,
          crossOrigin: 'anonymous'  // Required for CORS
        }),
        opacity: 0,
        zIndex: 10 + tile.row * 10 + tile.col  // Deterministic z-order
      });

      // Add layer to map
      map.addLayer(imageLayer);
      layersRef.current.set(tile.id, imageLayer);

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
        imageLayer.setOpacity(opacity);
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
