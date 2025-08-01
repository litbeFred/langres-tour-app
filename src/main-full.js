// Complete Langres Tour Application - Cycle 2
// SOLID Architecture with all enhanced features

import tourData from './data/tourData.json';

console.log('🏰 Langres Tour App loading...');

// ========== SERVICES (SOLID Single Responsibility) ==========

class LocationService {
    constructor() {
        this.watchId = null;
        this.currentPosition = null;
        this.callbacks = [];
        this.simulatedMode = false;
        this.simulatedPosition = {
            coords: {
                latitude: 47.8625,  // Start at Langres center
                longitude: 5.3350,
                accuracy: 10
            },
            timestamp: Date.now()
        };
    }

    enableSimulatedMode() {
        this.simulatedMode = true;
        console.log('📍 Simulated GPS mode enabled');
    }

    disableSimulatedMode() {
        this.simulatedMode = false;
        console.log('📍 Real GPS mode enabled');
    }

    setSimulatedPosition(lat, lon) {
        this.simulatedPosition.coords.latitude = lat;
        this.simulatedPosition.coords.longitude = lon;
        this.simulatedPosition.timestamp = Date.now();
        
        if (this.simulatedMode) {
            this.currentPosition = this.simulatedPosition;
            this.callbacks.forEach(cb => cb(this.simulatedPosition));
        }
    }

    moveSimulatedPosition(deltaLat, deltaLon) {
        this.setSimulatedPosition(
            this.simulatedPosition.coords.latitude + deltaLat,
            this.simulatedPosition.coords.longitude + deltaLon
        );
    }

    async getCurrentPosition() {
        if (this.simulatedMode) {
            return Promise.resolve(this.simulatedPosition);
        }
        
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
        });
    }

    startWatching(callback) {
        this.callbacks.push(callback);
        
        if (this.simulatedMode) {
            // In simulated mode, just call the callback with current position
            this.currentPosition = this.simulatedPosition;
            callback(this.simulatedPosition);
            return;
        }
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = position;
                this.callbacks.forEach(cb => cb(position));
            },
            (error) => console.error('GPS Error:', error),
            { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
        );
    }

    stopWatching() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }
}

class StorageService {
    constructor() {
        this.storageKey = 'langres_tour_data';
        this.photosKey = 'langres_photos';
    }

    saveTourProgress(progress) {
        localStorage.setItem(this.storageKey, JSON.stringify(progress));
    }

    getTourProgress() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : { 
            visitedPOIs: [], 
            photos: [], 
            startTime: null,
            lastVisitTime: null 
        };
    }

    savePhoto(poiId, photoData) {
        const photos = this.getPhotos();
        photos.push({
            id: Date.now(),
            poiId,
            timestamp: new Date().toISOString(),
            data: photoData
        });
        localStorage.setItem(this.photosKey, JSON.stringify(photos));
    }

    getPhotos() {
        const data = localStorage.getItem(this.photosKey);
        return data ? JSON.parse(data) : [];
    }

    clearAll() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.photosKey);
    }
}

class AudioService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.isEnabled = true;
        this.currentLanguage = 'fr-FR';
        this.availableLanguages = {
            'fr-FR': 'Français',
            'en-US': 'English',
            'de-DE': 'Deutsch',
            'es-ES': 'Español'
        };
        this.voices = [];
        this.init();
    }

    init() {
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => {
                this.voices = this.synth.getVoices();
            };
        }
        this.voices = this.synth.getVoices();
    }

    speak(text, language = this.currentLanguage) {
        if (!this.isEnabled || !this.synth) return;

        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;

        const voice = this.voices.find(v => v.lang.startsWith(language.split('-')[0]));
        if (voice) {
            utterance.voice = voice;
        }

        this.synth.speak(utterance);
    }

    toggle() {
        this.isEnabled = !this.isEnabled;
        if (!this.isEnabled) {
            this.synth.cancel();
        }
        return this.isEnabled;
    }

    stop() {
        this.synth.cancel();
    }
}

class NotificationService {
    constructor() {
        this.permission = null;
        this.init();
    }

    async init() {
        if ('Notification' in window) {
            this.permission = await Notification.requestPermission();
        }
    }

    showPOINotification(poi) {
        this.showInAppNotification(poi);

        if (this.permission === 'granted') {
            new Notification(`Point d'intérêt découvert!`, {
                body: poi.name,
                icon: '/vite.svg',
                badge: '/vite.svg',
                tag: `poi-${poi.id}`,
                requireInteraction: true
            });
        }

        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
    }

    showInAppNotification(poi) {
        const notification = document.createElement('div');
        notification.className = 'notification-popup';
        notification.innerHTML = `
            <div class="notification-content">
                <h3>🏛️ Point d'intérêt découvert!</h3>
                <h4>${poi.name}</h4>
                <p>${poi.description}</p>
                <div class="notification-actions">
                    <button onclick="window.app.showPOIDetails(${poi.id})" class="btn-details">En savoir plus</button>
                    <button onclick="window.app.services.audio.speak('${poi.description.replace(/'/g, "\\'")}')" class="btn-listen">🔊</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-close">✕</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    showProximityAlert(poi, distance) {
        const existing = document.querySelector('.proximity-alert');
        if (existing) existing.remove();

        const alert = document.createElement('div');
        alert.className = 'proximity-alert';
        alert.innerHTML = `
            <div class="alert-content">
                <p>📍 ${poi.name} à ${Math.round(distance)}m</p>
                <button onclick="this.parentElement.parentElement.remove()" class="btn-dismiss">✓</button>
            </div>
        `;
        
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }
}

class CameraService {
    constructor(storageService) {
        this.storageService = storageService;
    }

    async takePicture(poiId) {
        try {
            // Web Camera API fallback
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                });

                return new Promise((resolve) => {
                    const video = document.createElement('video');
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    
                    video.srcObject = stream;
                    video.play();
                    
                    const modal = document.createElement('div');
                    modal.className = 'camera-modal';
                    modal.innerHTML = `
                        <div class="camera-content">
                            <div class="camera-preview"></div>
                            <div class="camera-controls">
                                <button id="capture-btn" class="btn-capture">📷 Capturer</button>
                                <button id="cancel-btn" class="btn-cancel">❌ Annuler</button>
                            </div>
                        </div>
                    `;
                    
                    document.body.appendChild(modal);
                    document.querySelector('.camera-preview').appendChild(video);
                    
                    document.getElementById('capture-btn').onclick = () => {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        context.drawImage(video, 0, 0);
                        
                        const imageData = canvas.toDataURL('image/jpeg', 0.8);
                        this.storageService.savePhoto(poiId, imageData);
                        
                        stream.getTracks().forEach(track => track.stop());
                        modal.remove();
                        
                        resolve({
                            success: true,
                            imageUrl: imageData
                        });
                    };
                    
                    document.getElementById('cancel-btn').onclick = () => {
                        stream.getTracks().forEach(track => track.stop());
                        modal.remove();
                        resolve({ success: false, error: 'Annulé par l\'utilisateur' });
                    };
                });
            } else {
                throw new Error('Camera not available');
            }
        } catch (error) {
            console.error('Camera error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getPhotosForPOI(poiId) {
        return this.storageService.getPhotos().filter(photo => photo.poiId === poiId);
    }
}

// ========== TOUR MANAGER (Business Logic) ==========

class TourManager {
    constructor(locationService, storageService, audioService, notificationService) {
        this.locationService = locationService;
        this.storageService = storageService;
        this.audioService = audioService;
        this.notificationService = notificationService;
        this.pois = tourData;
        this.progress = this.storageService.getTourProgress();
        this.callbacks = [];
        this.proximityAlerts = new Set();
    }

    addProgressCallback(callback) {
        this.callbacks.push(callback);
    }

    checkProximity(userLat, userLon) {
        this.pois.forEach(poi => {
            const distance = this.locationService.calculateDistance(
                userLat, userLon, poi.lat, poi.lon
            );
            
            // Show proximity alert at 100m
            if (distance <= 100 && distance > poi.proximityRadius && !this.proximityAlerts.has(poi.id)) {
                this.notificationService.showProximityAlert(poi, distance);
                this.proximityAlerts.add(poi.id);
            }
            
            // Trigger discovery at proximity radius
            if (distance <= poi.proximityRadius && !this.isPOIVisited(poi.id)) {
                this.triggerPOIDiscovery(poi);
            }
        });
    }

    triggerPOIDiscovery(poi) {
        if (!this.progress.visitedPOIs.includes(poi.id)) {
            this.progress.visitedPOIs.push(poi.id);
            this.progress.lastVisitTime = new Date().toISOString();
            this.storageService.saveTourProgress(this.progress);
            
            this.notificationService.showPOINotification(poi);
            this.audioService.speak(poi.description);
            
            this.callbacks.forEach(callback => callback('poi_discovered', poi));
        }
    }

    simulatePOIDiscovery(poiId) {
        const poi = this.getPOI(poiId);
        if (poi && !this.isPOIVisited(poiId)) {
            this.triggerPOIDiscovery(poi);
        }
    }

    isPOIVisited(poiId) {
        return this.progress.visitedPOIs.includes(poiId);
    }

    getAllPOIs() {
        return this.pois.sort((a, b) => a.order - b.order);
    }

    getPOI(id) {
        return this.pois.find(poi => poi.id === id);
    }

    getNextPOI() {
        const unvisited = this.pois.filter(poi => !this.isPOIVisited(poi.id));
        return unvisited.sort((a, b) => a.order - b.order)[0];
    }

    getTourProgress() {
        return {
            total: this.pois.length,
            visited: this.progress.visitedPOIs.length,
            percentage: Math.round((this.progress.visitedPOIs.length / this.pois.length) * 100),
            startTime: this.progress.startTime,
            lastVisitTime: this.progress.lastVisitTime
        };
    }

    startTour() {
        if (!this.progress.startTime) {
            this.progress.startTime = new Date().toISOString();
            this.storageService.saveTourProgress(this.progress);
        }
    }

    resetTour() {
        this.progress = { visitedPOIs: [], photos: [], startTime: null };
        this.proximityAlerts.clear();
        this.storageService.clearAll();
        this.callbacks.forEach(callback => callback('tour_reset'));
    }
}

// ========== MAP COMPONENT ==========

class MapComponent {
    constructor(containerId, locationService, tourManager) {
        this.containerId = containerId;
        this.locationService = locationService;
        this.tourManager = tourManager;
        this.map = null;
        this.userMarker = null;
        this.poiMarkers = new Map();
        this.directRouteLayer = null;
        this.roadRouteLayer = null;
        this.showDirectRoute = true;
        this.showRoadRoute = false;
    }

    async initialize() {
        // Langres coordinates
        this.map = L.map(this.containerId).setView([47.8625, 5.3350], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            minZoom: 12
        }).addTo(this.map);

        this.addPOIMarkers();
        this.drawHikingRoutes();
        this.addRouteControls();

        this.locationService.startWatching((position) => {
            this.updateUserLocation(position.coords.latitude, position.coords.longitude);
        });
    }

    addPOIMarkers() {
        const pois = this.tourManager.getAllPOIs();
        
        pois.forEach((poi) => {
            const isVisited = this.tourManager.isPOIVisited(poi.id);
            const iconColor = isVisited ? 'green' : 'red';
            
            const marker = L.marker([poi.lat, poi.lon], {
                icon: this.createCustomIcon(iconColor, poi.order)
            })
            .bindPopup(`
                <div class="poi-popup">
                    <h3>${poi.name}</h3>
                    <p>${poi.description}</p>
                    <div style="margin-top: 10px;">
                        <button onclick="window.app.showPOIDetails(${poi.id})" style="margin-right: 5px;">En savoir plus</button>
                        <button onclick="window.app.simulateDiscovery(${poi.id})">Test découverte</button>
                    </div>
                </div>
            `)
            .addTo(this.map);

            this.poiMarkers.set(poi.id, marker);
        });
    }

    createCustomIcon(color, number) {
        return L.divIcon({
            html: `<div class="custom-marker ${color}">${number}</div>`,
            className: 'custom-div-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    }

    updateUserLocation(lat, lon) {
        if (this.userMarker) {
            this.userMarker.setLatLng([lat, lon]);
        } else {
            this.userMarker = L.marker([lat, lon], {
                icon: L.icon({
                    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgZmlsbD0iIzAwN2JmZiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(this.map);
        }
    }

    updatePOIMarker(poiId, visited) {
        const marker = this.poiMarkers.get(poiId);
        if (marker) {
            const poi = this.tourManager.getPOI(poiId);
            const iconColor = visited ? 'green' : 'red';
            marker.setIcon(this.createCustomIcon(iconColor, poi.order));
        }
    }

    resetMarkers() {
        this.poiMarkers.forEach((marker, poiId) => {
            const poi = this.tourManager.getPOI(poiId);
            marker.setIcon(this.createCustomIcon('red', poi.order));
        });
    }

    drawHikingRoutes() {
        const pois = this.tourManager.getAllPOIs();
        this.drawDirectRoute(pois);
        
        // Pedestrian route temporarily disabled
        console.log('� Direct route displayed - pedestrian route disabled for now');
    }

    drawDirectRoute(pois) {
        const coordinates = pois.map(poi => [poi.lat, poi.lon]);
        
        this.directRouteLayer = L.polyline(coordinates, {
            color: '#e74c3c',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 5',
            lineCap: 'round'
        }).addTo(this.map);

        this.directRouteLayer.bindPopup(`
            <div style="text-align: center;">
                <h4>🔴 Ligne directe</h4>
                <p>Distance totale: ~${this.calculateTotalDistance(coordinates).toFixed(1)} km</p>
                <p><small>Parcours à vol d'oiseau entre les POIs</small></p>
            </div>
        `);
    }

    async drawRoadRoute(pois) {
        // Always generate a realistic walking route around the ramparts
        const roadCoordinates = await this.generateRealisticRoute(pois);
        
        this.roadRouteLayer = L.polyline(roadCoordinates, {
            color: '#27ae60',
            weight: 4,
            opacity: 0.8,
            lineCap: 'round'
        }).addTo(this.map);

        const distance = this.calculateTotalDistance(roadCoordinates);

        this.roadRouteLayer.bindPopup(`
            <div style="text-align: center;">
                <h4>🟢 Parcours piéton des Remparts</h4>
                <p>Distance totale: ~${distance.toFixed(1)} km</p>
                <p><small>Itinéraire suivant les remparts de Langres</small></p>
            </div>
        `);

        // Initially hide road route
        if (!this.showRoadRoute) {
            this.map.removeLayer(this.roadRouteLayer);
        }
    }

    async generateRealisticRoute(pois) {
        // Always use enhanced local routing for reliable results
        // This ensures the green route is always different from the red direct line
        console.log('Generating enhanced pedestrian route around Langres ramparts...');
        return this.generateEnhancedLocalRoute(pois);
    }

    async generateGraphHopperRoute(pois) {
        const allCoordinates = [];
        
        for (let i = 0; i < pois.length; i++) {
            const currentPoi = pois[i];
            const nextPoi = pois[(i + 1) % pois.length];
            
            try {
                // GraphHopper API (free tier available)
                const url = `https://graphhopper.com/api/1/route?point=${currentPoi.lat},${currentPoi.lon}&point=${nextPoi.lat},${nextPoi.lon}&vehicle=foot&locale=fr&calc_points=true&type=json`;
                
                const response = await fetch(url);
                if (!response.ok) throw new Error(`GraphHopper API error: ${response.status}`);
                
                const data = await response.json();
                if (data.paths && data.paths[0] && data.paths[0].points) {
                    const decoded = this.decodePolyline(data.paths[0].points);
                    if (i === 0) {
                        allCoordinates.push(...decoded);
                    } else {
                        allCoordinates.push(...decoded.slice(1));
                    }
                } else {
                    throw new Error('No route in GraphHopper response');
                }
                
                // Respect rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.warn(`GraphHopper segment ${i} failed:`, error);
                // Add direct line for this segment
                if (i === 0) allCoordinates.push([currentPoi.lat, currentPoi.lon]);
                allCoordinates.push([nextPoi.lat, nextPoi.lon]);
            }
        }
        
        return allCoordinates;
    }

    async generateOSRMRoute(pois) {
        const allCoordinates = [];
        
        for (let i = 0; i < pois.length; i++) {
            const currentPoi = pois[i];
            const nextPoi = pois[(i + 1) % pois.length];
            
            try {
                // OSRM public API (no key required)
                const url = `https://router.project-osrm.org/route/v1/foot/${currentPoi.lon},${currentPoi.lat};${nextPoi.lon},${nextPoi.lat}?geometries=geojson`;
                
                const response = await fetch(url);
                if (!response.ok) throw new Error(`OSRM API error: ${response.status}`);
                
                const data = await response.json();
                if (data.routes && data.routes[0] && data.routes[0].geometry) {
                    const coords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                    if (i === 0) {
                        allCoordinates.push(...coords);
                    } else {
                        allCoordinates.push(...coords.slice(1));
                    }
                } else {
                    throw new Error('No route in OSRM response');
                }
                
                // Respect rate limits
                await new Promise(resolve => setTimeout(resolve, 150));
                
            } catch (error) {
                console.warn(`OSRM segment ${i} failed:`, error);
                // Add direct line for this segment
                if (i === 0) allCoordinates.push([currentPoi.lat, currentPoi.lon]);
                allCoordinates.push([nextPoi.lat, nextPoi.lon]);
            }
        }
        
        return allCoordinates;
    }

    generateEnhancedLocalRoute(pois) {
        // Create a realistic walking route that follows the Langres ramparts in a clockwise direction
        // This will always be visually distinct from the straight red line
        const enhancedRoute = [];
        
        // Define the actual ramparts circuit with many detailed waypoints for smooth curves
        const rampartsCircuit = [
            // Start at Porte des Moulins (southwest)
            [47.8584, 5.33279],
            // Follow the southern ramparts
            [47.8590, 5.3335],
            [47.8595, 5.3342],
            [47.8598, 5.3348],
            [47.8602, 5.3354],
            [47.8606, 5.3361],
            // Eastern section - Tour Saint-Ferjeux area
            [47.8612, 5.3368],
            [47.8618, 5.3374],
            [47.8624, 5.3379],
            [47.8630, 5.3383],
            // Northern ramparts - Tour de Navarre area
            [47.8637, 5.3385],
            [47.8644, 5.3386],
            [47.8651, 5.3384],
            [47.8658, 5.3381],
            // Northeast - Porte Henri IV
            [47.8664, 5.3376],
            [47.8669, 5.3370],
            [47.8673, 5.3362],
            [47.8675, 5.3354],
            // Eastern ramparts - Tour du Petit Sault
            [47.8676, 5.3346],
            [47.8675, 5.3338],
            [47.8673, 5.3330],
            [47.8669, 5.3322],
            // Southern return - Porte des Terreaux
            [47.8664, 5.3315],
            [47.8658, 5.3308],
            [47.8651, 5.3302],
            [47.8644, 5.3297],
            // Tour Piquante area
            [47.8637, 5.3293],
            [47.8630, 5.3290],
            [47.8623, 5.3289],
            [47.8616, 5.3290],
            // Western ramparts - Porte Gallo-Romaine
            [47.8609, 5.3293],
            [47.8602, 5.3297],
            [47.8596, 5.3302],
            [47.8591, 5.3308],
            // Return to start
            [47.8587, 5.3315],
            [47.8585, 5.3322],
            [47.8584, 5.33279] // Close the circuit
        ];
        
        // Add all the ramparts circuit points for a smooth, realistic walking path
        enhancedRoute.push(...rampartsCircuit);
        
        // Add additional smoothing between points for even better curves
        const smoothedRoute = [];
        for (let i = 0; i < enhancedRoute.length - 1; i++) {
            const current = enhancedRoute[i];
            const next = enhancedRoute[i + 1];
            
            smoothedRoute.push(current);
            
            // Add 2 intermediate points between each segment for ultra-smooth curves
            for (let j = 1; j <= 2; j++) {
                const ratio = j / 3;
                const interpLat = current[0] + (next[0] - current[0]) * ratio;
                const interpLon = current[1] + (next[1] - current[1]) * ratio;
                smoothedRoute.push([interpLat, interpLon]);
            }
        }
        
        // Add the final point
        smoothedRoute.push(enhancedRoute[enhancedRoute.length - 1]);
        
        return smoothedRoute;
    }

    decodePolyline(encoded) {
        // Decode Google's polyline encoding
        const poly = [];
        let index = 0;
        const len = encoded.length;
        let lat = 0;
        let lng = 0;

        while (index < len) {
            let b;
            let shift = 0;
            let result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            poly.push([lat / 1e5, lng / 1e5]);
        }
        return poly;
    }

    generateRampartsRoute(pois) {
        // Enhanced route based on actual Langres ramparts and streets
        // This follows the real pedestrian paths around the historic fortifications
        const realisticRoute = [];
        
        // Define key waypoints that follow actual streets and ramparts
        const waypoints = [
            // Start from Porte des Moulins
            [47.8584, 5.33279],
            // Follow Boulevard de la Marne
            [47.8588, 5.3335],
            [47.8595, 5.3345],
            // Tour Saint-Ferjeux area
            [47.8600, 5.3352],
            [47.8605, 5.3358],
            // Along Promenade des Remparts
            [47.8615, 5.3365],
            [47.8625, 5.3375],
            // Tour de Navarre/Sous-Murs area
            [47.8635, 5.3380],
            [47.8645, 5.3382],
            // Porte Henri IV
            [47.8655, 5.3378],
            [47.8665, 5.3370],
            // Tour du Petit Sault
            [47.8670, 5.3358],
            [47.8672, 5.3345],
            // Porte des Terreaux
            [47.8670, 5.3330],
            [47.8665, 5.3315],
            // Tour Piquante
            [47.8658, 5.3300],
            [47.8650, 5.3290],
            // Porte Gallo-Romaine
            [47.8640, 5.3285],
            [47.8630, 5.3288],
            // Tour Sud-Est
            [47.8620, 5.3295],
            [47.8610, 5.3305],
            // Back towards start
            [47.8600, 5.3315],
            [47.8590, 5.3325],
            // Complete the loop
            [47.8584, 5.33279]
        ];
        
        // Add smooth interpolation between waypoints
        for (let i = 0; i < waypoints.length - 1; i++) {
            const start = waypoints[i];
            const end = waypoints[i + 1];
            
            realisticRoute.push(start);
            
            // Add intermediate points for smooth curves
            const steps = 3;
            for (let j = 1; j < steps; j++) {
                const ratio = j / steps;
                const lat = start[0] + (end[0] - start[0]) * ratio;
                const lon = start[1] + (end[1] - start[1]) * ratio;
                realisticRoute.push([lat, lon]);
            }
        }
        
        realisticRoute.push(waypoints[waypoints.length - 1]);
        
        return realisticRoute;
    }

    generateIntermediatePoints(poi1, poi2) {
        const points = [];
        const steps = 8; // Number of intermediate points
        
        // Calculate the center of Langres for realistic curve generation
        const centerLat = 47.8625;
        const centerLon = 5.3350;
        
        for (let i = 1; i < steps; i++) {
            const ratio = i / steps;
            
            // Create a curved path that follows the ramparts
            const directLat = poi1.lat + (poi2.lat - poi1.lat) * ratio;
            const directLon = poi1.lon + (poi2.lon - poi1.lon) * ratio;
            
            // Add curvature to follow the ramparts (circular path around center)
            const angle1 = Math.atan2(poi1.lat - centerLat, poi1.lon - centerLon);
            const angle2 = Math.atan2(poi2.lat - centerLat, poi2.lon - centerLon);
            
            // Calculate the shortest angular path
            let angleDiff = angle2 - angle1;
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            const currentAngle = angle1 + angleDiff * ratio;
            
            // Distance from center (average of the two POIs)
            const dist1 = Math.sqrt(Math.pow(poi1.lat - centerLat, 2) + Math.pow(poi1.lon - centerLon, 2));
            const dist2 = Math.sqrt(Math.pow(poi2.lat - centerLat, 2) + Math.pow(poi2.lon - centerLon, 2));
            const avgDistance = dist1 + (dist2 - dist1) * ratio;
            
            // Generate curved point
            const curvedLat = centerLat + Math.sin(currentAngle) * avgDistance;
            const curvedLon = centerLon + Math.cos(currentAngle) * avgDistance;
            
            // Blend between direct path and curved path (70% curved, 30% direct)
            const finalLat = curvedLat * 0.7 + directLat * 0.3;
            const finalLon = curvedLon * 0.7 + directLon * 0.3;
            
            points.push([finalLat, finalLon]);
        }
        
        return points;
    }

    calculateTotalDistance(coordinates) {
        let totalDistance = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
            const [lat1, lon1] = coordinates[i];
            const [lat2, lon2] = coordinates[i + 1];
            totalDistance += this.locationService.calculateDistance(lat1, lon1, lat2, lon2);
        }
        return totalDistance / 1000; // Convert to kilometers
    }

    toggleDirectRoute() {
        if (this.directRouteLayer) {
            if (this.showDirectRoute) {
                this.map.removeLayer(this.directRouteLayer);
                this.showDirectRoute = false;
            } else {
                this.map.addLayer(this.directRouteLayer);
                this.showDirectRoute = true;
            }
        }
    }

    toggleRoadRoute() {
        if (this.roadRouteLayer) {
            if (this.showRoadRoute) {
                this.map.removeLayer(this.roadRouteLayer);
                this.showRoadRoute = false;
            } else {
                this.map.addLayer(this.roadRouteLayer);
                this.showRoadRoute = true;
            }
        }
    }

    addRouteControls() {
        const routeControl = L.control({ position: 'topright' });
        
        routeControl.onAdd = () => {
            const div = L.DomUtil.create('div', 'route-controls');
            div.innerHTML = `
                <div class="route-control-panel">
                    <h4>🗺️ Itinéraires</h4>
                    <label class="route-checkbox">
                        <input type="checkbox" id="direct-route-toggle" ${this.showDirectRoute ? 'checked' : ''}>
                        <span>🔴 Ligne directe</span>
                    </label>
                    <div class="route-disabled">
                        <span>🟢 Parcours piéton (bientôt)</span>
                    </div>
                </div>
            `;
            
            // Prevent map events when clicking on controls
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            
            return div;
        };
        
        routeControl.addTo(this.map);
        
        // Add event listeners after control is added
        setTimeout(() => {
            const directToggle = document.getElementById('direct-route-toggle');
            
            if (directToggle) {
                directToggle.addEventListener('change', () => this.toggleDirectRoute());
            }
        }, 100);
    }
}

// ========== MAIN APPLICATION ==========

class LangresTourApp {
    constructor() {
        this.services = {
            location: new LocationService(),
            storage: new StorageService(),
            audio: new AudioService(),
            notification: new NotificationService()
        };
        
        this.components = {};
        this.init();
    }

    async init() {
        await this.setupUI();
        this.setupServices();
        this.setupEventListeners();
        
        // Initialize map and tour manager
        this.components.tour = new TourManager(
            this.services.location, 
            this.services.storage, 
            this.services.audio,
            this.services.notification
        );

        this.components.camera = new CameraService(this.services.storage);

        this.components.map = new MapComponent('map', this.services.location, this.components.tour);
        await this.components.map.initialize();
        
        this.setupTourCallbacks();
        this.startLocationTracking();
        this.populatePOITeleportList();
        this.updateUI();
    }

    async setupUI() {
        const appContainer = document.getElementById('app');
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

        // Add styles
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f5f5f5;
                overflow: hidden;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            
            .app-container {
                height: 100vh;
                height: 100dvh; /* Dynamic viewport height for mobile */
                display: flex;
                flex-direction: column;
                position: relative;
            }
            
            .app-header {
                background: linear-gradient(135deg, #2c3e50, #3498db);
                color: white;
                padding: 0.75rem 1rem;
                text-align: center;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                position: relative;
                z-index: 1000;
            }
            
            .app-header h1 {
                font-size: clamp(1rem, 4vw, 1.4rem);
                margin-bottom: 0.5rem;
                font-weight: 600;
            }
            
            .progress-container {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                width: 100%;
            }
            
            .progress-bar {
                flex: 1;
                height: 6px;
                background: rgba(255,255,255,0.3);
                border-radius: 3px;
                overflow: hidden;
                min-width: 100px;
            }
            
            .progress-fill {
                height: 100%;
                background: #27ae60;
                border-radius: 3px;
                transition: width 0.3s ease;
                width: 0%;
            }
            
            #progress-text {
                font-size: clamp(0.8rem, 3vw, 0.9rem);
                font-weight: 500;
                white-space: nowrap;
            }
            
            .map-container {
                flex: 1;
                position: relative;
                overflow: hidden;
            }
            
            .bottom-panel {
                background: white;
                border-top: 1px solid #ddd;
                padding: 0.75rem;
                position: relative;
                z-index: 1000;
                safe-area-inset-bottom: env(safe-area-inset-bottom);
                padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
            }
            
            .next-poi {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 0.75rem;
                background: #ecf0f1;
                border-radius: 8px;
                margin-bottom: 0.75rem;
                font-size: clamp(0.8rem, 3.5vw, 0.9rem);
                min-height: 44px; /* Touch target */
            }
            
            .controls {
                display: flex;
                justify-content: space-around;
                gap: clamp(0.5rem, 2vw, 1rem);
                align-items: center;
            }
            
            .btn-control, .btn-camera {
                background: #3498db;
                color: white;
                border: none;
                padding: 0;
                border-radius: 50%;
                font-size: clamp(1rem, 4vw, 1.2rem);
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 44px; /* Minimum touch target */
                min-height: 44px;
                width: clamp(44px, 12vw, 54px);
                height: clamp(44px, 12vw, 54px);
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }
            
            .btn-camera {
                background: #e74c3c;
            }
            
            #gps-toggle.simulated {
                background: #f39c12;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            
            .gps-simulator {
                position: fixed;
                bottom: calc(120px + env(safe-area-inset-bottom));
                left: 0.5rem;
                background: white;
                border-radius: 12px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
                z-index: 9999;
                border: 2px solid #f39c12;
                width: 180px;
                max-height: 50vh;
                overflow-y: auto;
            }
            
            .gps-simulator.hidden { display: none; }
            
            .simulator-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 0.75rem;
                background: #f39c12;
                color: white;
                border-radius: 10px 10px 0 0;
                position: sticky;
                top: 0;
            }
            
            .simulator-header h3 {
                margin: 0;
                font-size: 0.9rem;
                font-weight: 600;
            }
            
            .btn-close-sim {
                background: none;
                border: none;
                color: white;
                font-size: 1rem;
                cursor: pointer;
                padding: 0.25rem;
                min-width: 28px;
                min-height: 28px;
                border-radius: 4px;
                touch-action: manipulation;
            }
            
            .simulator-content {
                padding: 0.75rem;
            }
            
            .position-info {
                text-align: center;
                margin-bottom: 0.75rem;
                font-family: monospace;
                background: #f8f9fa;
                padding: 0.5rem;
                border-radius: 6px;
                font-size: 0.7rem;
            }
            
            .movement-controls {
                display: flex;
                justify-content: center;
                margin-bottom: 0.75rem;
            }
            
            .circular-controller {
                position: relative;
                width: 120px;
                height: 120px;
            }
            
            .direction-pad {
                position: relative;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: #ecf0f1;
                border: 2px solid #bdc3c7;
            }
            
            .direction-btn {
                position: absolute;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: none;
                background: #3498db;
                color: white;
                font-size: 1rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: manipulation;
                user-select: none;
                transition: all 0.1s ease;
            }
            
            .direction-btn:active {
                background: #2980b9;
                transform: scale(0.9);
            }
            
            .direction-btn.north {
                top: -6px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .direction-btn.northeast {
                top: 8px;
                right: 8px;
            }
            
            .direction-btn.east {
                top: 50%;
                right: -6px;
                transform: translateY(-50%);
            }
            
            .direction-btn.southeast {
                bottom: 8px;
                right: 8px;
            }
            
            .direction-btn.south {
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .direction-btn.southwest {
                bottom: 8px;
                left: 8px;
            }
            
            .direction-btn.west {
                top: 50%;
                left: -6px;
                transform: translateY(-50%);
            }
            
            .direction-btn.northwest {
                top: 8px;
                left: 8px;
            }
            
            .center-btn {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: none;
                background: #27ae60;
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: manipulation;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            
            .center-btn:active {
                background: #229954;
                transform: translate(-50%, -50%) scale(0.9);
            }
            
            .quick-teleport {
                border-top: 1px solid #ddd;
                padding-top: 0.75rem;
            }
            
            .quick-teleport select {
                width: 100%;
                padding: 0.5rem;
                border: 1px solid #ddd;
                border-radius: 6px;
                margin-bottom: 0.5rem;
                font-size: 0.8rem;
                min-height: 36px;
            }
            
            #teleport-btn {
                width: 100%;
                background: #e74c3c;
                color: white;
                border: none;
                padding: 0.5rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.8rem;
                min-height: 36px;
                touch-action: manipulation;
            }
            
            .btn-control:active, .btn-camera:active {
                transform: scale(0.95);
            }
            
            .custom-marker {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 14px;
                border: 3px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            }
            
            .custom-marker.red { background: #e74c3c; }
            .custom-marker.green { background: #27ae60; }
            
            .notification-popup {
                position: fixed;
                top: calc(80px + env(safe-area-inset-top));
                left: 1rem;
                right: 1rem;
                z-index: 10000;
                animation: slideDown 0.3s ease;
            }
            
            .notification-content {
                background: white;
                border-radius: 12px;
                padding: 1rem;
                box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                border-left: 4px solid #3498db;
            }
            
            .notification-content h3 {
                font-size: clamp(1rem, 4vw, 1.1rem);
                margin-bottom: 0.5rem;
            }
            
            .notification-content h4 {
                font-size: clamp(0.9rem, 3.5vw, 1rem);
                margin-bottom: 0.5rem;
            }
            
            .notification-content p {
                font-size: clamp(0.8rem, 3vw, 0.9rem);
                line-height: 1.4;
            }
            
            .notification-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 1rem;
                flex-wrap: wrap;
            }
            
            .notification-actions button {
                flex: 1;
                padding: 0.75rem 0.5rem;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: clamp(0.8rem, 3vw, 0.9rem);
                min-height: 44px;
                touch-action: manipulation;
            }
            
            .btn-details { background: #3498db; color: white; }
            .btn-listen { background: #f39c12; color: white; }
            .btn-close { 
                background: #95a5a6; 
                color: white; 
                flex: 0 0 auto; 
                width: 44px;
                min-width: 44px;
            }
            
            .proximity-alert {
                position: fixed;
                top: calc(120px + env(safe-area-inset-top));
                right: 1rem;
                left: 1rem;
                z-index: 9999;
                animation: slideInRight 0.3s ease;
            }
            
            .alert-content {
                background: #f39c12;
                color: white;
                padding: 0.75rem 1rem;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 1rem;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                font-size: clamp(0.8rem, 3.5vw, 0.9rem);
            }
            
            .btn-dismiss {
                background: none;
                border: none;
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0.25rem;
                min-width: 32px;
                min-height: 32px;
                border-radius: 4px;
                touch-action: manipulation;
            }
            
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                padding-top: calc(1rem + env(safe-area-inset-top));
                padding-bottom: calc(1rem + env(safe-area-inset-bottom));
            }
            
            .modal.hidden { display: none; }
            
            .modal-content {
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 100%;
                max-height: 80vh;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                border-bottom: 1px solid #ddd;
                position: sticky;
                top: 0;
                background: white;
                border-radius: 12px 12px 0 0;
            }
            
            .modal-header h2 {
                font-size: clamp(1.1rem, 4vw, 1.3rem);
                margin: 0;
            }
            
            .modal-body { 
                padding: 1rem;
                font-size: clamp(0.9rem, 3.5vw, 1rem);
                line-height: 1.5;
            }
            
            .close {
                font-size: 1.5rem;
                cursor: pointer;
                color: #999;
                padding: 0.25rem;
                min-width: 32px;
                min-height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                touch-action: manipulation;
            }
            
            .camera-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            }
            
            .camera-content {
                background: white;
                border-radius: 12px;
                padding: 1rem;
                max-width: 90vw;
                max-height: 80vh;
                width: 100%;
            }
            
            .camera-preview video {
                width: 100%;
                max-width: 400px;
                border-radius: 8px;
                height: auto;
            }
            
            .camera-controls {
                display: flex;
                gap: 1rem;
                margin-top: 1rem;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .btn-capture, .btn-cancel {
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                font-size: clamp(0.9rem, 3.5vw, 1rem);
                min-height: 44px;
                touch-action: manipulation;
                flex: 1;
                min-width: 120px;
            }
            
            .btn-capture {
                background: #27ae60;
                color: white;
            }
            
            .btn-cancel {
                background: #e74c3c;
                color: white;
            }
            
            @keyframes slideDown {
                from { transform: translateY(-100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            /* Route Controls Styles */
            .route-controls {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                border: 2px solid #ddd;
                margin: 0.5rem;
            }
            
            .route-control-panel {
                padding: 0.75rem;
                min-width: 160px;
            }
            
            .route-control-panel h4 {
                margin: 0 0 0.75rem 0;
                color: #2c3e50;
                font-size: clamp(0.9rem, 3.5vw, 1rem);
                text-align: center;
                border-bottom: 1px solid #eee;
                padding-bottom: 0.5rem;
            }
            
            .route-checkbox {
                display: flex;
                align-items: center;
                margin-bottom: 0.5rem;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 4px;
                transition: background-color 0.2s ease;
                min-height: 44px;
                touch-action: manipulation;
            }
            
            .route-checkbox:hover {
                background-color: #f8f9fa;
            }
            
            .route-checkbox input[type="checkbox"] {
                margin-right: 0.5rem;
                transform: scale(1.3);
                cursor: pointer;
                min-width: 16px;
                min-height: 16px;
            }
            
            .route-checkbox span {
                font-size: clamp(0.8rem, 3vw, 0.9rem);
                color: #2c3e50;
                user-select: none;
            }
            
            .route-disabled {
                display: flex;
                align-items: center;
                margin-bottom: 0.5rem;
                padding: 0.5rem;
                border-radius: 4px;
                min-height: 44px;
                opacity: 0.6;
                background-color: #f8f9fa;
            }
            
            .route-disabled span {
                font-size: clamp(0.8rem, 3vw, 0.9rem);
                color: #7f8c8d;
                font-style: italic;
            }
            
            /* Responsive adjustments */
            @media (max-width: 480px) {
                .proximity-alert {
                    right: 0.5rem;
                    left: 0.5rem;
                }
                
                .notification-popup {
                    left: 0.5rem;
                    right: 0.5rem;
                }
                
                .route-controls {
                    transform: scale(0.9);
                    transform-origin: top right;
                }
                
                .controls {
                    gap: 0.5rem;
                }
                
                .notification-actions {
                    flex-direction: column;
                }
                
                .notification-actions .btn-close {
                    width: 100%;
                }
            }
            
            /* iOS Safari safe area handling */
            @supports (padding: max(0px)) {
                .app-container {
                    padding-left: env(safe-area-inset-left);
                    padding-right: env(safe-area-inset-right);
                }
                
                .app-header {
                    padding-top: calc(0.75rem + env(safe-area-inset-top));
                }
            }
            
            /* Touch improvements */
            @media (hover: none) and (pointer: coarse) {
                .btn-control:hover, .btn-camera:hover {
                    transform: none;
                }
                
                .route-checkbox:hover {
                    background-color: transparent;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setupServices() {
        // Initialize services
        console.log('🔧 Services initialized');
    }

    setupEventListeners() {
        document.getElementById('audio-toggle').addEventListener('click', () => {
            const isEnabled = this.services.audio.toggle();
            document.getElementById('audio-toggle').textContent = isEnabled ? '🔊' : '🔇';
        });

        document.getElementById('camera-btn').addEventListener('click', () => {
            this.takePictureAtCurrentLocation();
        });

        document.getElementById('gps-toggle').addEventListener('click', () => {
            this.toggleGPSMode();
        });

        document.getElementById('debug-btn').addEventListener('click', () => {
            this.showDebugInfo();
        });

        document.getElementById('reset-tour').addEventListener('click', () => {
            if (confirm('Recommencer le tour ? Tous les progrès seront perdus.')) {
                this.components.tour.resetTour();
            }
        });

        // Movement controls with continuous movement support
        let moveInterval = null;
        let currentDirection = null;
        
        const startMovement = (deltaLat, deltaLon) => {
            if (moveInterval) clearInterval(moveInterval);
            currentDirection = { deltaLat, deltaLon };
            
            // Immediate first move
            this.services.location.moveSimulatedPosition(deltaLat, deltaLon);
            this.updateSimulatorDisplay();
            
            // Continue moving every 200ms while held
            moveInterval = setInterval(() => {
                this.services.location.moveSimulatedPosition(deltaLat, deltaLon);
                this.updateSimulatorDisplay();
            }, 200);
        };
        
        const stopMovement = () => {
            if (moveInterval) {
                clearInterval(moveInterval);
                moveInterval = null;
                currentDirection = null;
            }
        };
        
        document.querySelectorAll('.direction-btn').forEach(btn => {
            if (btn.dataset.lat !== undefined) {
                const deltaLat = parseFloat(btn.dataset.lat);
                const deltaLon = parseFloat(btn.dataset.lon);
                
                // Mouse events
                btn.addEventListener('mousedown', () => startMovement(deltaLat, deltaLon));
                btn.addEventListener('mouseup', stopMovement);
                btn.addEventListener('mouseleave', stopMovement);
                
                // Touch events for mobile
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    startMovement(deltaLat, deltaLon);
                });
                btn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    stopMovement();
                });
                btn.addEventListener('touchcancel', (e) => {
                    e.preventDefault();
                    stopMovement();
                });
            }
        });
        
        // Stop movement when simulator is closed
        document.getElementById('close-simulator').addEventListener('click', () => {
            stopMovement();
            document.getElementById('gps-simulator').classList.add('hidden');
        });

        // Teleport functionality
        document.getElementById('teleport-btn').addEventListener('click', () => {
            const select = document.getElementById('poi-teleport');
            const poiId = parseInt(select.value);
            if (poiId) {
                const poi = this.components.tour.getPOI(poiId);
                if (poi) {
                    this.services.location.setSimulatedPosition(poi.lat, poi.lon);
                    this.updateSimulatorDisplay();
                }
            }
        });

        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('poi-modal').classList.add('hidden');
        });
    }

    setupTourCallbacks() {
        this.components.tour.addProgressCallback((event, data) => {
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
        });
    }

    startLocationTracking() {
        this.services.location.startWatching((position) => {
            this.components.tour.checkProximity(
                position.coords.latitude, 
                position.coords.longitude
            );
            this.updateNextPOIDistance(position.coords.latitude, position.coords.longitude);
        });
    }

    updateNextPOIDistance(userLat, userLon) {
        const nextPOI = this.components.tour.getNextPOI();
        if (nextPOI) {
            const distance = this.services.location.calculateDistance(
                userLat, userLon, nextPOI.lat, nextPOI.lon
            );
            document.getElementById('next-poi-name').textContent = nextPOI.name;
            document.getElementById('next-poi-distance').textContent = `${Math.round(distance)}m`;
        } else {
            document.getElementById('next-poi-name').textContent = 'Tour terminé!';
            document.getElementById('next-poi-distance').textContent = '🎉';
        }
    }

    updateUI() {
        const progress = this.components.tour.getTourProgress();
        document.getElementById('progress-text').textContent = 
            `${progress.visited}/${progress.total} découverts`;
        document.getElementById('progress-fill').style.width = `${progress.percentage}%`;
        
        if (progress.visited > 0 && !progress.startTime) {
            this.components.tour.startTour();
        }
    }

    showPOIDetails(poiId) {
        const poi = this.components.tour.getPOI(poiId);
        const photos = this.components.camera.getPhotosForPOI(poiId);
        
        document.getElementById('modal-title').textContent = poi.name;
        document.getElementById('poi-details').innerHTML = `
            <div class="poi-content">
                <p><strong>Description:</strong> ${poi.description}</p>
                <p><strong>Détails:</strong> ${poi.details}</p>
                <p><small><strong>Source:</strong> ${poi.source}</small></p>
                
                <div class="poi-actions" style="display: flex; gap: 0.5rem; margin: 1rem 0;">
                    <button onclick="window.app.components.camera.takePicture(${poi.id}).then(r => r.success && window.app.updateUI())" style="flex: 1; padding: 0.75rem; border: none; border-radius: 6px; background: #e74c3c; color: white; cursor: pointer;">
                        📷 Prendre une photo
                    </button>
                    <button onclick="window.app.services.audio.speak('${poi.details.replace(/'/g, "\\'")}')" style="flex: 1; padding: 0.75rem; border: none; border-radius: 6px; background: #f39c12; color: white; cursor: pointer;">
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
        this.components.tour.simulatePOIDiscovery(poiId);
    }

    async takePictureAtCurrentLocation() {
        try {
            const position = await this.services.location.getCurrentPosition();
            const nearestPOI = this.findNearestPOI(position.coords.latitude, position.coords.longitude);
            
            if (nearestPOI && nearestPOI.distance <= 100) {
                const result = await this.components.camera.takePicture(nearestPOI.poi.id);
                if (result.success) {
                    this.services.notification.showInAppNotification({
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

        this.components.tour.getAllPOIs().forEach(poi => {
            const distance = this.services.location.calculateDistance(
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
        const progress = this.components.tour.getTourProgress();
        const photos = this.services.storage.getPhotos();
        const gpsMode = this.services.location.simulatedMode ? 'Simulé' : 'Réel';
        const currentPos = this.services.location.currentPosition;
        
        // Calculate route distances
        const pois = this.components.tour.getAllPOIs();
        const directCoords = pois.map(poi => [poi.lat, poi.lon]);
        const directDistance = this.components.map.calculateTotalDistance(directCoords);
        const roadCoords = this.components.map.generateRampartsRoute(pois);
        const roadDistance = this.components.map.calculateTotalDistance(roadCoords);
        
        alert(`🔧 Debug Info:
        
📊 Progrès: ${progress.visited}/${progress.total} (${progress.percentage}%)
📷 Photos: ${photos.length}
🕒 Début: ${progress.startTime ? new Date(progress.startTime).toLocaleString() : 'Non commencé'}
🔊 Audio: ${this.services.audio.isEnabled ? 'Activé' : 'Désactivé'}
📍 GPS: ${gpsMode} ${currentPos ? `(${currentPos.coords.latitude.toFixed(4)}, ${currentPos.coords.longitude.toFixed(4)})` : '(Inactif)'}

🗺️ Itinéraires:
🔴 Ligne directe: ${directDistance.toFixed(1)} km
🟢 Parcours remparts: ${roadDistance.toFixed(1)} km
        
💡 Conseil: Utilisez les contrôles en haut à droite pour afficher/masquer les itinéraires !`);
    }

    toggleGPSMode() {
        const gpsToggle = document.getElementById('gps-toggle');
        const simulator = document.getElementById('gps-simulator');
        
        if (this.services.location.simulatedMode) {
            // Switch to real GPS
            this.services.location.disableSimulatedMode();
            gpsToggle.classList.remove('simulated');
            gpsToggle.title = 'GPS Mode: Réel';
            simulator.classList.add('hidden');
            
            // Restart location tracking with real GPS
            this.services.location.stopWatching();
            this.startLocationTracking();
        } else {
            // Switch to simulated GPS
            this.services.location.enableSimulatedMode();
            gpsToggle.classList.add('simulated');
            gpsToggle.title = 'GPS Mode: Simulé';
            simulator.classList.remove('hidden');
            
            // Start with simulated position
            this.services.location.startWatching((position) => {
                this.components.tour.checkProximity(
                    position.coords.latitude, 
                    position.coords.longitude
                );
                this.updateNextPOIDistance(position.coords.latitude, position.coords.longitude);
            });
            
            this.updateSimulatorDisplay();
        }
    }

    updateSimulatorDisplay() {
        const coords = this.services.location.simulatedPosition.coords;
        document.getElementById('sim-coords').textContent = 
            `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    }

    populatePOITeleportList() {
        const select = document.getElementById('poi-teleport');
        const pois = this.components.tour.getAllPOIs();
        
        pois.forEach(poi => {
            const option = document.createElement('option');
            option.value = poi.id;
            option.textContent = `${poi.order}. ${poi.name}`;
            select.appendChild(option);
        });
    }

    centerOnLangres() {
        this.services.location.setSimulatedPosition(47.8625, 5.3350);
        this.updateSimulatorDisplay();
    }
}

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
    window.app = new LangresTourApp();
    console.log('🏰 Langres Tour App ready!');
});
