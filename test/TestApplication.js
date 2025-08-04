/**
 * Main Test Application Class
 * Follows SOLID principles - coordinates components and manages application lifecycle
 */
import { TestGuidanceController } from './TestGuidanceController.js';
import { TestMapManager } from './TestMapManager.js';
import { TestGuidanceInterface } from './TestGuidanceInterface.js';
import { TestPOIList } from './TestPOIList.js';
import { TestStyles } from './TestStyles.js';
import { TestCrossroadSnapshot } from './TestCrossroadSnapshot.js';

export class TestApplication {
    constructor() {
        this.mapManager = null;
        this.uiInterface = null;
        this.controller = null;
        this.poiList = null;
        this.crossroadSnapshot = null;
        this.isInitialized = false;
        this.currentRoute = null;
        this.selectedDestination = null;
        
        // Test POI data for Langres
        this.testPOIs = [
            { id: 1, name: 'Porte des Moulins', lat: 47.8644, lon: 5.3353, description: 'Point de départ du tour' },
            { id: 2, name: 'Tour Saint-Ferjeux', lat: 47.8654, lon: 5.3363, description: 'Tour historique des remparts' },
            { id: 3, name: 'Tour de Navarre', lat: 47.8664, lon: 5.3373, description: 'Fortification Renaissance' },
            { id: 4, name: 'Cathédrale Saint-Mammès', lat: 47.8659, lon: 5.3349, description: 'Cathédrale du 12ème siècle' },
            { id: 5, name: 'Porte Gallo-Romaine', lat: 47.8634, lon: 5.3343, description: 'Vestiges gallo-romains' }
        ];
    }

    /**
     * Initialize the test application
     * Sets up all components following dependency injection pattern
     */
    async initialize() {
        try {
            // Inject CSS styles
            TestStyles.injectStyles();
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize components in correct order (respecting dependencies)
            await this.initializeMapManager();
            this.initializeUIInterface();
            this.initializeController();
            await this.initializePOIList();
            this.initializeCrossroadSnapshot();
            
            // Setup initial state
            this.setupInitialState();
            
            this.isInitialized = true;
            this.log('🎯 Test Application initialized successfully');
            this.log('👆 Click on the map to set your virtual position');
            this.log('🎯 Click "Initialize Guidance System" to start testing');
            
        } catch (error) {
            console.error('Failed to initialize test application:', error);
            this.log(`❌ Failed to initialize application: ${error.message}`);
        }
    }

    /**
     * Initialize map management component
     */
    async initializeMapManager() {
        try {
            this.mapManager = new TestMapManager();
            
            // Wait for maps to be properly initialized
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        this.mapManager.initializeMaps();
                        console.log('✅ Map manager initialized');
                        resolve();
                    } catch (error) {
                        console.error('❌ Map initialization failed:', error);
                        reject(error);
                    }
                }, 200); // Increased timeout to ensure DOM is ready
            });
        } catch (error) {
            console.error('❌ Failed to create map manager:', error);
            throw error;
        }
    }

    /**
     * Initialize UI interface component
     */
    initializeUIInterface() {
        this.uiInterface = new TestGuidanceInterface();
    }

    /**
     * Initialize main controller (depends on map and UI)
     */
    initializeController() {
        this.controller = new TestGuidanceController(this.mapManager, this.uiInterface);
        
        // Connect UI to controller
        this.uiInterface.testController = this.controller;
        this.uiInterface.setupEventListeners();
        
        // Set global reference for other components to access
        window.testApp = this;
    }

    /**
     * Initialize POI list component
     */
    async initializePOIList() {
        try {
            console.log('🎯 Initializing POI list...');
            this.poiList = new TestPOIList(this.mapManager);
            
            // Setup POI selection callback
            this.poiList.onPOISelect = (poi, index) => {
                this.uiInterface.log(`🎯 Selected destination: ${poi.name}`);
                this.uiInterface.updateSelectedPOI(poi);
            };

            // Setup route calculation callback
            this.poiList.onRouteCalculated = (route, poi) => {
                this.uiInterface.log(`🗺️ Route calculated to ${poi.name}`);
                this.currentRoute = route;
                this.selectedDestination = poi;
                this.uiInterface.updateRouteInfo(route);
            };
            
            // Initialize with test POIs (now async)
            await this.poiList.initialize(this.testPOIs);
            console.log('✅ POI list initialized');
        } catch (error) {
            console.error('❌ POI list initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup initial application state
     */
    setupInitialState() {
        // Set virtual position for GuidedTourService
        window.testingCurrentPosition = [47.8644, 5.3353];
        
        // Update initial position display
        this.uiInterface.updateCurrentPosition([47.8644, 5.3353]);
    }

    /**
     * Cleanup resources when application is closed
     */
    cleanup() {
        if (this.controller) {
            this.controller.stopSimulation();
            this.controller.stopGuidance();
        }
        
        this.isInitialized = false;
        this.log('🧹 Application cleaned up');
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            components: {
                mapManager: !!this.mapManager,
                uiInterface: !!this.uiInterface,
                controller: !!this.controller,
                poiList: !!this.poiList
            }
        };
    }

    /**
     * Helper method for logging
     */
    log(message) {
        if (this.uiInterface) {
            this.uiInterface.log(message);
        } else {
            console.log(message);
        }
    }

    /**
     * Initialize crossroad snapshot component
     */
    initializeCrossroadSnapshot() {
        try {
            console.log('🛣️ Initializing crossroad snapshot...');
            this.crossroadSnapshot = new TestCrossroadSnapshot();
            console.log('✅ Crossroad snapshot initialized');
        } catch (error) {
            console.error('❌ Crossroad snapshot initialization failed:', error);
            throw error;
        }
    }

    /**
     * Get the guidance service from controller (for other components to access)
     */
    get guidanceService() {
        return this.controller?.guidanceService || null;
    }

    /**
     * Static factory method to create and initialize application
     */
    static async create() {
        const app = new TestApplication();
        await app.initialize();
        return app;
    }
}
