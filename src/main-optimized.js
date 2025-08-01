// Import all modules following dependency inversion principle
import { ServiceContainer } from './utils/ServiceContainer.js';
import { LocationService } from './services/location/index.js';
import { StorageService } from './services/storage/index.js';
import { AudioService, CameraService, NotificationService } from './services/media/index.js';
import { OSMRoutingService, NavigationService } from './services/routing/index.js';
import { TourManager } from './managers/index.js';
import { MapComponent } from './components/index.js';
import tourData from './data/tourData.json';

// Import Leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Make Leaflet available globally
window.L = L;

// Import styles (modular CSS)
import './styles/main.css';

/**
 * Main Application Class - Simplified and SOLID
 * Single Responsibility: Coordinate application initialization and high-level operations
 * Open/Closed: Extensible through service container
 * Liskov Substitution: Services can be substituted through interfaces
 * Interface Segregation: Uses focused service interfaces
 * Dependency Inversion: Depends on abstractions via service container
 */
class LangresTourApp {
    constructor() {
        this.container = new ServiceContainer();
        this.components = {};
        this.initialized = false;
    }

    /**
     * Initialize the application (KISS - simple startup)
     */
    async init() {
        if (this.initialized) return;

        try {
            console.log('🏰 Langres Tour App initializing...');
            
            await this.registerServices();
            await this.setupUI();
            await this.initializeComponents();
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('🏰 Langres Tour App ready!');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Erreur lors du chargement de l\'application');
        }
    }

    /**
     * Register all services with dependency injection (Dependency Inversion)
     */
    async registerServices() {
        // Core services
        this.container.register('location', () => new LocationService());
        this.container.register('storage', () => new StorageService());
        this.container.register('audio', () => new AudioService());
        this.container.register('notification', () => new NotificationService());
        
        // Camera service depends on storage
        this.container.register('camera', (container) => 
            new CameraService(container.get('storage')));
        
        // Routing services
        this.container.register('osmRouting', () => new OSMRoutingService());
        this.container.register('navigation', (container) =>
            new NavigationService(
                container.get('osmRouting'),
                container.get('location'),
                container.get('audio')
            ));
        
        // Tour manager depends on multiple services
        this.container.register('tour', (container) => 
            new TourManager(
                container.get('location'),
                container.get('storage'),
                container.get('audio'),
                container.get('notification'),
                tourData
            ));
    }

    /**
     * Setup UI (Single Responsibility)
     */
    async setupUI() {
        const appContainer = document.getElementById('app');
        if (!appContainer) {
            throw new Error('App container not found');
        }

        appContainer.innerHTML = `
            <div class="app-container">
                <header class="app-header">
                    <h1>🏰 Tour des Remparts de Langres</h1>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <span id="progress-text">0/21 découverts</span>
                    </div>
                </header>
                
                <div id="map" class="map-container"></div>
                
                <div class="bottom-panel">
                    <div class="next-poi" id="next-poi">
                        <span>Prochain: <strong id="next-poi-name">-</strong></span>
                        <span id="next-poi-distance">-</span>
                    </div>
                    
                    <div class="controls">
                        <button id="audio-toggle" class="btn-control" title="Audio">🔊</button>
                        <button id="camera-btn" class="btn-camera" title="Photo">📷</button>
                        <button id="gps-toggle" class="btn-control" title="GPS Mode">📍</button>
                        <button id="debug-btn" class="btn-control" title="Debug">🔧</button>
                        <button id="reset-tour" class="btn-control" title="Reset">🔄</button>
                    </div>
                </div>
                
                <div id="gps-simulator" class="gps-simulator hidden">
                    <div class="simulator-header">
                        <h3>📍 GPS</h3>
                        <button id="close-simulator" class="btn-close-sim">✕</button>
                    </div>
                    <div class="simulator-content">
                        <div class="position-info">
                            <span id="sim-coords">47.8625, 5.3350</span>
                        </div>
                        <div class="movement-controls">
                            <div class="circular-controller">
                                <div class="direction-pad">
                                    <button class="direction-btn north" data-lat="0.0001" data-lon="0">⬆</button>
                                    <button class="direction-btn northeast" data-lat="0.0001" data-lon="0.0001">⬈</button>
                                    <button class="direction-btn east" data-lat="0" data-lon="0.0001">➡</button>
                                    <button class="direction-btn southeast" data-lat="-0.0001" data-lon="0.0001">⬊</button>
                                    <button class="direction-btn south" data-lat="-0.0001" data-lon="0">⬇</button>
                                    <button class="direction-btn southwest" data-lat="-0.0001" data-lon="-0.0001">⬋</button>
                                    <button class="direction-btn west" data-lat="0" data-lon="-0.0001">⬅</button>
                                    <button class="direction-btn northwest" data-lat="0.0001" data-lon="-0.0001">⬉</button>
                                    <button class="center-btn" onclick="window.app.centerOnLangres()">🎯</button>
                                </div>
                            </div>
                        </div>
                        <div class="quick-teleport">
                            <select id="poi-teleport">
                                <option value="">-- POI --</option>
                            </select>
                            <button id="teleport-btn">🚀</button>
                        </div>
                    </div>
                </div>
                
                <div id="poi-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 id="modal-title"></h2>
                            <span class="close">&times;</span>
                        </div>
                        <div id="poi-details" class="modal-body"></div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize components (Single Responsibility)
     */
    async initializeComponents() {
        // Initialize map component
        this.components.map = new MapComponent(
            'map', 
            this.container.get('location'), 
            this.container.get('tour'),
            this.container.get('osmRouting')
        );
        await this.components.map.initialize();
        
        // Setup tour callbacks
        this.container.get('tour').addProgressCallback((event, data) => {
            this.handleTourEvent(event, data);
        });
        
        // Start location tracking
        this.startLocationTracking();
        this.populatePOITeleportList();
        this.updateUI();
    }

    /**
     * Handle tour events (Single Responsibility)
     */
    handleTourEvent(event, data) {
        switch(event) {
            case 'poi_discovered':
                this.components.map.updatePOIMarker(data.id, true);
                this.updateUI();
                break;
            case 'tour_reset':
                this.components.map.resetMarkers();
                this.updateUI();
                break;
        }
    }

    /**
     * Setup event listeners (KISS - simple event handling)
     */
    setupEventListeners() {
        // Audio toggle
        document.getElementById('audio-toggle').addEventListener('click', () => {
            const isEnabled = this.container.get('audio').toggle();
            document.getElementById('audio-toggle').textContent = isEnabled ? '🔊' : '🔇';
        });

        // Camera button
        document.getElementById('camera-btn').addEventListener('click', () => {
            this.takePictureAtCurrentLocation();
        });

        // GPS toggle
        document.getElementById('gps-toggle').addEventListener('click', () => {
            this.toggleGPSMode();
        });

        // Debug button
        document.getElementById('debug-btn').addEventListener('click', () => {
            this.showDebugInfo();
        });

        // Reset tour
        document.getElementById('reset-tour').addEventListener('click', () => {
            if (confirm('Recommencer le tour ? Tous les progrès seront perdus.')) {
                this.container.get('tour').resetTour();
            }
        });

        // GPS simulator controls
        this.setupGPSSimulatorControls();

        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('poi-modal').classList.add('hidden');
        });
    }

    /**
     * GPS Simulator controls (Single Responsibility)
     */
    setupGPSSimulatorControls() {
        let moveInterval = null;
        
        const startMovement = (deltaLat, deltaLon) => {
            if (moveInterval) clearInterval(moveInterval);
            
            // Immediate first move
            this.container.get('location').moveSimulatedPosition(deltaLat, deltaLon);
            this.updateSimulatorDisplay();
            
            // Continue moving every 200ms while held
            moveInterval = setInterval(() => {
                this.container.get('location').moveSimulatedPosition(deltaLat, deltaLon);
                this.updateSimulatorDisplay();
            }, 200);
        };
        
        const stopMovement = () => {
            if (moveInterval) {
                clearInterval(moveInterval);
                moveInterval = null;
            }
        };
        
        // Direction buttons
        document.querySelectorAll('.direction-btn').forEach(btn => {
            if (btn.dataset.lat !== undefined) {
                const deltaLat = parseFloat(btn.dataset.lat);
                const deltaLon = parseFloat(btn.dataset.lon);
                
                // Mouse and touch events
                ['mousedown', 'touchstart'].forEach(event => {
                    btn.addEventListener(event, (e) => {
                        e.preventDefault();
                        startMovement(deltaLat, deltaLon);
                    });
                });
                
                ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(event => {
                    btn.addEventListener(event, (e) => {
                        e.preventDefault();
                        stopMovement();
                    });
                });
            }
        });

        // Close simulator
        document.getElementById('close-simulator').addEventListener('click', () => {
            stopMovement();
            document.getElementById('gps-simulator').classList.add('hidden');
        });

        // Teleport functionality
        document.getElementById('teleport-btn').addEventListener('click', () => {
            const select = document.getElementById('poi-teleport');
            const poiId = parseInt(select.value);
            if (poiId) {
                const poi = this.container.get('tour').getPOI(poiId);
                if (poi) {
                    this.container.get('location').setSimulatedPosition(poi.lat, poi.lon);
                    this.updateSimulatorDisplay();
                }
            }
        });
    }

    /**
     * Start location tracking (Single Responsibility)
     */
    startLocationTracking() {
        this.container.get('location').startWatching((position) => {
            this.container.get('tour').checkProximity(
                position.coords.latitude, 
                position.coords.longitude
            );
            this.updateNextPOIDistance(position.coords.latitude, position.coords.longitude);
        });
    }

    /**
     * Update UI elements (Single Responsibility)
     */
    updateUI() {
        const progress = this.container.get('tour').getTourProgress();
        document.getElementById('progress-text').textContent = 
            `${progress.visited}/${progress.total} découverts`;
        document.getElementById('progress-fill').style.width = `${progress.percentage}%`;
        
        if (progress.visited > 0 && !progress.startTime) {
            this.container.get('tour').startTour();
        }
    }

    updateNextPOIDistance(userLat, userLon) {
        const nextPOI = this.container.get('tour').getNextPOI();
        if (nextPOI) {
            const distance = this.container.get('location').calculateDistance(
                userLat, userLon, nextPOI.lat, nextPOI.lon
            );
            document.getElementById('next-poi-name').textContent = nextPOI.name;
            document.getElementById('next-poi-distance').textContent = `${Math.round(distance)}m`;
        } else {
            document.getElementById('next-poi-name').textContent = 'Tour terminé!';
            document.getElementById('next-poi-distance').textContent = '🎉';
        }
    }

    updateSimulatorDisplay() {
        const coords = this.container.get('location').simulatedPosition.coords;
        document.getElementById('sim-coords').textContent = 
            `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    }

    populatePOITeleportList() {
        const select = document.getElementById('poi-teleport');
        const pois = this.container.get('tour').getAllPOIs();
        
        pois.forEach(poi => {
            const option = document.createElement('option');
            option.value = poi.id;
            option.textContent = `${poi.order}. ${poi.name}`;
            select.appendChild(option);
        });
    }

    // Public API methods (Interface Segregation)
    showPOIDetails(poiId) {
        const poi = this.container.get('tour').getPOI(poiId);
        const photos = this.container.get('camera').getPhotosForPOI(poiId);
        
        document.getElementById('modal-title').textContent = poi.name;
        document.getElementById('poi-details').innerHTML = `
            <div class="poi-content">
                <p><strong>Description:</strong> ${poi.description}</p>
                <p><strong>Détails:</strong> ${poi.details}</p>
                <p><small><strong>Source:</strong> ${poi.source}</small></p>
                
                <div class="poi-actions" style="display: flex; gap: 0.5rem; margin: 1rem 0;">
                    <button onclick="window.app.container.get('camera').takePicture(${poi.id}).then(r => r.success && window.app.updateUI())" style="flex: 1; padding: 0.75rem; border: none; border-radius: 6px; background: #e74c3c; color: white; cursor: pointer;">
                        📷 Prendre une photo
                    </button>
                    <button onclick="window.app.container.get('audio').speak('${poi.details.replace(/'/g, "\\'")}')" style="flex: 1; padding: 0.75rem; border: none; border-radius: 6px; background: #f39c12; color: white; cursor: pointer;">
                        🔊 Écouter les détails
                    </button>
                </div>
                
                ${photos.length > 0 ? `
                    <div class="poi-photos">
                        <h4>Vos photos (${photos.length})</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.5rem; margin-top: 0.5rem;">
                            ${photos.map(photo => `
                                <img src="${photo.data}" alt="Photo du POI" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; cursor: pointer;">
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        document.getElementById('poi-modal').classList.remove('hidden');
    }

    simulateDiscovery(poiId) {
        this.container.get('tour').simulatePOIDiscovery(poiId);
    }

    async takePictureAtCurrentLocation() {
        try {
            const position = await this.container.get('location').getCurrentPosition();
            const nearestPOI = this.findNearestPOI(position.coords.latitude, position.coords.longitude);
            
            if (nearestPOI && nearestPOI.distance <= 100) {
                const result = await this.container.get('camera').takePicture(nearestPOI.poi.id);
                if (result.success) {
                    this.container.get('notification').showInAppNotification({
                        id: 0,
                        name: 'Photo sauvegardée',
                        description: `Photo de ${nearestPOI.poi.name} ajoutée à votre collection`
                    });
                }
            } else {
                alert('Vous devez être près d\'un point d\'intérêt pour prendre une photo.');
            }
        } catch (error) {
            console.error('Photo error:', error);
        }
    }

    findNearestPOI(userLat, userLon) {
        let nearest = null;
        let minDistance = Infinity;

        this.container.get('tour').getAllPOIs().forEach(poi => {
            const distance = this.container.get('location').calculateDistance(
                userLat, userLon, poi.lat, poi.lon
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearest = { poi, distance };
            }
        });

        return nearest;
    }

    showDebugInfo() {
        const progress = this.container.get('tour').getTourProgress();
        const photos = this.container.get('storage').getPhotos();
        const gpsMode = this.container.get('location').simulatedMode ? 'Simulé' : 'Réel';
        const currentPos = this.container.get('location').currentPosition;
        
        alert(`🔧 Debug Info:
        
📊 Progrès: ${progress.visited}/${progress.total} (${progress.percentage}%)
📷 Photos: ${photos.length}
🕒 Début: ${progress.startTime ? new Date(progress.startTime).toLocaleString() : 'Non commencé'}
🔊 Audio: ${this.container.get('audio').isEnabled ? 'Activé' : 'Désactivé'}
📍 GPS: ${gpsMode} ${currentPos ? `(${currentPos.coords.latitude.toFixed(4)}, ${currentPos.coords.longitude.toFixed(4)})` : '(Inactif)'}

🗺️ Architecture SOLID activée ✅
📁 Services modulaires: ${this.container.services.size}
        
💡 Nouvelle architecture appliquée !`);
    }

    toggleGPSMode() {
        const gpsToggle = document.getElementById('gps-toggle');
        const simulator = document.getElementById('gps-simulator');
        const locationService = this.container.get('location');
        
        if (locationService.simulatedMode) {
            // Switch to real GPS
            locationService.disableSimulatedMode();
            gpsToggle.classList.remove('simulated');
            gpsToggle.title = 'GPS Mode: Réel';
            simulator.classList.add('hidden');
            
            // Restart location tracking with real GPS
            locationService.stopWatching();
            this.startLocationTracking();
        } else {
            // Switch to simulated GPS
            locationService.enableSimulatedMode();
            gpsToggle.classList.add('simulated');
            gpsToggle.title = 'GPS Mode: Simulé';
            simulator.classList.remove('hidden');
            
            // Start with simulated position
            this.startLocationTracking();
            this.updateSimulatorDisplay();
        }
    }

    centerOnLangres() {
        this.container.get('location').setSimulatedPosition(47.8625, 5.3350);
        this.updateSimulatorDisplay();
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'notification-popup';
        errorDiv.innerHTML = `
            <div class="notification-content" style="border-left-color: #e74c3c;">
                <h3>❌ Erreur</h3>
                <p>${message}</p>
                <button onclick="this.parentElement.parentElement.remove()" class="btn-close" style="width: 100%; margin-top: 1rem;">OK</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 10000);
    }
}

// Initialize the application when DOM is ready
window.addEventListener('DOMContentLoaded', async () => {
    window.app = new LangresTourApp();
    await window.app.init();
});

export default LangresTourApp;