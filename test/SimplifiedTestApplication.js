/**
 * Simplified Test Application
 * One-click guidance system - no manual initialization required
 */
import { SimplifiedGuidanceController } from './SimplifiedGuidanceController.js';
import { TestMapManager } from './TestMapManager.js';
import { SimplifiedGuidanceInterface } from './SimplifiedGuidanceInterface.js';
import { SimplifiedPOIList } from './SimplifiedPOIList.js';
import { TestStyles } from './TestStyles.js';
import { TestCrossroadSnapshot } from './TestCrossroadSnapshot.js';

export class SimplifiedTestApplication {
    constructor() {
        this.mapManager = null;
        this.uiInterface = null;
        this.controller = null;
        this.poiList = null;
        this.crossroadSnapshot = null;
        this.isInitialized = false;
        
        console.log('🚀 Starting Simplified Guidance System...');
    }

    /**
     * Initialize the simplified application
     * Auto-starts everything without user intervention
     */
    async initialize() {
        try {
            // Inject CSS styles
            TestStyles.injectStyles();
            this.injectSimplifiedStyles();
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize components in order
            this.initializeMapManager();
            this.initializeUI();
            await this.initializeController();
            this.initializePOIList();
            this.initializeCrossroadSnapshot();
            
            this.isInitialized = true;
            this.uiInterface.log('✅ Simplified Guidance System ready!');
            this.uiInterface.log('🎯 Select any POI to start automatic guidance');
            
            console.log('✅ Simplified Test Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize simplified application:', error);
            this.handleInitializationError(error);
        }
    }

    initializeMapManager() {
        this.mapManager = new TestMapManager();
        this.mapManager.initializeMaps();
        
        // Set default position to Langres center
        this.mapManager.setPosition([47.8644, 5.3353]);
        console.log('✅ Map Manager initialized');
    }

    initializeUI() {
        this.uiInterface = new SimplifiedGuidanceInterface();
        console.log('✅ Simplified UI initialized');
    }

    async initializeController() {
        this.controller = new SimplifiedGuidanceController(
            this.mapManager,
            this.uiInterface
        );
        
        // Wait for controller to initialize and then test OSRM connection
        setTimeout(async () => {
            if (this.controller.mockServices && this.controller.mockServices.routingService) {
                this.mapManager.routingService = this.controller.mockServices.routingService;
                console.log('✅ OSRM routing service connected to map manager');
                
                // Test OSRM connection
                await this.testOSRMConnection();
            }
        }, 1000);
        
        // Controller auto-initializes, no manual action needed
        console.log('✅ Simplified Controller starting auto-initialization...');
    }

    /**
     * Test OSRM connection and response time
     */
    async testOSRMConnection() {
        console.log('🧪 Testing OSRM connection...');
        const startTime = Date.now();
        
        try {
            const testStart = [47.8644, 5.3353]; // Langres center
            const testEnd = [47.8654, 5.3363];   // Nearby point
            
            console.log(`🌐 Testing OSRM route from ${testStart} to ${testEnd}`);
            
            const routeData = await this.mapManager.routingService.calculateRoute(testStart, testEnd);
            const responseTime = Date.now() - startTime;
            
            console.log('📦 OSRM Response structure:', routeData);
            
            // Check for the correct OSRM response structure (GeoJSON FeatureCollection)
            if (routeData && routeData.type === 'FeatureCollection' && routeData.features && routeData.features.length > 0) {
                const feature = routeData.features[0];
                const properties = feature.properties;
                
                console.log(`✅ OSRM connection successful!`);
                console.log(`⏱️ Response time: ${responseTime}ms`);
                console.log(`📏 Test route: ${(properties.summary.distance / 1000).toFixed(2)}km, ${Math.round(properties.summary.duration / 60)}min`);
                console.log(`🛣️ Waypoints: ${feature.geometry.coordinates.length}`);
                
                // Update UI to show OSRM is ready
                if (this.uiInterface) {
                    this.uiInterface.log(`✅ OSRM routing ready (${responseTime}ms response time)`);
                }
            } else {
                throw new Error('Invalid OSRM response structure - expected GeoJSON FeatureCollection');
            }
        } catch (error) {
            const responseTime = Date.now() - startTime;
            console.error(`❌ OSRM connection failed after ${responseTime}ms:`, error.message);
            console.error('Full error details:', error);
            
            if (this.uiInterface) {
                this.uiInterface.log(`❌ OSRM connection failed: ${error.message}`);
                this.uiInterface.log(`⚠️ Routes will use simple fallback mode`);
            }
        }
    }

    initializePOIList() {
        this.poiList = new SimplifiedPOIList(
            this.mapManager,
            this.uiInterface,
            this.controller
        );
        
        // Connect UI and POI list
        this.uiInterface.onPOISelected = (poi) => {
            this.poiList.updateGuidanceState(true);
        };
        
        console.log('✅ Simplified POI List initialized');
    }

    initializeCrossroadSnapshot() {
        // Check if TestMapManager already initialized the crossroad map
        if (this.mapManager && this.mapManager.crossroadMap) {
            console.log('✅ Using existing crossroad map from TestMapManager');
            // Create a simplified crossroad snapshot that works with the existing map
            this.crossroadSnapshot = {
                snapshotMap: this.mapManager.crossroadMap,
                showCrossroad: (crossroadData, instruction) => {
                    console.log(`🛣️ Showing crossroad: ${instruction}`);
                    // Use the existing crossroad map functionality
                },
                hideSnapshot: () => {
                    console.log('🛣️ Hiding crossroad snapshot');
                }
            };
        } else {
            // Fallback: try to initialize TestCrossroadSnapshot
            const crossroadContainer = document.getElementById('crossroadMap');
            if (crossroadContainer && !crossroadContainer._leaflet_id) {
                this.crossroadSnapshot = new TestCrossroadSnapshot(crossroadContainer, 'crossroadMap');
                console.log('✅ Crossroad Snapshot initialized');
            } else {
                console.warn('⚠️ Crossroad container already in use or not found, skipping crossroad snapshot');
            }
        }
    }

    /**
     * Add simplified-specific CSS styles
     */
    injectSimplifiedStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Simplified UI Styles */
            .simplified-instructions {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                margin: 15px 0;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            
            .instruction-box h4 {
                margin: 0 0 15px 0;
                font-size: 18px;
                color: white;
            }
            
            .instruction-box ol {
                margin: 0;
                padding-left: 20px;
            }
            
            .instruction-box li {
                margin: 8px 0;
                line-height: 1.4;
            }

            /* Enhanced POI Items */
            .simplified-poi {
                border: 2px solid #e9ecef;
                border-radius: 8px;
                margin: 10px 0;
                transition: all 0.3s ease;
                background: white;
            }
            
            .simplified-poi:hover {
                border-color: #007bff;
                box-shadow: 0 4px 12px rgba(0,123,255,0.15);
                transform: translateY(-2px);
            }
            
            .simplified-poi.current {
                border-color: #28a745;
                background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
                box-shadow: 0 4px 15px rgba(40,167,69,0.2);
            }
            
            .poi-content {
                padding: 15px;
            }
            
            .poi-name {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .poi-number {
                background: #007bff;
                color: white;
                width: 25px;
                height: 25px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 10px;
                font-size: 12px;
                font-weight: bold;
            }
            
            .poi-description {
                color: #666;
                font-size: 13px;
                margin-bottom: 10px;
                line-height: 1.4;
            }
            
            .poi-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .poi-guide-btn, .poi-show-btn {
                background: #007bff;
                border: none;
                color: white;
                padding: 6px 12px;
                border-radius: 5px;
                font-size: 12px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .poi-guide-btn:hover {
                background: #0056b3;
            }
            
            .poi-show-btn {
                background: #6c757d;
            }
            
            .poi-show-btn:hover {
                background: #545b62;
            }

            /* Current Location Section */
            .current-location {
                border-color: #ffc107 !important;
                background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
            }
            
            .poi-locate-btn, .poi-manual-btn {
                background: #ffc107;
                color: #212529;
                border: none;
                padding: 6px 12px;
                border-radius: 5px;
                font-size: 12px;
                cursor: pointer;
                transition: background 0.2s;
                margin-right: 5px;
            }
            
            .poi-locate-btn:hover, .poi-manual-btn:hover {
                background: #e0a800;
            }

            /* Current Destination Display */
            .current-destination {
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                border-left: 4px solid #28a745;
                padding: 15px;
                margin: 15px 0;
                border-radius: 8px;
            }
            
            .current-destination h4 {
                margin: 0 0 10px 0;
                color: #155724;
            }
            
            .destination-info strong {
                color: #155724;
                font-size: 16px;
            }
            
            .destination-description {
                color: #155724;
                margin: 5px 0;
                font-style: italic;
            }
            
            .destination-coords {
                color: #6c757d;
                font-size: 12px;
                margin-top: 5px;
            }

            /* POI Header */
            .poi-header {
                text-align: center;
                padding: 15px;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 8px;
                margin-bottom: 15px;
            }
            
            .poi-header h4 {
                margin: 0 0 5px 0;
                color: #495057;
            }
            
            .poi-header p {
                margin: 0;
                color: #6c757d;
            }

            /* Status sections enhancement */
            .status-section.success {
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                border-left: 4px solid #28a745;
            }
            
            .status-section.info {
                background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
                border-left: 4px solid #17a2b8;
            }
            
            .status-section.warning {
                background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                border-left: 4px solid #ffc107;
            }

            /* Route loading animation */
            @keyframes routeLoadingPulse {
                0% { 
                    transform: scale(1);
                    opacity: 0.3;
                }
                50% { 
                    transform: scale(1.5);
                    opacity: 0.8;
                }
                100% { 
                    transform: scale(1);
                    opacity: 0.3;
                }
            }
            
            .route-loading-pulse {
                animation: routeLoadingPulse 1.5s ease-in-out infinite;
            }

            /* Hide complex controls */
            .hidden-in-simplified {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Handle initialization errors gracefully
     */
    handleInitializationError(error) {
        const statusElement = document.getElementById('systemStatus');
        if (statusElement) {
            statusElement.textContent = 'Initialization failed - check console';
            statusElement.className = 'status-section error';
        }

        // Show manual initialization button as fallback
        const initBtn = document.getElementById('initBtn');
        if (initBtn) {
            initBtn.style.display = 'block';
            initBtn.textContent = '🔄 Retry Initialization';
            initBtn.onclick = () => this.initialize();
        }

        console.error('Detailed error:', error);
    }

    /**
     * Get current application state for debugging
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            hasMapManager: !!this.mapManager,
            hasController: !!this.controller,
            hasUI: !!this.uiInterface,
            hasPOIList: !!this.poiList,
            hasCrossroadSnapshot: !!this.crossroadSnapshot,
            currentDestination: this.poiList?.getCurrentDestination(),
            isGuidanceActive: this.poiList?.isGuidanceActive
        };
    }
}

// Auto-start the simplified application
window.addEventListener('DOMContentLoaded', () => {
    window.simplifiedApp = new SimplifiedTestApplication();
    window.simplifiedApp.initialize();
});

// Global access for debugging
window.getAppState = () => {
    return window.simplifiedApp?.getState();
};
