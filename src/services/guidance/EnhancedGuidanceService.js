/**
 * Enhanced Guidance Service Implementation with Route Storage
 * Single Responsibility: Coordinate guidance with stored route support
 * Open/Closed: Extends existing guidance with route storage capabilities
 * Liskov Substitution: Can substitute original GuidanceService
 * Interface Segregation: Focused guidance coordination interface
 * Dependency Inversion: Depends on route storage and routing abstractions
 */

import { GuidanceEvents, GuidanceTypes, DefaultGuidanceSettings } from '../../interfaces/IGuidanceService.js';

export class EnhancedGuidanceService {
    constructor(navigationService, routingService, audioService, poiData, storedRouteService) {
        this.navigationService = navigationService;
        this.routingService = routingService; // OSMRoutingService for fallback
        this.audioService = audioService;
        this.poiData = poiData;
        this.storedRouteService = storedRouteService;
        
        // Guidance state
        this.activeGuidanceType = null;
        this.currentRoute = null;
        this.isUsingStoredRoute = false;
        this.guidanceStartTime = null;
        
        // Settings
        this.settings = { ...DefaultGuidanceSettings };
        
        // Event listeners
        this.listeners = [];
        
        // Back-on-track state
        this.isOnStoredRoute = true;
        this.lastRouteCheck = 0;
        this.routeCheckInterval = 5000; // Check every 5 seconds
        
        console.log('🎯✨ EnhancedGuidanceService initialized with stored route support');
    }

    /**
     * Start guidance with stored route priority
     * @param {Object} config - Guidance configuration
     * @returns {Promise<boolean>} Success status
     */
    async startGuidance(config) {
        try {
            console.log(`🎯✨ Starting enhanced guidance with type: ${config.type}`);
            
            // Stop any active guidance first
            if (this.activeGuidanceType) {
                await this.stopGuidance();
            }
            
            // Set state
            this.activeGuidanceType = config.type;
            this.guidanceStartTime = new Date();
            
            let result = false;
            
            switch (config.type) {
                case GuidanceTypes.GUIDED_TOUR:
                    result = await this.startEnhancedGuidedTour(config);
                    break;
                    
                case GuidanceTypes.BACK_ON_TRACK:
                    result = await this.startEnhancedBackOnTrack(config);
                    break;
                    
                case GuidanceTypes.FREE_NAVIGATION:
                    result = await this.startFreeNavigation(config);
                    break;
                    
                default:
                    throw new Error(`Unsupported guidance type: ${config.type}`);
            }
            
            if (result) {
                console.log(`🎯✨ Enhanced ${config.type} guidance started successfully`);
                console.log(`   Using stored route: ${this.isUsingStoredRoute}`);
                
                this.notifyListeners(GuidanceEvents.GUIDANCE_STARTED, {
                    type: config.type,
                    startTime: this.guidanceStartTime,
                    usingStoredRoute: this.isUsingStoredRoute,
                    config: config
                });
            } else {
                this.activeGuidanceType = null;
                this.guidanceStartTime = null;
            }
            
            return result;
            
        } catch (error) {
            console.error('🎯✨ Failed to start enhanced guidance:', error);
            this.activeGuidanceType = null;
            this.guidanceStartTime = null;
            
            this.notifyListeners(GuidanceEvents.GUIDANCE_ERROR, {
                message: 'Failed to start enhanced guidance',
                error: error.message,
                config: config
            });
            
            return false;
        }
    }

    /**
     * Start enhanced guided tour with stored route priority
     * @param {Object} config - Tour configuration
     * @returns {Promise<boolean>} Success status
     */
    async startEnhancedGuidedTour(config) {
        try {
            console.log('🎯✨ Starting enhanced guided tour...');
            
            // Try to get stored route first
            const routeResult = await this.storedRouteService.getTourRoute({
                routeId: config.routeId,
                preferStored: true
            });
            
            if (routeResult.success) {
                this.currentRoute = routeResult.route;
                this.isUsingStoredRoute = routeResult.source === 'stored';
                
                console.log(`🎯✨ Tour route obtained from: ${routeResult.source}`);
                
                if (this.isUsingStoredRoute) {
                    console.log('✅ Using pre-calculated stored route - no OSRM calls needed!');
                    
                    // Start navigation with stored route
                    const navigationStarted = this.navigationService.startNavigation(routeResult);
                    
                    if (navigationStarted) {
                        this.startRouteMonitoring();
                        return true;
                    } else {
                        throw new Error('Failed to start navigation with stored route');
                    }
                } else {
                    console.log('⚠️ Using fresh OSRM route - consider storing for future use');
                    
                    // Start navigation with fresh route
                    const navigationStarted = this.navigationService.startNavigation(routeResult);
                    return navigationStarted;
                }
            } else {
                throw new Error(`Failed to obtain tour route: ${routeResult.error}`);
            }
            
        } catch (error) {
            console.error('🎯✨ Enhanced guided tour failed:', error);
            return false;
        }
    }

    /**
     * Start enhanced back-on-track with stored route awareness
     * @param {Object} config - Back-on-track configuration
     * @returns {Promise<boolean>} Success status
     */
    async startEnhancedBackOnTrack(config) {
        try {
            console.log('🎯✨ Starting enhanced back-on-track...');
            
            if (!config.userPosition) {
                throw new Error('User position required for back-on-track');
            }
            
            // Check if we have a stored route to return to
            if (this.storedRouteService.hasStoredRoute()) {
                console.log('🎯✨ Using stored route for back-on-track guidance');
                
                // Get closest point on stored route
                const closestPoint = this.storedRouteService.getClosestRoutePoint(config.userPosition);
                
                if (closestPoint) {
                    // Calculate route back to stored route
                    const backToRouteResult = await this.routingService.calculateRoute(
                        config.userPosition,
                        [closestPoint.lat, closestPoint.lon]
                    );
                    
                    if (backToRouteResult && backToRouteResult.features && backToRouteResult.features.length > 0) {
                        const navigationStarted = this.navigationService.startNavigation({
                            success: true,
                            route: backToRouteResult,
                            segments: [{
                                id: 'back-to-stored-route',
                                start: { 
                                    lat: config.userPosition[0], 
                                    lon: config.userPosition[1], 
                                    name: 'Current position' 
                                },
                                end: {
                                    lat: closestPoint.lat,
                                    lon: closestPoint.lon,
                                    name: 'Return to tour route'
                                },
                                route: backToRouteResult.features[0],
                                instructions: backToRouteResult.features[0].properties.segments[0].steps || [],
                                distance: backToRouteResult.features[0].properties.summary.distance,
                                duration: backToRouteResult.features[0].properties.summary.duration
                            }]
                        });
                        
                        if (navigationStarted) {
                            this.isOnStoredRoute = false;
                            this.startRouteMonitoring();
                            return true;
                        }
                    }
                }
            }
            
            // Fallback to regular back-on-track if no stored route
            console.log('🎯✨ No stored route available, using regular back-on-track');
            return false; // Let original back-on-track service handle this
            
        } catch (error) {
            console.error('🎯✨ Enhanced back-on-track failed:', error);
            return false;
        }
    }

    /**
     * Start route monitoring for stored route adherence
     */
    startRouteMonitoring() {
        if (!this.isUsingStoredRoute) {
            return;
        }
        
        console.log('🎯✨ Starting stored route monitoring...');
        
        // Set up periodic route checking
        this.routeMonitoringInterval = setInterval(() => {
            this.checkStoredRouteAdherence();
        }, this.routeCheckInterval);
    }

    /**
     * Stop route monitoring
     */
    stopRouteMonitoring() {
        if (this.routeMonitoringInterval) {
            clearInterval(this.routeMonitoringInterval);
            this.routeMonitoringInterval = null;
            console.log('🎯✨ Stopped stored route monitoring');
        }
    }

    /**
     * Check if user is still on stored route
     */
    async checkStoredRouteAdherence() {
        try {
            // Get current position from location service
            // For this implementation, we'll wait for position updates via updatePosition
            const now = Date.now();
            if (now - this.lastRouteCheck < this.routeCheckInterval) {
                return;
            }
            
            this.lastRouteCheck = now;
            
            // This will be called from updatePosition with actual user position
            
        } catch (error) {
            console.error('🎯✨ Error checking stored route adherence:', error);
        }
    }

    /**
     * Update position with stored route awareness
     * @param {Array} position - [latitude, longitude]
     * @returns {Promise<Object>} Enhanced guidance instruction
     */
    async updatePosition(position) {
        if (!this.activeGuidanceType) {
            return { guidance: false, message: 'No active guidance' };
        }
        
        try {
            // Check stored route adherence if using stored route
            if (this.isUsingStoredRoute && this.storedRouteService.hasStoredRoute()) {
                const routeCheck = this.storedRouteService.isOnStoredRoute(position, this.settings.deviationThreshold);
                
                if (routeCheck.onRoute && !this.isOnStoredRoute) {
                    // User returned to stored route
                    console.log('🎯✨ User returned to stored route');
                    this.isOnStoredRoute = true;
                    this.handleReturnToStoredRoute(position);
                    
                } else if (!routeCheck.onRoute && this.isOnStoredRoute) {
                    // User deviated from stored route
                    console.log(`🎯✨ User deviated from stored route: ${routeCheck.distance.toFixed(0)}m`);
                    this.isOnStoredRoute = false;
                    
                    if (this.settings.autoCorrectDeviations) {
                        await this.handleStoredRouteDeviation(position);
                    }
                }
                
                // Get next instruction from stored route if on route
                if (this.isOnStoredRoute) {
                    const nextInstruction = this.storedRouteService.getNextInstruction(position);
                    
                    if (nextInstruction) {
                        this.notifyListeners(GuidanceEvents.POSITION_UPDATED, {
                            position: position,
                            guidanceType: this.activeGuidanceType,
                            onStoredRoute: this.isOnStoredRoute,
                            routeCheck: routeCheck,
                            nextInstruction: nextInstruction
                        });
                        
                        return {
                            guidance: true,
                            type: this.activeGuidanceType,
                            position: position,
                            usingStoredRoute: true,
                            onRoute: true,
                            nextInstruction: nextInstruction,
                            routeProgress: routeCheck.routeProgress
                        };
                    }
                }
            }
            
            // Default position update handling
            this.notifyListeners(GuidanceEvents.POSITION_UPDATED, {
                position: position,
                guidanceType: this.activeGuidanceType,
                onStoredRoute: this.isOnStoredRoute,
                usingStoredRoute: this.isUsingStoredRoute
            });
            
            return {
                guidance: true,
                type: this.activeGuidanceType,
                position: position,
                usingStoredRoute: this.isUsingStoredRoute,
                onRoute: this.isOnStoredRoute
            };
            
        } catch (error) {
            console.error('🎯✨ Error in enhanced position update:', error);
            return {
                guidance: false,
                error: error.message
            };
        }
    }

    /**
     * Handle deviation from stored route
     * @param {Array} position - Current user position
     */
    async handleStoredRouteDeviation(position) {
        console.log('🎯✨ Handling stored route deviation...');
        
        // Switch to back-on-track mode automatically
        const backOnTrackConfig = {
            type: GuidanceTypes.BACK_ON_TRACK,
            userPosition: position,
            mainRoute: this.currentRoute
        };
        
        // Pause current guidance temporarily
        const previousGuidanceType = this.activeGuidanceType;
        
        // Start back-on-track
        const backOnTrackStarted = await this.startEnhancedBackOnTrack(backOnTrackConfig);
        
        if (backOnTrackStarted) {
            this.notifyListeners(GuidanceEvents.DEVIATION_DETECTED, {
                position: position,
                previousGuidance: previousGuidanceType,
                switchedToBackOnTrack: true,
                storedRouteDeviation: true
            });
        }
    }

    /**
     * Handle return to stored route
     * @param {Array} position - Current user position
     */
    handleReturnToStoredRoute(position) {
        console.log('🎯✨ User returned to stored route');
        
        // Resume normal guidance
        if (this.activeGuidanceType === GuidanceTypes.BACK_ON_TRACK) {
            this.activeGuidanceType = GuidanceTypes.GUIDED_TOUR;
        }
        
        this.notifyListeners(GuidanceEvents.RETURNED_TO_MAIN_ROUTE, {
            position: position,
            resumedStoredRoute: true,
            guidanceType: this.activeGuidanceType
        });
    }

    /**
     * Stop enhanced guidance
     */
    async stopGuidance() {
        if (!this.activeGuidanceType) {
            console.log('🎯✨ No active enhanced guidance to stop');
            return;
        }
        
        console.log(`🎯✨ Stopping enhanced ${this.activeGuidanceType} guidance`);
        
        try {
            // Stop route monitoring
            this.stopRouteMonitoring();
            
            // Stop navigation service
            this.navigationService.stopNavigation();
            
            // Clear stored route service state if needed
            if (this.isUsingStoredRoute) {
                // Don't clear the stored route itself, just the current usage state
                this.storedRouteService.clearCurrentRoute();
            }
            
            // Reset state
            const previousType = this.activeGuidanceType;
            this.activeGuidanceType = null;
            this.guidanceStartTime = null;
            this.currentRoute = null;
            this.isUsingStoredRoute = false;
            this.isOnStoredRoute = true;
            
            this.notifyListeners(GuidanceEvents.GUIDANCE_STOPPED, {
                previousType: previousType,
                reason: 'Enhanced guidance stopped'
            });
            
        } catch (error) {
            console.error('🎯✨ Error stopping enhanced guidance:', error);
        }
    }

    /**
     * Get enhanced guidance status
     * @returns {Object} Enhanced guidance status
     */
    getGuidanceStatus() {
        if (!this.activeGuidanceType) {
            return {
                active: false,
                type: null,
                message: 'No active enhanced guidance'
            };
        }
        
        const baseStatus = {
            active: true,
            type: this.activeGuidanceType,
            startTime: this.guidanceStartTime,
            duration: this.guidanceStartTime ? Date.now() - this.guidanceStartTime : 0,
            usingStoredRoute: this.isUsingStoredRoute,
            onStoredRoute: this.isOnStoredRoute,
            enhancedFeatures: true
        };
        
        // Add stored route specific information
        if (this.isUsingStoredRoute && this.storedRouteService.hasStoredRoute()) {
            baseStatus.storedRoute = {
                routeId: this.storedRouteService.getCurrentRouteId(),
                metadata: this.storedRouteService.getCurrentRouteMetadata(),
                segmentCount: this.storedRouteService.getRouteSegmentCount(),
                coordinateCount: this.storedRouteService.getRouteCoordinateCount()
            };
        }
        
        return baseStatus;
    }

    /**
     * Start free navigation (unchanged from original)
     * @param {Object} config - Navigation configuration
     * @returns {Promise<boolean>} Success status
     */
    async startFreeNavigation(config) {
        console.log('🎯✨ Starting free navigation mode');
        
        if (!config.route) {
            throw new Error('Free navigation requires route data');
        }
        
        return this.navigationService.startNavigation(config.route);
    }

    // Event listener management (unchanged from original)
    addGuidanceListener(callback) {
        this.listeners.push(callback);
    }

    removeGuidanceListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('🎯✨ Enhanced guidance listener error:', error);
            }
        });
    }

    // Settings management
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Update stored route service settings
        if (newSettings.hasOwnProperty('preferStoredRoutes')) {
            this.storedRouteService.setPreferStoredRoutes(newSettings.preferStoredRoutes);
        }
        
        if (newSettings.hasOwnProperty('fallbackToOSRM')) {
            this.storedRouteService.setFallbackToOSRM(newSettings.fallbackToOSRM);
        }
        
        if (newSettings.hasOwnProperty('routeCheckInterval')) {
            this.routeCheckInterval = newSettings.routeCheckInterval;
        }
        
        console.log('🎯✨ Enhanced guidance settings updated:', this.settings);
    }

    getSettings() {
        return { ...this.settings };
    }

    // Utility methods
    isEnhancedGuidanceActive() {
        return this.activeGuidanceType !== null;
    }

    isUsingStoredRouteGuidance() {
        return this.isUsingStoredRoute;
    }

    isUserOnStoredRoute() {
        return this.isOnStoredRoute;
    }

    getActiveGuidanceType() {
        return this.activeGuidanceType;
    }

    getGuidanceDuration() {
        return this.guidanceStartTime ? Date.now() - this.guidanceStartTime : 0;
    }

    getStoredRouteService() {
        return this.storedRouteService;
    }
}