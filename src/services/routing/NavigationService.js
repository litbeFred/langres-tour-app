/**
 * Navigation Service Implementation
 * Single Responsibility: Handle turn-by-turn navigation and guidance
 * Works with OSMRoutingService for route data
 */
export class NavigationService {
    constructor(routingService, locationService, audioService) {
        this.routingService = routingService;
        this.locationService = locationService;
        this.audioService = audioService;
        
        this.currentRoute = null;
        this.currentSegment = 0;
        this.currentInstruction = 0;
        this.navigationActive = false;
        this.listeners = [];
        
        // Navigation settings
        this.settings = {
            rerouteThreshold: 50, // meters
            instructionAnnounceDistance: 100, // meters
            audioEnabled: true,
            language: 'fr-FR'
        };
        
        this.lastPosition = null;
        this.announcedInstructions = new Set();
    }

    /**
     * Start navigation with a calculated route
     * @param {Object} routeData - Route data from OSMRoutingService
     * @returns {Boolean} Success status
     */
    startNavigation(routeData) {
        if (!routeData || !routeData.success) {
            console.error('🧭 Cannot start navigation: Invalid route data');
            return false;
        }

        this.currentRoute = routeData;
        this.currentSegment = 0;
        this.currentInstruction = 0;
        this.navigationActive = true;
        this.announcedInstructions.clear();

        console.log('🧭 Navigation started');
        console.log(`Total distance: ${(routeData.route.summary.distance / 1000).toFixed(2)}km`);
        console.log(`Estimated duration: ${Math.round(routeData.route.summary.duration / 60)}min`);

        // Start listening to location updates
        this.locationService.startWatching(this.handleLocationUpdate.bind(this));

        // Announce first instruction
        this.announceCurrentInstruction();

        // Notify listeners
        this.notifyListeners('navigationStarted', {
            route: this.currentRoute,
            totalDistance: routeData.route.summary.distance,
            totalDuration: routeData.route.summary.duration
        });

        return true;
    }

    /**
     * Stop active navigation
     */
    stopNavigation() {
        if (!this.navigationActive) return;

        this.navigationActive = false;
        this.currentRoute = null;
        this.currentSegment = 0;
        this.currentInstruction = 0;
        this.announcedInstructions.clear();

        console.log('🧭 Navigation stopped');

        // Notify listeners
        this.notifyListeners('navigationStopped', {});
    }

    /**
     * Handle location updates during navigation
     * @param {Object} position - GPS position object
     */
    async handleLocationUpdate(position) {
        if (!this.navigationActive || !this.currentRoute) return;

        const userPosition = [position.coords.latitude, position.coords.longitude];
        this.lastPosition = userPosition;

        // Check if rerouting is needed
        await this.checkAndHandleReroute(userPosition);

        // Update current instruction based on proximity
        this.updateCurrentInstruction(userPosition);

        // Check if we need to announce upcoming instructions
        this.checkInstructionAnnouncement(userPosition);

        // Notify listeners of position update
        this.notifyListeners('positionUpdate', {
            position: userPosition,
            currentSegment: this.currentSegment,
            currentInstruction: this.currentInstruction
        });
    }

    /**
     * Check if rerouting is needed and handle it
     * @param {Array} userPosition - [latitude, longitude]
     */
    async checkAndHandleReroute(userPosition) {
        if (!this.currentRoute || this.currentSegment >= this.currentRoute.segments.length) return;

        const currentSegmentData = this.currentRoute.segments[this.currentSegment];
        const rerouteCheck = await this.routingService.checkRerouteNeeded(
            userPosition,
            { features: [currentSegmentData.route] },
            this.settings.rerouteThreshold
        );

        if (rerouteCheck.rerouteNeeded) {
            console.log(`🧭 Rerouting needed: ${rerouteCheck.reason}`);
            await this.performReroute(userPosition);
        }
    }

    /**
     * Perform rerouting from current position
     * @param {Array} userPosition - [latitude, longitude]
     */
    async performReroute(userPosition) {
        try {
            console.log('🧭 Performing reroute...');

            // Find the next unvisited POI as destination
            const nextPOI = this.findNextDestination();
            if (!nextPOI) {
                console.log('🧭 No next destination found - navigation complete');
                this.stopNavigation();
                return;
            }

            // Calculate new route from current position to next POI
            const newRoute = await this.routingService.calculateRoute(
                userPosition,
                [nextPOI.lat, nextPOI.lon]
            );

            if (newRoute && newRoute.features && newRoute.features.length > 0) {
                // Update current route with new segment
                const feature = newRoute.features[0];
                const newSegment = {
                    id: this.currentSegment,
                    start: { lat: userPosition[0], lon: userPosition[1], name: 'Position actuelle' },
                    end: nextPOI,
                    route: feature,
                    instructions: feature.properties.segments[0].steps || [],
                    distance: feature.properties.summary.distance,
                    duration: feature.properties.summary.duration
                };

                // Replace current segment with new rerouted segment
                this.currentRoute.segments[this.currentSegment] = newSegment;
                this.currentInstruction = 0;
                this.announcedInstructions.clear();

                console.log('🧭 Reroute successful');
                this.announceReroute();

                // Notify listeners
                this.notifyListeners('rerouteCompleted', {
                    newSegment: newSegment,
                    reason: 'User deviated from route'
                });
            }
        } catch (error) {
            console.error('🧭 Reroute failed:', error);
            this.announceError('Recalcul de l\'itinéraire impossible');
        }
    }

    /**
     * Update current instruction based on user proximity
     * @param {Array} userPosition - [latitude, longitude]
     */
    updateCurrentInstruction(userPosition) {
        if (!this.currentRoute || this.currentSegment >= this.currentRoute.segments.length) return;

        const currentSegmentData = this.currentRoute.segments[this.currentSegment];
        const instructions = currentSegmentData.instructions;

        if (this.currentInstruction >= instructions.length) {
            // Move to next segment
            this.currentSegment++;
            this.currentInstruction = 0;
            this.announcedInstructions.clear();

            if (this.currentSegment >= this.currentRoute.segments.length) {
                // Navigation complete
                console.log('🧭 Navigation completed!');
                this.announceNavigationComplete();
                this.stopNavigation();
                return;
            }

            // Announce next segment
            this.announceSegmentTransition();
        }
    }

    /**
     * Check if we should announce upcoming instructions
     * @param {Array} userPosition - [latitude, longitude]
     */
    checkInstructionAnnouncement(userPosition) {
        if (!this.currentRoute || this.currentSegment >= this.currentRoute.segments.length) return;

        const currentSegmentData = this.currentRoute.segments[this.currentSegment];
        const instructions = currentSegmentData.instructions;

        if (this.currentInstruction >= instructions.length) return;

        const instruction = instructions[this.currentInstruction];
        const instructionKey = `${this.currentSegment}-${this.currentInstruction}`;

        // Skip if already announced
        if (this.announcedInstructions.has(instructionKey)) return;

        // Check distance to instruction point
        if (instruction.location) {
            const distance = this.routingService.calculateDistance(
                userPosition[0], userPosition[1],
                instruction.location[1], instruction.location[0] // Note: instruction.location is [lon, lat]
            );

            if (distance <= this.settings.instructionAnnounceDistance) {
                this.announceInstruction(instruction);
                this.announcedInstructions.add(instructionKey);
                this.currentInstruction++;
            }
        }
    }

    /**
     * Find the next destination POI
     * @returns {Object|null} Next POI or null if none found
     */
    findNextDestination() {
        if (!this.currentRoute || this.currentSegment >= this.currentRoute.segments.length) return null;

        const currentSegmentData = this.currentRoute.segments[this.currentSegment];
        return currentSegmentData.end;
    }

    /**
     * Get current navigation status
     * @returns {Object} Navigation status
     */
    getNavigationStatus() {
        if (!this.navigationActive || !this.currentRoute) {
            return {
                active: false,
                message: 'Navigation inactive'
            };
        }

        const currentSegmentData = this.currentRoute.segments[this.currentSegment];
        const progress = (this.currentSegment / this.currentRoute.segments.length) * 100;

        return {
            active: true,
            currentSegment: this.currentSegment,
            totalSegments: this.currentRoute.segments.length,
            progress: progress,
            currentDestination: currentSegmentData?.end?.name || 'Destination inconnue',
            remainingDistance: this.calculateRemainingDistance(),
            remainingDuration: this.calculateRemainingDuration()
        };
    }

    /**
     * Calculate remaining distance to destination
     * @returns {Number} Distance in meters
     */
    calculateRemainingDistance() {
        if (!this.currentRoute || this.currentSegment >= this.currentRoute.segments.length) return 0;

        let distance = 0;
        for (let i = this.currentSegment; i < this.currentRoute.segments.length; i++) {
            distance += this.currentRoute.segments[i].distance;
        }
        return distance;
    }

    /**
     * Calculate remaining duration to destination
     * @returns {Number} Duration in seconds
     */
    calculateRemainingDuration() {
        if (!this.currentRoute || this.currentSegment >= this.currentRoute.segments.length) return 0;

        let duration = 0;
        for (let i = this.currentSegment; i < this.currentRoute.segments.length; i++) {
            duration += this.currentRoute.segments[i].duration;
        }
        return duration;
    }

    // Audio announcement methods
    announceCurrentInstruction() {
        if (!this.settings.audioEnabled) return;

        const status = this.getNavigationStatus();
        if (status.active) {
            const message = `Navigation démarrée vers ${status.currentDestination}. Distance totale: ${(status.remainingDistance / 1000).toFixed(1)} kilomètres.`;
            this.audioService.speak(message, this.settings.language);
        }
    }

    announceInstruction(instruction) {
        if (!this.settings.audioEnabled) return;

        let message = instruction.instruction;
        if (instruction.way_name && instruction.way_name !== 'Route sans nom') {
            message += ` sur ${instruction.way_name}`;
        }
        if (instruction.distance > 0) {
            message += ` dans ${instruction.distance} mètres`;
        }

        console.log(`🧭 Navigation: ${message}`);
        this.audioService.speak(message, this.settings.language);
    }

    announceReroute() {
        if (!this.settings.audioEnabled) return;

        const message = "Recalcul de l'itinéraire en cours. Nouvel itinéraire calculé.";
        this.audioService.speak(message, this.settings.language);
    }

    announceSegmentTransition() {
        if (!this.settings.audioEnabled) return;

        const nextSegment = this.currentRoute.segments[this.currentSegment];
        if (nextSegment) {
            const message = `Direction ${nextSegment.end.name}`;
            this.audioService.speak(message, this.settings.language);
        }
    }

    announceNavigationComplete() {
        if (!this.settings.audioEnabled) return;

        const message = "Navigation terminée. Vous êtes arrivé à destination.";
        this.audioService.speak(message, this.settings.language);
    }

    announceError(errorMessage) {
        if (!this.settings.audioEnabled) return;

        this.audioService.speak(errorMessage, this.settings.language);
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
                console.error('Navigation listener error:', error);
            }
        });
    }

    // Settings management
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('🧭 Navigation settings updated:', this.settings);
    }

    getSettings() {
        return { ...this.settings };
    }
}