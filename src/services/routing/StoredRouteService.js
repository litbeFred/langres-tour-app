/**
 * Stored Route Service Implementation
 * Single Responsibility: Interface between guidance system and stored routes
 * Open/Closed: Extensible for different route retrieval strategies
 * Liskov Substitution: Can substitute any routing service interface
 * Interface Segregation: Focused stored route interface
 * Dependency Inversion: Depends on storage abstraction, not concrete implementation
 */
export class StoredRouteService {
    constructor(routeStorageService, osmRoutingService, poiData) {
        this.routeStorageService = routeStorageService;
        this.osmRoutingService = osmRoutingService;
        this.poiData = poiData;
        
        // Current stored route state
        this.currentStoredRoute = null;
        this.currentRouteId = null;
        this.routeSegments = [];
        this.routeCoordinates = [];
        
        // Fallback settings
        this.fallbackToOSRM = true;
        this.preferStoredRoutes = true;
        
        console.log('🗂️ StoredRouteService initialized for route retrieval');
    }

    /**
     * Get tour route - checks stored routes first, falls back to OSRM if needed
     * @param {Object} options - Route retrieval options
     * @returns {Promise<Object>} Route data in OSRM-compatible format
     */
    async getTourRoute(options = {}) {
        try {
            console.log('🗂️ Getting tour route...');
            
            // First try to get stored route
            if (this.preferStoredRoutes) {
                const storedRouteResult = await this.getStoredTourRoute(options);
                
                if (storedRouteResult.success) {
                    console.log('✅ Using stored tour route');
                    return storedRouteResult;
                }
                
                console.log('⚠️ No suitable stored route found, checking fallback options...');
            }
            
            // Fallback to OSRM calculation if enabled and no stored route
            if (this.fallbackToOSRM && this.osmRoutingService) {
                console.log('🔄 Falling back to OSRM route calculation...');
                return await this.calculateFreshRoute(options);
            }
            
            // No route available
            return {
                success: false,
                error: 'No stored route available and OSRM fallback disabled',
                fallbackAvailable: this.fallbackToOSRM
            };
            
        } catch (error) {
            console.error('🗂️ Failed to get tour route:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get stored tour route if available
     * @param {Object} options - Route options
     * @returns {Promise<Object>} Stored route result
     */
    async getStoredTourRoute(options = {}) {
        try {
            // Try to find existing stored route
            const routeId = options.routeId || await this.findBestStoredRoute();
            
            if (!routeId) {
                return {
                    success: false,
                    reason: 'No stored route found'
                };
            }
            
            console.log(`🗂️ Loading stored route: ${routeId}`);
            
            const storedRoute = await this.routeStorageService.getRoute(routeId);
            
            if (!storedRoute) {
                return {
                    success: false,
                    reason: 'Stored route not accessible'
                };
            }
            
            // Validate stored route compatibility
            const validation = this.validateStoredRoute(storedRoute);
            if (!validation.valid) {
                return {
                    success: false,
                    reason: `Stored route validation failed: ${validation.reason}`
                };
            }
            
            // Set current route state
            this.currentStoredRoute = storedRoute;
            this.currentRouteId = routeId;
            this.routeSegments = storedRoute.routeData.segments || [];
            this.extractRouteCoordinates();
            
            // Convert to OSRM-compatible format
            const osrmCompatibleRoute = this.convertStoredRouteToOSRMFormat(storedRoute);
            
            console.log(`✅ Stored route loaded successfully: ${routeId}`);
            console.log(`   Distance: ${(storedRoute.metadata.totalDistance / 1000).toFixed(2)}km`);
            console.log(`   Duration: ${Math.round(storedRoute.metadata.totalDuration / 60)}min`);
            console.log(`   Segments: ${storedRoute.routeData.segments.length}`);
            
            return {
                success: true,
                source: 'stored',
                routeId: routeId,
                ...osrmCompatibleRoute,
                metadata: storedRoute.metadata
            };
            
        } catch (error) {
            console.error('🗂️ Failed to get stored tour route:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate fresh route using OSRM service
     * @param {Object} options - Calculation options
     * @returns {Promise<Object>} Fresh route result
     */
    async calculateFreshRoute(options = {}) {
        try {
            console.log('🗂️ Calculating fresh route with OSRM...');
            
            const sortedPOIs = this.getSortedPOIs();
            const routeResult = await this.osmRoutingService.calculateTourRoute(sortedPOIs);
            
            if (!routeResult.success) {
                throw new Error(`OSRM calculation failed: ${routeResult.error}`);
            }
            
            console.log('✅ Fresh route calculated with OSRM');
            
            return {
                success: true,
                source: 'osrm',
                ...routeResult
            };
            
        } catch (error) {
            console.error('🗂️ Failed to calculate fresh route:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check if user is on stored route
     * @param {Array} userPosition - [latitude, longitude]
     * @param {number} threshold - Distance threshold in meters
     * @returns {Object} On-route check result
     */
    isOnStoredRoute(userPosition, threshold = 50) {
        if (!this.currentStoredRoute || this.routeCoordinates.length === 0) {
            return {
                onRoute: false,
                reason: 'No current stored route'
            };
        }
        
        try {
            let minDistance = Infinity;
            let closestPointIndex = -1;
            let routeProgress = 0;
            
            // Check distance to all route coordinates
            for (let i = 0; i < this.routeCoordinates.length; i++) {
                const coord = this.routeCoordinates[i];
                const distance = this.calculateDistance(
                    userPosition[0], userPosition[1],
                    coord[1], coord[0] // Note: stored as [lon, lat]
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPointIndex = i;
                    routeProgress = i / this.routeCoordinates.length;
                }
            }
            
            const onRoute = minDistance <= threshold;
            
            return {
                onRoute: onRoute,
                distance: minDistance,
                threshold: threshold,
                closestPointIndex: closestPointIndex,
                routeProgress: routeProgress,
                reason: onRoute ? 'On stored route' : `${minDistance.toFixed(0)}m from route`
            };
            
        } catch (error) {
            console.error('🗂️ Error checking if on stored route:', error);
            return {
                onRoute: false,
                error: error.message
            };
        }
    }

    /**
     * Get next navigation instruction based on stored route
     * @param {Array} userPosition - [latitude, longitude]
     * @returns {Object} Next instruction or null
     */
    getNextInstruction(userPosition) {
        if (!this.currentStoredRoute || this.routeSegments.length === 0) {
            return null;
        }
        
        try {
            // Find current segment based on user position
            const currentSegment = this.findCurrentSegment(userPosition);
            
            if (!currentSegment) {
                return null;
            }
            
            const instructions = currentSegment.instructions || [];
            if (instructions.length === 0) {
                return null;
            }
            
            // Find next instruction based on position
            // For simplicity, return first instruction
            // In production, you'd calculate progress through current instruction
            return {
                instruction: instructions[0],
                segment: currentSegment,
                segmentIndex: this.routeSegments.indexOf(currentSegment),
                totalInstructions: instructions.length
            };
            
        } catch (error) {
            console.error('🗂️ Error getting next instruction:', error);
            return null;
        }
    }

    /**
     * Get closest point on stored route for back-on-track functionality
     * @param {Array} userPosition - [latitude, longitude]
     * @returns {Object|null} Closest route point
     */
    getClosestRoutePoint(userPosition) {
        if (!this.currentStoredRoute || this.routeCoordinates.length === 0) {
            return null;
        }
        
        try {
            let minDistance = Infinity;
            let closestPoint = null;
            
            for (const coord of this.routeCoordinates) {
                const distance = this.calculateDistance(
                    userPosition[0], userPosition[1],
                    coord[1], coord[0] // Note: stored as [lon, lat]
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = {
                        lat: coord[1],
                        lon: coord[0],
                        distance: distance
                    };
                }
            }
            
            return closestPoint;
            
        } catch (error) {
            console.error('🗂️ Error finding closest route point:', error);
            return null;
        }
    }

    /**
     * Find best stored route for current POI configuration
     * @returns {Promise<string|null>} Route ID or null
     */
    async findBestStoredRoute() {
        try {
            const storedRoutes = await this.routeStorageService.listStoredRoutes();
            const currentPOIs = this.getSortedPOIs();
            
            // Find route with matching POI configuration
            for (const route of storedRoutes) {
                if (this.routeMatchesPOIs(route, currentPOIs)) {
                    return route.id;
                }
            }
            
            // If no perfect match, find most recent route with similar POI count
            const similarRoutes = storedRoutes.filter(route => 
                route.poiCount === currentPOIs.length
            );
            
            if (similarRoutes.length > 0) {
                // Return most recent
                similarRoutes.sort((a, b) => new Date(b.calculationDate) - new Date(a.calculationDate));
                return similarRoutes[0].id;
            }
            
            return null;
            
        } catch (error) {
            console.error('🗂️ Error finding best stored route:', error);
            return null;
        }
    }

    /**
     * Check if stored route matches current POI data
     * @param {Object} routeMetadata - Route metadata
     * @param {Array} currentPOIs - Current POI array
     * @returns {boolean} True if route matches
     */
    routeMatchesPOIs(routeMetadata, currentPOIs) {
        const routePOIs = routeMetadata.pois || [];
        
        if (routePOIs.length !== currentPOIs.length) {
            return false;
        }
        
        // Check if POIs match by ID and position
        for (let i = 0; i < routePOIs.length; i++) {
            const routePOI = routePOIs[i];
            const currentPOI = currentPOIs[i];
            
            if (routePOI.id !== currentPOI.id ||
                Math.abs(routePOI.lat - currentPOI.lat) > 0.00001 ||
                Math.abs(routePOI.lon - currentPOI.lon) > 0.00001) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Validate stored route for compatibility
     * @param {Object} storedRoute - Stored route data
     * @returns {Object} Validation result
     */
    validateStoredRoute(storedRoute) {
        if (!storedRoute) {
            return { valid: false, reason: 'No route data' };
        }
        
        if (!storedRoute.routeData) {
            return { valid: false, reason: 'Missing route data' };
        }
        
        if (!storedRoute.routeData.segments || !Array.isArray(storedRoute.routeData.segments)) {
            return { valid: false, reason: 'Invalid or missing segments' };
        }
        
        if (storedRoute.routeData.segments.length === 0) {
            return { valid: false, reason: 'Empty segments array' };
        }
        
        // Check if route data has required structure
        for (const segment of storedRoute.routeData.segments) {
            if (!segment.route || !segment.route.geometry) {
                return { valid: false, reason: 'Segment missing route geometry' };
            }
        }
        
        return { valid: true };
    }

    /**
     * Convert stored route to OSRM-compatible format
     * @param {Object} storedRoute - Stored route data
     * @returns {Object} OSRM-compatible route format
     */
    convertStoredRouteToOSRMFormat(storedRoute) {
        try {
            const routeData = storedRoute.routeData;
            const metadata = storedRoute.metadata;
            
            // Build combined route features
            const features = routeData.segments.map(segment => segment.route);
            
            // Build combined instructions
            const instructions = [];
            routeData.segments.forEach(segment => {
                if (segment.instructions && Array.isArray(segment.instructions)) {
                    instructions.push(...segment.instructions);
                }
            });
            
            return {
                route: {
                    type: 'FeatureCollection',
                    features: features,
                    segments: routeData.segments,
                    instructions: instructions,
                    summary: {
                        distance: metadata.totalDistance,
                        duration: metadata.totalDuration
                    },
                    metadata: {
                        ...metadata,
                        source: 'stored',
                        provider: metadata.provider || 'stored'
                    }
                },
                segments: routeData.segments,
                provider: 'stored',
                fallbackSegments: metadata.fallbackSegments || 0
            };
            
        } catch (error) {
            console.error('🗂️ Error converting stored route to OSRM format:', error);
            throw error;
        }
    }

    /**
     * Extract route coordinates from stored route for quick access
     */
    extractRouteCoordinates() {
        this.routeCoordinates = [];
        
        if (!this.currentStoredRoute || !this.routeSegments.length) {
            return;
        }
        
        try {
            for (const segment of this.routeSegments) {
                if (segment.route && segment.route.geometry && segment.route.geometry.coordinates) {
                    this.routeCoordinates.push(...segment.route.geometry.coordinates);
                }
            }
            
            console.log(`🗂️ Extracted ${this.routeCoordinates.length} route coordinates`);
            
        } catch (error) {
            console.error('🗂️ Error extracting route coordinates:', error);
        }
    }

    /**
     * Find current route segment based on user position
     * @param {Array} userPosition - [latitude, longitude]
     * @returns {Object|null} Current segment
     */
    findCurrentSegment(userPosition) {
        if (this.routeSegments.length === 0) {
            return null;
        }
        
        let closestSegment = null;
        let minDistance = Infinity;
        
        for (const segment of this.routeSegments) {
            // Calculate distance to segment start point
            const startDistance = this.calculateDistance(
                userPosition[0], userPosition[1],
                segment.start.lat, segment.start.lon
            );
            
            if (startDistance < minDistance) {
                minDistance = startDistance;
                closestSegment = segment;
            }
        }
        
        return closestSegment;
    }

    /**
     * Calculate distance between two points (Haversine formula)
     * @param {number} lat1 - Latitude 1
     * @param {number} lon1 - Longitude 1
     * @param {number} lat2 - Latitude 2
     * @param {number} lon2 - Longitude 2
     * @returns {number} Distance in meters
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
     * Get sorted POIs for comparison
     * @returns {Array} Sorted POI array
     */
    getSortedPOIs() {
        return this.poiData.sort((a, b) => a.order - b.order);
    }

    // Configuration methods
    setPreferStoredRoutes(prefer) {
        this.preferStoredRoutes = prefer;
        console.log(`🗂️ Prefer stored routes: ${prefer}`);
    }

    setFallbackToOSRM(fallback) {
        this.fallbackToOSRM = fallback;
        console.log(`🗂️ Fallback to OSRM: ${fallback}`);
    }

    // Status getters
    hasStoredRoute() {
        return this.currentStoredRoute !== null;
    }

    getCurrentRouteId() {
        return this.currentRouteId;
    }

    getCurrentRouteMetadata() {
        return this.currentStoredRoute ? this.currentStoredRoute.metadata : null;
    }

    getRouteSegmentCount() {
        return this.routeSegments.length;
    }

    getRouteCoordinateCount() {
        return this.routeCoordinates.length;
    }

    // Clear current route state
    clearCurrentRoute() {
        this.currentStoredRoute = null;
        this.currentRouteId = null;
        this.routeSegments = [];
        this.routeCoordinates = [];
        console.log('🗂️ Current route state cleared');
    }
}