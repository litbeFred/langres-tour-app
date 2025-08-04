// Enhanced Main Application with Integrated Guidance System
import { ServiceContainer } from './utils/ServiceContainer.js';
import { LocationService } from './services/location/LocationService.js';
import { StorageService } from './services/storage/StorageService.js';
import { AudioService } from './services/media/AudioService.js';
import { CameraService } from './services/media/CameraService.js';
import { NotificationService } from './services/media/NotificationService.js';
import { OSMRoutingService } from './services/routing/OSMRoutingService.js';
import { NavigationService } from './services/routing/NavigationService.js';
import { GuidanceService } from './services/guidance/GuidanceService.js';
import { TourManager } from './managers/TourManager.js';
import { GuidanceController } from './components/guidance/GuidanceController.js';
import { GuidanceInterface } from './components/guidance/GuidanceInterface.js';
import { EnhancedMapManager } from './components/map/EnhancedMapManager.js';
import tourData from './data/tourData.json';

// Import Leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Make Leaflet available globally
window.L = L;

// Import styles
import './styles/main.css';
import './styles/components/guidance.css';

/**
 * Enhanced Langres Tour Application
 * Integrates simplified guidance system with main application
 * Following SOLID principles and existing architecture patterns
 */
class EnhancedLangresTourApp {
    constructor() {
        this.container = new ServiceContainer();
        this.components = {};
        this.guidanceController = null;
        this.guidanceInterface = null;
        this.mapManager = null;
        this.initialized = false;
    }

    /**
     * Initialize the enhanced application with guidance system
     */
    async init() {
        if (this.initialized) return;

        try {
            console.log('🏰 Enhanced Langres Tour App initializing...');
            
            await this.registerServices();
            await this.setupGuidanceSystem();
            
            this.initialized = true;
            console.log('✅ Enhanced Langres Tour App initialized successfully');
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showErrorMessage(error.message);
        }
    }

    /**
     * Register all services in the service container
     */
    async registerServices() {
        console.log('📦 Registering services...');

        // Core services - register as factory functions
        this.container.register('LocationService', () => new LocationService());
        this.container.register('StorageService', () => new StorageService());
        this.container.register('AudioService', () => new AudioService());
        this.container.register('CameraService', () => new CameraService());
        this.container.register('NotificationService', () => new NotificationService());
        
        // Routing services
        this.container.register('OSMRoutingService', () => new OSMRoutingService());
        this.container.register('NavigationService', (container) => new NavigationService(
            container.get('AudioService'),
            container.get('OSMRoutingService')
        ));
        
        // Guidance services
        this.container.register('GuidanceService', (container) => new GuidanceService(
            container.get('NavigationService'),
            container.get('OSMRoutingService'),
            container.get('AudioService'),
            tourData.pois || []
        ));
        
        // Tour manager
        this.container.register('TourManager', (container) => new TourManager(
            container.get('LocationService'),
            container.get('StorageService'),
            container.get('NotificationService'),
            tourData
        ));

        console.log('✅ Services registered successfully');
    }

    /**
     * Setup the integrated guidance system
     */
    async setupGuidanceSystem() {
        console.log('🎯 Setting up guidance system...');

        // Create enhanced map manager
        this.mapManager = new EnhancedMapManager(this.container);
        
        // Create guidance interface
        this.guidanceInterface = new GuidanceInterface(null); // Will be set after controller
        
        // Create guidance controller
        this.guidanceController = new GuidanceController(
            this.container,
            this.mapManager,
            this.guidanceInterface
        );
        
        // Connect interface to controller
        this.guidanceInterface.guidanceController = this.guidanceController;
        
        // Initialize map
        await this.mapManager.initialize('map');
        
        // Make globally available for debugging and popup interactions
        window.guidanceController = this.guidanceController;
        window.mapManager = this.mapManager;
        window.app = this;
        
        console.log('✅ Guidance system setup complete');
    }

    /**
     * Show error message to user
     */
    showErrorMessage(message) {
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = `
                <div class="error-container">
                    <div class="error-card">
                        <h2>🚫 Erreur d'initialisation</h2>
                        <p>${message}</p>
                        <button onclick="location.reload()" class="retry-btn">
                            🔄 Réessayer
                        </button>
                    </div>
                </div>
                <style>
                    .error-container {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    }
                    .error-card {
                        background: white;
                        padding: 2rem;
                        border-radius: 15px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                        text-align: center;
                        max-width: 400px;
                    }
                    .error-card h2 {
                        color: #e74c3c;
                        margin-bottom: 1rem;
                    }
                    .error-card p {
                        color: #7f8c8d;
                        margin-bottom: 1.5rem;
                        line-height: 1.5;
                    }
                    .retry-btn {
                        background: linear-gradient(135deg, #3498db, #2980b9);
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: transform 0.3s ease;
                    }
                    .retry-btn:hover {
                        transform: translateY(-2px);
                    }
                </style>
            `;
        }
    }

    // Public API methods for debugging and external access
    getServiceContainer() {
        return this.container;
    }

    getGuidanceController() {
        return this.guidanceController;
    }

    getMapManager() {
        return this.mapManager;
    }

    // Utility method for testing
    async simulateGuidanceToFirstPOI() {
        if (this.guidanceController) {
            const pois = this.guidanceController.getTourPOIs();
            if (pois.length > 0) {
                await this.guidanceController.startGuidanceToPOI(pois[0].id);
            }
        }
    }

    // Test OSRM connectivity
    async testOSRMConnection() {
        try {
            const osmService = this.container.get('OSMRoutingService');
            if (osmService) {
                const start = [47.8644, 5.3353]; // Langres center
                const end = [47.8641, 5.3347]; // Porte des Moulins
                
                console.log('🧪 Testing OSRM connection...');
                const startTime = performance.now();
                
                const route = await osmService.calculateRoute(start, end);
                
                const endTime = performance.now();
                const duration = Math.round(endTime - startTime);
                
                if (route) {
                    console.log(`✅ OSRM test successful! Response time: ${duration}ms`);
                    console.log('Route data:', route);
                    return { success: true, duration, route };
                } else {
                    console.warn('⚠️ OSRM test returned no route');
                    return { success: false, error: 'No route returned' };
                }
            } else {
                console.error('❌ OSMRoutingService not found');
                return { success: false, error: 'Service not found' };
            }
        } catch (error) {
            console.error('❌ OSRM test failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM loaded, initializing Enhanced Langres Tour App...');
    
    window.app = new EnhancedLangresTourApp();
    
    try {
        await window.app.init();
        
        // Test OSRM connection on startup
        setTimeout(() => {
            window.app.testOSRMConnection();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Application startup failed:', error);
    }
});

// Make app available globally for debugging
export { EnhancedLangresTourApp };
