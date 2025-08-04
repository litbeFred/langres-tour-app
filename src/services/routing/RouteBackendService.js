/**
 * Route Backend Service Implementation
 * Single Responsibility: Handle route calculation, management, and backend operations
 * Open/Closed: Extensible for different route management features
 * Liskov Substitution: Can substitute any route backend interface
 * Interface Segregation: Focused backend operations interface
 * Dependency Inversion: Depends on routing and storage abstractions
 */
export class RouteBackendService {
    constructor(osmRoutingService, routeStorageService, poiData) {
        this.osmRoutingService = osmRoutingService;
        this.routeStorageService = routeStorageService;
        this.poiData = poiData;
        
        // Backend state
        this.isCalculating = false;
        this.calculationProgress = 0;
        this.lastCalculationTime = null;
        this.debugMode = false;
        
        // Event listeners for backend operations
        this.listeners = [];
        
        console.log('🏗️ RouteBackendService initialized for route management');
    }

    /**
     * Calculate and store the complete tour route
     * @param {Object} options - Calculation options
     * @returns {Promise<Object>} Calculation result with route data
     */
    async calculateAndStoreTourRoute(options = {}) {
        if (this.isCalculating) {
            return {
                success: false,
                error: 'Route calculation already in progress'
            };
        }

        try {
            console.log('🏗️ Starting tour route calculation and storage...');
            this.isCalculating = true;
            this.calculationProgress = 0;
            this.lastCalculationTime = new Date();

            this.notifyListeners('calculationStarted', {
                timestamp: this.lastCalculationTime
            });

            // Get POI data sorted by tour order
            const sortedPOIs = this.getSortedPOIs();
            const routeId = options.routeId || this.generateDefaultRouteId();

            console.log(`🏗️ Calculating route through ${sortedPOIs.length} POIs...`);

            // Calculate complete tour route using OSRM
            const routeCalculation = await this.osmRoutingService.calculateTourRoute(sortedPOIs);
            
            if (!routeCalculation.success) {
                throw new Error(`OSRM route calculation failed: ${routeCalculation.error}`);
            }

            this.calculationProgress = 70;
            this.notifyListeners('calculationProgress', {
                progress: this.calculationProgress,
                stage: 'Route calculated, preparing storage...'
            });

            // Prepare route data for storage
            const routeData = {
                segments: routeCalculation.segments,
                route: routeCalculation.route,
                summary: routeCalculation.route.summary,
                fallbackSegments: routeCalculation.fallbackSegments || 0,
                provider: routeCalculation.provider || 'OSRM'
            };

            // Prepare metadata
            const metadata = {
                pois: sortedPOIs,
                calculationDate: this.lastCalculationTime.toISOString(),
                totalDistance: routeCalculation.route.summary.distance,
                totalDuration: routeCalculation.route.summary.duration,
                segmentCount: routeCalculation.segments.length,
                poiCount: sortedPOIs.length,
                fallbackSegments: routeCalculation.fallbackSegments,
                provider: routeCalculation.provider,
                options: options
            };

            // Store the route
            const stored = await this.routeStorageService.storeRoute(routeId, routeData, metadata);
            
            if (!stored) {
                throw new Error('Failed to store calculated route');
            }

            this.calculationProgress = 100;
            const result = {
                success: true,
                routeId: routeId,
                routeData: routeData,
                metadata: metadata,
                calculationTime: Date.now() - this.lastCalculationTime.getTime(),
                fallbackSegments: routeCalculation.fallbackSegments
            };

            this.notifyListeners('calculationCompleted', result);
            
            console.log(`✅ Tour route calculated and stored successfully: ${routeId}`);
            console.log(`   Distance: ${(metadata.totalDistance / 1000).toFixed(2)}km`);
            console.log(`   Duration: ${Math.round(metadata.totalDuration / 60)}min`);
            console.log(`   Segments: ${metadata.segmentCount}`);
            
            if (routeCalculation.fallbackSegments > 0) {
                console.warn(`   ⚠️ ${routeCalculation.fallbackSegments} segments used fallback routing`);
            }

            return result;

        } catch (error) {
            console.error('🏗️ Tour route calculation failed:', error);
            
            const errorResult = {
                success: false,
                error: error.message,
                calculationTime: this.lastCalculationTime ? Date.now() - this.lastCalculationTime.getTime() : 0
            };

            this.notifyListeners('calculationFailed', errorResult);
            return errorResult;

        } finally {
            this.isCalculating = false;
            this.calculationProgress = 0;
        }
    }

    /**
     * Recalculate specific route segment
     * @param {string} routeId - Route identifier
     * @param {number} segmentIndex - Index of segment to recalculate
     * @param {Object} options - Recalculation options
     * @returns {Promise<Object>} Recalculation result
     */
    async recalculateSegment(routeId, segmentIndex, options = {}) {
        try {
            console.log(`🏗️ Recalculating segment ${segmentIndex} for route ${routeId}`);

            // Get stored route
            const storedRoute = await this.routeStorageService.getRoute(routeId);
            if (!storedRoute) {
                throw new Error(`Route ${routeId} not found`);
            }

            const segments = storedRoute.routeData.segments;
            if (segmentIndex < 0 || segmentIndex >= segments.length) {
                throw new Error(`Invalid segment index: ${segmentIndex}`);
            }

            const segment = segments[segmentIndex];
            const startPOI = [segment.start.lat, segment.start.lon];
            const endPOI = [segment.end.lat, segment.end.lon];

            // Recalculate this segment
            const newSegmentRoute = await this.osmRoutingService.calculateRoute(startPOI, endPOI);
            
            if (!newSegmentRoute || !newSegmentRoute.features || newSegmentRoute.features.length === 0) {
                throw new Error('Failed to recalculate segment route');
            }

            // Update segment data
            const updatedSegment = {
                ...segment,
                route: newSegmentRoute.features[0],
                instructions: newSegmentRoute.features[0].properties.segments[0].steps || [],
                distance: newSegmentRoute.features[0].properties.summary.distance,
                duration: newSegmentRoute.features[0].properties.summary.duration,
                recalculated: true,
                recalculationDate: new Date().toISOString()
            };

            // Update segments array
            segments[segmentIndex] = updatedSegment;

            // Recalculate totals
            const newTotalDistance = segments.reduce((sum, seg) => sum + seg.distance, 0);
            const newTotalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);

            // Update stored route
            const updatedRouteData = {
                ...storedRoute.routeData,
                segments: segments,
                summary: {
                    ...storedRoute.routeData.summary,
                    distance: newTotalDistance,
                    duration: newTotalDuration
                }
            };

            const updatedMetadata = {
                ...storedRoute.metadata,
                totalDistance: newTotalDistance,
                totalDuration: newTotalDuration,
                lastSegmentUpdate: new Date().toISOString(),
                updatedSegments: (storedRoute.metadata.updatedSegments || []).concat([segmentIndex])
            };

            // Store updated route
            const stored = await this.routeStorageService.storeRoute(routeId, updatedRouteData, updatedMetadata);
            
            if (!stored) {
                throw new Error('Failed to store updated route');
            }

            const result = {
                success: true,
                routeId: routeId,
                segmentIndex: segmentIndex,
                updatedSegment: updatedSegment,
                newTotalDistance: newTotalDistance,
                newTotalDuration: newTotalDuration
            };

            this.notifyListeners('segmentRecalculated', result);
            console.log(`✅ Segment ${segmentIndex} recalculated successfully`);

            return result;

        } catch (error) {
            console.error(`🏗️ Failed to recalculate segment ${segmentIndex}:`, error);
            return {
                success: false,
                error: error.message,
                routeId: routeId,
                segmentIndex: segmentIndex
            };
        }
    }

    /**
     * Add new POI to existing route and recalculate affected segments
     * @param {string} routeId - Route identifier
     * @param {Object} newPOI - New POI to add
     * @param {number} insertIndex - Position to insert POI (optional)
     * @returns {Promise<Object>} Addition result
     */
    async addPOIToRoute(routeId, newPOI, insertIndex = null) {
        try {
            console.log(`🏗️ Adding POI ${newPOI.name} to route ${routeId}`);

            // Get stored route
            const storedRoute = await this.routeStorageService.getRoute(routeId);
            if (!storedRoute) {
                throw new Error(`Route ${routeId} not found`);
            }

            const currentPOIs = storedRoute.metadata.pois || [];
            
            // Determine insert position
            if (insertIndex === null) {
                insertIndex = currentPOIs.length; // Add to end
            }

            // Insert new POI
            const updatedPOIs = [...currentPOIs];
            updatedPOIs.splice(insertIndex, 0, newPOI);

            // Recalculate affected route segments
            const affectedSegments = [];
            
            if (insertIndex > 0) {
                // Recalculate segment from previous POI to new POI
                affectedSegments.push(insertIndex - 1);
            }
            
            if (insertIndex < currentPOIs.length) {
                // Recalculate segment from new POI to next POI
                affectedSegments.push(insertIndex);
            }

            // For simplicity, recalculate entire route with new POI
            // In a production system, you might optimize to recalculate only affected segments
            const newRouteId = `${routeId}_updated_${Date.now()}`;
            const recalculationResult = await this.calculateAndStoreTourRoute({
                routeId: newRouteId,
                pois: updatedPOIs,
                reason: `POI ${newPOI.name} added at position ${insertIndex}`
            });

            if (!recalculationResult.success) {
                throw new Error(`Failed to recalculate route with new POI: ${recalculationResult.error}`);
            }

            const result = {
                success: true,
                originalRouteId: routeId,
                newRouteId: newRouteId,
                addedPOI: newPOI,
                insertIndex: insertIndex,
                updatedPOIs: updatedPOIs,
                recalculationResult: recalculationResult
            };

            this.notifyListeners('poiAdded', result);
            console.log(`✅ POI ${newPOI.name} added to route successfully`);

            return result;

        } catch (error) {
            console.error(`🏗️ Failed to add POI to route:`, error);
            return {
                success: false,
                error: error.message,
                routeId: routeId,
                newPOI: newPOI
            };
        }
    }

    /**
     * Move POI to different position in route and recalculate
     * @param {string} routeId - Route identifier
     * @param {number} fromIndex - Current POI position
     * @param {number} toIndex - New POI position
     * @returns {Promise<Object>} Move result
     */
    async movePOI(routeId, fromIndex, toIndex) {
        try {
            console.log(`🏗️ Moving POI from position ${fromIndex} to ${toIndex} in route ${routeId}`);

            // Get stored route
            const storedRoute = await this.routeStorageService.getRoute(routeId);
            if (!storedRoute) {
                throw new Error(`Route ${routeId} not found`);
            }

            const currentPOIs = storedRoute.metadata.pois || [];
            
            if (fromIndex < 0 || fromIndex >= currentPOIs.length) {
                throw new Error(`Invalid from index: ${fromIndex}`);
            }
            
            if (toIndex < 0 || toIndex >= currentPOIs.length) {
                throw new Error(`Invalid to index: ${toIndex}`);
            }

            if (fromIndex === toIndex) {
                return {
                    success: true,
                    message: 'No change needed, POI already at target position'
                };
            }

            // Move POI
            const updatedPOIs = [...currentPOIs];
            const [movedPOI] = updatedPOIs.splice(fromIndex, 1);
            updatedPOIs.splice(toIndex, 0, movedPOI);

            // Recalculate entire route with reordered POIs
            const newRouteId = `${routeId}_reordered_${Date.now()}`;
            const recalculationResult = await this.calculateAndStoreTourRoute({
                routeId: newRouteId,
                pois: updatedPOIs,
                reason: `POI ${movedPOI.name} moved from position ${fromIndex} to ${toIndex}`
            });

            if (!recalculationResult.success) {
                throw new Error(`Failed to recalculate route with moved POI: ${recalculationResult.error}`);
            }

            const result = {
                success: true,
                originalRouteId: routeId,
                newRouteId: newRouteId,
                movedPOI: movedPOI,
                fromIndex: fromIndex,
                toIndex: toIndex,
                updatedPOIs: updatedPOIs,
                recalculationResult: recalculationResult
            };

            this.notifyListeners('poiMoved', result);
            console.log(`✅ POI ${movedPOI.name} moved successfully`);

            return result;

        } catch (error) {
            console.error(`🏗️ Failed to move POI:`, error);
            return {
                success: false,
                error: error.message,
                routeId: routeId,
                fromIndex: fromIndex,
                toIndex: toIndex
            };
        }
    }

    /**
     * Get backend status and statistics
     * @returns {Promise<Object>} Backend status information
     */
    async getBackendStatus() {
        try {
            const storageStats = await this.routeStorageService.getStorageStats();
            const storedRoutes = await this.routeStorageService.listStoredRoutes();
            
            return {
                isCalculating: this.isCalculating,
                calculationProgress: this.calculationProgress,
                lastCalculationTime: this.lastCalculationTime,
                debugMode: this.debugMode,
                storage: storageStats,
                availableRoutes: storedRoutes,
                poiCount: this.poiData.length,
                services: {
                    osmRouting: this.osmRoutingService ? 'available' : 'unavailable',
                    routeStorage: this.routeStorageService ? 'available' : 'unavailable'
                }
            };
        } catch (error) {
            console.error('🏗️ Failed to get backend status:', error);
            return {
                error: error.message,
                isCalculating: this.isCalculating,
                debugMode: this.debugMode
            };
        }
    }

    /**
     * Check if route needs recalculation (POI data changed, etc.)
     * @param {string} routeId - Route identifier
     * @returns {Promise<Object>} Check result with recommendations
     */
    async checkRouteNeedsUpdate(routeId) {
        try {
            const storedRoute = await this.routeStorageService.getRoute(routeId);
            if (!storedRoute) {
                return {
                    needsUpdate: true,
                    reason: 'Route not found',
                    recommendation: 'Calculate new route'
                };
            }

            const storedPOIs = storedRoute.metadata.pois || [];
            const currentPOIs = this.getSortedPOIs();

            // Check if POI count changed
            if (storedPOIs.length !== currentPOIs.length) {
                return {
                    needsUpdate: true,
                    reason: 'POI count changed',
                    storedCount: storedPOIs.length,
                    currentCount: currentPOIs.length,
                    recommendation: 'Recalculate entire route'
                };
            }

            // Check if POI order or data changed
            for (let i = 0; i < storedPOIs.length; i++) {
                const storedPOI = storedPOIs[i];
                const currentPOI = currentPOIs[i];
                
                if (storedPOI.id !== currentPOI.id ||
                    storedPOI.lat !== currentPOI.lat ||
                    storedPOI.lon !== currentPOI.lon) {
                    return {
                        needsUpdate: true,
                        reason: 'POI data changed',
                        changedPOI: i,
                        recommendation: 'Recalculate entire route'
                    };
                }
            }

            // Check route age (older than 7 days might need refresh)
            const routeAge = Date.now() - new Date(storedRoute.metadata.calculationDate).getTime();
            const weekInMs = 7 * 24 * 60 * 60 * 1000;
            
            if (routeAge > weekInMs) {
                return {
                    needsUpdate: false,
                    reason: 'Route is older than 7 days',
                    age: Math.round(routeAge / (24 * 60 * 60 * 1000)),
                    recommendation: 'Consider recalculating for freshest routing data'
                };
            }

            return {
                needsUpdate: false,
                reason: 'Route is up to date',
                age: Math.round(routeAge / (24 * 60 * 60 * 1000)),
                recommendation: 'No action needed'
            };

        } catch (error) {
            console.error(`🏗️ Failed to check route update status:`, error);
            return {
                needsUpdate: true,
                reason: 'Error checking route status',
                error: error.message,
                recommendation: 'Recalculate route to be safe'
            };
        }
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Debug mode state
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🏗️ Debug mode ${enabled ? 'enabled' : 'disabled'}`);
        
        if (enabled) {
            // Enable detailed logging in routing service
            if (this.osmRoutingService.debugMode !== undefined) {
                this.osmRoutingService.debugMode = true;
            }
        }
    }

    /**
     * Get sorted POIs for tour route calculation
     * @returns {Array} Array of POIs sorted by tour order
     */
    getSortedPOIs() {
        return this.poiData.sort((a, b) => a.order - b.order);
    }

    /**
     * Generate default route ID based on POI data
     * @returns {string} Generated route identifier
     */
    generateDefaultRouteId() {
        const sortedPOIs = this.getSortedPOIs();
        const poiIds = sortedPOIs.map(poi => poi.id).join('-');
        const hash = this.simpleHash(poiIds);
        return `langres_tour_${hash}_${Date.now()}`;
    }

    /**
     * Simple hash function for generating route IDs
     * @param {string} str - String to hash
     * @returns {string} Hash string
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // Event listener management
    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('🏗️ Backend listener error:', error);
            }
        });
    }

    // Utility methods for external access
    isCalculatingRoute() {
        return this.isCalculating;
    }

    getCalculationProgress() {
        return this.calculationProgress;
    }

    getLastCalculationTime() {
        return this.lastCalculationTime;
    }
}