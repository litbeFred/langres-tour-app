/**
 * IGuidanceService Interface
 * Defines the contract for guidance services that provide turn-by-turn navigation
 * 
 * This interface serves as the foundation for both guided tour and back-on-track functionality.
 * It separates the concerns of main tour navigation from deviation correction.
 */

/**
 * @interface IGuidanceService
 * @description Core interface for guidance services
 */
export const IGuidanceService = {
    /**
     * Start guidance for a specific route or tour
     * @param {Object} config - Guidance configuration
     * @param {Array} config.route - Array of waypoints or POIs for the route
     * @param {string} config.type - Type of guidance ('guided-tour' | 'back-on-track')
     * @param {Object} config.options - Additional guidance options
     * @returns {Promise<boolean>} Success status
     */
    startGuidance: (config) => {},

    /**
     * Stop active guidance
     * @returns {void}
     */
    stopGuidance: () => {},

    /**
     * Update current position and get next guidance instruction
     * @param {Array} position - [latitude, longitude]
     * @returns {Promise<Object>} Next guidance instruction
     */
    updatePosition: (position) => {},

    /**
     * Get current guidance status
     * @returns {Object} Current guidance state and progress
     */
    getGuidanceStatus: () => {},

    /**
     * Register listener for guidance events
     * @param {Function} callback - Event callback function
     * @returns {void}
     */
    addGuidanceListener: (callback) => {},

    /**
     * Remove guidance event listener
     * @param {Function} callback - Event callback function to remove
     * @returns {void}
     */
    removeGuidanceListener: (callback) => {}
};

/**
 * @interface IGuidedTourService
 * @description Specialized interface for main guided tour functionality
 * Extends IGuidanceService with tour-specific methods
 */
export const IGuidedTourService = {
    ...IGuidanceService,

    /**
     * Start guided tour from current position through all POIs
     * @param {Array} tourPOIs - Array of POI objects for the tour
     * @param {Object} options - Tour-specific options
     * @returns {Promise<boolean>} Success status
     */
    startGuidedTour: (tourPOIs, options) => {},

    /**
     * Navigate to specific POI in the tour
     * @param {Object} targetPOI - Target POI object
     * @returns {Promise<boolean>} Success status
     */
    navigateToNextPOI: (targetPOI) => {},

    /**
     * Skip current POI and move to next in tour
     * @returns {Promise<boolean>} Success status
     */
    skipCurrentPOI: () => {},

    /**
     * Get tour progress information
     * @returns {Object} Tour progress details
     */
    getTourProgress: () => {}
};

/**
 * @interface IBackOnTrackService
 * @description Specialized interface for back-on-track correction functionality
 * Extends IGuidanceService with deviation correction methods
 */
export const IBackOnTrackService = {
    ...IGuidanceService,

    /**
     * Calculate route back to the main tour path
     * @param {Array} currentPosition - [latitude, longitude]
     * @param {Object} mainRoute - Main tour route data
     * @param {Object} options - Back-on-track options
     * @returns {Promise<Object>} Correction route data
     */
    calculateBackOnTrackRoute: (currentPosition, mainRoute, options) => {},

    /**
     * Start navigation back to tour route
     * @param {Array} currentPosition - [latitude, longitude]
     * @param {Object} targetRoute - Route to return to
     * @returns {Promise<boolean>} Success status
     */
    startBackOnTrackNavigation: (currentPosition, targetRoute) => {},

    /**
     * Check if user has returned to main route
     * @param {Array} currentPosition - [latitude, longitude]
     * @param {Object} mainRoute - Main tour route
     * @returns {boolean} True if back on main route
     */
    isBackOnMainRoute: (currentPosition, mainRoute) => {},

    /**
     * Get deviation information
     * @returns {Object} Deviation details and correction suggestions
     */
    getDeviationInfo: () => {}
};

/**
 * Guidance Event Types
 * Standard events that guidance services should emit
 */
export const GuidanceEvents = {
    // General guidance events
    GUIDANCE_STARTED: 'guidance-started',
    GUIDANCE_STOPPED: 'guidance-stopped',
    GUIDANCE_PAUSED: 'guidance-paused',
    GUIDANCE_RESUMED: 'guidance-resumed',
    
    // Navigation events
    INSTRUCTION_UPDATED: 'instruction-updated',
    POSITION_UPDATED: 'position-updated',
    DESTINATION_REACHED: 'destination-reached',
    
    // Guided tour specific events
    TOUR_STARTED: 'tour-started',
    TOUR_COMPLETED: 'tour-completed',
    POI_APPROACHED: 'poi-approached',
    POI_REACHED: 'poi-reached',
    NEXT_POI_NAVIGATION: 'next-poi-navigation',
    
    // Back-on-track specific events
    DEVIATION_DETECTED: 'deviation-detected',
    BACK_ON_TRACK_STARTED: 'back-on-track-started',
    BACK_ON_TRACK_COMPLETED: 'back-on-track-completed',
    RETURNED_TO_MAIN_ROUTE: 'returned-to-main-route',
    
    // Error events
    GUIDANCE_ERROR: 'guidance-error',
    ROUTING_ERROR: 'routing-error',
    REROUTE_FAILED: 'reroute-failed'
};

/**
 * Guidance Configuration Types
 */
export const GuidanceTypes = {
    GUIDED_TOUR: 'guided-tour',
    BACK_ON_TRACK: 'back-on-track',
    FREE_NAVIGATION: 'free-navigation'
};

/**
 * Default guidance settings
 */
export const DefaultGuidanceSettings = {
    // Audio settings
    audioEnabled: true,
    language: 'fr-FR',
    
    // Navigation thresholds
    deviationThreshold: 50, // meters
    poiProximityThreshold: 30, // meters
    instructionAnnouncementDistance: 100, // meters
    
    // Rerouting settings
    rerouteAttempts: 3,
    rerouteThreshold: 50, // meters
    
    // Tour settings
    autoAdvanceToNextPOI: true,
    pauseAtPOI: true,
    tourCompletionCelebration: true
};