/**
 * Enhanced Map Manager for Production
 * Integrates OSRM routing with existing map functionality
 */

export class EnhancedMapManager {
    constructor(serviceContainer) {
        this.container = serviceContainer;
        this.map = null;
        this.currentPositionMarker = null;
        this.routeLayer = null;
        this.poiMarkers = [];
        this.currentPosition = [47.8644, 5.3353]; // Langres center
        this.currentRouteCoordinates = [];
        this.routingService = null;
    }

    async initialize(mapElementId = 'map') {
        try {
            const mapElement = document.getElementById(mapElementId);
            if (!mapElement) {
                throw new Error(`Map container element '${mapElementId}' not found`);
            }

            // Initialize Leaflet map
            this.map = L.map(mapElementId).setView(this.currentPosition, 15);
            
            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);

            // Get routing service from container
            this.routingService = this.container.get('OSMRoutingService');
            
            // Add current position marker
            this.addPositionMarker();
            
            // Setup map interactions
            this.setupMapEvents();
            
            // Load and display POIs
            await this.loadPOIs();
            
            console.log('✅ Enhanced Map Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Enhanced Map Manager initialization failed:', error);
            throw error;
        }
    }

    addPositionMarker() {
        if (!this.map) return;

        const userIcon = L.icon({
            iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="12" fill="#3498db" stroke="white" stroke-width="3"/>
                    <circle cx="16" cy="16" r="6" fill="white"/>
                    <circle cx="16" cy="16" r="3" fill="#3498db"/>
                </svg>
            `),
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            className: 'user-position-marker'
        });

        this.currentPositionMarker = L.marker(this.currentPosition, {
            icon: userIcon
        }).addTo(this.map);
    }

    setupMapEvents() {
        if (!this.map) return;

        // Allow user to click to set position (for testing)
        this.map.on('click', (e) => {
            this.updateUserPosition([e.latlng.lat, e.latlng.lng]);
        });

        // Add zoom controls styling
        this.map.zoomControl.setPosition('topright');
    }

    async loadPOIs() {
        try {
            // Import tour data
            const tourData = await import('../../data/tourData.json');
            const pois = tourData.default.pois || tourData.pois || this.getDefaultPOIs();
            
            this.addPOIMarkers(pois);
            
        } catch (error) {
            console.warn('Could not load tour data, using default POIs:', error);
            this.addPOIMarkers(this.getDefaultPOIs());
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

    addPOIMarkers(pois) {
        if (!this.map) return;

        // Clear existing POI markers
        this.poiMarkers.forEach(marker => this.map.removeLayer(marker));
        this.poiMarkers = [];

        pois.forEach((poi, index) => {
            const poiIcon = L.icon({
                iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
                        <path d="M20 0C9 0 0 9 0 20c0 11 20 30 20 30s20-19 20-30C40 9 31 0 20 0z" fill="#e74c3c"/>
                        <circle cx="20" cy="20" r="8" fill="white"/>
                        <text x="20" y="25" text-anchor="middle" font-size="10" font-weight="bold" fill="#e74c3c">${index + 1}</text>
                    </svg>
                `),
                iconSize: [40, 50],
                iconAnchor: [20, 50],
                popupAnchor: [0, -50]
            });

            const marker = L.marker([poi.lat, poi.lon], {
                icon: poiIcon
            });

            // Add popup with POI information
            marker.bindPopup(`
                <div class="poi-popup">
                    <h4>${poi.name}</h4>
                    <p>${poi.description}</p>
                    <div class="poi-actions">
                        <button onclick="window.guidanceController?.startGuidanceToPOI('${poi.id}')" 
                                class="popup-button">
                            🎯 Aller ici
                        </button>
                    </div>
                </div>
            `);

            marker.addTo(this.map);
            this.poiMarkers.push(marker);
        });
    }

    updateUserPosition(position) {
        this.currentPosition = position;
        
        if (this.currentPositionMarker) {
            this.currentPositionMarker.setLatLng(position);
        }

        // Notify location service
        const locationService = this.container.get('LocationService');
        if (locationService) {
            locationService.updatePosition({
                lat: position[0],
                lon: position[1],
                accuracy: 10,
                timestamp: Date.now()
            });
        }

        console.log(`📍 Position updated: ${position[0].toFixed(4)}, ${position[1].toFixed(4)}`);
    }

    async displayRoute(route) {
        if (!this.map || !route) return;

        try {
            // Clear existing route
            this.clearRoute();

            let coordinates = [];
            
            // Handle different route formats
            if (route.features && Array.isArray(route.features)) {
                // GeoJSON FeatureCollection from OSRM
                const feature = route.features[0];
                if (feature && feature.geometry && feature.geometry.coordinates) {
                    coordinates = feature.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                }
            } else if (route.coordinates && Array.isArray(route.coordinates)) {
                // Simple coordinates array
                coordinates = route.coordinates.map(coord => 
                    Array.isArray(coord) && coord.length === 2 ? [coord[1], coord[0]] : coord
                );
            } else if (Array.isArray(route)) {
                // Direct coordinates array
                coordinates = route;
            }

            if (coordinates.length === 0) {
                console.warn('⚠️ No valid coordinates found in route');
                return;
            }

            // Determine route color based on source
            const isOSRMRoute = route.features || route.waypoints;
            const routeColor = isOSRMRoute ? '#27ae60' : '#f39c12'; // Green for OSRM, Orange for fallback
            const routeWeight = isOSRMRoute ? 6 : 4;

            // Create and add route polyline
            this.routeLayer = L.polyline(coordinates, {
                color: routeColor,
                weight: routeWeight,
                opacity: 0.8,
                smoothFactor: 1
            }).addTo(this.map);

            // Add route endpoints
            if (coordinates.length > 1) {
                const startPoint = coordinates[0];
                const endPoint = coordinates[coordinates.length - 1];
                
                // Start marker (green)
                L.circleMarker(startPoint, {
                    color: '#27ae60',
                    fillColor: '#27ae60',
                    fillOpacity: 1,
                    radius: 8
                }).addTo(this.map);

                // End marker (red)
                L.circleMarker(endPoint, {
                    color: '#e74c3c',
                    fillColor: '#e74c3c',
                    fillOpacity: 1,
                    radius: 8
                }).addTo(this.map);
            }

            // Fit map to route bounds
            this.map.fitBounds(this.routeLayer.getBounds(), {
                padding: [20, 20]
            });

            this.currentRouteCoordinates = coordinates;
            
            const routeType = isOSRMRoute ? 'OSRM' : 'Fallback';
            console.log(`🗺️ Route displayed: ${routeType} route with ${coordinates.length} points`);

        } catch (error) {
            console.error('❌ Error displaying route:', error);
        }
    }

    clearRoute() {
        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
            this.routeLayer = null;
        }
        this.currentRouteCoordinates = [];
    }

    async calculateAndDisplayRoute(startPos, endPos) {
        if (!this.routingService) {
            console.warn('⚠️ No routing service available');
            return null;
        }

        try {
            console.log(`🗺️ Calculating route from [${startPos[0].toFixed(4)}, ${startPos[1].toFixed(4)}] to [${endPos[0].toFixed(4)}, ${endPos[1].toFixed(4)}]`);
            
            const route = await this.routingService.calculateRoute(startPos, endPos);
            
            if (route) {
                await this.displayRoute(route);
                return route;
            } else {
                console.warn('⚠️ No route returned from routing service');
                return null;
            }

        } catch (error) {
            console.error('❌ Route calculation error:', error);
            return null;
        }
    }

    centerOnUser() {
        if (this.map && this.currentPosition) {
            this.map.setView(this.currentPosition, 16);
        }
    }

    centerOnPOI(poiId) {
        const poi = this.getDefaultPOIs().find(p => p.id === poiId);
        if (poi && this.map) {
            this.map.setView([poi.lat, poi.lon], 17);
        }
    }

    // Getters
    getCurrentPosition() {
        return this.currentPosition;
    }

    getMap() {
        return this.map;
    }

    getRouteCoordinates() {
        return this.currentRouteCoordinates;
    }

    isRouteActive() {
        return this.routeLayer !== null;
    }
}
