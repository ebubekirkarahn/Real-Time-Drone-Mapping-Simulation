/**
 * @fileoverview React Context for sharing OpenLayers Map instance
 * 
 * This context allows child components (DroneLayer, DroneIcon) to access
 * the OpenLayers Map instance without prop drilling. The Map component
 * provides this context, and child components consume it via useContext.
 * 
 * Pattern: Context Provider Pattern
 * - Provider: Map.tsx wraps children with MapContext.Provider
 * - Consumers: DroneLayer.tsx, DroneIcon.tsx use useContext(MapContext)
 * 
 * @module components/map-container/map/MapContext
 */

import React from 'react';
import { Map as OlMap } from 'ol';

/**
 * React Context for OpenLayers Map instance
 * 
 * Default value is a new empty OlMap, but in practice the Map component
 * will provide the actual configured map instance.
 * 
 * @example
 * // Provider (in Map.tsx)
 * <MapContext.Provider value={olMap}>
 *   {children}
 * </MapContext.Provider>
 * 
 * // Consumer (in child components)
 * const map = useContext(MapContext);
 * map.addLayer(layer);
 */
export const MapContext = React.createContext<OlMap>(new OlMap({}));
