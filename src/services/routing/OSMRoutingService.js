/**
 * OSM Routing Service Implementation
 * Single Responsibility: Handle OpenStreetMap-based pedestrian routing
 * Uses OpenRouteService API for pedestrian route calculation
 */
export class OSMRoutingService {
    constructor() {
        // Use OSRM (Open Source Routing Machine) - CORS-enabled, no API key required
        this.osrmBaseUrl = 'https://router.project-osrm.org/route/v1/foot';
        this.osrmTableUrl = 'https://router.project-osrm.org/table/v1/foot';
        this.cache = new Map();
        this.maxCacheSize = 100;
        this.lastRequestTime = 0;
        this.requestDelay = 1000; // 1 second between requests to respect rate limits
    }

    /**
     * Rate limiting to be respectful to the public OSRM server
     */
    async respectRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.requestDelay) {
            const waitTime = this.requestDelay - timeSinceLastRequest;
            console.log(`⏱️ Rate limiting: waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();
    }

    /**
     * Assess if OSRM routing is available for the given area
     * @param {Array} coordinates - Array of [lat, lon] coordinates
     * @returns {Promise<Object>} Assessment result with availability status
     */
    async assessPedestrianRouteAvailability(coordinates) {
        try {
            console.log('� Testing OSRM routing availability...');
            
            // Test route calculation between first two points
            const testStart = coordinates[0];
            const testEnd = coordinates[1];
            
            const testRoute = await this.calculateRoute(testStart, testEnd);
            
            // Check if we got a real OSRM response or fallback
            const isRealRoute = !testRoute.features[0].properties.fallback;
            
            if (isRealRoute) {
                const route = testRoute.features[0];
                const distance = route.properties.summary.distance;
                const duration = route.properties.summary.duration;
                
                return {
                    available: true,
                    confidence: 'high',
                    testDistance: distance,
                    testDuration: duration,
                    message: '✅ OSRM routing disponible',
                    provider: 'OSRM',
                    debugInfo: {
                        endpoint: this.osrmBaseUrl,
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                return {
                    available: false,
                    confidence: 'low',
                    message: '⚠️ OSRM indisponible - mode fallback actif',
                    fallbackReason: testRoute.features[0].properties.fallback.reason
                };
            }
        } catch (error) {
            console.warn('🚨 OSRM route assessment failed, using fallback assessment:', error);
            
            // Determine the specific error type for better debugging
            let errorType = 'unknown';
            let errorDetails = error.message || 'Unknown error';
            
            if (error.message && error.message.includes('CORS')) {
                errorType = 'cors';
                errorDetails = 'CORS policy blocking external API access';
            } else if (error.message && error.message.includes('403')) {
                errorType = 'forbidden';
                errorDetails = 'API access forbidden (403) - possibly rate limited';
            } else if (error.message && error.message.includes('Network')) {
                errorType = 'network';
                errorDetails = 'Network connectivity issue';
            } else if (error.name === 'TypeError') {
                errorType = 'fetch';
                errorDetails = 'Fetch API error - possibly network issue';
            }
            
            // Log detailed error for debugging
            console.error('🔍 OSRM API Error Details:', {
                type: errorType,
                message: errorDetails,
                originalError: error,
                apiEndpoint: this.osrmBaseUrl,
                timestamp: new Date().toISOString()
            });
            
            // Provide fallback assessment with error context
            return {
                available: true,
                confidence: 'medium',
                fallbackMode: true,
                errorType: errorType,
                errorDetails: errorDetails,
                message: `⚠️ Mode fallback activé (${errorType})`,
                note: `OSRM indisponible: ${errorDetails}`,
                debugInfo: {
                    originalError: error.message,
                    apiUrl: this.osrmBaseUrl,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    /**
     * Calculate pedestrian route between two points using OSRM
     * @param {Array} start - [latitude, longitude]
     * @param {Array} end - [latitude, longitude]
     * @returns {Promise<Object>} GeoJSON route data
     */
    async calculateRoute(start, end) {
        const cacheKey = `${start[0]},${start[1]}-${end[0]},${end[1]}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            console.log('� Using cached OSRM route');
            return this.cache.get(cacheKey);
        }

        // Rate limiting
        await this.respectRateLimit();

        try {
            console.log('🚀 Calculating route with OSRM...');
            console.log(`📍 From: ${start[0]}, ${start[1]} → To: ${end[0]}, ${end[1]}`);
            
            // OSRM expects coordinates as [longitude, latitude]
            const startCoord = [start[1], start[0]]; // lon, lat
            const endCoord = [end[1], end[0]];       // lon, lat
            
            const url = `${this.osrmBaseUrl}/${startCoord.join(',')};${endCoord.join(',')}?overview=full&geometries=geojson&steps=true&annotations=true`;
            
            console.log('🌐 OSRM URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Langres-Tour-App/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`OSRM API error: ${response.status} ${response.statusText}`);
            }

            const routeData = await response.json();
            console.log('✅ OSRM response received');
            
            if (routeData.routes && routeData.routes.length > 0) {
                const convertedRoute = this.convertOSRMToGeoJSON(routeData.routes[0], start, end);
                
                // Cache the result
                this.addToCache(cacheKey, convertedRoute);
                
                console.log('🗺️ OSRM route converted successfully');
                return convertedRoute;
            } else {
                throw new Error('No routes found in OSRM response');
            }
            
        } catch (error) {
            // Enhanced error logging and categorization
            let errorType = 'unknown';
            let errorDetails = error.message || 'Unknown error';
            
            if (error.message && error.message.includes('CORS')) {
                errorType = 'cors';
                errorDetails = 'CORS policy blocking external API access';
                console.error('🚨 CORS Error: External API calls blocked by browser policy');
            } else if (error.message && (error.message.includes('403') || error.message.includes('Forbidden'))) {
                errorType = 'forbidden';
                errorDetails = 'API access forbidden - possibly rate limited';
                console.error('🚨 API Forbidden: Rate limit or access restriction');
            } else if (error.message && error.message.includes('404')) {
                errorType = 'not_found';
                errorDetails = 'OSRM endpoint not found';
                console.error('🚨 API Not Found: OSRM endpoint may be unavailable');
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorType = 'fetch';
                errorDetails = 'Network request failed - possibly connectivity issue';
                console.error('🚨 Fetch Error: Network request failed');
            } else if (error.message && error.message.includes('HTTP')) {
                errorType = 'http';
                errorDetails = `HTTP error: ${error.message}`;
                console.error('🚨 HTTP Error:', error.message);
            }
            
            console.warn(`🔄 OSRM routing API unavailable (${errorType}), falling back to direct route:`, errorDetails);
            console.warn('🔍 Full error details:', {
                type: errorType,
                message: errorDetails,
                originalError: error,
                apiUrl: this.osrmBaseUrl,
                timestamp: new Date().toISOString()
            });
            
            return this.generateFallbackRoute(start, end, { errorType, errorDetails });
        }
    }

    /**
     * Convert OSRM response to our standard GeoJSON format
     * @param {Object} osrmRoute - OSRM route object
     * @param {Array} start - [latitude, longitude]
     * @param {Array} end - [latitude, longitude]
     * @returns {Object} GeoJSON route data compatible with our system
     */
    convertOSRMToGeoJSON(osrmRoute, start, end) {
        const distance = Math.round(osrmRoute.distance); // meters
        const duration = Math.round(osrmRoute.duration); // seconds
        const geometry = osrmRoute.geometry;
        
        // Convert OSRM steps to French navigation instructions
        const instructions = this.convertOSRMStepsToInstructions(osrmRoute.legs[0].steps);
        
        return {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: geometry,
                properties: {
                    summary: {
                        distance: distance,
                        duration: duration
                    },
                    segments: [{
                        distance: distance,
                        duration: duration,
                        steps: instructions
                    }],
                    way_points: [0, geometry.coordinates.length - 1],
                    provider: 'OSRM',
                    fallback: null // This is a real API response
                }
            }],
            bbox: osrmRoute.bbox || [
                Math.min(start[1], end[1]),
                Math.min(start[0], end[0]),
                Math.max(start[1], end[1]),
                Math.max(start[0], end[0])
            ],
            metadata: {
                attribution: 'Route via OSRM (Open Source Routing Machine)',
                service: 'OSRM',
                timestamp: Date.now()
            }
        };
    }

    /**
     * Convert OSRM navigation steps to French instructions
     * @param {Array} steps - OSRM step objects
     * @returns {Array} Formatted navigation instructions
     */
    convertOSRMStepsToInstructions(steps) {
        return steps.map((step, index) => {
            const maneuver = step.maneuver;
            let instruction = '';
            
            // Handle different maneuver types with French instructions
            switch (maneuver.type) {
                case 'depart':
                    instruction = 'Commencez votre trajet';
                    break;
                case 'arrive':
                    instruction = 'Arrivée à destination';
                    break;
                case 'turn':
                    instruction = this.getTurnInstruction(maneuver.modifier);
                    break;
                case 'continue':
                    instruction = 'Continuez tout droit';
                    break;
                case 'merge':
                    instruction = 'Continuez en restant sur la voie';
                    break;
                case 'ramp':
                    instruction = 'Prenez la bretelle';
                    break;
                case 'roundabout':
                    instruction = 'Entrez dans le rond-point';
                    break;
                case 'exit roundabout':
                    instruction = 'Sortez du rond-point';
                    break;
                case 'new name':
                    instruction = 'Continuez sur';
                    break;
                default:
                    instruction = 'Continuez';
            }
            
            // Add street name if available
            if (step.name && step.name !== '' && step.name !== 'undefined') {
                instruction += ` sur ${step.name}`;
            }
            
            // Add distance information for longer segments
            if (step.distance > 50) {
                const distanceText = step.distance > 1000 
                    ? `${(step.distance / 1000).toFixed(1)} km`
                    : `${Math.round(step.distance)} m`;
                instruction += ` pendant ${distanceText}`;
            }
            
            return {
                distance: Math.round(step.distance),
                duration: Math.round(step.duration),
                type: maneuver.type,
                instruction: instruction,
                name: step.name || 'Route sans nom',
                way_points: [step.intersections?.[0]?.location || maneuver.location],
                location: maneuver.location
            };
        });
    }

    /**
     * Get French turn instruction based on OSRM modifier
     * @param {String} modifier - OSRM turn modifier
     * @returns {String} French turn instruction
     */
    getTurnInstruction(modifier) {
        const turnInstructions = {
            'straight': 'Continuez tout droit',
            'slight left': 'Tournez légèrement à gauche',
            'left': 'Tournez à gauche',
            'sharp left': 'Tournez fortement à gauche',
            'slight right': 'Tournez légèrement à droite',
            'right': 'Tournez à droite',
            'sharp right': 'Tournez fortement à droite',
            'uturn': 'Faites demi-tour'
        };
        
        return turnInstructions[modifier] || `Tournez ${modifier}`;
    }
    /**
     * Calculate complete tour route through all POIs using OSRM
     * @param {Array} pois - Array of POI objects with lat, lon properties
     * @returns {Promise<Object>} Complete route with segments
     */
    async calculateTourRoute(pois) {
        console.log(`🗺️ Calculating complete OSRM tour route through ${pois.length} POIs...`);
        
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

        let fallbackCount = 0;

        try {
            // Calculate route between consecutive POIs
            for (let i = 0; i < pois.length - 1; i++) {
                const start = [pois[i].lat, pois[i].lon];
                const end = [pois[i + 1].lat, pois[i + 1].lon];
                
                console.log(`📍 Calculating segment ${i + 1}/${pois.length - 1}: ${pois[i].name} → ${pois[i + 1].name}`);
                
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
                    
                    // Check if this segment used fallback
                    if (feature.properties.fallback) {
                        fallbackCount++;
                        console.warn(`   ⚠️ Segment ${i + 1} used fallback: ${feature.properties.fallback.reason}`);
                    }
                    
                    routeSegments.push(segment);
                    totalRoute.features.push(feature);
                    totalRoute.segments.push(segment);
                    totalRoute.instructions.push(...segment.instructions);
                    totalRoute.summary.distance += segment.distance;
                    totalRoute.summary.duration += segment.duration;
                }
                
                // Small delay to avoid overwhelming the OSRM server
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            const totalDistanceKm = (totalRoute.summary.distance / 1000).toFixed(2);
            const totalDurationMin = Math.round(totalRoute.summary.duration / 60);
            
            console.log(`🗺️ Complete OSRM route calculated: ${totalDistanceKm}km, ${totalDurationMin}min`);
            
            if (fallbackCount > 0) {
                console.warn(`⚠️ ${fallbackCount}/${routeSegments.length} segments used fallback routing`);
            }
            
            return {
                success: true,
                route: totalRoute,
                segments: routeSegments,
                fallbackSegments: fallbackCount,
                provider: 'OSRM'
            };
            
        } catch (error) {
            console.error('OSRM tour route calculation failed:', error);
            return {
                success: false,
                error: error.message,
                partialSegments: routeSegments,
                fallbackSegments: fallbackCount
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

    /**
     * Generate a fallback route when OSM API is unavailable
     * Creates a simple direct route with pedestrian-like waypoints
     * @param {Array} start - [latitude, longitude]
     * @param {Array} end - [latitude, longitude]
     * @param {Object} errorContext - Optional error context for debugging
     * @returns {Object} Fallback route data in GeoJSON format
     */
    generateFallbackRoute(start, end, errorContext = null) {
        const fallbackReason = errorContext ? 
            `OSRM API Error (${errorContext.errorType}): ${errorContext.errorDetails}` : 
            'OSRM API unavailable';
            
        console.log('� Generating fallback pedestrian route...');
        console.log('🔍 Fallback reason:', fallbackReason);
        
        const distance = this.calculateDistance(start[0], start[1], end[0], end[1]);
        const estimatedDuration = Math.round(distance / 1.4); // Walking speed ~1.4 m/s
        
        // Create intermediate waypoints for a more realistic pedestrian path
        const waypoints = this.generateWalkingWaypoints(start, end);
        
        // Create basic instructions for the fallback route
        const instructions = this.generateFallbackInstructions(start, end, waypoints, distance);
        
        const fallbackRoute = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {
                    summary: {
                        distance: distance,
                        duration: estimatedDuration
                    },
                    segments: [{
                        distance: distance,
                        duration: estimatedDuration,
                        steps: instructions
                    }],
                    way_points: [0, waypoints.length - 1],
                    // Add fallback metadata for debugging
                    fallback: {
                        used: true,
                        reason: fallbackReason,
                        errorContext: errorContext,
                        timestamp: new Date().toISOString(),
                        service: 'local-fallback'
                    }
                },
                geometry: {
                    type: 'LineString',
                    coordinates: waypoints.map(wp => [wp[1], wp[0]]) // Convert to [lon, lat]
                }
            }],
            bbox: [
                Math.min(start[1], end[1]),
                Math.min(start[0], end[0]),
                Math.max(start[1], end[1]),
                Math.max(start[0], end[0])
            ],
            metadata: {
                attribution: 'Fallback route - Direct pedestrian path',
                service: 'local-fallback',
                timestamp: Date.now(),
                fallbackReason: fallbackReason,
                errorContext: errorContext
            }
        };
        
        // Cache the fallback route
        const cacheKey = `${start[0]},${start[1]}-${end[0]},${end[1]}`;
        this.addToCache(cacheKey, fallbackRoute);
        
        console.log(`� Fallback route generated: ${(distance / 1000).toFixed(2)}km, ${Math.round(estimatedDuration / 60)}min`);
        console.log('⚠️ USING FALLBACK MODE - OSM API not available');
        
        return fallbackRoute;
    }

    /**
     * Generate walking waypoints that follow a more natural pedestrian path
     * @param {Array} start - [latitude, longitude]
     * @param {Array} end - [latitude, longitude]
     * @returns {Array} Array of waypoint coordinates
     */
    generateWalkingWaypoints(start, end) {
        const waypoints = [start];
        
        // Calculate the number of intermediate points based on distance
        const distance = this.calculateDistance(start[0], start[1], end[0], end[1]);
        const numWaypoints = Math.max(2, Math.min(8, Math.floor(distance / 200))); // Every ~200m
        
        for (let i = 1; i < numWaypoints; i++) {
            const ratio = i / numWaypoints;
            
            // Add slight deviation to make it more natural (avoiding straight lines)
            const deviation = (Math.random() - 0.5) * 0.0003; // Small random offset
            
            const lat = start[0] + (end[0] - start[0]) * ratio + deviation;
            const lon = start[1] + (end[1] - start[1]) * ratio + deviation;
            
            waypoints.push([lat, lon]);
        }
        
        waypoints.push(end);
        return waypoints;
    }

    /**
     * Generate fallback navigation instructions
     * @param {Array} start - [latitude, longitude]
     * @param {Array} end - [latitude, longitude]
     * @param {Array} waypoints - Array of waypoint coordinates
     * @param {Number} totalDistance - Total distance in meters
     * @returns {Array} Array of instruction objects
     */
    generateFallbackInstructions(start, end, waypoints, totalDistance) {
        const instructions = [];
        
        // Calculate bearing for general direction
        const bearing = this.calculateBearing(start[0], start[1], end[0], end[1]);
        const direction = this.bearingToDirection(bearing);
        
        // Starting instruction
        instructions.push({
            distance: Math.round(totalDistance * 0.1),
            duration: Math.round(totalDistance * 0.1 / 1.4),
            type: 'start',
            instruction: `Dirigez-vous vers le ${direction}`,
            name: 'Début du parcours',
            way_points: [0, Math.floor(waypoints.length * 0.1)],
            location: [start[1], start[0]]
        });
        
        // Mid-route instruction if distance is significant
        if (totalDistance > 300) {
            instructions.push({
                distance: Math.round(totalDistance * 0.7),
                duration: Math.round(totalDistance * 0.7 / 1.4),
                type: 'continue',
                instruction: `Continuez vers le ${direction}`,
                name: 'Continuation du parcours',
                way_points: [Math.floor(waypoints.length * 0.5), Math.floor(waypoints.length * 0.8)],
                location: [waypoints[Math.floor(waypoints.length * 0.5)][1], waypoints[Math.floor(waypoints.length * 0.5)][0]]
            });
        }
        
        // Arrival instruction
        instructions.push({
            distance: 0,
            duration: 0,
            type: 'arrive',
            instruction: 'Vous êtes arrivé à votre destination',
            name: 'Destination',
            way_points: [waypoints.length - 1, waypoints.length - 1],
            location: [end[1], end[0]]
        });
        
        return instructions;
    }

    /**
     * Calculate bearing between two points
     * @param {Number} lat1 - Start latitude
     * @param {Number} lon1 - Start longitude
     * @param {Number} lat2 - End latitude
     * @param {Number} lon2 - End longitude
     * @returns {Number} Bearing in degrees
     */
    calculateBearing(lat1, lon1, lat2, lon2) {
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

        const θ = Math.atan2(y, x);

        return (θ * 180 / Math.PI + 360) % 360;
    }

    /**
     * Convert bearing to cardinal direction
     * @param {Number} bearing - Bearing in degrees
     * @returns {String} Cardinal direction in French
     */
    bearingToDirection(bearing) {
        const directions = [
            'nord', 'nord-est', 'est', 'sud-est',
            'sud', 'sud-ouest', 'ouest', 'nord-ouest'
        ];
        const index = Math.round(bearing / 45) % 8;
        return directions[index];
    }
}