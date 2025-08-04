/**
 * POI List component for guidance testing
 * Follows Single Responsibility Principle - handles only POI list operations
 */
export class TestPOIList {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.pois = [];
        this.selectedPOI = null;
        this.onPOISelect = null;
        this.onRouteCalculated = null; // Callback for when route is calculated
    }

    async initialize(pois) {
        try {
            this.pois = pois;
            this.render();
            
            // Ensure map is initialized before adding markers
            if (this.mapManager && this.mapManager.map) {
                await this.mapManager.addPOIMarkers(pois);
            } else {
                console.warn('Map not ready for POI markers');
            }
        } catch (error) {
            console.error('Error initializing POI list:', error);
        }
    }

    render() {
        const poiListElement = document.getElementById('poiList');
        if (!poiListElement) return;

        poiListElement.innerHTML = '';
        
        this.pois.forEach((poi, index) => {
            const poiDiv = document.createElement('div');
            poiDiv.className = 'poi-item';
            poiDiv.innerHTML = `
                <strong>${poi.name}</strong><br>
                <small>${poi.description}</small>
            `;
            
            poiDiv.addEventListener('click', () => {
                this.selectPOI(poi, index);
            });
            
            poiListElement.appendChild(poiDiv);
        });
    }

    async selectPOI(poi, index) {
        try {
            this.selectedPOI = poi;
            console.log(`🎯 Selected destination: ${poi.name}`);
            
            // Update visual selection
            const poiItems = document.querySelectorAll('.poi-item');
            poiItems.forEach(item => item.classList.remove('current'));
            poiItems[index]?.classList.add('current');

            // Calculate route from current position to selected POI
            if (this.mapManager && this.mapManager.currentPosition) {
                const route = await this.calculateRouteToSelectedPOI();
                if (route && this.onRouteCalculated) {
                    this.onRouteCalculated(route, poi);
                }
            } else {
                console.warn('No current position available for route calculation');
            }

            // Notify parent component if callback is set
            if (this.onPOISelect) {
                this.onPOISelect(poi, index);
            }
            
        } catch (error) {
            console.error('Error selecting POI:', error);
        }
    }

    async calculateRouteToSelectedPOI() {
        if (!this.selectedPOI || !this.mapManager.currentPosition) {
            console.warn('Cannot calculate route: missing POI or position');
            return null;
        }

        try {
            const start = this.mapManager.currentPosition;
            const end = [this.selectedPOI.lat, this.selectedPOI.lon];
            
            console.log(`🗺️ Calculating OSRM route from current position to ${this.selectedPOI.name}`);
            
            // Try to get real OSRM routing service if available
            let route;
            if (window.testApp?.guidanceService?.routingService?.calculateRoute) {
                console.log('🛰️ Attempting real OSRM routing...');
                try {
                    route = await window.testApp.guidanceService.routingService.calculateRoute(start, end);
                    
                    if (route?.features?.[0]?.properties?.fallback) {
                        console.log('⚠️ OSRM returned fallback route - network roads not available');
                    } else {
                        console.log('✅ Real OSRM route calculated successfully - using actual road network');
                    }
                } catch (error) {
                    console.warn('❌ OSRM routing failed, switching to simple fallback route:', error.message);
                    route = this.createSimpleRoute(start, end);
                }
            } else {
                console.log('📍 No OSRM service available, using simple fallback route');
                route = this.createSimpleRoute(start, end);
            }

            // Display route on map
            if (this.mapManager.displayRoute) {
                this.mapManager.displayRoute(route);
            }

            return route;
            
        } catch (error) {
            console.error('Error calculating route to POI:', error);
            return null;
        }
    }

    createSimpleRoute(start, end) {
        // Create a simple fallback route with multiple waypoints for simulation
        const waypoints = this.generateWaypoints(start, end, 8); // More waypoints for smoother simulation
        
        return {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {
                    summary: { 
                        distance: this.calculateDistance(start[0], start[1], end[0], end[1]),
                        duration: 300 // 5 minutes estimate
                    },
                    fallback: true // Mark as fallback route
                },
                geometry: {
                    type: 'LineString',
                    coordinates: waypoints.map(point => [point[1], point[0]]) // lon, lat for GeoJSON
                }
            }]
        };
    }

    createRouteWithWaypoints(start, end) {
        // Create intermediate waypoints for a more realistic walking route
        const waypoints = this.generateWaypoints(start, end, 8); // Increased from 5 to 8 for smoother simulation
        
        return {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {
                    summary: { 
                        distance: this.calculateDistance(start[0], start[1], end[0], end[1]),
                        duration: 300 // 5 minutes estimate
                    },
                    fallback: true // Mark as fallback route
                },
                geometry: {
                    type: 'LineString',
                    coordinates: waypoints.map(point => [point[1], point[0]]) // lon, lat for GeoJSON
                }
            }]
        };
    }

    generateWaypoints(start, end, numPoints) {
        const waypoints = [start];
        
        for (let i = 1; i <= numPoints; i++) {
            const fraction = i / (numPoints + 1);
            const lat = start[0] + (end[0] - start[0]) * fraction;
            const lon = start[1] + (end[1] - start[1]) * fraction;
            
            // Add some random variation to make it more realistic (smaller variation)
            const variation = 0.0002; // Reduced variation for smoother simulation
            waypoints.push([
                lat + (Math.random() - 0.5) * variation,
                lon + (Math.random() - 0.5) * variation
            ]);
        }
        
        waypoints.push(end);
        return waypoints;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    highlightPOI(index) {
        const poiItems = document.querySelectorAll('.poi-item');
        poiItems.forEach(item => item.classList.remove('current'));
        poiItems[index]?.classList.add('current');
    }

    clearSelection() {
        const poiItems = document.querySelectorAll('.poi-item');
        poiItems.forEach(item => item.classList.remove('current'));
    }
}
