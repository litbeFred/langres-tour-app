/**
 * Map management component for guidance testing
 * Follows Single Responsibility Principle - handles only map operations
 */
export class TestMapManager {
    constructor() {
        this.map = null;
        this.crossroadMap = null;
        this.currentPositionMarker = null;
        this.routeLayer = null;
        this.crossroadLayers = [];
        this.poiMarkers = [];
        this.currentPosition = [47.8644, 5.3353];
        this.currentRouteCoordinates = [];
        this.crossroadIsVisible = false;
        this.currentCrossroadInstruction = null;
    }

    initializeMaps() {
        try {
            // Check if required DOM elements exist
            const mapElement = document.getElementById('map');
            const crossroadMapElement = document.getElementById('crossroadMap');
            
            if (!mapElement) {
                throw new Error('Map container element not found');
            }
            
            // Initialize main map
            this.map = L.map('map').setView(this.currentPosition, 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            // Initialize crossroad mini-map if element exists
            if (crossroadMapElement) {
                this.crossroadMap = L.map('crossroadMap', {
                    zoomControl: false,
                    scrollWheelZoom: false,
                    doubleClickZoom: false,
                    touchZoom: false,
                    boxZoom: false,
                    keyboard: false,
                    dragging: false,
                    attributionControl: false
                }).setView(this.currentPosition, 18);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: ''
                }).addTo(this.crossroadMap);
            } else {
                console.warn('⚠️ Crossroad map element not found, skipping crossroad map initialization');
            }

            this.addPositionMarker();
            this.setupMapEvents();
            
            console.log('✅ Maps initialized successfully');
            
        } catch (error) {
            console.error('❌ Map initialization failed:', error);
            throw error;
        }
    }

    addPositionMarker() {
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
    }

    setupMapEvents() {
        this.map.on('click', (e) => {
            this.currentPosition = [e.latlng.lat, e.latlng.lng];
            this.updatePosition();
            if (this.onPositionChange) {
                this.onPositionChange(this.currentPosition);
            }
        });
    }

    addPOIMarkers(pois) {
        if (!this.map) {
            console.warn('⚠️ Map not initialized yet, cannot add POI markers');
            return;
        }
        
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

    /**
     * Clear all POI markers from the map
     */
    clearPOIMarkers() {
        if (this.poiMarkers && this.poiMarkers.length > 0) {
            this.poiMarkers.forEach(marker => {
                if (this.map && marker) {
                    this.map.removeLayer(marker);
                }
            });
            this.poiMarkers = [];
            console.log('🗺️ POI markers cleared');
        }
    }

    /**
     * Add a single POI marker to the map
     * @param {Object} poi - POI object with lat, lon, name, description
     */
    addPOIMarker(poi) {
        if (!this.map) {
            console.warn('⚠️ Map not initialized yet, cannot add POI marker');
            return;
        }

        const marker = L.marker([poi.lat, poi.lon], {
            icon: L.icon({
                iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="14" fill="#ff6b6b" stroke="white" stroke-width="2"/>
                        <text x="16" y="20" text-anchor="middle" fill="white" font-size="16" font-weight="bold">${poi.id || '📍'}</text>
                    </svg>
                `),
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            })
        }).addTo(this.map);

        marker.bindPopup(`<b>${poi.name}</b><br>${poi.description}`);
        this.poiMarkers.push(marker);
        
        console.log(`🗺️ Added POI marker: ${poi.name}`);
        return marker;
    }

    /**
     * Set map view to specific coordinates and zoom
     * @param {Array} coordinates - [lat, lon]
     * @param {number} zoom - Zoom level
     */
    setView(coordinates, zoom = 15) {
        if (this.map) {
            this.map.setView(coordinates, zoom);
        }
    }

    /**
     * Calculate and display route to destination
     * @param {Array} destination - [lat, lon]
     */
    async calculateAndDisplayRoute(destination) {
        if (!this.map) {
            console.warn('⚠️ Map not initialized, cannot calculate route');
            return;
        }

        const start = this.currentPosition;
        const end = destination;
        
        console.log(`🗺️ Calculating OSRM route from ${start} to ${end}`);
        
        // Show loading indicator
        this.showRouteLoadingIndicator();
        
        try {
            // Use OSRM routing service if available
            if (this.routingService) {
                console.log('🌐 Using OSRM routing service...');
                const startTime = Date.now();
                
                // Add timeout wrapper for OSRM request
                const routePromise = this.routingService.calculateRoute(start, end);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('OSRM timeout after 10 seconds')), 10000)
                );
                
                const routeData = await Promise.race([routePromise, timeoutPromise]);
                const responseTime = Date.now() - startTime;
                
                console.log('📦 OSRM Response structure:', routeData);
                
                // Check for GeoJSON FeatureCollection structure (actual OSRM service response)
                if (routeData && routeData.type === 'FeatureCollection' && routeData.features && routeData.features.length > 0) {
                    const feature = routeData.features[0];
                    const geometry = feature.geometry;
                    const properties = feature.properties;
                    
                    if (geometry && geometry.coordinates) {
                        // OSRM service already returns coordinates in [lon, lat] format
                        // Convert to Leaflet format [lat, lon]
                        const leafletCoordinates = geometry.coordinates.map(coord => [coord[1], coord[0]]);
                        this.currentRouteCoordinates = leafletCoordinates;
                        
                        // Draw route on map
                        this.drawRouteOnMap(leafletCoordinates, true);  // true = OSRM route
                        
                        console.log(`✅ OSRM route calculated with ${leafletCoordinates.length} waypoints in ${responseTime}ms`);
                        console.log(`📏 Distance: ${(properties.summary.distance / 1000).toFixed(2)}km, Duration: ${Math.round(properties.summary.duration / 60)}min`);
                        
                        this.hideRouteLoadingIndicator();
                        return;
                    }
                }
                
                throw new Error('Invalid OSRM response structure - expected GeoJSON FeatureCollection');
            } else {
                console.warn('⚠️ No routing service available, using fallback');
                throw new Error('No routing service available');
            }
        } catch (error) {
            console.warn('⚠️ OSRM routing failed, using simple route:', error.message);
            
            // Check if it's a timeout vs other error
            if (error.message.includes('timeout')) {
                console.log('⏳ OSRM is taking too long, falling back to simple route');
            }
        }
        
        // Fallback: Create a simple route (straight line)
        console.log('📍 Using simple straight-line route as fallback');
        const routeCoordinates = [start, end];
        this.currentRouteCoordinates = routeCoordinates;
        
        // Draw simple route on map
        this.drawRouteOnMap(routeCoordinates, false);  // false = simple route
        
        this.hideRouteLoadingIndicator();
        console.log(`🗺️ Simple route calculated from ${start} to ${end}`);
    }

    /**
     * Show loading indicator for route calculation
     */
    showRouteLoadingIndicator() {
        if (this.routeLoadingIndicator) {
            this.map.removeLayer(this.routeLoadingIndicator);
        }
        
        // Create a pulsing marker to show loading
        this.routeLoadingIndicator = L.circleMarker(this.currentPosition, {
            radius: 10,
            color: '#007bff',
            fillColor: '#007bff',
            fillOpacity: 0.3,
            className: 'route-loading-pulse'
        }).addTo(this.map);
        
        this.routeLoadingIndicator.bindPopup('🔄 Calculating route...');
        console.log('⏳ Route calculation in progress...');
    }

    /**
     * Hide loading indicator
     */
    hideRouteLoadingIndicator() {
        if (this.routeLoadingIndicator) {
            this.map.removeLayer(this.routeLoadingIndicator);
            this.routeLoadingIndicator = null;
        }
    }

    /**
     * Draw route on map
     * @param {Array} coordinates - Array of [lat, lon] coordinates
     * @param {boolean} isOSRMRoute - Whether this is a real OSRM route or simple fallback
     */
    drawRouteOnMap(coordinates, isOSRMRoute = coordinates.length > 2) {
        // Remove existing route
        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
        }
        
        // Different styling for OSRM vs simple routes
        const routeStyle = isOSRMRoute ? {
            color: '#28a745',  // Green for real OSRM routes
            weight: 5,
            opacity: 0.8,
            dashArray: null,  // Solid line for real routes
            lineJoin: 'round'
        } : {
            color: '#ffc107',  // Yellow for simple fallback routes  
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 5',  // Dashed line for simple routes
            lineJoin: 'round'
        };
        
        // Draw new route
        this.routeLayer = L.polyline(coordinates, routeStyle).addTo(this.map);
        
        // Add route info popup
        const routeInfo = isOSRMRoute ? 
            `🛣️ OSRM Route (${coordinates.length} waypoints)` : 
            `📍 Direct Route (${coordinates.length} waypoints)`;
            
        this.routeLayer.bindPopup(routeInfo);
        
        // Fit map to show entire route
        if (coordinates.length > 1) {
            const bounds = L.latLngBounds(coordinates);
            this.map.fitBounds(bounds, { padding: [20, 20] });
        }
        
        console.log(`🗺️ Route drawn on map: ${routeInfo}`);
    }

    updatePosition() {
        if (this.currentPositionMarker) {
            this.currentPositionMarker.setLatLng(this.currentPosition);
        }
    }

    setPosition(position) {
        this.currentPosition = position;
        this.updatePosition();
        if (this.map) {
            this.map.setView(position, 15);
        }
    }

    updatePositionOnly(position) {
        // Update position marker without changing map view/zoom
        this.currentPosition = position;
        this.updatePosition();
        // Don't change map view - let user control zoom/pan during simulation
    }

    drawRoute(routeData) {
        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
        }
        
        if (routeData?.geometry?.coordinates) {
            const coordinates = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            this.currentRouteCoordinates = coordinates;
            
            this.routeLayer = L.polyline(coordinates, {
                color: 'blue',
                weight: 4,
                opacity: 0.7
            }).addTo(this.map);
        }
    }

    displayRoute(routeGeoJSON) {
        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
        }
        
        if (routeGeoJSON?.features?.[0]?.geometry?.coordinates) {
            const coordinates = routeGeoJSON.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            this.currentRouteCoordinates = coordinates;
            
            this.routeLayer = L.polyline(coordinates, {
                color: 'red',
                weight: 4,
                opacity: 0.8,
                dashArray: '5, 10'
            }).addTo(this.map);

            // Fit map to show entire route
            const bounds = L.latLngBounds(coordinates);
            this.map.fitBounds(bounds, { padding: [20, 20] });

            console.log(`🗺️ Route displayed with ${coordinates.length} waypoints`);
        }
    }

    clearRoute() {
        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
            this.routeLayer = null;
        }
        this.currentRouteCoordinates = [];
    }

    updateCrossroadView(instructions, instructionIndex) {
        if (!instructions || instructionIndex >= instructions.length) {
            this.hideCrossroad();
            return;
        }

        const currentInstruction = instructions[instructionIndex];
        if (!currentInstruction?.maneuver?.location) return;

        const instructionPoint = [currentInstruction.maneuver.location[1], currentInstruction.maneuver.location[0]];
        const distance = this.calculateDistance(this.currentPosition, instructionPoint);

        if (distance <= 50 && !this.crossroadIsVisible) {
            this.showCrossroad(instructionPoint, currentInstruction);
        } else if (distance > 50 && this.crossroadIsVisible) {
            this.hideCrossroad();
        }
    }

    showCrossroad(instructionPoint, instruction) {
        document.getElementById('crossroadView').style.display = 'block';
        this.crossroadIsVisible = true;
        this.crossroadMap.setView(instructionPoint, 20);
        
        // Clear previous layers
        this.crossroadLayers.forEach(layer => {
            if (this.crossroadMap.hasLayer(layer)) {
                this.crossroadMap.removeLayer(layer);
            }
        });
        this.crossroadLayers = [];

        // Add route segment
        const routeSegment = this.getRouteSegment(instructionPoint, 40);
        if (routeSegment.length > 1) {
            const route = L.polyline(routeSegment, {
                color: '#2E7D32',
                weight: 6,
                opacity: 0.9
            });
            route.addTo(this.crossroadMap);
            this.crossroadLayers.push(route);
        }

        // Add markers
        const marker = L.circleMarker(instructionPoint, {
            radius: 10,
            fillColor: '#FF5722',
            color: '#D84315',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.9
        });
        marker.addTo(this.crossroadMap);
        this.crossroadLayers.push(marker);
    }

    hideCrossroad() {
        document.getElementById('crossroadView').style.display = 'none';
        this.crossroadIsVisible = false;
    }

    getRouteSegment(center, radius) {
        const segment = [];
        for (let i = 0; i < this.currentRouteCoordinates.length; i++) {
            const point = [this.currentRouteCoordinates[i][1], this.currentRouteCoordinates[i][0]];
            if (this.calculateDistance(center, point) <= radius) {
                segment.push(point);
            }
        }
        return segment;
    }

    calculateDistance(pos1, pos2) {
        const R = 6371e3;
        const φ1 = pos1[0] * Math.PI/180;
        const φ2 = pos2[0] * Math.PI/180;
        const Δφ = (pos2[0]-pos1[0]) * Math.PI/180;
        const Δλ = (pos2[1]-pos1[1]) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }
}
