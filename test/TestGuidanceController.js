/**
 * Test controller for guidance system
 * Follows Single Responsibility Principle - coordinates between components
 */
import { TestNavigationInstructor } from './TestNavigationInstructor.js';

export class TestGuidanceController {
    constructor(mapManager, uiInterface) {
        this.mapManager = mapManager;
        this.ui = uiInterface;
        this.guidanceService = null;
        this.mockServices = null;
        this.isInitialized = false;
        this.simulationInterval = null;
        this.currentInstructions = [];
        this.instructionIndex = 0;
        this.routeProgress = 0;
        this.navigationInstructor = new TestNavigationInstructor();
        
        this.setupCallbacks();
    }

    setupCallbacks() {
        this.mapManager.onPositionChange = (position) => {
            this.ui.updateCurrentPosition(position);
            this.ui.log(`📍 Position set: ${position[0].toFixed(4)}, ${position[1].toFixed(4)}`);
            window.testingCurrentPosition = [...position];
            
            if (this.guidanceService && this.isInitialized) {
                this.guidanceService.updatePosition(position);
            }
        };
    }

    async initializeSystem() {
        try {
            this.ui.log('🚀 Initializing Guidance System...');
            this.ui.updateSystemStatus('Initializing...');
            
            // Import services dynamically to avoid module loading issues
            const { GuidanceService } = await import('../src/services/guidance/index.js');
            const { GuidanceTypes, GuidanceEvents } = await import('../src/interfaces/IGuidanceService.js');
            const { OSMRoutingService } = await import('../src/services/routing/OSMRoutingService.js');
            
            // Create services - use real OSRM routing service
            this.mockServices = new TestMockServices();
            
            // Replace mock routing service with real OSRM service
            this.mockServices.routingService = new OSMRoutingService();
            this.ui.log('🗺️ Using real OSRM routing service for authentic routes');
            
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
            this.ui.updateSystemStatus('Ready');
            this.ui.enableButtons(true);
            this.ui.log('✅ Guidance System initialized successfully');
            
        } catch (error) {
            this.ui.log(`❌ Failed to initialize: ${error.message}`);
            this.ui.updateSystemStatus('Error');
        }
    }

    handleGuidanceEvent(event, data, GuidanceEvents) {
        this.ui.log(`📢 Event: ${event}`);
        
        switch (event) {
            case GuidanceEvents.TOUR_STARTED:
                this.ui.updateActiveGuidance('Guided Tour');
                break;
            case GuidanceEvents.BACK_ON_TRACK_STARTED:
                this.ui.updateActiveGuidance('Back-on-Track');
                break;
            case GuidanceEvents.GUIDANCE_STOPPED:
                this.ui.updateActiveGuidance('None');
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

    async startGuidedTour() {
        if (!this.isInitialized) {
            this.ui.log('❌ System not initialized');
            return;
        }
        
        try {
            this.ui.log('🎯 Starting guided tour...');
            const settings = this.ui.getSettings();
            
            const { GuidanceTypes } = await import('../src/interfaces/IGuidanceService.js');
            
            const success = await this.guidanceService.startGuidance({
                type: GuidanceTypes.GUIDED_TOUR,
                route: this.getTestPOIs(),
                options: {
                    audioEnabled: settings.audioEnabled,
                    autoAdvanceToNextPOI: settings.autoAdvance,
                    pauseAtPOI: true
                }
            });
            
            if (success) {
                this.ui.log('✅ Guided tour started');
                this.ui.enableStopButtons(true);
                this.ui.updateCurrentInstruction('Guided tour active - start simulation to see instructions');
            } else {
                this.ui.log('❌ Failed to start guided tour');
            }
            
        } catch (error) {
            this.ui.log(`❌ Error starting guided tour: ${error.message}`);
        }
    }

    async stopGuidance() {
        if (this.guidanceService) {
            await this.guidanceService.stopGuidance();
            this.ui.log('⏹️ Guidance stopped');
            this.ui.enableStopButtons(false);
            this.ui.updateCurrentInstruction('No active navigation');
            this.stopSimulation();
        }
    }

    async testBackOnTrack() {
        if (!this.isInitialized) {
            this.ui.log('❌ System not initialized');
            return;
        }
        
        try {
            this.ui.log('🔄 Testing back-on-track navigation...');
            
            const { GuidanceTypes } = await import('../src/interfaces/IGuidanceService.js');
            
            // Create a main route (simple path through POIs)
            const mainRoute = {
                features: [{
                    geometry: {
                        coordinates: this.getTestPOIs().map(poi => [poi.lon, poi.lat])
                    }
                }]
            };
            
            const success = await this.guidanceService.startGuidance({
                type: GuidanceTypes.BACK_ON_TRACK,
                userPosition: this.mapManager.currentPosition,
                mainRoute: mainRoute
            });
            
            if (success) {
                this.ui.log('✅ Back-on-track started');
                this.ui.enableStopButtons(true);
            } else {
                this.ui.log('❌ Failed to start back-on-track');
            }
            
        } catch (error) {
            this.ui.log(`❌ Error testing back-on-track: ${error.message}`);
        }
    }

    updateVirtualPosition() {
        const position = this.ui.getVirtualPosition();
        if (!isNaN(position[0]) && !isNaN(position[1])) {
            this.mapManager.setPosition(position);
            this.ui.updateCurrentPosition(position);
            this.ui.log(`📍 Virtual position updated: ${position[0].toFixed(4)}, ${position[1].toFixed(4)}`);
            window.testingCurrentPosition = [...position];
        }
    }

    simulateMovement() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }
        
        // Check if we have route coordinates from the map manager
        if (!this.mapManager.currentRouteCoordinates?.length) {
            this.ui.log('❌ No active route to follow. Please select a POI destination first.');
            return;
        }
        
        this.ui.log('🚶 Starting route simulation...');
        this.routeProgress = 0;
        this.instructionIndex = 0;
        
        // Initialize navigation instructor with current route
        this.navigationInstructor.setRoute(this.mapManager.currentRouteCoordinates);
        
        // Start with initial instruction
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
            this.ui.log('🎯 Reached destination! Simulation completed.');
            this.ui.updateCurrentInstruction('🎯 Destination atteinte !');
            return;
        }
        
        // Update position along route with better speed
        const currentPoint = coordinates[Math.floor(this.routeProgress)];
        const nextPoint = coordinates[Math.ceil(this.routeProgress)];
        
        if (currentPoint && nextPoint) {
            const fraction = this.routeProgress - Math.floor(this.routeProgress);
            const newPosition = [
                currentPoint[0] + (nextPoint[0] - currentPoint[0]) * fraction,
                currentPoint[1] + (nextPoint[1] - currentPoint[1]) * fraction
            ];
            
            // Update position without changing map zoom/view
            this.mapManager.updatePositionOnly(newPosition);
            this.ui.updateCurrentPosition(newPosition);
            
            // Get real navigation instruction from instructor
            const instruction = this.navigationInstructor.updatePosition(newPosition, this.routeProgress);
            this.ui.updateCurrentInstruction(`🧭 ${instruction.instruction}`);
            
            // Debug info to console (not UI)
            const progressPercent = Math.round((this.routeProgress / (coordinates.length - 1)) * 100);
            console.log(`🚶 Walking simulation: ${progressPercent}% complete (waypoint ${Math.floor(this.routeProgress + 1)}/${coordinates.length}) - ${instruction.type}`);
            
            // Update crossroad view if needed
            this.mapManager.updateCrossroadView(this.currentInstructions, this.instructionIndex);
        }
        
        // Better walking speed: not too slow, not too fast
        this.routeProgress += 0.25;
    }

    stopSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
            this.ui.updateCurrentInstruction('Simulation stopped');
            this.ui.log('⏹️ Route simulation stopped');
        }
    }

    simulateDeviation() {
        const currentPos = this.mapManager.currentPosition;
        const newPosition = [currentPos[0] + 0.001, currentPos[1] + 0.001];
        this.mapManager.setPosition(newPosition);
        this.ui.updateCurrentPosition(newPosition);
        this.ui.log('📍 Simulated deviation from route');
    }

    getTestPOIs() {
        return [
            { id: 1, name: 'Porte des Moulins', lat: 47.8644, lon: 5.3353, description: 'Point de départ du tour' },
            { id: 2, name: 'Tour Saint-Ferjeux', lat: 47.8654, lon: 5.3363, description: 'Tour historique des remparts' },
            { id: 3, name: 'Tour de Navarre', lat: 47.8664, lon: 5.3373, description: 'Fortification Renaissance' },
            { id: 4, name: 'Cathédrale Saint-Mammès', lat: 47.8659, lon: 5.3349, description: 'Cathédrale du 12ème siècle' },
            { id: 5, name: 'Porte Gallo-Romaine', lat: 47.8634, lon: 5.3343, description: 'Vestiges gallo-romains' }
        ];
    }
}

// Mock services for testing
class TestMockServices {
    constructor() {
        this.navigationService = new TestNavigationService();
        this.routingService = new TestRoutingService();
        this.audioService = new TestAudioService();
    }
}

class TestNavigationService {
    constructor() {
        this.listeners = [];
        this.active = false;
    }
    
    startNavigation(routeData) { return true; }
    stopNavigation() { this.active = false; }
    addListener(callback) { this.listeners.push(callback); }
    removeListener(callback) { this.listeners = this.listeners.filter(l => l !== callback); }
    getNavigationStatus() { return { active: this.active }; }
}

class TestRoutingService {
    async calculateRoute(start, end) {
        const distance = this.calculateDistance(start[0], start[1], end[0], end[1]);
        
        return {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {
                    summary: { distance, duration: Math.round(distance / 5 * 60) },
                    segments: [{ steps: [{ distance, instruction: 'Test route', name: 'Test' }] }]
                },
                geometry: {
                    type: 'LineString',
                    coordinates: [[start[1], start[0]], [end[1], end[0]]]
                }
            }]
        };
    }

    async calculateTourRoute(pois) {
        console.log(`🗺️ TestRoutingService: Calculating tour route through ${pois.length} POIs...`);
        
        let totalDistance = 0;
        let totalDuration = 0;
        const segments = [];
        
        // Calculate route between consecutive POIs
        for (let i = 0; i < pois.length - 1; i++) {
            const start = [pois[i].lat, pois[i].lon];
            const end = [pois[i + 1].lat, pois[i + 1].lon];
            
            const segmentRoute = await this.calculateRoute(start, end);
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
            
            segments.push(segment);
            totalDistance += segment.distance;
            totalDuration += segment.duration;
        }
        
        return {
            success: true,
            route: {
                type: 'FeatureCollection',
                features: segments.map(s => s.route),
                segments: segments,
                summary: {
                    distance: totalDistance,
                    duration: totalDuration
                }
            },
            fallbackCount: 0
        };
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
}

class TestAudioService {
    speak(message, language) {
        console.log(`🔊 Audio [${language}]: "${message}"`);
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = language || 'fr-FR';
            speechSynthesis.speak(utterance);
        }
    }
}
