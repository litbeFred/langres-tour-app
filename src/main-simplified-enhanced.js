// Simplified Enhanced Main Application - Fallback Version
import tourData from './data/tourData.json';

// Import routing service
import { OSMRoutingService } from './services/routing/OSMRoutingService.js';

// Import Leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Make Leaflet available globally
window.L = L;

// Import styles
import './styles/main.css';
import './styles/components/guidance.css';

/**
 * Simplified Enhanced Langres Tour Application
 * Fallback version with minimal dependencies for testing
 */
class SimplifiedEnhancedApp {
    constructor() {
        this.initialized = false;
        this.map = null;
        this.currentPosition = [47.8644, 5.3353]; // Langres center
        this.pois = [];
        this.osmRoutingService = null;
        this.currentRoute = null;
        this.debugMode = false;
        this.isSimulating = false;
        this.simulationInterval = null;
        this.currentPositionMarker = null;
        
        // Prevent race conditions
        this.processingPOIReached = false;
        this.lastDeviationCheck = 0;
        
        // Guidance state tracking
        this.activeGuidanceService = null; // 'guided-tour', 'back-on-track', or null
        this.guidanceState = {
            isDeviated: false,
            currentPOI: null,
            targetPOI: null,
            routeProgress: 0,
            lastKnownPosition: null,
            isOnTour: false,           // Is user following the planned tour sequence?
            currentTourStep: 0,        // Current step in the planned tour (0-based)
            tourSequence: [],          // The planned tour sequence
            tourActive: false,         // Is the tour currently running?
            fullTourRoute: null        // Complete route for the entire tour
        };
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('🏰 Simplified Enhanced App initializing...');
            
            // Load POI data
            this.pois = Array.isArray(tourData) ? tourData : this.getDefaultPOIs();
            console.log(`📍 Loaded ${this.pois.length} POIs from tourData.json`);
            console.log('First POI:', this.pois[0]); // Debug: show structure of first POI
            
            // Initialize planned tour sequence based on POI order
            this.initializeTourSequence();
            
            // Initialize OSRM routing service
            try {
                this.osmRoutingService = new OSMRoutingService();
                this.log('🌐 Service de routage OSRM initialisé');
            } catch (error) {
                this.log(`⚠️ Service de routage non disponible: ${error.message}`);
                this.osmRoutingService = null;
            }
            
            // Create interface
            this.createInterface();
            
            // Initialize map
            await this.initializeMap();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Add keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            this.initialized = true;
            console.log('✅ Simplified Enhanced App initialized successfully');
            
        } catch (error) {
            console.error('❌ Simplified app initialization failed:', error);
            this.showErrorMessage(error.message);
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

    createInterface() {
        const appContainer = document.getElementById('app');
        if (!appContainer) return;

        // Remove loading indicator
        const loading = document.getElementById('loading');
        if (loading) loading.remove();

        appContainer.innerHTML = `
            <div class="guidance-app">
                <header class="app-header">
                    <h1>🏰 Tour des Remparts de Langres</h1>
                    <p>Version simplifiée avec guidage intégré</p>
                    <div class="status-bar">
                        <span class="status-label">État:</span>
                        <span id="systemStatus" class="status-value">Initialisé</span>
                        <button id="toggleDebugBtn" class="debug-btn-header">
                            🔧 Debug
                        </button>
                    </div>
                </header>

                <main class="main-content">
                    <div class="map-container">
                        <div id="map" class="map"></div>
                    </div>

                        <div class="sidebar">
                        <div class="guidance-section">
                            <h3>🎯 Visite des Remparts</h3>
                            <div class="instructions">
                                <p>Démarrez votre visite guidée des remparts de Langres.</p>
                                <p><small>💡 Le système vous guidera automatiquement d'un point à l'autre.</small></p>
                            </div>
                            
                            <div class="tour-controls">
                                <div class="start-options">
                                    <label for="startOption">Point de départ:</label>
                                    <select id="startOption" class="start-option-select">
                                        <option value="closest">🎯 POI le plus proche</option>
                                        <option value="first">1️⃣ Commencer par le POI #1</option>
                                    </select>
                                </div>
                                
                                <button id="startTourBtn" class="start-tour-btn">
                                    🚀 Démarrer la Visite
                                </button>
                                <button id="stopTourBtn" class="stop-tour-btn" style="display: none;">
                                    ⏹️ Arrêter la Visite
                                </button>
                                <button id="simulateTourBtn" class="simulate-tour-btn" style="display: none;">
                                    🚶 Simuler le Déplacement
                                </button>
                            </div>
                            
                            <div id="tourProgress" class="tour-progress" style="display: none;">
                                <h4>📍 Progression de la Visite</h4>
                                <div class="current-destination">
                                    <span class="label">Destination actuelle:</span>
                                    <span id="currentDestination" class="value">-</span>
                                </div>
                                <div class="tour-step">
                                    <span class="label">Étape:</span>
                                    <span id="tourStepProgress" class="value">-</span>
                                </div>
                                <div class="progress-bar">
                                    <div id="progressFill" class="progress-fill"></div>
                                </div>
                            </div>
                            
                            <div id="poiList" class="poi-list" style="display: none;">
                                <h4>📋 Points d'Intérêt de la Visite</h4>
                                ${this.renderPOIList()}
                            </div>
                        </div>                        <div class="status-section">
                            <h4>📊 État du système</h4>
                            <div class="status-grid">
                                <div class="status-item">
                                    <span class="label">Version:</span>
                                    <span class="value">Simplifiée</span>
                                </div>
                                <div class="status-item">
                                    <span class="label">POIs:</span>
                                    <span class="value">${this.pois.length} disponibles</span>
                                </div>
                                <div class="status-item">
                                    <span class="label">Position:</span>
                                    <span id="currentPosDisplay">${this.currentPosition[0].toFixed(4)}, ${this.currentPosition[1].toFixed(4)}</span>
                                </div>
                            </div>
                        </div>

                        <div id="debugPanel" class="debug-panel" style="display: none;">
                            <h4>🔧 Panneau d'Administration</h4>
                            
                            <div class="debug-section">
                                <h5>🧭 État du Guidage</h5>
                                <div class="guidance-status">
                                    <div class="status-item">
                                        <span class="label">Service Actif:</span>
                                        <span id="activeGuidanceService" class="value guidance-service">Aucun</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">État:</span>
                                        <span id="guidanceStateDisplay" class="value">Inactif</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">POI Cible:</span>
                                        <span id="targetPOIDisplay" class="value">Aucun</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">Distance au POI:</span>
                                        <span id="distanceToPOI" class="value">-</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">Distance fin route:</span>
                                        <span id="distanceToRouteEnd" class="value">-</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">Type de Visite:</span>
                                        <span id="tourTypeDisplay" class="value">Aucune</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">Étape Tour:</span>
                                        <span id="tourStepDisplay" class="value">-</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">Déviation:</span>
                                        <span id="deviationStatus" class="value">Non</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">Progression:</span>
                                        <span id="routeProgressDisplay" class="value">0%</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="debug-section">
                                <h5>📍 Contrôle de Position</h5>
                                <div class="position-controls">
                                    <div class="coord-inputs">
                                        <label>Latitude:</label>
                                        <input type="number" id="debugLat" step="0.0001" value="${this.currentPosition[0]}" />
                                        <label>Longitude:</label>
                                        <input type="number" id="debugLon" step="0.0001" value="${this.currentPosition[1]}" />
                                        <button id="setPositionBtn" class="small-btn">📍 Définir</button>
                                    </div>
                                    
                                    <div class="quick-positions">
                                        <label>Positions rapides:</label>
                                        <select id="quickPositions">
                                            <option value="">-- Sélectionner --</option>
                                            <option value="47.8644,5.3353">Centre Langres</option>
                                            <option value="47.8641,5.3347">Porte des Moulins</option>
                                            <option value="47.8621,5.3369">Tour Saint-Ferjeux</option>
                                            <option value="47.8601,5.3389">Porte Henri IV</option>
                                        </select>
                                        <button id="goToQuickBtn" class="small-btn">🚀 Aller</button>
                                    </div>
                                </div>
                            </div>

                            <div class="debug-section">
                                <h5>🎮 Tests et Contrôles</h5>
                                <div class="test-controls">
                                    <button id="testOSRMBtn" class="small-btn">🌐 Test OSRM</button>
                                    <button id="testRouteBtn" class="small-btn">🛣️ Test Route</button>
                                    <button id="clearRouteBtn" class="small-btn">🗑️ Effacer Route</button>
                                    <button id="centerMapBtn" class="small-btn">🎯 Centrer Carte</button>
                                </div>
                                
                                <div class="simulation-controls" style="margin-top: 1rem;">
                                    <div class="status-item">
                                        <span class="label">Simulation active:</span>
                                        <span id="walkingSimulationStatus" class="value">Non</span>
                                    </div>
                                    <button id="stopWalkingSimulationBtn" class="control-btn" style="display: none;">⏹️ Arrêter Simulation</button>
                                </div>
                            </div>
                        </div>

                        <div class="log-section">
                            <h4>📝 Journal</h4>
                            <div class="log-controls">
                                <button id="clearLogBtn" class="small-btn">🗑️ Effacer</button>
                            </div>
                            <div id="logContainer" class="log-container"></div>
                        </div>
                    </div>
                </main>
            </div>
            
            <style>
                .poi-confirmation-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    animation: fadeIn 0.3s ease;
                }
                
                .poi-confirmation-modal .modal-content {
                    background: white;
                    padding: 2rem;
                    border-radius: 16px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    animation: slideIn 0.3s ease;
                }
                
                .poi-confirmation-modal .modal-header h3 {
                    margin: 0 0 1rem 0;
                    color: #2c3e50;
                    text-align: center;
                }
                
                .poi-confirmation-modal .modal-body {
                    margin-bottom: 1.5rem;
                }
                
                .poi-confirmation-modal .modal-body p {
                    margin: 0.5rem 0;
                }
                
                .poi-confirmation-modal .modal-body .poi-description {
                    color: #7f8c8d;
                    font-style: italic;
                }
                
                .poi-confirmation-modal .detection-info {
                    background: #f8f9fa;
                    padding: 0.5rem;
                    border-radius: 8px;
                    margin: 1rem 0;
                }
                
                .poi-confirmation-modal .confirmation-question {
                    font-weight: 600;
                    color: #2c3e50;
                    text-align: center;
                    margin-top: 1rem !important;
                }
                
                .poi-confirmation-modal .modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }
                
                .poi-confirmation-modal .confirm-btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    min-width: 120px;
                }
                
                .poi-confirmation-modal .yes-btn {
                    background: #27ae60;
                    color: white;
                }
                
                .poi-confirmation-modal .yes-btn:hover {
                    background: #219a52;
                    transform: translateY(-1px);
                }
                
                .poi-confirmation-modal .no-btn {
                    background: #e74c3c;
                    color: white;
                }
                
                .poi-confirmation-modal .no-btn:hover {
                    background: #c0392b;
                    transform: translateY(-1px);
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideIn {
                    from { 
                        opacity: 0;
                        transform: translateY(-20px) scale(0.95);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            </style>
        `;
    }

    renderPOIList() {
        return this.pois.map(poi => {
            const tourOrder = poi.order || '?';
            const isCurrentTarget = this.guidanceState.targetPOI && this.guidanceState.targetPOI.id === poi.id;
            const isCompleted = this.guidanceState.currentTourStep > (poi.order - 1);
            
            let statusClass = '';
            let statusIcon = '';
            
            if (isCompleted) {
                statusClass = 'completed';
                statusIcon = '✅';
            } else if (isCurrentTarget) {
                statusClass = 'current-target';
                statusIcon = '🎯';
            }
            
            return `
            <div class="poi-card ${statusClass}" data-poi-id="${poi.id}">
                <div class="poi-header">
                    <div class="poi-name-section">
                        <span class="tour-order">${tourOrder}</span>
                        <h5 class="poi-name">${poi.name}</h5>
                        ${statusIcon ? `<span class="poi-status">${statusIcon}</span>` : ''}
                    </div>
                </div>
                <p class="poi-description">${poi.description}</p>
                <div class="poi-location">
                    📍 ${poi.lat.toFixed(4)}, ${poi.lon.toFixed(4)}
                </div>
            </div>
        `}).join('');
    }

    async initializeMap() {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            throw new Error('Map container not found');
        }

        // Initialize Leaflet map
        this.map = L.map('map').setView(this.currentPosition, 15);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Add current position marker
        this.addPositionMarker();
        
        // Add POI markers
        this.addPOIMarkers();
        
        this.log('🗺️ Carte initialisée avec succès');
    }

    addPositionMarker() {
        const userIcon = L.icon({
            iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="12" fill="#3498db" stroke="white" stroke-width="3"/>
                    <circle cx="16" cy="16" r="6" fill="white"/>
                    <circle cx="16" cy="16" r="3" fill="#3498db"/>
                </svg>
            `),
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        // Store reference for debug mode
        this.currentPositionMarker = L.marker(this.currentPosition, { icon: userIcon }).addTo(this.map);
    }

    addPOIMarkers() {
        this.pois.forEach((poi, index) => {
            const poiIcon = L.icon({
                iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
                        <path d="M20 0C9 0 0 9 0 20c0 11 20 30 20 30s20-19 20-30C40 9 31 0 20 0z" fill="#e74c3c"/>
                        <circle cx="20" cy="20" r="8" fill="white"/>
                        <text x="20" y="25" text-anchor="middle" font-size="10" font-weight="bold" fill="#e74c3c">${index + 1}</text>
                    </svg>
                `),
                iconSize: [40, 50],
                iconAnchor: [20, 50]
            });

            const marker = L.marker([poi.lat, poi.lon], { icon: poiIcon });
            
            marker.bindPopup(`
                <div class="poi-popup">
                    <h4>${poi.name}</h4>
                    <p>${poi.description}</p>
                </div>
            `);

            marker.addTo(this.map);
        });
    }

    setupEventListeners() {
        // Tour controls
        document.getElementById('startTourBtn')?.addEventListener('click', () => {
            this.startTour();
        });

        document.getElementById('stopTourBtn')?.addEventListener('click', () => {
            this.stopTour();
        });

        document.getElementById('simulateTourBtn')?.addEventListener('click', () => {
            this.startTourSimulation();
        });

        // Start option change feedback
        document.getElementById('startOption')?.addEventListener('change', (e) => {
            this.previewStartOption(e.target.value);
        });

        // Clear log
        document.getElementById('clearLogBtn')?.addEventListener('click', () => {
            this.clearLog();
        });

        // Debug mode toggle
        document.getElementById('toggleDebugBtn')?.addEventListener('click', () => {
            this.toggleDebugMode();
        });

        // Debug panel controls
        this.setupDebugControls();
    }

    setupDebugControls() {
        // Position controls
        document.getElementById('setPositionBtn')?.addEventListener('click', () => {
            this.setDebugPosition();
        });

        document.getElementById('goToQuickBtn')?.addEventListener('click', () => {
            this.goToQuickPosition();
        });

        // Walking simulation controls
        document.getElementById('stopWalkingSimulationBtn')?.addEventListener('click', () => {
            this.stopWalkingSimulation();
        });

        // Test controls
        document.getElementById('testOSRMBtn')?.addEventListener('click', () => {
            this.testOSRMConnection();
        });

        document.getElementById('testRouteBtn')?.addEventListener('click', () => {
            this.testRandomRoute();
        });

        document.getElementById('clearRouteBtn')?.addEventListener('click', () => {
            this.clearRoute();
        });

        document.getElementById('centerMapBtn')?.addEventListener('click', () => {
            this.centerMapOnUser();
        });
    }

    async selectPOI(poiId) {
        // Convert poiId to number to match JSON data format
        const numericPoiId = parseInt(poiId);
        const poi = this.pois.find(p => p.id === numericPoiId);
        
        if (poi) {
            this.log(`🎯 POI sélectionné: ${poi.name} (ID: ${poi.id})`);
            
            // Determine which guidance service to use
            const isNextInTour = this.isNextPOIInTour(numericPoiId);
            const isInTourSequence = this.isPOIInTourSequence(numericPoiId);
            
            let guidanceService;
            let isOnTour = false;
            
            if (isNextInTour) {
                // Following the planned tour sequence
                guidanceService = 'guided-tour';
                isOnTour = true;
                this.guidanceState.currentTourStep++;
                this.log(`✅ Suivi de la visite guidée - Étape ${this.guidanceState.currentTourStep}/${this.guidanceState.tourSequence.length}`);
            } else if (isInTourSequence) {
                // POI is in tour but not the next expected one
                guidanceService = 'back-on-track';
                const poiStep = this.findPOIStepInTour(numericPoiId);
                this.guidanceState.currentTourStep = poiStep + 1;
                this.log(`⚠️ POI hors séquence - Activation BackOnTrack (POI ${poi.order || 'N/A'})`);
            } else {
                // POI not in planned tour at all
                guidanceService = 'back-on-track';
                this.log(`⚠️ POI hors circuit - Activation BackOnTrack`);
            }
            
            // Update guidance state
            this.setGuidanceService(guidanceService);
            this.updateGuidanceState({
                targetPOI: poi,
                currentPOI: null,
                isDeviated: false,
                routeProgress: 0,
                isOnTour: isOnTour
            });
            
            // Visual feedback
            const card = document.querySelector(`[data-poi-id="${poiId}"]`);
            if (card) {
                card.classList.add('selected');
                setTimeout(() => card.classList.remove('selected'), 2000);
            }
            
            // Calculate and display route
            await this.calculateAndDisplayRoute(poi);
            
            // Center map on POI
            this.map.setView([poi.lat, poi.lon], 17);
            
            this.log(`🗺️ Carte centrée sur ${poi.name}`);
            this.log(`📍 Position: ${poi.lat.toFixed(4)}, ${poi.lon.toFixed(4)}`);
        } else {
            this.log(`❌ POI introuvable avec l'ID: ${poiId} (converti en: ${numericPoiId})`);
        }
    }

    async calculateAndDisplayRoute(poi) {
        if (!this.osmRoutingService) {
            this.log('⚠️ Service de routage non disponible');
            return;
        }

        try {
            this.log('🗺️ Calcul de l\'itinéraire en cours...');
            
            const startTime = performance.now();
            const route = await this.osmRoutingService.calculateRoute(
                this.currentPosition,
                [poi.lat, poi.lon]
            );
            const endTime = performance.now();
            
            if (route) {
                this.displayRoute(route);
                this.log(`✅ Itinéraire calculé en ${Math.round(endTime - startTime)}ms`);
            } else {
                this.log('❌ Impossible de calculer l\'itinéraire');
            }
            
        } catch (error) {
            this.log(`❌ Erreur de calcul d'itinéraire: ${error.message}`);
        }
    }

    displayRoute(route) {
        try {
            // Clear existing route
            if (this.currentRoute) {
                this.map.removeLayer(this.currentRoute);
            }

            let coordinates = [];
            
            // Handle OSRM GeoJSON format
            if (route.features && Array.isArray(route.features)) {
                const feature = route.features[0];
                if (feature && feature.geometry && feature.geometry.coordinates) {
                    coordinates = feature.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                }
            }

            if (coordinates.length > 0) {
                // Create route polyline with proper guidance color (blue, not green)
                this.currentRoute = L.polyline(coordinates, {
                    color: '#3498db',      // Blue color for guidance routes
                    weight: 6,
                    opacity: 0.8,
                    dashArray: '5, 10'     // Dashed line to distinguish from simulation
                }).addTo(this.map);

                // Fit map to route
                this.map.fitBounds(this.currentRoute.getBounds(), { padding: [20, 20] });
                
                this.log(`🛣️ Itinéraire affiché avec ${coordinates.length} points`);
            } else {
                this.log('⚠️ Aucune coordonnée d\'itinéraire trouvée');
            }

        } catch (error) {
            this.log(`❌ Erreur d'affichage de l'itinéraire: ${error.message}`);
        }
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logContainer = document.getElementById('logContainer');
        
        if (logContainer) {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.innerHTML = `
                <span class="timestamp">${timestamp}</span>
                <span class="message">${message}</span>
            `;
            
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        
        console.log(`[App] ${message}`);
    }

    clearLog() {
        const logContainer = document.getElementById('logContainer');
        if (logContainer) {
            logContainer.innerHTML = '';
        }
    }

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
            `;
        }
    }

    // Debug Mode Methods
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        const debugPanel = document.getElementById('debugPanel');
        const toggleBtn = document.getElementById('toggleDebugBtn');
        const simulateBtn = document.getElementById('simulateTourBtn');
        const poiList = document.getElementById('poiList');
        
        if (this.debugMode) {
            debugPanel.style.display = 'block';
            toggleBtn.textContent = '🔧 Fermer';
            toggleBtn.classList.add('active');
            if (simulateBtn) simulateBtn.style.display = 'inline-block';
            if (poiList) poiList.style.display = 'block';
            this.log('🔧 Mode debug activé - Contrôles avancés visibles');
            
            // Initialize guidance display
            this.updateGuidanceDisplay();
        } else {
            debugPanel.style.display = 'none';
            toggleBtn.textContent = '🔧 Debug';
            toggleBtn.classList.remove('active');
            if (simulateBtn) simulateBtn.style.display = 'none';
            if (poiList) poiList.style.display = 'none';
            this.log('🔧 Mode debug désactivé');
            
            // Stop any ongoing simulation
            if (this.isSimulating) {
                this.stopWalkingSimulation();
            }
        }
    }

    setDebugPosition() {
        const lat = parseFloat(document.getElementById('debugLat').value);
        const lon = parseFloat(document.getElementById('debugLon').value);
        
        if (isNaN(lat) || isNaN(lon)) {
            this.log('❌ Coordonnées invalides');
            return;
        }
        
        this.updateUserPosition([lat, lon]);
        this.log(`📍 Position définie: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }

    goToQuickPosition() {
        const select = document.getElementById('quickPositions');
        const value = select.value;
        
        if (!value) return;
        
        const [lat, lon] = value.split(',').map(parseFloat);
        this.updateUserPosition([lat, lon]);
        
        // Update input fields
        document.getElementById('debugLat').value = lat;
        document.getElementById('debugLon').value = lon;
        
        this.log(`🚀 Téléportation vers: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }

    updateUserPosition(newPosition) {
        this.currentPosition = newPosition;
        
        // Update marker on map
        if (this.currentPositionMarker) {
            this.currentPositionMarker.setLatLng(newPosition);
        }
        
        // Update display
        const posDisplay = document.getElementById('currentPosDisplay');
        if (posDisplay) {
            posDisplay.textContent = `${newPosition[0].toFixed(4)}, ${newPosition[1].toFixed(4)}`;
        }
        
        // Center map on new position
        this.map.setView(newPosition, this.map.getZoom());
        
        // Update guidance display with new distances
        this.updateGuidanceDisplay();
        
        // Check for tour-related events
        if (this.guidanceState.tourActive) {
            this.checkPOIReached();
            this.checkForDeviation();
        }
    }

    // Old simulation methods removed - replaced with walking simulation

    async testOSRMConnection() {
        if (!this.osmRoutingService) {
            this.log('❌ Service OSRM non disponible');
            return;
        }
        
        this.log('🧪 Test de connexion OSRM...');
        
        try {
            const start = this.currentPosition;
            const end = [47.8641, 5.3347]; // Porte des Moulins
            
            const startTime = performance.now();
            const route = await this.osmRoutingService.calculateRoute(start, end);
            const endTime = performance.now();
            
            if (route) {
                this.log(`✅ Test OSRM réussi! Temps de réponse: ${Math.round(endTime - startTime)}ms`);
            } else {
                this.log('❌ Test OSRM échoué: Aucune route retournée');
            }
        } catch (error) {
            this.log(`❌ Test OSRM échoué: ${error.message}`);
        }
    }

    async testRandomRoute() {
        if (this.pois.length === 0) {
            this.log('❌ Aucun POI disponible pour le test');
            return;
        }
        
        const randomPOI = this.pois[Math.floor(Math.random() * this.pois.length)];
        this.log(`🧪 Test de route vers ${randomPOI.name}...`);
        
        await this.calculateAndDisplayRoute(randomPOI);
    }

    clearRoute() {
        if (this.currentRoute) {
            this.map.removeLayer(this.currentRoute);
            this.currentRoute = null;
            this.log('🗑️ Route effacée');
        } else {
            this.log('⚠️ Aucune route à effacer');
        }
    }

    centerMapOnUser() {
        this.map.setView(this.currentPosition, 16);
        this.log('🎯 Carte centrée sur la position utilisateur');
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            console.log('Key pressed:', e.key, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey);
            
            // Ctrl+D or Cmd+D for debug mode
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                console.log('Debug shortcut triggered!');
                this.toggleDebugMode();
            }
            
            // Also try with uppercase D
            if ((e.ctrlKey || e.metaKey) && e.key === 'D') {
                e.preventDefault();
                console.log('Debug shortcut (uppercase) triggered!');
                this.toggleDebugMode();
            }
            
            // Escape to close debug mode
            if (e.key === 'Escape' && this.debugMode) {
                this.toggleDebugMode();
            }
            
            // Space to stop walking simulation
            if (e.key === ' ' && this.isSimulating) {
                e.preventDefault();
                this.stopWalkingSimulation();
            }
        });
        
        this.log('⌨️ Raccourcis clavier: Ctrl+D (Debug), Échap (Fermer), Espace (Arrêter simulation)');
    }

    // Tour Sequence Management
    initializeTourSequence() {
        // Sort POIs by their order property to create the planned tour sequence
        this.guidanceState.tourSequence = [...this.pois].sort((a, b) => (a.order || 0) - (b.order || 0));
        this.log(`🗺️ Séquence de visite initialisée: ${this.guidanceState.tourSequence.length} POIs`);
        console.log('Tour sequence:', this.guidanceState.tourSequence.map(poi => `${poi.order}: ${poi.name}`));
    }

    isNextPOIInTour(targetPoiId) {
        const currentStep = this.guidanceState.currentTourStep;
        const nextPOI = this.guidanceState.tourSequence[currentStep];
        
        return nextPOI && nextPOI.id === targetPoiId;
    }

    isPOIInTourSequence(poiId) {
        return this.guidanceState.tourSequence.some(poi => poi.id === poiId);
    }

    findPOIStepInTour(poiId) {
        return this.guidanceState.tourSequence.findIndex(poi => poi.id === poiId);
    }

    findClosestPOI() {
        let closestPOI = null;
        let minDistance = Infinity;

        for (const poi of this.guidanceState.tourSequence) {
            const distance = this.calculateDistance(
                this.currentPosition,
                [poi.lat, poi.lon]
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                closestPOI = poi;
            }
        }

        if (closestPOI) {
            // Convert distance to meters for user display
            const distanceInMeters = Math.round(minDistance * 111320);
            this.log(`📏 POI le plus proche trouvé: ${closestPOI.name} (${distanceInMeters}m)`);
        }

        return closestPOI;
    }

    determineStartingPOI() {
        const startOption = document.getElementById('startOption')?.value || 'closest';
        
        if (startOption === 'first') {
            // Start from POI #1 - return POI #1 itself as target
            return this.guidanceState.tourSequence[0];
        } else {
            // Start from closest POI - use straight line calculation for speed
            return this.findClosestPOIFast();
        }
    }

    findClosestPOIFast() {
        let closestPOI = null;
        let minDistance = Infinity;
        
        // Debug: Log all POI distances for verification
        this.log(`📏 Calcul des distances vers tous les POIs depuis position: ${this.currentPosition[0].toFixed(4)}, ${this.currentPosition[1].toFixed(4)}`);
        
        const distanceResults = [];

        for (const poi of this.guidanceState.tourSequence) {
            // Use straight-line distance calculation (much faster than routing)
            const distance = this.calculateStraightLineDistance(
                this.currentPosition,
                [poi.lat, poi.lon]
            );
            
            // Convert distance to meters for user display
            const distanceInMeters = Math.round(distance * 1000);
            
            distanceResults.push({
                poi: poi,
                distance: distance,
                distanceInMeters: distanceInMeters
            });
            
            // Debug: Log each POI distance
            this.log(`  📍 ${poi.name} (Ordre ${poi.order || '?'}): ${distanceInMeters}m`);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestPOI = poi;
            }
        }

        // Sort results by distance for better debugging
        distanceResults.sort((a, b) => a.distance - b.distance);
        
        // Debug: Show sorted results
        this.log(`📊 Classement par distance:`);
        distanceResults.forEach((result, index) => {
            const marker = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            this.log(`  ${marker} ${result.poi.name}: ${result.distanceInMeters}m`);
        });

        if (closestPOI) {
            const distanceInMeters = Math.round(minDistance * 1000);
            this.log(`🎯 POI le plus proche sélectionné: ${closestPOI.name} (${distanceInMeters}m)`);
        } else {
            this.log(`❌ Aucun POI trouvé lors du calcul`);
        }

        return closestPOI;
    }

    calculateStraightLineDistance(pos1, pos2) {
        const [lat1, lon1] = pos1;
        const [lat2, lon2] = pos2;
        
        // Haversine formula for more accurate distance calculation
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in km
    }

    previewStartOption(option) {
        if (option === 'first') {
            const firstPOI = this.guidanceState.tourSequence[0];
            if (firstPOI) {
                this.log(`📍 Point de départ sélectionné: POI #1 - ${firstPOI.name} (vous irez directement à ce POI)`);
            }
        } else {
            this.log(`🔍 Aperçu: Recherche du POI le plus proche...`);
            const closestPOI = this.findClosestPOIFast();
            if (closestPOI) {
                // Distance calculation and logging already done in findClosestPOIFast
                this.log(`📍 Point de départ sélectionné: POI le plus proche - ${closestPOI.name} (vous irez directement à ce POI)`);
            } else {
                this.log(`❌ Aucun POI proche trouvé`);
            }
        }
    }

    // Tour Management Methods
    async startTour() {
        if (this.guidanceState.tourActive) {
            this.log('⚠️ Visite déjà en cours');
            return;
        }

        this.log('🚀 Démarrage de la visite guidée des remparts');
        
        // Determine starting POI
        const startingPOI = this.determineStartingPOI();
        if (!startingPOI) {
            this.log('❌ Aucun POI trouvé pour démarrer la visite');
            return;
        }

        // Find the starting step in the tour sequence
        const startingStep = this.findPOIStepInTour(startingPOI.id);
        if (startingStep === -1) {
            this.log('❌ POI de départ introuvable dans la séquence');
            return;
        }

        // Reset tour state
        this.guidanceState.tourActive = true;
        this.guidanceState.isOnTour = true;
        
        const startOption = document.getElementById('startOption')?.value || 'closest';
        
        // Both options should go TO the selected starting POI first
        this.guidanceState.currentTourStep = startingStep;
        
        if (startOption === 'first') {
            this.log(`📍 Point de départ choisi: POI #1 - Direction vers ${startingPOI.name}`);
        } else {
            this.log(`📍 Point de départ choisi: POI le plus proche - Direction vers ${startingPOI.name}`);
        }
        
        // Update UI
        document.getElementById('startTourBtn').style.display = 'none';
        document.getElementById('stopTourBtn').style.display = 'inline-block';
        document.getElementById('tourProgress').style.display = 'block';
        
        // Start guidance to target POI
        await this.navigateToNextPOI();
        
        const targetPOI = this.guidanceState.tourSequence[this.guidanceState.currentTourStep];
        this.log(`✅ Visite démarrée - Direction: ${targetPOI.name} (Étape ${this.guidanceState.currentTourStep + 1}/${this.guidanceState.tourSequence.length})`);
    }

    async navigateToNextPOI() {
        const nextPOI = this.guidanceState.tourSequence[this.guidanceState.currentTourStep];
        
        if (!nextPOI) {
            this.completeTour();
            return;
        }

        // Set guidance service based on tour status
        this.setGuidanceService('guided-tour');
        this.updateGuidanceState({
            targetPOI: nextPOI,
            isOnTour: true
        });

        // Calculate and display route
        await this.calculateAndDisplayRoute(nextPOI);
        
        // Update progress display
        this.updateTourProgress();
        
        this.log(`🧭 Navigation vers: ${nextPOI.name} (Étape ${this.guidanceState.currentTourStep + 1}/${this.guidanceState.tourSequence.length})`);
    }

    completeTour() {
        this.log('🎉 Visite des remparts terminée!');
        this.stopTour();
    }

    stopTour() {
        this.guidanceState.tourActive = false;
        this.guidanceState.isOnTour = false;
        this.setGuidanceService(null);
        
        // Reset race condition flags
        this.processingPOIReached = false;
        this.lastDeviationCheck = 0;
        
        // Clear route
        this.clearRoute();
        
        // Update UI
        document.getElementById('startTourBtn').style.display = 'inline-block';
        document.getElementById('stopTourBtn').style.display = 'none';
        document.getElementById('tourProgress').style.display = 'none';
        
        // Stop simulation if running
        if (this.isSimulating) {
            this.stopWalkingSimulation();
        }
        
        this.log('🛑 Visite arrêtée');
    }

    updateTourProgress() {
        const currentDestElement = document.getElementById('currentDestination');
        const stepElement = document.getElementById('tourStepProgress');
        const progressFill = document.getElementById('progressFill');

        if (currentDestElement && this.guidanceState.targetPOI) {
            currentDestElement.textContent = this.guidanceState.targetPOI.name;
        }

        if (stepElement) {
            const current = this.guidanceState.currentTourStep + 1;
            const total = this.guidanceState.tourSequence.length;
            stepElement.textContent = `${current}/${total}`;
        }

        if (progressFill) {
            const progress = ((this.guidanceState.currentTourStep + 1) / this.guidanceState.tourSequence.length) * 100;
            progressFill.style.width = `${progress}%`;
        }
    }

    // Check if user has reached current POI and advance tour
    checkPOIReached() {
        if (!this.guidanceState.tourActive || !this.guidanceState.targetPOI) return;

        const targetPOI = this.guidanceState.targetPOI;
        let isReached = false;
        let reachMethod = '';
        
        // Method 1: Direct proximity to POI coordinates
        const directDistance = this.calculateDistance(this.currentPosition, [targetPOI.lat, targetPOI.lon]);
        const proximityRadius = (targetPOI.proximityRadius || 30) / 111320; // Convert meters to degrees
        
        // Debug: Log current checking
        const directDistanceMeters = Math.round(directDistance * 111320);
        this.log(`🔍 Vérification POI ${targetPOI.name}: distance directe = ${directDistanceMeters}m (seuil: 30m)`);
        
        if (directDistance < proximityRadius) {
            isReached = true;
            reachMethod = 'direct proximity';
        }
        
        // Method 2: End of route detection (for inaccessible POIs)
        if (!isReached && this.currentRoute) {
            const routeCoords = this.currentRoute.getLatLngs();
            if (routeCoords.length > 0) {
                // Check if user is near the end of the calculated route
                const routeEnd = routeCoords[routeCoords.length - 1];
                const distanceToRouteEnd = this.calculateDistance(
                    this.currentPosition,
                    [routeEnd.lat, routeEnd.lng]
                );
                
                const distanceToRouteEndMeters = Math.round(distanceToRouteEnd * 111320);
                this.log(`🔍 Distance à la fin de route: ${distanceToRouteEndMeters}m (seuil: 20m)`);
                
                // Consider POI reached if within 20 meters of route end
                const routeEndRadius = 20 / 111320; // 20 meters in degrees
                
                if (distanceToRouteEnd < routeEndRadius) {
                    // For route end detection, use a more generous safety check (200m instead of 100m)
                    // This accounts for POIs inside buildings or inaccessible areas
                    const maxPOIDistance = 200 / 111320; // 200 meters in degrees
                    
                    if (directDistance < maxPOIDistance) {
                        isReached = true;
                        reachMethod = 'route end';
                        this.log(`📍 POI considéré atteint via fin de route (${Math.round(directDistance * 111320)}m du POI exact)`);
                    } else {
                        this.log(`⚠️ Près de la fin de route mais trop loin du POI (${directDistanceMeters}m > 200m)`);
                    }
                } else {
                    this.log(`🔍 Pas encore à la fin de route`);
                }
            }
        }
        
        // Method 3: Extended proximity for difficult-to-reach POIs
        if (!isReached) {
            // Increase extended radius to 120m for very difficult POIs
            const extendedRadius = 120 / 111320; // 120 meters in degrees
            if (directDistance < extendedRadius) {
                isReached = true;
                reachMethod = 'extended proximity';
                this.log(`📍 POI atteint via proximité étendue (${directDistanceMeters}m < 120m)`);
            }
        }
        
        if (isReached) {
            this.log(`🎯 POI détecté: ${targetPOI.name} (méthode: ${reachMethod})`);
            
            // Prevent multiple POI reached events
            if (this.processingPOIReached) {
                this.log('⚠️ POI reached event already processing, skipping...');
                return;
            }
            this.processingPOIReached = true;
            
            // For route end or extended proximity, ask for user confirmation
            if (reachMethod === 'route end' || reachMethod === 'extended proximity') {
                this.showPOIConfirmationDialog(targetPOI, reachMethod, directDistanceMeters);
            } else {
                // Direct proximity - automatic confirmation
                this.confirmPOIReached(targetPOI, reachMethod);
            }
        } else {
            // Debug: Log why POI wasn't reached
        }
    }

    showPOIConfirmationDialog(targetPOI, reachMethod, distanceMeters) {
        // Create modal dialog
        const modalHtml = `
            <div id="poiConfirmationModal" class="poi-confirmation-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🎯 Confirmation de visite</h3>
                    </div>
                    <div class="modal-body">
                        <p><strong>${targetPOI.name}</strong></p>
                        <p class="poi-description">${targetPOI.description}</p>
                        <div class="detection-info">
                            <p><small>📍 Distance: ${distanceMeters}m</small></p>
                            <p><small>🔍 Détection: ${reachMethod === 'route end' ? 'Fin de route' : 'Proximité étendue'}</small></p>
                        </div>
                        <p class="confirmation-question">Avez-vous visité ce point d'intérêt ?</p>
                    </div>
                    <div class="modal-actions">
                        <button id="confirmPOIYes" class="confirm-btn yes-btn">✅ Oui, continuer</button>
                        <button id="confirmPOINo" class="confirm-btn no-btn">❌ Non, pas encore</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add event listeners
        document.getElementById('confirmPOIYes').addEventListener('click', () => {
            this.removePOIConfirmationDialog();
            this.confirmPOIReached(targetPOI, reachMethod);
        });

        document.getElementById('confirmPOINo').addEventListener('click', () => {
            this.removePOIConfirmationDialog();
            this.processingPOIReached = false; // Reset flag to allow future checks
            this.log(`❌ Utilisateur n'a pas confirmé la visite de ${targetPOI.name}`);
        });

        this.log(`❓ Demande de confirmation pour ${targetPOI.name} (${reachMethod})`);
    }

    removePOIConfirmationDialog() {
        const modal = document.getElementById('poiConfirmationModal');
        if (modal) {
            modal.remove();
        }
    }

    confirmPOIReached(targetPOI, reachMethod) {
        this.log(`🎯 POI confirmé: ${targetPOI.name} (méthode: ${reachMethod})`);
        
        // Mark current POI as visited
        this.guidanceState.currentPOI = targetPOI;
        
        // Advance to next POI in sequence (with wraparound)
        const nextStep = (this.guidanceState.currentTourStep + 1) % this.guidanceState.tourSequence.length;
        this.guidanceState.currentTourStep = nextStep;
        
        this.log(`📈 Tour avancé à l'étape ${nextStep + 1}/${this.guidanceState.tourSequence.length}`);
        
        // Check if we completed the full tour
        if (this.guidanceState.currentTourStep === 0 && this.guidanceState.currentPOI) {
            // We've completed the full circle
            this.log('🎉 Tour complet terminé! Retour au point de départ.');
            setTimeout(() => {
                this.processingPOIReached = false;
                this.completeTour();
            }, 3000);
            return;
        }
        
        // Move to next POI
        setTimeout(() => {
            this.navigateToNextPOI();
            this.refreshPOIList(); // Update POI visual status
            this.processingPOIReached = false; // Reset flag
        }, 2000); // 2 second delay before next POI
    }

    refreshPOIList() {
        const poiListContainer = document.getElementById('poiList');
        if (poiListContainer) {
            // Update the inner HTML with new POI status
            const existingContent = poiListContainer.innerHTML;
            const headerMatch = existingContent.match(/<h4>.*?<\/h4>/);
            const header = headerMatch ? headerMatch[0] : '<h4>📋 Points d\'Intérêt de la Visite</h4>';
            poiListContainer.innerHTML = header + this.renderPOIList();
        }
    }

    // Walking Simulation Methods (separate from guidance)
    async startTourSimulation() {
        if (!this.guidanceState.tourActive) {
            this.log('⚠️ Démarrez d\'abord la visite avant la simulation');
            return;
        }

        if (this.isSimulating) {
            this.log('⚠️ Simulation déjà en cours');
            return;
        }

        if (!this.currentRoute) {
            this.log('❌ Aucune route active pour la simulation');
            return;
        }

        // Get route coordinates
        const routeCoords = this.currentRoute.getLatLngs();
        
        if (routeCoords.length === 0) {
            this.log('❌ Aucune coordonnée de route disponible');
            return;
        }

        this.isSimulating = true;
        this.simulationStep = 0;
        this.simulationCoords = routeCoords;
        this.simulationTargetPOI = this.guidanceState.targetPOI; // Set target POI for simulation
        
        // Update UI
        document.getElementById('walkingSimulationStatus').textContent = 'Oui';
        document.getElementById('stopWalkingSimulationBtn').style.display = 'inline-block';
        
        this.log(`🚶 Démarrage simulation de marche vers ${this.simulationTargetPOI?.name || 'destination'} - La visite guidée continuera automatiquement`);
        
        // Start simulation with 300ms intervals (faster for tour simulation)
        this.simulationInterval = setInterval(() => {
            this.stepWalkingSimulation();
        }, 300);
    }

    async startWalkingSimulation(poiId) {
        // This method is kept for backward compatibility with debug mode
        // But now it just starts tour simulation if tour is active
        if (this.guidanceState.tourActive) {
            return this.startTourSimulation();
        }

        const numericPoiId = parseInt(poiId);
        const targetPOI = this.pois.find(p => p.id === numericPoiId);
        
        if (!targetPOI) {
            this.log(`❌ POI cible introuvable pour simulation: ${poiId}`);
            return;
        }

        if (!this.currentRoute) {
            this.log('❌ Aucune route active - Démarrez d\'abord la visite');
            return;
        }

        return this.startTourSimulation();
    }

    stepWalkingSimulation() {
        if (!this.isSimulating || this.simulationStep >= this.simulationCoords.length) {
            this.log(`🏁 Simulation terminée - position finale atteinte (étape ${this.simulationStep}/${this.simulationCoords.length})`);
            this.stopWalkingSimulation();
            return;
        }
        
        const currentCoord = this.simulationCoords[this.simulationStep];
        const position = [currentCoord.lat, currentCoord.lng];
        
        // Debug: Log final few positions
        if (this.simulationStep >= this.simulationCoords.length - 5) {
            this.log(`🚶 Position simulation ${this.simulationStep + 1}/${this.simulationCoords.length}: ${position[0].toFixed(6)}, ${position[1].toFixed(6)}`);
        }
        
        // Only update position - let the guidance system react
        this.updateUserPosition(position);
        
        // Update progress in guidance state
        const progress = Math.round((this.simulationStep / this.simulationCoords.length) * 100);
        this.updateGuidanceState({ routeProgress: progress });
        
        // Check for deviation (let guidance system handle it)
        this.checkForDeviation();
        
        this.simulationStep++;
        
        if (this.simulationStep % 20 === 0) { // Log every 20 steps
            const targetName = this.simulationTargetPOI?.name || 'destination';
            this.log(`🚶 Marche simulée: ${progress}% du trajet vers ${targetName}`);
        }
    }

    stopWalkingSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        this.isSimulating = false;
        this.simulationTargetPOI = null;
        
        // Update UI
        document.getElementById('walkingSimulationStatus').textContent = 'Non';
        document.getElementById('stopWalkingSimulationBtn').style.display = 'none';
        
        this.log('🛑 Simulation de marche arrêtée');
    }

    // Guidance State Management Methods
    setGuidanceService(serviceName) {
        this.activeGuidanceService = serviceName;
        this.updateGuidanceDisplay();
        
        const serviceNames = {
            'guided-tour': 'Visite Guidée',
            'back-on-track': 'Retour sur Route',
            'simulating': 'Simulation',
            null: 'Aucun'
        };
        
        this.log(`🧭 Service de guidage activé: ${serviceNames[serviceName] || serviceName}`);
    }

    updateGuidanceState(newState) {
        this.guidanceState = { ...this.guidanceState, ...newState };
        this.updateGuidanceDisplay();
    }

    updateGuidanceDisplay() {
        const serviceElement = document.getElementById('activeGuidanceService');
        const stateElement = document.getElementById('guidanceStateDisplay');
        const targetElement = document.getElementById('targetPOIDisplay');
        const tourTypeElement = document.getElementById('tourTypeDisplay');
        const tourStepElement = document.getElementById('tourStepDisplay');
        const deviationElement = document.getElementById('deviationStatus');
        const progressElement = document.getElementById('routeProgressDisplay');
        const distanceToPOIElement = document.getElementById('distanceToPOI');
        const distanceToRouteEndElement = document.getElementById('distanceToRouteEnd');

        if (serviceElement) {
            const serviceText = {
                'guided-tour': 'Visite Guidée',
                'back-on-track': 'Retour Route',
                'simulating': 'Simulation',
                null: 'Aucun'
            }[this.activeGuidanceService] || 'Inconnu';

            serviceElement.textContent = serviceText;
            serviceElement.className = `value guidance-service ${this.activeGuidanceService || 'none'}`;
        }

        if (stateElement) {
            const state = this.isSimulating ? 'Simulation' : 
                         this.activeGuidanceService ? 'Actif' : 'Inactif';
            stateElement.textContent = state;
        }

        if (targetElement) {
            targetElement.textContent = this.guidanceState.targetPOI ? 
                this.guidanceState.targetPOI.name : 'Aucun';
        }

        // Update distance to POI
        if (distanceToPOIElement && this.guidanceState.targetPOI) {
            const distance = this.calculateDistance(
                this.currentPosition, 
                [this.guidanceState.targetPOI.lat, this.guidanceState.targetPOI.lon]
            );
            const distanceInMeters = Math.round(distance * 111320);
            distanceToPOIElement.textContent = `${distanceInMeters}m`;
            
            // Color code based on proximity
            if (distanceInMeters < 30) {
                distanceToPOIElement.style.color = '#27ae60'; // Green - very close
            } else if (distanceInMeters < 50) {
                distanceToPOIElement.style.color = '#f39c12'; // Orange - close
            } else {
                distanceToPOIElement.style.color = '#e74c3c'; // Red - far
            }
        } else if (distanceToPOIElement) {
            distanceToPOIElement.textContent = '-';
            distanceToPOIElement.style.color = '';
        }

        // Update distance to route end
        if (distanceToRouteEndElement && this.currentRoute) {
            const routeCoords = this.currentRoute.getLatLngs();
            if (routeCoords.length > 0) {
                const routeEnd = routeCoords[routeCoords.length - 1];
                const distanceToEnd = this.calculateDistance(
                    this.currentPosition,
                    [routeEnd.lat, routeEnd.lng]
                );
                const distanceInMeters = Math.round(distanceToEnd * 111320);
                distanceToRouteEndElement.textContent = `${distanceInMeters}m`;
                
                // Color code based on proximity to route end
                if (distanceInMeters < 20) {
                    distanceToRouteEndElement.style.color = '#27ae60'; // Green - at route end
                } else if (distanceInMeters < 50) {
                    distanceToRouteEndElement.style.color = '#f39c12'; // Orange - near route end
                } else {
                    distanceToRouteEndElement.style.color = '#3498db'; // Blue - following route
                }
            } else {
                distanceToRouteEndElement.textContent = '-';
                distanceToRouteEndElement.style.color = '';
            }
        } else if (distanceToRouteEndElement) {
            distanceToRouteEndElement.textContent = '-';
            distanceToRouteEndElement.style.color = '';
        }

        if (tourTypeElement) {
            const tourType = this.guidanceState.isOnTour ? 'Visite Séquentielle' : 
                           this.activeGuidanceService === 'back-on-track' ? 'Hors Séquence' : 'Aucune';
            tourTypeElement.textContent = tourType;
            tourTypeElement.style.color = this.guidanceState.isOnTour ? '#27ae60' : '#e67e22';
        }

        if (tourStepElement) {
            if (this.guidanceState.isOnTour || this.activeGuidanceService === 'back-on-track') {
                const currentStep = this.guidanceState.currentTourStep;
                const totalSteps = this.guidanceState.tourSequence.length;
                tourStepElement.textContent = `${currentStep}/${totalSteps}`;
            } else {
                tourStepElement.textContent = '-';
            }
        }

        if (deviationElement) {
            deviationElement.textContent = this.guidanceState.isDeviated ? 'Oui' : 'Non';
            deviationElement.style.color = this.guidanceState.isDeviated ? '#e74c3c' : '#27ae60';
        }

        if (progressElement) {
            progressElement.textContent = `${Math.round(this.guidanceState.routeProgress)}%`;
        }
    }

    // Simulate route deviation detection
    checkForDeviation() {
        if (!this.currentRoute || !this.activeGuidanceService) return;
        
        // Throttle deviation checks to prevent excessive recalculations
        const now = Date.now();
        if (now - this.lastDeviationCheck < 1000) { // Only check once per second
            return;
        }
        this.lastDeviationCheck = now;
        
        // Don't check for deviation if we're processing a POI reached event
        if (this.processingPOIReached) {
            return;
        }

        // Find closest point on route
        const routeCoords = this.currentRoute.getLatLngs();
        if (routeCoords.length === 0) return;

        let minDistance = Infinity;
        for (const coord of routeCoords) {
            const distance = this.calculateDistance(
                this.currentPosition,
                [coord.lat, coord.lng]
            );
            minDistance = Math.min(minDistance, distance);
        }

        // If more than 50 meters from route, consider deviated
        const isDeviated = minDistance > 0.0005; // ~50 meters in decimal degrees

        if (isDeviated && !this.guidanceState.isDeviated) {
            // Switch to BackOnTrack service
            this.setGuidanceService('back-on-track');
            this.updateGuidanceState({ 
                isDeviated: true,
                isOnTour: false 
            });
            this.log('⚠️ Déviation détectée - Tentative de retour sur le circuit');
            
            // Recalculate route back to tour
            if (this.guidanceState.tourActive && this.guidanceState.targetPOI) {
                this.calculateAndDisplayRoute(this.guidanceState.targetPOI);
            }
            
        } else if (!isDeviated && this.guidanceState.isDeviated) {
            // Back on route - return to GuidedTour if on tour
            if (this.guidanceState.tourActive) {
                this.setGuidanceService('guided-tour');
                this.updateGuidanceState({ 
                    isDeviated: false,
                    isOnTour: true 
                });
                this.log('✅ Retour sur le circuit - Reprise de la visite guidée');
                
                // Don't recalculate route - we're already on the correct route
                // The existing route should still be valid
            }
        }
    }

    calculateDistance(pos1, pos2) {
        const [lat1, lon1] = pos1;
        const [lat2, lon2] = pos2;
        return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM loaded, initializing Simplified Enhanced App...');
    
    window.app = new SimplifiedEnhancedApp();
    
    try {
        await window.app.init();
    } catch (error) {
        console.error('❌ App startup failed:', error);
    }
});

export { SimplifiedEnhancedApp };
