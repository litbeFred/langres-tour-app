/**
 * Back On Track Service Implementation
 * Single Responsibility: Handle deviation correction and getting users back to main tour route
 * 
 * This service provides generic correction functionality when users deviate from
 * their intended route. It's designed to be a robust fallback that can handle
 * any routing scenario, not just tour-specific deviations.
 */

import { GuidanceEvents, GuidanceTypes, DefaultGuidanceSettings } from '../../interfaces/IGuidanceService.js';

export class BackOnTrackService {
    constructor(navigationService, routingService, audioService) {
        this.navigationService = navigationService;
        this.routingService = routingService;
        this.audioService = audioService;
        
        // Back-on-track state
        this.correctionActive = false;
        this.mainRoute = null;
        this.deviationPoint = null;
        this.correctionRoute = null;
        this.targetReconnectionPoint = null;
        this.deviationStartTime = null;
        
        // Settings
        this.settings = { ...DefaultGuidanceSettings };
        
        // Event listeners
        this.listeners = [];
        
        // Deviation tracking
        this.deviationHistory = [];
        this.lastDeviationCheck = 0;
        
        console.log('🔄 BackOnTrackService initialized');
    }

    /**
     * Calculate route back to the main tour path
     * @param {Array} currentPosition - [latitude, longitude]
     * @param {Object} mainRoute - Main tour route data
     * @param {Object} options - Back-on-track options
     * @returns {Promise<Object>} Correction route data
     */
    async calculateBackOnTrackRoute(currentPosition, mainRoute, options = {}) {
        try {
            console.log('🔄 Calculating back-on-track route...');
            
            if (!mainRoute || !mainRoute.features || mainRoute.features.length === 0) {
                throw new Error('No main route provided for back-on-track calculation');
            }
            
            // Find the best reconnection point on the main route
            const reconnectionPoint = this.findBestReconnectionPoint(currentPosition, mainRoute);
            
            if (!reconnectionPoint) {
                throw new Error('No suitable reconnection point found on main route');
            }
            
            this.targetReconnectionPoint = reconnectionPoint;
            
            // Calculate route from current position to reconnection point
            const correctionRoute = await this.routingService.calculateRoute(
                currentPosition,
                [reconnectionPoint.lat, reconnectionPoint.lon]
            );
            
            if (!correctionRoute || !correctionRoute.features || correctionRoute.features.length === 0) {
                throw new Error('Failed to calculate correction route');
            }
            
            // Store correction route
            this.correctionRoute = correctionRoute;
            
            console.log(`🔄 Back-on-track route calculated: ${(correctionRoute.features[0].properties.summary.distance / 1000).toFixed(2)}km`);
            
            return {
                success: true,
                correctionRoute: correctionRoute,
                reconnectionPoint: reconnectionPoint,
                deviationDistance: this.routingService.calculateDistance(
                    currentPosition[0], currentPosition[1],
                    reconnectionPoint.lat, reconnectionPoint.lon
                ),
                estimatedCorrectionTime: correctionRoute.features[0].properties.summary.duration
            };
            
        } catch (error) {
            console.error('🔄 Failed to calculate back-on-track route:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Start navigation back to tour route
     * @param {Array} currentPosition - [latitude, longitude]
     * @param {Object} targetRoute - Route to return to
     * @returns {Promise<boolean>} Success status
     */
    async startBackOnTrackNavigation(currentPosition, targetRoute) {
        try {
            console.log('🔄 Starting back-on-track navigation...');
            
            // Calculate correction route
            const correctionResult = await this.calculateBackOnTrackRoute(currentPosition, targetRoute);
            
            if (!correctionResult.success) {
                throw new Error(`Correction route calculation failed: ${correctionResult.error}`);
            }
            
            // Set state
            this.correctionActive = true;
            this.mainRoute = targetRoute;
            this.deviationPoint = currentPosition;
            this.deviationStartTime = new Date();
            
            // Start navigation service for correction route
            const navigationStarted = this.navigationService.startNavigation({
                success: true,
                route: correctionResult.correctionRoute,
                segments: [{
                    id: 'back-on-track',
                    start: { 
                        lat: currentPosition[0], 
                        lon: currentPosition[1], 
                        name: 'Position de déviation' 
                    },
                    end: {
                        lat: correctionResult.reconnectionPoint.lat,
                        lon: correctionResult.reconnectionPoint.lon,
                        name: 'Point de reconnexion'
                    },
                    route: correctionResult.correctionRoute.features[0],
                    instructions: correctionResult.correctionRoute.features[0].properties.segments[0].steps || [],
                    distance: correctionResult.correctionRoute.features[0].properties.summary.distance,
                    duration: correctionResult.correctionRoute.features[0].properties.summary.duration
                }]
            });
            
            if (!navigationStarted) {
                throw new Error('Navigation service failed to start correction navigation');
            }
            
            // Register for navigation events
            this.navigationService.addListener(this.handleCorrectionNavigationEvent.bind(this));
            
            // Track deviation
            this.deviationHistory.push({
                timestamp: this.deviationStartTime,
                position: currentPosition,
                correctionDistance: correctionResult.deviationDistance,
                reason: 'User deviated from main route'
            });
            
            // Announce back-on-track navigation
            this.announceBackOnTrackStart(correctionResult);
            
            // Notify listeners
            this.notifyListeners(GuidanceEvents.BACK_ON_TRACK_STARTED, {
                deviationPoint: currentPosition,
                reconnectionPoint: correctionResult.reconnectionPoint,
                correctionDistance: correctionResult.deviationDistance,
                estimatedTime: correctionResult.estimatedCorrectionTime
            });
            
            console.log('🔄 Back-on-track navigation started successfully');
            return true;
            
        } catch (error) {
            console.error('🔄 Failed to start back-on-track navigation:', error);
            this.correctionActive = false;
            
            this.notifyListeners(GuidanceEvents.GUIDANCE_ERROR, {
                message: 'Failed to start back-on-track navigation',
                error: error.message
            });
            
            return false;
        }
    }

    /**
     * Check if user has returned to main route
     * @param {Array} currentPosition - [latitude, longitude]
     * @param {Object} mainRoute - Main tour route
     * @returns {boolean} True if back on main route
     */
    isBackOnMainRoute(currentPosition, mainRoute) {
        if (!mainRoute || !mainRoute.features || mainRoute.features.length === 0) {
            return false;
        }
        
        try {
            // Check distance to main route
            const routeCoordinates = mainRoute.features[0].geometry.coordinates;
            let minDistance = Infinity;
            
            for (const coord of routeCoordinates) {
                const distance = this.routingService.calculateDistance(
                    currentPosition[0], currentPosition[1],
                    coord[1], coord[0] // Note: route coords are [lon, lat]
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                }
            }
            
            const isBackOnTrack = minDistance <= this.settings.deviationThreshold;
            
            if (isBackOnTrack && this.correctionActive) {
                console.log(`🔄 User returned to main route (${minDistance.toFixed(0)}m from route)`);
                this.handleReturnToMainRoute();
            }
            
            return isBackOnTrack;
            
        } catch (error) {
            console.error('🔄 Error checking if back on main route:', error);
            return false;
        }
    }

    /**
     * Get deviation information
     * @returns {Object} Deviation details and correction suggestions
     */
    getDeviationInfo() {
        return {
            correctionActive: this.correctionActive,
            deviationPoint: this.deviationPoint,
            deviationStartTime: this.deviationStartTime,
            deviationDuration: this.deviationStartTime 
                ? Date.now() - this.deviationStartTime 
                : 0,
            targetReconnectionPoint: this.targetReconnectionPoint,
            correctionRoute: this.correctionRoute,
            deviationHistory: [...this.deviationHistory],
            correctionProgress: this.getCorrectionProgress()
        };
    }

    /**
     * Find the best reconnection point on the main route
     * @param {Array} currentPosition - [latitude, longitude]
     * @param {Object} mainRoute - Main route data
     * @returns {Object|null} Best reconnection point
     */
    findBestReconnectionPoint(currentPosition, mainRoute) {
        try {
            const routeCoordinates = mainRoute.features[0].geometry.coordinates;
            let bestPoint = null;
            let minDistance = Infinity;
            let bestIndex = -1;
            
            // Find closest point on route
            for (let i = 0; i < routeCoordinates.length; i++) {
                const coord = routeCoordinates[i];
                const distance = this.routingService.calculateDistance(
                    currentPosition[0], currentPosition[1],
                    coord[1], coord[0] // Note: route coords are [lon, lat]
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    bestPoint = {
                        lat: coord[1],
                        lon: coord[0],
                        routeIndex: i,
                        distanceFromUser: distance
                    };
                    bestIndex = i;
                }
            }
            
            // Look ahead on the route for a better strategic reconnection point
            // This helps users rejoin the route ahead of where they deviated
            const lookAheadDistance = 200; // meters
            const lookAheadSteps = Math.min(10, routeCoordinates.length - bestIndex - 1);
            
            for (let i = 1; i <= lookAheadSteps; i++) {
                const coordIndex = bestIndex + i;
                if (coordIndex >= routeCoordinates.length) break;
                
                const coord = routeCoordinates[coordIndex];
                const distance = this.routingService.calculateDistance(
                    currentPosition[0], currentPosition[1],
                    coord[1], coord[0]
                );
                
                // If this point is not much farther and would be strategically better
                if (distance < minDistance + lookAheadDistance) {
                    bestPoint = {
                        lat: coord[1],
                        lon: coord[0],
                        routeIndex: coordIndex,
                        distanceFromUser: distance,
                        strategic: true // Mark as strategic reconnection point
                    };
                }
            }
            
            if (bestPoint) {
                bestPoint.name = bestPoint.strategic ? 
                    'Point de reconnexion strategique' : 
                    'Point de reconnexion le plus proche';
                    
                console.log(`🔄 Best reconnection point found: ${bestPoint.distanceFromUser.toFixed(0)}m away`);
            }
            
            return bestPoint;
            
        } catch (error) {
            console.error('🔄 Error finding reconnection point:', error);
            return null;
        }
    }

    /**
     * Handle return to main route
     */
    handleReturnToMainRoute() {
        if (!this.correctionActive) return;
        
        console.log('🔄 User returned to main route - back-on-track completed');
        
        // Stop correction navigation
        this.stopBackOnTrackNavigation();
        
        // Record successful correction
        if (this.deviationHistory.length > 0) {
            const lastDeviation = this.deviationHistory[this.deviationHistory.length - 1];
            lastDeviation.correctionCompletedTime = new Date();
            lastDeviation.correctionDuration = lastDeviation.correctionCompletedTime - lastDeviation.timestamp;
            lastDeviation.successful = true;
        }
        
        // Announce return to route
        this.announceReturnToMainRoute();
        
        // Notify listeners
        this.notifyListeners(GuidanceEvents.RETURNED_TO_MAIN_ROUTE, {
            deviationDuration: this.deviationStartTime ? Date.now() - this.deviationStartTime : 0,
            correctionSuccessful: true,
            reconnectionPoint: this.targetReconnectionPoint
        });
    }

    /**
     * Handle correction navigation events
     * @param {string} event - Event type
     * @param {Object} data - Event data
     */
    handleCorrectionNavigationEvent(event, data) {
        switch (event) {
            case 'navigationStopped':
                // Reached reconnection point
                if (this.correctionActive) {
                    this.handleReturnToMainRoute();
                }
                break;
                
            case 'positionUpdate':
                // Check if user is back on main route
                if (this.mainRoute) {
                    this.isBackOnMainRoute(data.position, this.mainRoute);
                }
                break;
                
            case 'rerouteCompleted':
                console.log('🔄 Back-on-track reroute completed');
                break;
        }
    }

    /**
     * Stop back-on-track navigation
     */
    stopBackOnTrackNavigation() {
        if (!this.correctionActive) return;
        
        console.log('🔄 Stopping back-on-track navigation');
        
        this.correctionActive = false;
        this.navigationService.stopNavigation();
        this.navigationService.removeListener(this.handleCorrectionNavigationEvent.bind(this));
        
        // Reset state
        this.deviationPoint = null;
        this.correctionRoute = null;
        this.targetReconnectionPoint = null;
        this.deviationStartTime = null;
        
        // Notify listeners
        this.notifyListeners(GuidanceEvents.BACK_ON_TRACK_COMPLETED, {
            reason: 'Back-on-track navigation stopped',
            successful: true
        });
    }

    /**
     * Get correction progress information
     * @returns {Object} Correction progress details
     */
    getCorrectionProgress() {
        if (!this.correctionActive || !this.correctionRoute) {
            return {
                active: false,
                message: 'No active correction'
            };
        }
        
        return {
            active: true,
            deviationDuration: this.deviationStartTime ? Date.now() - this.deviationStartTime : 0,
            targetPoint: this.targetReconnectionPoint,
            correctionDistance: this.correctionRoute.features[0].properties.summary.distance,
            estimatedTimeToReconnection: this.correctionRoute.features[0].properties.summary.duration
        };
    }

    /**
     * Check for deviation from route (can be called periodically)
     * @param {Array} currentPosition - [latitude, longitude]
     * @param {Object} mainRoute - Main route to check against
     * @returns {Object} Deviation check result
     */
    checkDeviation(currentPosition, mainRoute) {
        const now = Date.now();
        
        // Rate limit deviation checks (max once per 5 seconds)
        if (now - this.lastDeviationCheck < 5000) {
            return { checked: false, reason: 'Rate limited' };
        }
        
        this.lastDeviationCheck = now;
        
        try {
            if (!mainRoute || !mainRoute.features || mainRoute.features.length === 0) {
                return { deviated: false, reason: 'No main route to check against' };
            }
            
            const routeCoordinates = mainRoute.features[0].geometry.coordinates;
            let minDistance = Infinity;
            
            for (const coord of routeCoordinates) {
                const distance = this.routingService.calculateDistance(
                    currentPosition[0], currentPosition[1],
                    coord[1], coord[0] // Note: route coords are [lon, lat]
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                }
            }
            
            const deviated = minDistance > this.settings.deviationThreshold;
            
            if (deviated && !this.correctionActive) {
                console.log(`🔄 Deviation detected: ${minDistance.toFixed(0)}m from route`);
                
                this.notifyListeners(GuidanceEvents.DEVIATION_DETECTED, {
                    position: currentPosition,
                    deviationDistance: minDistance,
                    threshold: this.settings.deviationThreshold
                });
            }
            
            return {
                checked: true,
                deviated: deviated,
                distance: minDistance,
                threshold: this.settings.deviationThreshold
            };
            
        } catch (error) {
            console.error('🔄 Error checking deviation:', error);
            return {
                checked: false,
                error: error.message
            };
        }
    }

    // Audio announcement methods
    announceBackOnTrackStart(correctionResult) {
        if (!this.settings.audioEnabled) return;
        
        const distance = Math.round(correctionResult.deviationDistance);
        const message = `Vous vous êtes écarté du parcours. Recalcul de l'itinéraire pour revenir sur la route principale. Distance de correction: ${distance} mètres.`;
        this.audioService.speak(message, this.settings.language);
    }

    announceReturnToMainRoute() {
        if (!this.settings.audioEnabled) return;
        
        const message = "Parfait! Vous êtes de retour sur le parcours principal. Continuez votre visite.";
        this.audioService.speak(message, this.settings.language);
    }

    announceDeviationDetected(deviationDistance) {
        if (!this.settings.audioEnabled) return;
        
        const distance = Math.round(deviationDistance);
        const message = `Attention, vous vous écartez du parcours. Distance: ${distance} mètres. Souhaitez-vous revenir sur la route?`;
        this.audioService.speak(message, this.settings.language);
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
                console.error('🔄 Back-on-track listener error:', error);
            }
        });
    }

    // Settings management
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('🔄 Back-on-track settings updated:', this.settings);
    }

    getSettings() {
        return { ...this.settings };
    }

    // Status getters
    isActive() {
        return this.correctionActive;
    }

    getDeviationHistory() {
        return [...this.deviationHistory];
    }

    getCurrentCorrection() {
        return this.correctionActive ? {
            deviationPoint: this.deviationPoint,
            targetReconnectionPoint: this.targetReconnectionPoint,
            correctionRoute: this.correctionRoute,
            startTime: this.deviationStartTime
        } : null;
    }
}