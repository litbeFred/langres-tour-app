/**
 * OSM Routing Service Implementation
 * Single Responsibility: Handle OpenStreetMap-based pedestrian routing
 * Uses OpenRouteService API for pedestrian route calculation
 */
export class OSMRoutingService {
    constructor() {
        // Use public OpenRouteService API (limited requests, but good for testing)
        // For production, consider getting your own API key
        this.baseUrl = 'https://api.openrouteservice.org/v2';
        this.apiKey = '5b3ce3597851110001cf624841065b7d00c54a47a5bbf6b5a8cd3d1e'; // Public demo key
        this.cache = new Map();
        this.maxCacheSize = 50;
    }

    /**
     * Assess if pedestrian routes are available in OSM for the given area
     * @param {Array} coordinates - Array of [lat, lon] coordinates
     * @returns {Promise<Object>} Assessment result with availability status
     */
    async assessPedestrianRouteAvailability(coordinates) {
        try {
            console.log('🗺️ Assessing OSM pedestrian route availability...');
            
            // Test route calculation between first two points
            const testStart = coordinates[0];
            const testEnd = coordinates[1];
            
            const testRoute = await this.calculateRoute(testStart, testEnd);
            
            if (testRoute && testRoute.features && testRoute.features.length > 0) {
                const route = testRoute.features[0];
                const distance = route.properties.summary.distance;
                const duration = route.properties.summary.duration;
                
                return {
                    available: true,
                    confidence: 'high',
                    testDistance: distance,
                    testDuration: duration,
                    message: 'OSM pedestrian paths available for routing'
                };
            } else {
                return {
                    available: false,
                    confidence: 'low',
                    message: 'Limited OSM pedestrian data available'
                };
            }
        } catch (error) {
            console.warn('OSM route assessment failed:', error);
            return {
                available: false,
                confidence: 'unknown',
                error: error.message,
                message: 'Unable to assess OSM route availability'
            };
        }
    }

    /**
     * Calculate pedestrian route between two points
     * @param {Array} start - [latitude, longitude]
     * @param {Array} end - [latitude, longitude]
     * @returns {Promise<Object>} GeoJSON route data
     */
    async calculateRoute(start, end) {
        const cacheKey = `${start[0]},${start[1]}-${end[0]},${end[1]}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            console.log('📍 Using cached route');
            return this.cache.get(cacheKey);
        }

        try {
            const url = `${this.baseUrl}/directions/foot-walking/geojson`;
            
            const requestBody = {
                coordinates: [
                    [start[1], start[0]], // OpenRouteService expects [lon, lat]
                    [end[1], end[0]]
                ],
                elevation: false,
                extra_info: ['waytype', 'surface'],
                geometry_simplify: false,
                instructions: true,
                instructions_format: 'json',
                language: 'fr',
                maneuvers: true,
                preference: 'recommended',
                units: 'm'
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.apiKey
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const routeData = await response.json();
            
            // Cache the result
            this.addToCache(cacheKey, routeData);
            
            console.log('🗺️ OSM route calculated successfully');
            return routeData;
            
        } catch (error) {
            console.error('OSM routing error:', error);
            throw error;
        }
    }

    /**
     * Calculate complete tour route through all POIs
     * @param {Array} pois - Array of POI objects with lat, lon properties
     * @returns {Promise<Object>} Complete route with segments
     */
    async calculateTourRoute(pois) {
        console.log('🗺️ Calculating complete OSM tour route...');
        
        const routeSegments = [];
        const totalRoute = {
            type: 'FeatureCollection',
            features: [],
            segments: [],
            instructions: [],
            summary: {
                distance: 0,
                duration: 0
            }
        };

        try {
            // Calculate route between consecutive POIs
            for (let i = 0; i < pois.length - 1; i++) {
                const start = [pois[i].lat, pois[i].lon];
                const end = [pois[i + 1].lat, pois[i + 1].lon];
                
                console.log(`Calculating segment ${i + 1}/${pois.length - 1}: ${pois[i].name} → ${pois[i + 1].name}`);
                
                const segmentRoute = await this.calculateRoute(start, end);
                
                if (segmentRoute && segmentRoute.features && segmentRoute.features.length > 0) {
                    const feature = segmentRoute.features[0];
                    const segment = {
                        id: i,
                        start: pois[i],
                        end: pois[i + 1],
                        route: feature,
                        instructions: feature.properties.segments[0].steps || [],
                        distance: feature.properties.summary.distance,
                        duration: feature.properties.summary.duration
                    };
                    
                    routeSegments.push(segment);
                    totalRoute.features.push(feature);
                    totalRoute.segments.push(segment);
                    totalRoute.instructions.push(...segment.instructions);
                    totalRoute.summary.distance += segment.distance;
                    totalRoute.summary.duration += segment.duration;
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log(`🗺️ Complete route calculated: ${(totalRoute.summary.distance / 1000).toFixed(2)}km, ${Math.round(totalRoute.summary.duration / 60)}min`);
            
            return {
                success: true,
                route: totalRoute,
                segments: routeSegments
            };
            
        } catch (error) {
            console.error('Tour route calculation failed:', error);
            return {
                success: false,
                error: error.message,
                partialSegments: routeSegments
            };
        }
    }

    /**
     * Extract route instructions with path names and distances
     * @param {Object} routeData - Route data from OSM API
     * @returns {Array} Formatted navigation instructions
     */
    extractNavigationInstructions(routeData) {
        if (!routeData.features || routeData.features.length === 0) {
            return [];
        }

        const route = routeData.features[0];
        const steps = route.properties.segments[0].steps || [];
        
        return steps.map((step, index) => ({
            id: index,
            instruction: step.instruction,
            distance: step.distance,
            duration: step.duration,
            type: step.type,
            way_name: step.name || 'Route sans nom',
            bearing_after: step.exit_bearing || null,
            location: route.geometry.coordinates[step.way_points[0]] || null
        }));
    }

    /**
     * Check if user has deviated from route and calculate reroute if needed
     * @param {Array} userPosition - [latitude, longitude]
     * @param {Object} currentRoute - Current route data
     * @param {Number} threshold - Deviation threshold in meters (default: 50m)
     * @returns {Promise<Object>} Reroute result
     */
    async checkRerouteNeeded(userPosition, currentRoute, threshold = 50) {
        if (!currentRoute || !currentRoute.features || currentRoute.features.length === 0) {
            return { rerouteNeeded: false, reason: 'No current route' };
        }

        try {
            // Find closest point on route
            const routeCoordinates = currentRoute.features[0].geometry.coordinates;
            let minDistance = Infinity;
            let closestPoint = null;

            for (const coord of routeCoordinates) {
                const distance = this.calculateDistance(
                    userPosition[0], userPosition[1],
                    coord[1], coord[0] // Note: route coords are [lon, lat]
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = coord;
                }
            }

            if (minDistance > threshold) {
                console.log(`🗺️ User deviated ${minDistance.toFixed(0)}m from route - rerouting needed`);
                return {
                    rerouteNeeded: true,
                    deviation: minDistance,
                    reason: `Deviation of ${minDistance.toFixed(0)}m exceeds threshold`
                };
            }

            return {
                rerouteNeeded: false,
                deviation: minDistance,
                reason: 'On route'
            };

        } catch (error) {
            console.error('Reroute check failed:', error);
            return {
                rerouteNeeded: false,
                error: error.message,
                reason: 'Reroute check failed'
            };
        }
    }

    /**
     * Calculate distance between two points (Haversine formula)
     * @param {Number} lat1 - Latitude 1
     * @param {Number} lon1 - Longitude 1 
     * @param {Number} lat2 - Latitude 2
     * @param {Number} lon2 - Longitude 2
     * @returns {Number} Distance in meters
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Add route to cache with size management
     * @param {String} key - Cache key
     * @param {Object} data - Route data to cache
     */
    addToCache(key, data) {
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, data);
    }

    /**
     * Clear the route cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗺️ Route cache cleared');
    }
}