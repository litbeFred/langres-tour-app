/**
 * Map Component Implementation
 * Single Responsibility: Handle map rendering and user interactions
 * Open/Closed: Extensible for different map providers
 * Liskov Substitution: Can be extended with specialized map components
 * Interface Segregation: Focused map interface
 * Dependency Inversion: Depends on service abstractions
 */
export class MapComponent {
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

    // Initialization (KISS - simple setup)
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

    // POI Marker Management (Single Responsibility)
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

    // User Location Management (Single Responsibility)
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

    // Route Management (delegated to RouteRenderer for better separation)
    drawHikingRoutes() {
        const pois = this.tourManager.getAllPOIs();
        this.drawDirectRoute(pois);
        console.log('🗺️ Direct route displayed - pedestrian route available via controls');
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

    // Route Controls (KISS - simple toggle interface)
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

    // Route Toggle Methods (Single Responsibility)
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

    // Utility Methods
    calculateTotalDistance(coordinates) {
        let totalDistance = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
            const [lat1, lon1] = coordinates[i];
            const [lat2, lon2] = coordinates[i + 1];
            totalDistance += this.locationService.calculateDistance(lat1, lon1, lat2, lon2);
        }
        return totalDistance / 1000; // Convert to kilometers
    }
}