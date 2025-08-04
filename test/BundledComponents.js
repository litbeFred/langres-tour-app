/**
 * Bundled Test Components for Browser Compatibility
 * All components in a single file to avoid module loading issues
 */

// Test Styles Component
class TestStyles {
    static getCSS() {
        return `
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
            }
            
            .container {
                display: grid;
                grid-template-columns: 1fr 400px;
                gap: 20px;
                max-width: 1400px;
                margin: 0 auto;
            }
            
            .map-section {
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .control-panel {
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                height: fit-content;
            }
            
            #map {
                height: 500px;
                border-radius: 4px;
                border: 2px solid #ddd;
            }
            
            .test-section {
                margin: 15px 0;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 6px;
                background: #f8f9fa;
            }
            
            .status-section {
                margin: 10px 0;
                padding: 10px;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .success { 
                background-color: #d4edda; 
                border-left: 4px solid #28a745; 
            }
            
            .error { 
                background-color: #f8d7da; 
                border-left: 4px solid #dc3545; 
            }
            
            .info { 
                background-color: #d1ecf1; 
                border-left: 4px solid #17a2b8; 
            }
            
            .warning { 
                background-color: #fff3cd; 
                border-left: 4px solid #ffc107; 
            }
            
            button {
                margin: 5px;
                padding: 8px 16px;
                background-color: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            }
            
            button:hover { 
                background-color: #0056b3; 
            }
            
            button:disabled { 
                background-color: #6c757d; 
                cursor: not-allowed; 
            }
            
            button.success { 
                background-color: #28a745; 
            }
            
            button.success:hover { 
                background-color: #218838; 
            }
            
            button.danger { 
                background-color: #dc3545; 
            }
            
            button.danger:hover { 
                background-color: #c82333; 
            }
            
            button.warning { 
                background-color: #ffc107; 
                color: #212529; 
            }
            
            button.warning:hover { 
                background-color: #e0a800; 
            }
            
            .position-controls {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin: 10px 0;
            }
            
            .position-display {
                background: #e9ecef;
                padding: 8px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
            }
            
            #log {
                height: 200px;
                overflow-y: auto;
                background-color: #f8f9fa;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
                white-space: pre-wrap;
            }
            
            .poi-list {
                max-height: 150px;
                overflow-y: auto;
                background: #f8f9fa;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 8px;
            }
            
            .poi-item {
                padding: 5px;
                margin: 2px 0;
                background: white;
                border-radius: 3px;
                cursor: pointer;
                font-size: 13px;
                transition: background-color 0.2s;
            }
            
            .poi-item:hover {
                background: #e9ecef;
            }
            
            .poi-item.current {
                background: #cce5ff;
                border-left: 3px solid #007bff;
            }
            
            h1 {
                text-align: center;
                color: #333;
                margin-bottom: 30px;
            }
            
            h2 {
                color: #555;
                margin-top: 0;
                font-size: 18px;
            }
            
            .virtual-controls {
                background: #fff3cd;
                border: 1px solid #ffc107;
                border-radius: 4px;
                padding: 10px;
                margin: 10px 0;
            }
            
            input[type="number"] {
                width: 100%;
                padding: 5px;
                border: 1px solid #ddd;
                border-radius: 3px;
                font-size: 14px;
            }
            
            label {
                display: block;
                margin: 5px 0 2px 0;
                font-weight: bold;
                font-size: 13px;
            }
            
            .hidden {
                display: none;
            }
            
            #crossroadMap {
                height: 180px;
                border: none;
                border-radius: 12px;
                margin-top: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                overflow: hidden;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            }

            .crossroad-section {
                margin-top: 15px;
                padding: 15px;
                border: none;
                border-radius: 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
                display: none;
                -webkit-backdrop-filter: blur(10px);
                backdrop-filter: blur(10px);
            }

            .crossroad-section h3 {
                margin-top: 0;
                color: #ffffff;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                font-weight: 600;
            }

            .crossroad-info {
                margin-top: 8px;
                text-align: center;
                opacity: 0.9;
                font-style: italic;
                margin-bottom: 10px;
                font-weight: bold;
                color: #333;
            }

            .crossroad-info small {
                color: #f0f8ff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
        `;
    }

    static injectStyles() {
        const existingStyle = document.getElementById('test-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'test-styles';
        style.textContent = this.getCSS();
        document.head.appendChild(style);
    }
}

// Simple Map Manager for fallback
class SimpleMapManager {
    constructor() {
        this.map = null;
        this.currentPosition = [47.8644, 5.3353];
        this.currentPositionMarker = null;
        this.poiMarkers = [];
        this.onPositionChange = null;
    }

    initializeMap() {
        this.map = L.map('map').setView(this.currentPosition, 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        this.currentPositionMarker = L.marker(this.currentPosition, {
            icon: L.icon({
                iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="blue">
                        <circle cx="12" cy="12" r="8"/>
                        <circle cx="12" cy="12" r="4" fill="white"/>
                    </svg>
                `),
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).addTo(this.map);

        this.map.on('click', (e) => {
            this.setPosition([e.latlng.lat, e.latlng.lng]);
        });
    }

    setPosition(position) {
        this.currentPosition = position;
        if (this.currentPositionMarker) {
            this.currentPositionMarker.setLatLng(position);
        }
        if (this.map) {
            this.map.setView(position, 15);
        }
        if (this.onPositionChange) {
            this.onPositionChange(position);
        }
    }

    addPOIMarkers(pois) {
        pois.forEach((poi, index) => {
            const marker = L.marker([poi.lat, poi.lon], {
                icon: L.icon({
                    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="red">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            <text x="12" y="9" text-anchor="middle" fill="white" font-size="8" font-weight="bold">${index + 1}</text>
                        </svg>
                    `),
                    iconSize: [32, 32],
                    iconAnchor: [16, 32]
                })
            }).addTo(this.map);
            
            marker.bindPopup(`<b>${poi.name}</b><br>${poi.description}`);
            this.poiMarkers.push(marker);
        });
    }
}

// Simple UI Manager
class SimpleUIManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Initialize system
        document.getElementById('initBtn')?.addEventListener('click', () => {
            this.log('🚀 Initialize button clicked (simplified mode)');
            this.updateSystemStatus('Simplified mode - ready');
            document.getElementById('initBtn').disabled = true;
        });

        // Virtual position controls
        document.getElementById('updatePosBtn')?.addEventListener('click', () => {
            const lat = parseFloat(document.getElementById('virtualLat')?.value || '47.8644');
            const lon = parseFloat(document.getElementById('virtualLon')?.value || '5.3353');
            if (window.simpleMapManager) {
                window.simpleMapManager.setPosition([lat, lon]);
                this.log(`📍 Position updated: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
            }
        });

        // Clear log
        document.getElementById('clearLogBtn')?.addEventListener('click', () => {
            this.clearLog();
        });
    }

    log(message) {
        const logElement = document.getElementById('log');
        if (logElement) {
            const timestamp = new Date().toLocaleTimeString();
            logElement.textContent += `[${timestamp}] ${message}\n`;
            logElement.scrollTop = logElement.scrollHeight;
        }
        console.log(message);
    }

    clearLog() {
        const logElement = document.getElementById('log');
        if (logElement) logElement.textContent = '';
    }

    updateSystemStatus(status) {
        const element = document.getElementById('systemStatus');
        if (element) element.textContent = status;
    }

    updateCurrentPosition(position) {
        const element = document.getElementById('currentPosition');
        if (element) element.textContent = `${position[0].toFixed(4)}, ${position[1].toFixed(4)}`;
        
        const latInput = document.getElementById('virtualLat');
        const lonInput = document.getElementById('virtualLon');
        if (latInput) latInput.value = position[0].toFixed(4);
        if (lonInput) lonInput.value = position[1].toFixed(4);
    }
}

// Bundled Test Application
class BundledTestApp {
    constructor() {
        this.mapManager = null;
        this.uiManager = null;
        this.isInitialized = false;
        
        this.testPOIs = [
            { id: 1, name: 'Porte des Moulins', lat: 47.8644, lon: 5.3353, description: 'Point de départ du tour' },
            { id: 2, name: 'Tour Saint-Ferjeux', lat: 47.8654, lon: 5.3363, description: 'Tour historique des remparts' },
            { id: 3, name: 'Tour de Navarre', lat: 47.8664, lon: 5.3373, description: 'Fortification Renaissance' },
            { id: 4, name: 'Cathédrale Saint-Mammès', lat: 47.8659, lon: 5.3349, description: 'Cathédrale du 12ème siècle' },
            { id: 5, name: 'Porte Gallo-Romaine', lat: 47.8634, lon: 5.3343, description: 'Vestiges gallo-romains' }
        ];
    }

    async initialize() {
        try {
            // Inject styles
            TestStyles.injectStyles();
            
            // Wait a bit for DOM to be ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Initialize components
            this.mapManager = new SimpleMapManager();
            this.uiManager = new SimpleUIManager();
            
            // Set up map
            this.mapManager.initializeMap();
            this.mapManager.addPOIMarkers(this.testPOIs);
            
            // Set up position change callback
            this.mapManager.onPositionChange = (position) => {
                this.uiManager.updateCurrentPosition(position);
                this.uiManager.log(`📍 Position updated: ${position[0].toFixed(4)}, ${position[1].toFixed(4)}`);
            };
            
            // Make map manager available globally
            window.simpleMapManager = this.mapManager;
            
            this.isInitialized = true;
            this.uiManager.updateSystemStatus('Bundled components - ready');
            this.uiManager.log('✅ Bundled test application initialized');
            this.uiManager.log('📱 Simplified SOLID architecture loaded');
            this.uiManager.log('👆 Click on the map to set position');
            this.uiManager.log('🎯 Click "Initialize" to test basic functionality');
            
        } catch (error) {
            console.error('Failed to initialize bundled app:', error);
            if (this.uiManager) {
                this.uiManager.log(`❌ Initialization failed: ${error.message}`);
            }
        }
    }

    static async create() {
        const app = new BundledTestApp();
        await app.initialize();
        return app;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.BundledTestApp = BundledTestApp;
    window.TestStyles = TestStyles;
    window.SimpleMapManager = SimpleMapManager;
    window.SimpleUIManager = SimpleUIManager;
}
