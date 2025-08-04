/**
 * Production Guidance Controller
 * Integrates simplified guidance system with main application
 * Following SOLID principles and existing architecture patterns
 */

export class GuidanceController {
    constructor(serviceContainer, mapComponent, uiInterface) {
        this.container = serviceContainer;
        this.mapComponent = mapComponent;
        this.ui = uiInterface;
        this.guidanceService = null;
        this.isInitialized = false;
        this.currentGuidanceType = null;
        this.tourPOIs = [];
        this.simulationInterval = null;
        this.routeProgress = 0;
        
        this.setupCallbacks();
        this.autoInitialize();
    }

    setupCallbacks() {
        // Listen for position changes from location service
        const locationService = this.container.get('LocationService');
        if (locationService) {
            locationService.addLocationListener((position) => {
                this.ui.updateCurrentPosition(position);
                
                if (this.guidanceService && this.isInitialized) {
                    this.guidanceService.updatePosition(position);
                }
            });
        }
    }

    /**
     * Auto-initialize the guidance system using existing services
     */
    async autoInitialize() {
        try {
            this.ui.log('🚀 Initializing Production Guidance System...');
            this.ui.updateSystemStatus('Initializing...');
            
            // Get services from container
            const guidanceService = this.container.get('GuidanceService');
            const routingService = this.container.get('OSMRoutingService');
            const audioService = this.container.get('AudioService');
            const navigationService = this.container.get('NavigationService');
            
            if (!guidanceService) {
                throw new Error('GuidanceService not found in container');
            }
            
            this.guidanceService = guidanceService;
            
            // Setup event listeners
            this.guidanceService.addGuidanceListener((event, data) => {
                this.handleGuidanceEvent(event, data);
            });
            
            // Load POIs from tour data
            await this.loadTourPOIs();
            
            this.isInitialized = true;
            this.ui.updateSystemStatus('Ready - Select destination to start guidance');
            this.ui.log('✅ Production Guidance System ready - select any POI to start guidance');
            
        } catch (error) {
            this.ui.log(`❌ Failed to initialize: ${error.message}`);
            this.ui.updateSystemStatus('Error');
            console.error('Guidance initialization error:', error);
        }
    }

    async loadTourPOIs() {
        try {
            // Import tour data
            const tourData = await import('../../data/tourData.json');
            this.tourPOIs = tourData.default.pois || tourData.pois || [];
            this.ui.log(`📍 Loaded ${this.tourPOIs.length} POIs`);
        } catch (error) {
            this.ui.log(`⚠️ Could not load tour data: ${error.message}`);
            // Fallback POIs
            this.tourPOIs = this.getDefaultPOIs();
        }
    }

    getDefaultPOIs() {
        return [
            {
                id: 'porte-des-moulins',
                name: 'Porte des Moulins',
                lat: 47.8641,
                lon: 5.3347,
                description: 'Entrée principale des remparts'
            },
            {
                id: 'tour-saint-ferjeux',
                name: 'Tour Saint-Ferjeux',
                lat: 47.8621,
                lon: 5.3369,
                description: 'Tour défensive médiévale'
            },
            {
                id: 'porte-henri-iv',
                name: 'Porte Henri IV',
                lat: 47.8601,
                lon: 5.3389,
                description: 'Porte renaissance du XVIe siècle'
            }
        ];
    }

    handleGuidanceEvent(event, data) {
        this.ui.log(`📢 Event: ${event}`);
        
        switch (event) {
            case 'guidance_started':
                this.ui.updateGuidanceStatus('En cours');
                this.ui.log(`🎯 Guidance started to ${data.destination?.name}`);
                break;
                
            case 'guidance_stopped':
                this.ui.updateGuidanceStatus('Arrêté');
                this.ui.log('🛑 Guidance stopped');
                break;
                
            case 'route_calculated':
                this.ui.log(`🗺️ Route calculated: ${(data.distance/1000).toFixed(1)}km, ${Math.round(data.duration/60)}min`);
                if (this.mapComponent && data.route) {
                    this.mapComponent.displayRoute(data.route);
                }
                break;
                
            case 'navigation_instruction':
                this.ui.updateCurrentInstruction(data.instruction);
                this.ui.log(`🧭 ${data.instruction.text}`);
                break;
                
            case 'poi_reached':
                this.ui.log(`🎉 POI reached: ${data.poi?.name}`);
                break;
                
            case 'guidance_completed':
                this.ui.updateGuidanceStatus('Terminé');
                this.ui.log('🏁 Guidance completed');
                break;
                
            case 'off_route':
                this.ui.log(`⚠️ Off route detected`);
                break;
                
            case 'route_recalculation':
                this.ui.log(`🔄 Recalculating route...`);
                break;
                
            default:
                this.ui.log(`📢 ${event}: ${JSON.stringify(data)}`);
        }
    }

    /**
     * Start guidance to a specific POI (main entry point)
     */
    async startGuidanceToPOI(poiId) {
        if (!this.isInitialized) {
            this.ui.log('❌ Guidance system not initialized');
            return;
        }

        try {
            const poi = this.tourPOIs.find(p => p.id === poiId);
            if (!poi) {
                throw new Error(`POI not found: ${poiId}`);
            }

            this.ui.log(`🎯 Starting guidance to ${poi.name}...`);
            this.ui.updateSystemStatus('Starting guidance...');
            
            // Determine guidance type based on POI and user position
            const guidanceType = await this.determineGuidanceType(poi);
            
            if (guidanceType === 'direct') {
                await this.startDirectNavigation(poi);
            } else {
                await this.startGuidedTour(poi);
            }
            
        } catch (error) {
            this.ui.log(`❌ Failed to start guidance: ${error.message}`);
            console.error('Guidance start error:', error);
        }
    }

    async determineGuidanceType(targetPOI) {
        try {
            const locationService = this.container.get('LocationService');
            const currentPosition = await locationService.getCurrentPosition();
            
            if (!currentPosition) {
                this.ui.log('📍 No current position, using guided tour mode');
                return 'guided_tour';
            }
            
            // Calculate distance to target POI
            const distance = this.calculateDistance(
                [currentPosition.lat, currentPosition.lon],
                [targetPOI.lat, targetPOI.lon]
            );
            
            // Use direct navigation if close (< 2km), guided tour otherwise
            const useDirectNavigation = distance < 2000;
            
            this.ui.log(`📐 Distance to ${targetPOI.name}: ${(distance/1000).toFixed(1)}km - Using ${useDirectNavigation ? 'direct navigation' : 'guided tour'}`);
            
            return useDirectNavigation ? 'direct' : 'guided_tour';
            
        } catch (error) {
            this.ui.log(`⚠️ Could not determine guidance type: ${error.message}`);
            return 'guided_tour'; // Safe fallback
        }
    }

    async startDirectNavigation(poi) {
        this.currentGuidanceType = 'direct';
        this.ui.log(`🎯 Starting direct navigation to ${poi.name}`);
        
        await this.guidanceService.startDirectNavigation(poi);
    }

    async startGuidedTour(poi) {
        this.currentGuidanceType = 'guided_tour';
        this.ui.log(`🎯 Starting guided tour to ${poi.name}`);
        
        await this.guidanceService.startGuidedTour(poi);
    }

    async stopGuidance() {
        if (!this.guidanceService) return;
        
        try {
            await this.guidanceService.stopGuidance();
            this.currentGuidanceType = null;
            this.ui.updateSystemStatus('Ready');
            this.ui.log('🛑 Guidance stopped by user');
        } catch (error) {
            this.ui.log(`❌ Error stopping guidance: ${error.message}`);
        }
    }

    calculateDistance(pos1, pos2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (pos2[0] - pos1[0]) * Math.PI / 180;
        const dLon = (pos2[1] - pos1[1]) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(pos1[0] * Math.PI / 180) * Math.cos(pos2[0] * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Getters for status
    isGuidanceActive() {
        return this.guidanceService?.isGuidanceActive() || false;
    }

    getCurrentGuidanceType() {
        return this.currentGuidanceType;
    }

    getTourPOIs() {
        return this.tourPOIs;
    }
}
