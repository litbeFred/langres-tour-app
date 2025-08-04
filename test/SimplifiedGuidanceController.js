/**
 * Simplified Guidance Controller
 * Automatically handles guidance initiation and route type selection
 */
import { TestNavigationInstructor } from './TestNavigationInstructor.js';

export class SimplifiedGuidanceController {
    constructor(mapManager, uiInterface) {
        this.mapManager = mapManager;
        this.ui = uiInterface;
        this.guidanceService = null;
        this.mockServices = null;
        this.isInitialized = false;
        this.navigationInstructor = new TestNavigationInstructor();
        this.currentGuidanceType = null;
        this.tourPOIs = [];
        this.simulationInterval = null;
        this.routeProgress = 0;
        
        this.setupCallbacks();
        this.autoInitialize();
    }

    setupCallbacks() {
        this.mapManager.onPositionChange = (position) => {
            this.ui.updateCurrentPosition(position);
            window.testingCurrentPosition = [...position];
            
            if (this.guidanceService && this.isInitialized) {
                this.guidanceService.updatePosition(position);
            }
        };
    }

    /**
     * Auto-initialize the system without user interaction
     */
    async autoInitialize() {
        try {
            this.ui.log('🚀 Auto-initializing Simplified Guidance System...');
            this.ui.updateSystemStatus('Auto-initializing...');
            
            // Import services dynamically
            const { GuidanceService } = await import('../src/services/guidance/index.js');
            const { GuidanceTypes, GuidanceEvents } = await import('../src/interfaces/IGuidanceService.js');
            const { OSMRoutingService } = await import('../src/services/routing/OSMRoutingService.js');
            
            // Create services
            this.mockServices = new TestMockServices();
            this.mockServices.routingService = new OSMRoutingService();
            
            // Make OSRM service globally available for route visualization
            window.osmRoutingService = this.mockServices.routingService;
            
            // Create guidance service
            this.guidanceService = new GuidanceService(
                this.mockServices.navigationService,
                this.mockServices.routingService,
                this.mockServices.audioService,
                this.getTestPOIs()
            );
            
            // Setup event listeners
            this.guidanceService.addGuidanceListener((event, data) => {
                this.handleGuidanceEvent(event, data, GuidanceEvents);
            });
            
            this.isInitialized = true;
            this.ui.updateSystemStatus('Ready - Select destination to start guidance');
            this.ui.log('✅ Simplified Guidance System ready - select any POI to start guidance');
            
        } catch (error) {
            this.ui.log(`❌ Failed to auto-initialize: ${error.message}`);
            this.ui.updateSystemStatus('Error');
            
            // Fallback to manual initialization
            this.ui.log('🔄 Falling back to manual initialization mode');
            this.enableManualMode();
        }
    }

    /**
     * Enable manual mode if auto-initialization fails
     */
    enableManualMode() {
        const initBtn = document.getElementById('initBtn');
        if (initBtn) {
            initBtn.style.display = 'block';
            initBtn.onclick = () => this.manualInitialize();
        }
    }

    async manualInitialize() {
        const initBtn = document.getElementById('initBtn');
        if (initBtn) initBtn.style.display = 'none';
        await this.autoInitialize();
    }

    handleGuidanceEvent(event, data, GuidanceEvents) {
        this.ui.log(`📢 Event: ${event}`);
        
        switch (event) {
            case GuidanceEvents.TOUR_STARTED:
                this.ui.updateActiveGuidance('Guided Tour');
                this.currentGuidanceType = 'tour';
                break;
            case GuidanceEvents.BACK_ON_TRACK_STARTED:
                this.ui.updateActiveGuidance('Back-on-Track');
                this.currentGuidanceType = 'backOnTrack';
                break;
            case GuidanceEvents.GUIDANCE_STOPPED:
                this.ui.updateActiveGuidance('None');
                this.currentGuidanceType = null;
                break;
            case GuidanceEvents.POI_REACHED:
                this.ui.log(`🎯 Reached POI: ${data.poi.name}`);
                break;
            case GuidanceEvents.DEVIATION_DETECTED:
                this.ui.log(`⚠️ Deviation detected: ${data.deviationDistance.toFixed(0)}m`);
                break;
            case GuidanceEvents.INSTRUCTION_UPDATED:
                if (data.instruction) {
                    this.ui.updateCurrentInstruction(`🧭 ${data.instruction}`);
                    this.ui.log(`📍 Navigation: ${data.instruction}`);
                }
                break;
        }
    }

    /**
     * Main method: Start guidance to selected POI
     * Automatically determines if user needs back-on-track or guided tour
     * @param {Object} poi - Selected POI destination
     */
    async startGuidanceToPOI(poi) {
        if (!this.isInitialized) {
            this.ui.log('❌ System not ready yet, please wait...');
            return;
        }

        try {
            // Stop any existing guidance
            await this.stopGuidance();

            const userPosition = this.mapManager.currentPosition;
            const { GuidanceTypes } = await import('../src/interfaces/IGuidanceService.js');
            
            // Determine guidance type based on user's situation
            const guidanceType = this.determineGuidanceType(userPosition, poi);
            
            this.ui.log(`🎯 Starting ${guidanceType} guidance to ${poi.name}...`);
            
            let success = false;
            
            if (guidanceType === 'tour') {
                // Start guided tour from current POI to selected POI
                success = await this.startGuidedTourToPOI(poi);
            } else {
                // Start back-on-track to get user to tour route
                success = await this.startBackOnTrackToPOI(poi);
            }
            
            if (success) {
                this.ui.log(`✅ ${guidanceType} guidance started to ${poi.name}`);
                this.ui.updateCurrentInstruction('Guidance active - starting simulation...');
                
                // Auto-start simulation for immediate feedback
                this.autoStartSimulation();
            } else {
                this.ui.log(`❌ Failed to start guidance to ${poi.name}`);
            }
            
        } catch (error) {
            this.ui.log(`❌ Error starting guidance: ${error.message}`);
        }
    }

    /**
     * Determine if user needs guided tour or back-on-track guidance
     * @param {Array} userPosition - Current user position [lat, lon]
     * @param {Object} targetPOI - Selected destination POI
     * @returns {string} 'tour' or 'backOnTrack'
     */
    determineGuidanceType(userPosition, targetPOI) {
        const pois = this.getTestPOIs();
        const proximityThreshold = 50; // meters
        
        // Check if user is near any tour POI
        const nearTourRoute = pois.some(poi => {
            const distance = this.calculateDistance(
                userPosition[0], userPosition[1],
                poi.lat, poi.lon
            );
            return distance <= proximityThreshold;
        });
        
        if (nearTourRoute) {
            this.ui.log(`📍 User is near tour route - using guided tour mode`);
            return 'tour';
        } else {
            this.ui.log(`📍 User is away from tour route - using back-on-track mode`);
            return 'backOnTrack';
        }
    }

    /**
     * Start guided tour to specific POI
     */
    async startGuidedTourToPOI(targetPOI) {
        const { GuidanceTypes } = await import('../src/interfaces/IGuidanceService.js');
        
        // Create route that includes target POI
        const tourRoute = this.createTourRouteToPOI(targetPOI);
        
        return await this.guidanceService.startGuidance({
            type: GuidanceTypes.GUIDED_TOUR,
            route: tourRoute,
            options: {
                audioEnabled: true,
                autoAdvanceToNextPOI: true,
                pauseAtPOI: true
            }
        });
    }

    /**
     * Start back-on-track guidance to get user to tour
     */
    async startBackOnTrackToPOI(targetPOI) {
        const { GuidanceTypes } = await import('../src/interfaces/IGuidanceService.js');
        
        // Create main route through all POIs
        const mainRoute = {
            features: [{
                geometry: {
                    coordinates: this.getTestPOIs().map(poi => [poi.lon, poi.lat])
                }
            }]
        };
        
        return await this.guidanceService.startGuidance({
            type: GuidanceTypes.BACK_ON_TRACK,
            userPosition: this.mapManager.currentPosition,
            mainRoute: mainRoute,
            targetPOI: targetPOI
        });
    }

    /**
     * Create optimized tour route to reach target POI
     */
    createTourRouteToPOI(targetPOI) {
        const allPOIs = this.getTestPOIs();
        const userPosition = this.mapManager.currentPosition;
        
        // Find closest POI to user's current position
        let closestPOI = allPOIs[0];
        let minDistance = this.calculateDistance(
            userPosition[0], userPosition[1],
            closestPOI.lat, closestPOI.lon
        );
        
        allPOIs.forEach(poi => {
            const distance = this.calculateDistance(
                userPosition[0], userPosition[1],
                poi.lat, poi.lon
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestPOI = poi;
            }
        });
        
        // Create route from closest POI to target POI
        const startIndex = allPOIs.findIndex(poi => poi.id === closestPOI.id);
        const targetIndex = allPOIs.findIndex(poi => poi.id === targetPOI.id);
        
        let routePOIs = [];
        if (startIndex <= targetIndex) {
            routePOIs = allPOIs.slice(startIndex, targetIndex + 1);
        } else {
            routePOIs = allPOIs.slice(targetIndex, startIndex + 1).reverse();
        }
        
        return routePOIs;
    }

    /**
     * Auto-start simulation after guidance begins
     */
    autoStartSimulation() {
        // Small delay to allow route calculation
        setTimeout(() => {
            if (this.mapManager.currentRouteCoordinates?.length) {
                this.simulateMovement();
            } else {
                this.ui.log('⏳ Waiting for route calculation...');
                // Retry after route is ready
                const checkRoute = setInterval(() => {
                    if (this.mapManager.currentRouteCoordinates?.length) {
                        clearInterval(checkRoute);
                        this.simulateMovement();
                    }
                }, 500);
                
                // Stop checking after 10 seconds
                setTimeout(() => clearInterval(checkRoute), 10000);
            }
        }, 1000);
    }

    simulateMovement() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }
        
        if (!this.mapManager.currentRouteCoordinates?.length) {
            this.ui.log('❌ No active route to follow.');
            return;
        }
        
        this.ui.log('🚶 Starting automatic route simulation...');
        this.routeProgress = 0;
        
        // Initialize navigation instructor
        this.navigationInstructor.setRoute(this.mapManager.currentRouteCoordinates);
        
        const initialInstruction = this.navigationInstructor.updatePosition(
            this.mapManager.currentPosition, 
            this.routeProgress
        );
        this.ui.updateCurrentInstruction(`🧭 ${initialInstruction.instruction}`);
        
        this.simulationInterval = setInterval(() => {
            this.updateSimulationStep();
        }, 1000);
    }

    updateSimulationStep() {
        const coordinates = this.mapManager.currentRouteCoordinates;
        
        if (this.routeProgress >= coordinates.length - 1) {
            this.stopSimulation();
            this.ui.log('🎯 Destination reached! Guidance completed.');
            this.ui.updateCurrentInstruction('🎯 Destination atteinte !');
            return;
        }
        
        // Update position along route
        const currentPoint = coordinates[Math.floor(this.routeProgress)];
        const nextPoint = coordinates[Math.ceil(this.routeProgress)];
        
        if (currentPoint && nextPoint) {
            const fraction = this.routeProgress - Math.floor(this.routeProgress);
            const newPosition = [
                currentPoint[0] + (nextPoint[0] - currentPoint[0]) * fraction,
                currentPoint[1] + (nextPoint[1] - currentPoint[1]) * fraction
            ];
            
            this.mapManager.updatePositionOnly(newPosition);
            this.ui.updateCurrentPosition(newPosition);
            
            // Get updated navigation instruction
            const instruction = this.navigationInstructor.updatePosition(newPosition, this.routeProgress);
            if (instruction && instruction.instruction) {
                this.ui.updateCurrentInstruction(`🧭 ${instruction.instruction}`);
            }
            
            // Update guidance service position
            if (this.guidanceService) {
                this.guidanceService.updatePosition(newPosition);
            }
        }
        
        this.routeProgress += 0.5; // Simulation speed
    }

    stopSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
            this.ui.log('⏹️ Simulation stopped');
        }
    }

    async stopGuidance() {
        if (this.guidanceService) {
            await this.guidanceService.stopGuidance();
            this.ui.log('⏹️ Guidance stopped');
            this.ui.updateCurrentInstruction('No active navigation');
            this.stopSimulation();
            this.currentGuidanceType = null;
        }
    }

    // Utility methods
    getTestPOIs() {
        return [
            { id: 1, name: 'Porte des Moulins', lat: 47.8644, lon: 5.3353, description: 'Point de départ du tour' },
            { id: 2, name: 'Tour Saint-Ferjeux', lat: 47.8654, lon: 5.3363, description: 'Tour historique des remparts' },
            { id: 3, name: 'Tour de Navarre', lat: 47.8664, lon: 5.3373, description: 'Fortification Renaissance' },
            { id: 4, name: 'Cathédrale Saint-Mammès', lat: 47.8659, lon: 5.3349, description: 'Cathédrale du 12ème siècle' },
            { id: 5, name: 'Porte Gallo-Romaine', lat: 47.8634, lon: 5.3343, description: 'Vestiges gallo-romains' }
        ];
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
}

// Mock services class for compatibility
class TestMockServices {
    constructor() {
        this.navigationService = new MockNavigationService();
        this.audioService = new MockAudioService();
        this.routingService = null; // Will be replaced with real OSRM service
    }
}

class MockNavigationService {
    constructor() {
        this.listeners = [];
        this.navigationActive = false;
        this.currentRoute = null;
        this.currentInstruction = null;
    }

    calculateRoute(start, end) {
        return Promise.resolve({
            coordinates: [[start[1], start[0]], [end[1], end[0]]],
            distance: 1000,
            duration: 600
        });
    }

    async startNavigation(destination, options = {}) {
        console.log(`🧭 Starting navigation to ${destination.name || 'destination'}`);
        
        this.navigationActive = true;
        this.currentRoute = {
            destination: destination,
            options: options
        };
        
        // Notify listeners about navigation start
        this.notifyListeners('navigation_started', {
            destination: destination,
            route: this.currentRoute
        });
        
        // Mock navigation start - return success
        return {
            success: true,
            route: {
                coordinates: [[destination.lon, destination.lat]],
                distance: 1000,
                duration: 600
            },
            instructions: [
                {
                    text: `Navigate to ${destination.name || 'destination'}`,
                    distance: 1000,
                    duration: 600
                }
            ]
        };
    }

    async stopNavigation() {
        console.log(`🛑 Stopping navigation`);
        this.navigationActive = false;
        this.currentRoute = null;
        
        // Notify listeners about navigation stop
        this.notifyListeners('navigation_stopped', {});
        
        return { success: true };
    }

    async updatePosition(position) {
        console.log(`📍 Navigation position updated: ${position[0].toFixed(4)}, ${position[1].toFixed(4)}`);
        
        // Mock instruction update
        if (this.navigationActive && this.currentRoute) {
            this.currentInstruction = {
                text: "Continue straight",
                distance: 100,
                type: "continue"
            };
            
            // Notify listeners about instruction update
            this.notifyListeners('instruction_updated', {
                instruction: this.currentInstruction,
                position: position
            });
        }
        
        return { success: true };
    }

    async getCurrentInstruction() {
        return this.currentInstruction || {
            text: "Continue straight",
            distance: 100,
            type: "continue"
        };
    }

    // Event listener management
    addListener(callback) {
        this.listeners.push(callback);
        console.log(`📢 Navigation listener added (${this.listeners.length} total)`);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
        console.log(`📢 Navigation listener removed (${this.listeners.length} remaining)`);
    }

    notifyListeners(event, data) {
        console.log(`📢 Navigation event: ${event}`, data);
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Navigation listener error:', error);
            }
        });
    }

    // Additional methods that might be called
    isNavigationActive() {
        return this.navigationActive;
    }

    getCurrentRoute() {
        return this.currentRoute;
    }

    updateSettings(settings) {
        console.log('🔧 Navigation settings updated:', settings);
        return { success: true };
    }
}

class MockAudioService {
    constructor() {
        this.isEnabled = true;
        this.currentLanguage = 'fr-FR';
        this.availableLanguages = {
            'fr-FR': 'Français',
            'en-US': 'English',
            'de-DE': 'Deutsch',
            'es-ES': 'Español'
        };
    }

    speak(text, language = this.currentLanguage) {
        if (!this.isEnabled || !text) return;
        
        // Mock TTS - console implementation for testing
        console.log(`🔊 Mock TTS [${language}]: "${text}"`);
        
        // Simulate speech completion after a brief delay
        setTimeout(() => {
            console.log('🔊 Mock TTS: Speech completed');
        }, 100);
    }

    toggle() {
        this.isEnabled = !this.isEnabled;
        console.log(`🔊 Mock TTS: Audio ${this.isEnabled ? 'enabled' : 'disabled'}`);
        return this.isEnabled;
    }

    stop() {
        console.log('🔊 Mock TTS: Stopped');
    }

    setLanguage(language) {
        if (this.availableLanguages[language]) {
            this.currentLanguage = language;
            console.log(`🔊 Mock TTS: Language set to ${language}`);
        }
    }

    getAvailableLanguages() {
        return this.availableLanguages;
    }

    playInstruction(instruction) {
        console.log(`🔊 Audio: ${instruction}`);
    }
    
    playAlert(sound) {
        console.log(`🔔 Alert: ${sound}`);
    }
}
