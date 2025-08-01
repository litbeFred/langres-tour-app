/**
 * Map Component Implementation
 * Single Responsibility: Handle map rendering and user interactions
 * Open/Closed: Extensible for different map providers
 * Liskov Substitution: Can be extended with specialized map components
 * Interface Segregation: Focused map interface
 * Dependency Inversion: Depends on service abstractions
 */
export class MapComponent {
    constructor(containerId, locationService, tourManager, osmRoutingService = null) {
        this.containerId = containerId;
        this.locationService = locationService;
        this.tourManager = tourManager;
        this.osmRoutingService = osmRoutingService;
        this.map = null;
        this.userMarker = null;
        this.poiMarkers = new Map();
        this.directRouteLayer = null;
        this.osmRouteLayer = null;
        this.showDirectRoute = true;
        this.showOSMRoute = false;
        this.osmRouteData = null;
        this.osmRouteAvailable = false;
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

        // Assess OSM route availability if service is available
        if (this.osmRoutingService) {
            await this.assessOSMRouteAvailability();
        }

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
                    <label class="route-checkbox" id="osm-route-container" style="display: none;">
                        <input type="checkbox" id="osm-route-toggle" ${this.showOSMRoute ? 'checked' : ''}>
                        <span>🟢 Parcours piéton</span>
                    </label>
                    <button id="calculate-osm-route" class="route-button" style="display: none;">
                        🧭 Calculer itinéraire OSM
                    </button>
                    <div id="osm-route-status" class="route-status">
                        <span>🟢 Évaluation en cours...</span>
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
            
            const osmToggle = document.getElementById('osm-route-toggle');
            if (osmToggle) {
                osmToggle.addEventListener('change', () => this.toggleOSMRoute());
            }
            
            const calculateButton = document.getElementById('calculate-osm-route');
            if (calculateButton) {
                calculateButton.addEventListener('click', () => this.calculateOSMRoute());
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

    toggleOSMRoute() {
        if (this.osmRouteLayer) {
            if (this.showOSMRoute) {
                this.map.removeLayer(this.osmRouteLayer);
                this.showOSMRoute = false;
            } else {
                this.map.addLayer(this.osmRouteLayer);
                this.showOSMRoute = true;
            }
        }
    }

    // OSM Route Management
    async assessOSMRouteAvailability() {
        if (!this.osmRoutingService) return;

        try {
            const pois = this.tourManager.getAllPOIs();
            const coordinates = pois.slice(0, 3).map(poi => [poi.lat, poi.lon]); // Test with first 3 POIs
            
            console.log('🗺️ Assessing OSM route availability...');
            const assessment = await this.osmRoutingService.assessPedestrianRouteAvailability(coordinates);
            
            this.osmRouteAvailable = assessment.available;
            this.updateOSMRouteStatus(assessment);
            
        } catch (error) {
            console.warn('OSM route assessment failed:', error);
            this.updateOSMRouteStatus({
                available: false,
                message: 'Évaluation impossible'
            });
        }
    }

    updateOSMRouteStatus(assessment) {
        const statusElement = document.getElementById('osm-route-status');
        const containerElement = document.getElementById('osm-route-container');
        const buttonElement = document.getElementById('calculate-osm-route');
        
        if (statusElement) {
            if (assessment.available) {
                statusElement.innerHTML = '<span style="color: #27ae60;">✅ Parcours OSM disponible</span>';
                if (containerElement) containerElement.style.display = 'block';
                if (buttonElement) buttonElement.style.display = 'block';
            } else {
                statusElement.innerHTML = `<span style="color: #f39c12;">⚠️ ${assessment.message}</span>`;
                if (containerElement) containerElement.style.display = 'none';
                if (buttonElement) buttonElement.style.display = 'none';
            }
        }
    }

    async calculateOSMRoute() {
        if (!this.osmRoutingService || !this.osmRouteAvailable) {
            console.warn('OSM routing not available');
            return;
        }

        try {
            const statusElement = document.getElementById('osm-route-status');
            if (statusElement) {
                statusElement.innerHTML = '<span style="color: #3498db;">🔄 Calcul en cours...</span>';
            }

            const pois = this.tourManager.getAllPOIs();
            console.log('🗺️ Calculating OSM tour route...');
            
            const result = await this.osmRoutingService.calculateTourRoute(pois);
            
            if (result.success) {
                this.osmRouteData = result;
                this.drawOSMRoute(result);
                
                if (statusElement) {
                    const distance = (result.route.summary.distance / 1000).toFixed(2);
                    const duration = Math.round(result.route.summary.duration / 60);
                    statusElement.innerHTML = `<span style="color: #27ae60;">✅ ${distance}km, ${duration}min</span>`;
                }
                
                console.log('🗺️ OSM route calculated successfully');
            } else {
                throw new Error(result.error || 'Route calculation failed');
            }
            
        } catch (error) {
            console.error('OSM route calculation failed:', error);
            const statusElement = document.getElementById('osm-route-status');
            if (statusElement) {
                statusElement.innerHTML = '<span style="color: #e74c3c;">❌ Calcul échoué</span>';
            }
        }
    }

    drawOSMRoute(routeResult) {
        // Remove existing OSM route
        if (this.osmRouteLayer) {
            this.map.removeLayer(this.osmRouteLayer);
        }

        // Create a layer group for all route segments
        this.osmRouteLayer = L.layerGroup();

        const colors = ['#27ae60', '#3498db', '#9b59b6', '#e67e22', '#1abc9c'];
        
        routeResult.segments.forEach((segment, index) => {
            const coordinates = segment.route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            const color = colors[index % colors.length];
            
            const segmentLayer = L.polyline(coordinates, {
                color: color,
                weight: 5,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
            });

            // Add popup with segment information
            segmentLayer.bindPopup(`
                <div style="text-align: center;">
                    <h4>🟢 Segment ${index + 1}</h4>
                    <p><strong>De:</strong> ${segment.start.name}</p>
                    <p><strong>Vers:</strong> ${segment.end.name}</p>
                    <p><strong>Distance:</strong> ${(segment.distance / 1000).toFixed(2)} km</p>
                    <p><strong>Durée:</strong> ${Math.round(segment.duration / 60)} min</p>
                    <p><small>Parcours piéton OSM</small></p>
                </div>
            `);

            this.osmRouteLayer.addLayer(segmentLayer);
        });

        // Add to map if OSM route is enabled
        if (this.showOSMRoute) {
            this.osmRouteLayer.addTo(this.map);
        }

        // Enable the toggle checkbox
        const osmToggle = document.getElementById('osm-route-toggle');
        if (osmToggle) {
            osmToggle.disabled = false;
        }
    }

    // Get OSM route data for navigation
    getOSMRouteData() {
        return this.osmRouteData;
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