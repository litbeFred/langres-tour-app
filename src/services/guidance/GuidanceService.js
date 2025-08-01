/**
 * Main Guidance Service Implementation
 * Single Responsibility: Orchestrate guidance between GuidedTour and BackOnTrack services
 * 
 * This service acts as the main coordinator for all guidance functionality,
 * providing a unified interface while separating concerns between guided tour
 * navigation and deviation correction (back-on-track).
 * 
 * Architecture:
 * - GuidedTourService: Handles main tour navigation through POIs
 * - BackOnTrackService: Handles deviation correction back to main route
 * - GuidanceService: Coordinates between both and provides unified API
 */

import { GuidedTourService } from './GuidedTourService.js';
import { BackOnTrackService } from './BackOnTrackService.js';
import { GuidanceEvents, GuidanceTypes, DefaultGuidanceSettings } from '../../interfaces/IGuidanceService.js';

export class GuidanceService {
    constructor(navigationService, routingService, audioService, poiData) {
        this.navigationService = navigationService;
        this.routingService = routingService;
        this.audioService = audioService;
        this.poiData = poiData;
        
        // Initialize specialized guidance services
        this.guidedTourService = new GuidedTourService(
            navigationService, 
            routingService, 
            audioService, 
            poiData
        );
        
        this.backOnTrackService = new BackOnTrackService(
            navigationService, 
            routingService, 
            audioService
        );
        
        // Guidance state
        this.activeGuidanceType = null;
        this.currentRoute = null;
        this.guidanceStartTime = null;
        
        // Settings
        this.settings = { ...DefaultGuidanceSettings };
        
        // Event listeners
        this.listeners = [];
        
        // Initialize service event listeners
        this.setupServiceEventListeners();
        
        console.log('🎯 GuidanceService initialized with separated guidance functions');
    }

    /**
     * Start guidance for a specific route or tour
     * @param {Object} config - Guidance configuration
     * @param {Array} config.route - Array of waypoints or POIs for the route
     * @param {string} config.type - Type of guidance ('guided-tour' | 'back-on-track')
     * @param {Object} config.options - Additional guidance options
     * @returns {Promise<boolean>} Success status
     */
    async startGuidance(config) {
        try {
            console.log(`🎯 Starting guidance with type: ${config.type}`);
            
            // Validate configuration
            if (!config.type || !Object.values(GuidanceTypes).includes(config.type)) {
                throw new Error(`Invalid guidance type: ${config.type}`);
            }
            
            // Stop any active guidance first
            if (this.activeGuidanceType) {
                await this.stopGuidance();
            }
            
            // Update settings
            if (config.options) {
                this.updateSettings(config.options);
            }
            
            // Set state
            this.activeGuidanceType = config.type;
            this.guidanceStartTime = new Date();
            
            let result = false;
            
            // Route to appropriate service based on guidance type
            switch (config.type) {
                case GuidanceTypes.GUIDED_TOUR:
                    result = await this.startGuidedTour(config.route, config.options);
                    break;
                    
                case GuidanceTypes.BACK_ON_TRACK:
                    result = await this.startBackOnTrackGuidance(config);
                    break;
                    
                case GuidanceTypes.FREE_NAVIGATION:
                    result = await this.startFreeNavigation(config);
                    break;
                    
                default:
                    throw new Error(`Unsupported guidance type: ${config.type}`);
            }
            
            if (result) {
                console.log(`🎯 ${config.type} guidance started successfully`);
                
                this.notifyListeners(GuidanceEvents.GUIDANCE_STARTED, {
                    type: config.type,
                    startTime: this.guidanceStartTime,
                    config: config
                });
            } else {
                this.activeGuidanceType = null;
                this.guidanceStartTime = null;
            }
            
            return result;
            
        } catch (error) {
            console.error('🎯 Failed to start guidance:', error);
            this.activeGuidanceType = null;
            this.guidanceStartTime = null;
            
            this.notifyListeners(GuidanceEvents.GUIDANCE_ERROR, {
                message: 'Failed to start guidance',
                error: error.message,
                config: config
            });
            
            return false;
        }
    }

    /**
     * Stop active guidance
     */
    async stopGuidance() {
        if (!this.activeGuidanceType) {
            console.log('🎯 No active guidance to stop');
            return;
        }
        
        console.log(`🎯 Stopping ${this.activeGuidanceType} guidance`);
        
        try {
            // Stop appropriate service
            switch (this.activeGuidanceType) {
                case GuidanceTypes.GUIDED_TOUR:
                    this.guidedTourService.stopGuidedTour();
                    break;
                    
                case GuidanceTypes.BACK_ON_TRACK:
                    this.backOnTrackService.stopBackOnTrackNavigation();
                    break;
                    
                case GuidanceTypes.FREE_NAVIGATION:
                    this.navigationService.stopNavigation();
                    break;
            }
            
            // Reset state
            const previousType = this.activeGuidanceType;
            this.activeGuidanceType = null;
            this.guidanceStartTime = null;
            this.currentRoute = null;
            
            this.notifyListeners(GuidanceEvents.GUIDANCE_STOPPED, {
                previousType: previousType,
                reason: 'User stopped guidance'
            });
            
        } catch (error) {
            console.error('🎯 Error stopping guidance:', error);
        }
    }

    /**
     * Update current position and get next guidance instruction
     * @param {Array} position - [latitude, longitude]
     * @returns {Promise<Object>} Next guidance instruction
     */
    async updatePosition(position) {
        if (!this.activeGuidanceType) {
            return { guidance: false, message: 'No active guidance' };
        }
        
        try {
            // Check for deviation if we have a main route and not already in back-on-track mode
            if (this.currentRoute && this.activeGuidanceType !== GuidanceTypes.BACK_ON_TRACK) {
                const deviationCheck = this.backOnTrackService.checkDeviation(position, this.currentRoute);
                
                if (deviationCheck.deviated && this.settings.autoCorrectDeviations) {
                    // Automatically start back-on-track guidance
                    console.log('🎯 Auto-starting back-on-track due to deviation');
                    await this.handleDeviation(position);
                }
            }
            
            // Get guidance status from active service
            let guidanceInfo = {};
            
            switch (this.activeGuidanceType) {
                case GuidanceTypes.GUIDED_TOUR:
                    guidanceInfo = this.guidedTourService.getTourProgress();
                    break;
                    
                case GuidanceTypes.BACK_ON_TRACK:
                    guidanceInfo = this.backOnTrackService.getCorrectionProgress();
                    break;
                    
                case GuidanceTypes.FREE_NAVIGATION:
                    guidanceInfo = this.navigationService.getNavigationStatus();
                    break;
            }
            
            // Notify position update
            this.notifyListeners(GuidanceEvents.POSITION_UPDATED, {
                position: position,
                guidanceType: this.activeGuidanceType,
                guidanceInfo: guidanceInfo
            });
            
            return {
                guidance: true,
                type: this.activeGuidanceType,
                position: position,
                ...guidanceInfo
            };
            
        } catch (error) {
            console.error('🎯 Error updating position:', error);
            return {
                guidance: false,
                error: error.message
            };
        }
    }

    /**
     * Get current guidance status
     * @returns {Object} Current guidance state and progress
     */
    getGuidanceStatus() {
        if (!this.activeGuidanceType) {
            return {
                active: false,
                type: null,
                message: 'No active guidance'
            };
        }
        
        let serviceStatus = {};
        
        switch (this.activeGuidanceType) {
            case GuidanceTypes.GUIDED_TOUR:
                serviceStatus = this.guidedTourService.getTourProgress();
                break;
                
            case GuidanceTypes.BACK_ON_TRACK:
                serviceStatus = this.backOnTrackService.getDeviationInfo();
                break;
                
            case GuidanceTypes.FREE_NAVIGATION:
                serviceStatus = this.navigationService.getNavigationStatus();
                break;
        }
        
        return {
            active: true,
            type: this.activeGuidanceType,
            startTime: this.guidanceStartTime,
            duration: this.guidanceStartTime ? Date.now() - this.guidanceStartTime : 0,
            ...serviceStatus
        };
    }

    /**
     * Start guided tour using GuidedTourService
     * @param {Array} tourPOIs - Array of POI objects
     * @param {Object} options - Tour options
     * @returns {Promise<boolean>} Success status
     */
    async startGuidedTour(tourPOIs, options = {}) {
        console.log('🎯 Starting guided tour mode');
        
        const result = await this.guidedTourService.startGuidedTour(tourPOIs, options);
        
        if (result) {
            // Store current route for deviation detection
            this.currentRoute = this.guidedTourService.tourRoute?.route || null;
        }
        
        return result;
    }

    /**
     * Start back-on-track guidance using BackOnTrackService
     * @param {Object} config - Back-on-track configuration
     * @returns {Promise<boolean>} Success status
     */
    async startBackOnTrackGuidance(config) {
        console.log('🎯 Starting back-on-track mode');
        
        if (!config.userPosition || !config.mainRoute) {
            throw new Error('Back-on-track requires userPosition and mainRoute');
        }
        
        return await this.backOnTrackService.startBackOnTrackNavigation(
            config.userPosition,
            config.mainRoute
        );
    }

    /**
     * Start free navigation using NavigationService directly
     * @param {Object} config - Navigation configuration
     * @returns {Promise<boolean>} Success status
     */
    async startFreeNavigation(config) {
        console.log('🎯 Starting free navigation mode');
        
        if (!config.route) {
            throw new Error('Free navigation requires route data');
        }
        
        return this.navigationService.startNavigation(config.route);
    }

    /**
     * Handle deviation detection - switch to back-on-track mode
     * @param {Array} currentPosition - [latitude, longitude]
     */
    async handleDeviation(currentPosition) {
        console.log('🎯 Handling deviation - switching to back-on-track mode');
        
        // Store the current guided tour state
        const currentTourProgress = this.guidedTourService.getTourProgress();
        const mainRoute = this.currentRoute;
        
        // Pause guided tour (don't stop completely)
        this.guidedTourService.tourActive = false;
        
        // Start back-on-track guidance
        const backOnTrackStarted = await this.startBackOnTrackGuidance({
            userPosition: currentPosition,
            mainRoute: mainRoute
        });
        
        if (backOnTrackStarted) {
            this.activeGuidanceType = GuidanceTypes.BACK_ON_TRACK;
            
            this.notifyListeners(GuidanceEvents.DEVIATION_DETECTED, {
                position: currentPosition,
                previousGuidance: GuidanceTypes.GUIDED_TOUR,
                tourProgress: currentTourProgress
            });
        }
    }

    /**
     * Handle return to main route - switch back to guided tour
     */
    async handleReturnToMainRoute() {
        console.log('🎯 Returning to main route - resuming guided tour');
        
        // Stop back-on-track
        this.backOnTrackService.stopBackOnTrackNavigation();
        
        // Resume guided tour
        this.guidedTourService.tourActive = true;
        this.activeGuidanceType = GuidanceTypes.GUIDED_TOUR;
        
        // Continue with current POI
        const currentPOI = this.guidedTourService.getCurrentPOI();
        if (currentPOI) {
            await this.guidedTourService.navigateToNextPOI(currentPOI);
        }
        
        this.notifyListeners(GuidanceEvents.RETURNED_TO_MAIN_ROUTE, {
            resumedGuidance: GuidanceTypes.GUIDED_TOUR,
            currentPOI: currentPOI
        });
    }

    /**
     * Setup event listeners for child services
     */
    setupServiceEventListeners() {
        // Listen to guided tour events
        this.guidedTourService.addListener((event, data) => {
            // Forward guided tour events to main listeners
            this.notifyListeners(event, {
                ...data,
                source: 'guided-tour'
            });
        });
        
        // Listen to back-on-track events
        this.backOnTrackService.addListener((event, data) => {
            // Handle special back-on-track events
            if (event === GuidanceEvents.RETURNED_TO_MAIN_ROUTE) {
                this.handleReturnToMainRoute();
            }
            
            // Forward back-on-track events to main listeners
            this.notifyListeners(event, {
                ...data,
                source: 'back-on-track'
            });
        });
    }

    /**
     * Get specific service instance
     * @param {string} serviceType - 'guided-tour' | 'back-on-track'
     * @returns {Object|null} Service instance
     */
    getService(serviceType) {
        switch (serviceType) {
            case 'guided-tour':
                return this.guidedTourService;
            case 'back-on-track':
                return this.backOnTrackService;
            default:
                return null;
        }
    }

    // Event listener management
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
                console.error('🎯 Guidance listener error:', error);
            }
        });
    }

    // Settings management
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Propagate settings to child services
        this.guidedTourService.updateSettings(newSettings);
        this.backOnTrackService.updateSettings(newSettings);
        
        console.log('🎯 Guidance settings updated:', this.settings);
    }

    getSettings() {
        return { ...this.settings };
    }

    // Utility methods
    isGuidedTourActive() {
        return this.activeGuidanceType === GuidanceTypes.GUIDED_TOUR && this.guidedTourService.isActive();
    }

    isBackOnTrackActive() {
        return this.activeGuidanceType === GuidanceTypes.BACK_ON_TRACK && this.backOnTrackService.isActive();
    }

    getActiveGuidanceType() {
        return this.activeGuidanceType;
    }

    getGuidanceDuration() {
        return this.guidanceStartTime ? Date.now() - this.guidanceStartTime : 0;
    }
}