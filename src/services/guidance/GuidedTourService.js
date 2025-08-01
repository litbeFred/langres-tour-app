/**
 * Guided Tour Service Implementation
 * Single Responsibility: Handle main tour navigation through all POIs
 * 
 * This service manages the primary tour experience, guiding users from
 * their current location to the tour start, then through each POI in sequence.
 * It's optimized for the always-same tour route and provides enhanced features
 * for the tour experience.
 */

import { GuidanceEvents, GuidanceTypes, DefaultGuidanceSettings } from '../../interfaces/IGuidanceService.js';

export class GuidedTourService {
    constructor(navigationService, routingService, audioService, poiData) {
        this.navigationService = navigationService;
        this.routingService = routingService;
        this.audioService = audioService;
        this.poiData = poiData;
        
        // Tour state
        this.tourActive = false;
        this.currentPOIIndex = 0;
        this.tourPOIs = [];
        this.tourRoute = null;
        this.userStartPosition = null;
        
        // Tour settings
        this.settings = { ...DefaultGuidanceSettings };
        
        // Event listeners
        this.listeners = [];
        
        // Tour statistics
        this.tourStats = {
            startTime: null,
            poiVisited: [],
            totalDistance: 0,
            distanceTraveled: 0
        };
        
        console.log('🎯 GuidedTourService initialized');
    }

    /**
     * Start guided tour from current position through all POIs
     * @param {Array} tourPOIs - Array of POI objects for the tour
     * @param {Object} options - Tour-specific options
     * @returns {Promise<boolean>} Success status
     */
    async startGuidedTour(tourPOIs, options = {}) {
        try {
            console.log('🎯 Starting guided tour...');
            
            // Validate inputs
            if (!tourPOIs || tourPOIs.length === 0) {
                throw new Error('No POIs provided for guided tour');
            }
            
            // Update settings with provided options
            this.settings = { ...this.settings, ...options };
            
            // Store tour data
            this.tourPOIs = [...tourPOIs];
            this.currentPOIIndex = 0;
            this.tourActive = true;
            
            // Initialize tour statistics
            this.tourStats = {
                startTime: new Date(),
                poiVisited: [],
                totalDistance: 0,
                distanceTraveled: 0
            };
            
            // Get current user position
            this.userStartPosition = await this.getCurrentPosition();
            
            // Calculate complete tour route
            const routeResult = await this.calculateCompleteTourRoute();
            
            if (!routeResult.success) {
                throw new Error(`Failed to calculate tour route: ${routeResult.error}`);
            }
            
            this.tourRoute = routeResult;
            
            // Start navigation to first POI
            const firstPOI = this.tourPOIs[0];
            const navigationStarted = await this.navigateToNextPOI(firstPOI);
            
            if (!navigationStarted) {
                throw new Error('Failed to start navigation to first POI');
            }
            
            // Announce tour start
            this.announceTourStart();
            
            // Notify listeners
            this.notifyListeners(GuidanceEvents.TOUR_STARTED, {
                totalPOIs: this.tourPOIs.length,
                startPosition: this.userStartPosition,
                firstDestination: firstPOI.name,
                estimatedDuration: this.tourRoute.route.summary.duration
            });
            
            console.log(`🎯 Guided tour started with ${this.tourPOIs.length} POIs`);
            return true;
            
        } catch (error) {
            console.error('🎯 Failed to start guided tour:', error);
            this.tourActive = false;
            
            this.notifyListeners(GuidanceEvents.GUIDANCE_ERROR, {
                message: 'Failed to start guided tour',
                error: error.message
            });
            
            return false;
        }
    }

    /**
     * Navigate to specific POI in the tour
     * @param {Object} targetPOI - Target POI object
     * @returns {Promise<boolean>} Success status
     */
    async navigateToNextPOI(targetPOI) {
        try {
            console.log(`🎯 Navigating to POI: ${targetPOI.name}`);
            
            if (!this.tourActive) {
                console.warn('🎯 Tour not active, cannot navigate to POI');
                return false;
            }
            
            // Calculate route from current position to target POI
            const currentPosition = await this.getCurrentPosition();
            const routeToTarget = await this.routingService.calculateRoute(
                currentPosition,
                [targetPOI.lat, targetPOI.lon]
            );
            
            if (!routeToTarget || !routeToTarget.features || routeToTarget.features.length === 0) {
                throw new Error(`No route found to ${targetPOI.name}`);
            }
            
            // Start navigation service for this segment
            const navigationStarted = this.navigationService.startNavigation({
                success: true,
                route: routeToTarget,
                segments: [{
                    id: this.currentPOIIndex,
                    start: { 
                        lat: currentPosition[0], 
                        lon: currentPosition[1], 
                        name: 'Position actuelle' 
                    },
                    end: targetPOI,
                    route: routeToTarget.features[0],
                    instructions: routeToTarget.features[0].properties.segments[0].steps || [],
                    distance: routeToTarget.features[0].properties.summary.distance,
                    duration: routeToTarget.features[0].properties.summary.duration
                }]
            });
            
            if (!navigationStarted) {
                throw new Error('Navigation service failed to start');
            }
            
            // Register for navigation events
            this.navigationService.addListener(this.handleNavigationEvent.bind(this));
            
            // Announce POI navigation
            this.announcePOINavigation(targetPOI);
            
            // Notify listeners
            this.notifyListeners(GuidanceEvents.NEXT_POI_NAVIGATION, {
                targetPOI: targetPOI,
                poiIndex: this.currentPOIIndex,
                totalPOIs: this.tourPOIs.length,
                distance: routeToTarget.features[0].properties.summary.distance
            });
            
            return true;
            
        } catch (error) {
            console.error(`🎯 Failed to navigate to POI ${targetPOI.name}:`, error);
            
            this.notifyListeners(GuidanceEvents.ROUTING_ERROR, {
                targetPOI: targetPOI,
                error: error.message
            });
            
            return false;
        }
    }

    /**
     * Skip current POI and move to next in tour
     * @returns {Promise<boolean>} Success status
     */
    async skipCurrentPOI() {
        if (!this.tourActive) {
            console.warn('🎯 Tour not active, cannot skip POI');
            return false;
        }
        
        console.log(`🎯 Skipping POI: ${this.tourPOIs[this.currentPOIIndex].name}`);
        
        // Stop current navigation
        this.navigationService.stopNavigation();
        
        // Move to next POI
        this.currentPOIIndex++;
        
        if (this.currentPOIIndex >= this.tourPOIs.length) {
            // Tour completed
            await this.completeTour();
            return true;
        }
        
        // Navigate to next POI
        const nextPOI = this.tourPOIs[this.currentPOIIndex];
        return await this.navigateToNextPOI(nextPOI);
    }

    /**
     * Handle navigation events from NavigationService
     * @param {string} event - Event type
     * @param {Object} data - Event data
     */
    handleNavigationEvent(event, data) {
        switch (event) {
            case 'navigationStopped':
                // POI reached - check if we should advance to next
                if (this.tourActive && this.settings.autoAdvanceToNextPOI) {
                    this.handlePOIReached();
                }
                break;
                
            case 'positionUpdate':
                // Check if user is approaching POI
                this.checkPOIProximity(data.position);
                break;
                
            case 'rerouteCompleted':
                // Log reroute for tour statistics
                console.log('🎯 Tour reroute completed');
                break;
        }
    }

    /**
     * Handle POI reached event
     */
    async handlePOIReached() {
        const currentPOI = this.tourPOIs[this.currentPOIIndex];
        console.log(`🎯 Reached POI: ${currentPOI.name}`);
        
        // Update tour statistics
        this.tourStats.poiVisited.push({
            poi: currentPOI,
            visitTime: new Date(),
            poiIndex: this.currentPOIIndex
        });
        
        // Announce POI reached
        this.announcePOIReached(currentPOI);
        
        // Notify listeners
        this.notifyListeners(GuidanceEvents.POI_REACHED, {
            poi: currentPOI,
            poiIndex: this.currentPOIIndex,
            totalPOIs: this.tourPOIs.length,
            tourProgress: this.getTourProgress()
        });
        
        // Move to next POI or complete tour
        this.currentPOIIndex++;
        
        if (this.currentPOIIndex >= this.tourPOIs.length) {
            // Tour completed
            await this.completeTour();
        } else if (this.settings.autoAdvanceToNextPOI) {
            // Navigate to next POI after a brief pause
            setTimeout(async () => {
                const nextPOI = this.tourPOIs[this.currentPOIIndex];
                await this.navigateToNextPOI(nextPOI);
            }, this.settings.pauseAtPOI ? 3000 : 1000);
        }
    }

    /**
     * Check if user is approaching a POI
     * @param {Array} userPosition - [latitude, longitude]
     */
    checkPOIProximity(userPosition) {
        if (!this.tourActive || this.currentPOIIndex >= this.tourPOIs.length) return;
        
        const currentPOI = this.tourPOIs[this.currentPOIIndex];
        const distance = this.routingService.calculateDistance(
            userPosition[0], userPosition[1],
            currentPOI.lat, currentPOI.lon
        );
        
        if (distance <= this.settings.poiProximityThreshold) {
            console.log(`🎯 Approaching POI: ${currentPOI.name} (${distance.toFixed(0)}m)`);
            
            this.notifyListeners(GuidanceEvents.POI_APPROACHED, {
                poi: currentPOI,
                distance: distance,
                poiIndex: this.currentPOIIndex
            });
        }
    }

    /**
     * Complete the guided tour
     */
    async completeTour() {
        console.log('🎯 Guided tour completed!');
        
        this.tourActive = false;
        this.navigationService.stopNavigation();
        
        // Calculate final tour statistics
        this.tourStats.endTime = new Date();
        this.tourStats.duration = this.tourStats.endTime - this.tourStats.startTime;
        
        // Announce tour completion
        this.announceTourCompletion();
        
        // Notify listeners
        this.notifyListeners(GuidanceEvents.TOUR_COMPLETED, {
            totalPOIs: this.tourPOIs.length,
            poiVisited: this.tourStats.poiVisited.length,
            tourDuration: this.tourStats.duration,
            tourStats: this.getTourProgress()
        });
    }

    /**
     * Stop guided tour
     */
    stopGuidedTour() {
        if (!this.tourActive) return;
        
        console.log('🎯 Stopping guided tour');
        
        this.tourActive = false;
        this.navigationService.stopNavigation();
        this.navigationService.removeListener(this.handleNavigationEvent.bind(this));
        
        // Notify listeners
        this.notifyListeners(GuidanceEvents.GUIDANCE_STOPPED, {
            reason: 'User stopped tour',
            tourProgress: this.getTourProgress()
        });
    }

    /**
     * Get tour progress information
     * @returns {Object} Tour progress details
     */
    getTourProgress() {
        return {
            active: this.tourActive,
            currentPOIIndex: this.currentPOIIndex,
            totalPOIs: this.tourPOIs.length,
            poiVisited: this.tourStats.poiVisited.length,
            progressPercentage: Math.round((this.tourStats.poiVisited.length / this.tourPOIs.length) * 100),
            currentPOI: this.tourActive && this.currentPOIIndex < this.tourPOIs.length 
                ? this.tourPOIs[this.currentPOIIndex] 
                : null,
            tourDuration: this.tourStats.startTime 
                ? Date.now() - this.tourStats.startTime 
                : 0,
            estimatedTimeRemaining: this.calculateEstimatedTimeRemaining()
        };
    }

    /**
     * Calculate complete tour route through all POIs
     * @returns {Promise<Object>} Complete route data
     */
    async calculateCompleteTourRoute() {
        try {
            console.log('🎯 Calculating complete tour route...');
            
            // Create route through all POIs starting from current position
            const allWaypoints = [this.userStartPosition, ...this.tourPOIs.map(poi => [poi.lat, poi.lon])];
            
            const routeResult = await this.routingService.calculateTourRoute(this.tourPOIs);
            
            if (routeResult.success) {
                this.tourStats.totalDistance = routeResult.route.summary.distance;
                console.log(`🎯 Tour route calculated: ${(this.tourStats.totalDistance / 1000).toFixed(2)}km`);
            }
            
            return routeResult;
            
        } catch (error) {
            console.error('🎯 Failed to calculate tour route:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Calculate estimated time remaining for tour
     * @returns {number} Estimated time in milliseconds
     */
    calculateEstimatedTimeRemaining() {
        if (!this.tourActive || !this.tourRoute) return 0;
        
        const remainingPOIs = this.tourPOIs.length - this.currentPOIIndex;
        const avgTimePerPOI = 10 * 60 * 1000; // 10 minutes per POI estimate
        
        return remainingPOIs * avgTimePerPOI;
    }

    /**
     * Get current position using location service
     * @returns {Promise<Array>} [latitude, longitude]
     */
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                position => resolve([position.coords.latitude, position.coords.longitude]),
                error => reject(error),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    // Audio announcement methods
    announceTourStart() {
        if (!this.settings.audioEnabled) return;
        
        const message = `Bienvenue dans la visite guidée de Langres. Vous allez découvrir ${this.tourPOIs.length} points d'intérêt. Suivez les instructions pour commencer votre parcours.`;
        this.audioService.speak(message, this.settings.language);
    }

    announcePOINavigation(poi) {
        if (!this.settings.audioEnabled) return;
        
        const message = `Direction ${poi.name}. Point d'intérêt ${this.currentPOIIndex + 1} sur ${this.tourPOIs.length}.`;
        this.audioService.speak(message, this.settings.language);
    }

    announcePOIReached(poi) {
        if (!this.settings.audioEnabled) return;
        
        const message = `Vous êtes arrivé à ${poi.name}. ${poi.description || 'Profitez de ce point d\'intérêt.'}`;
        this.audioService.speak(message, this.settings.language);
    }

    announceTourCompletion() {
        if (!this.settings.audioEnabled || !this.settings.tourCompletionCelebration) return;
        
        const visitedCount = this.tourStats.poiVisited.length;
        const message = `Félicitations! Vous avez terminé la visite guidée de Langres. Vous avez visité ${visitedCount} points d'intérêt. Merci d'avoir découvert notre patrimoine historique.`;
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
                console.error('🎯 Guided tour listener error:', error);
            }
        });
    }

    // Settings management
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('🎯 Guided tour settings updated:', this.settings);
    }

    getSettings() {
        return { ...this.settings };
    }

    // Status getters
    isActive() {
        return this.tourActive;
    }

    getCurrentPOI() {
        return this.currentPOIIndex < this.tourPOIs.length 
            ? this.tourPOIs[this.currentPOIIndex] 
            : null;
    }

    getTourStats() {
        return { ...this.tourStats };
    }
}