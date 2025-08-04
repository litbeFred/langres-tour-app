/**
 * Crossroad Snapshot Component
 * Follows Single Responsibility Principle - handles only crossroad visualization
 * Follows Open/Closed Principle - extensible for different map styles
 */
export class TestCrossroadSnapshot {
    constructor(containerElement = null, containerId = 'crossroadSnapshot') {
        this.snapshotMap = null;
        this.routeLayer = null;
        this.userMarker = null;
        this.directionArrow = null;
        this.crossroadLayers = []; // Initialize array for crossroad markers
        this.isVisible = false;
        this.currentCrossroad = null;
        this.userDirection = 0; // User's heading in degrees
        this.hideTimeout = null; // For managing auto-hide timeout
        this.containerElement = containerElement;
        this.containerId = containerId;
        
        this.initializeSnapshot();
    }

    /**
     * Initialize the crossroad snapshot mini-map
     */
    initializeSnapshot() {
        // Use provided container element or try to find it by ID
        let container = this.containerElement;
        if (!container) {
            container = document.getElementById(this.containerId);
        }
        
        if (!container) {
            console.warn(`❌ Crossroad snapshot container not found (looking for: ${this.containerId})`);
            return;
        }

        console.log('🗺️ Initializing crossroad snapshot...');

        // Check if container already has a Leaflet map
        if (container._leaflet_id) {
            console.log('🗺️ Container already has a map, reusing existing instance');
            // Get the existing map instance from the global map registry
            this.snapshotMap = window.L._map || null;
            
            // Try alternative method to get map instance
            if (!this.snapshotMap && window.mapInstances && window.mapInstances[this.containerId]) {
                this.snapshotMap = window.mapInstances[this.containerId];
            }
            
            if (!this.snapshotMap) {
                console.warn('⚠️ Could not access existing map instance, skipping crossroad snapshot');
                return;
            }
        } else {
            // Container is free, initialize new map
            // Ensure container is visible from start
            container.style.opacity = '1';
            container.style.transform = 'none';

            // Initialize Leaflet map for crossroad view
            this.snapshotMap = L.map(container, {
                zoomControl: false,
                attributionControl: false,
                dragging: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                boxZoom: false,
                keyboard: false
            }).setView([47.8644, 5.3353], 18);

            // Add tile layer with high zoom for detail
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 20,
                minZoom: 16
            }).addTo(this.snapshotMap);
        }

        // Add compass indicator
        this.addCompassIndicator();
        
        // Show default state
        this.showDefaultState();
        
        console.log('✅ Crossroad snapshot initialized successfully');
    }

    /**
     * Show default state when no crossroad is active
     */
    showDefaultState() {
        const container = document.getElementById('crossroadSnapshot');
        if (container) {
            // Start in hidden state
            container.style.opacity = '0.4';
            
            // Add a simple default marker at map center
            const defaultIcon = L.divIcon({
                html: `
                    <div class="default-snapshot-state">
                        <div class="default-icon">🧭</div>
                        <div class="default-text">Navigation</div>
                    </div>
                `,
                iconSize: [80, 40],
                iconAnchor: [40, 20],
                className: 'default-state-marker'
            });
            
            // Place at current map center
            const center = this.snapshotMap.getCenter();
            L.marker([center.lat, center.lng], { icon: defaultIcon }).addTo(this.snapshotMap);
        }
    }

    /**
     * Show crossroad snapshot with route and user direction
     * @param {Array} crossroadPositions - Array of crossroad positions [[lat, lon], ...]
     * @param {Array} routeCoordinates - Route coordinates through crossroad
     * @param {Array} userPosition - Current user position [lat, lon]
     * @param {number} userHeading - User's heading in degrees
     * @param {Array} instructions - Array of navigation instruction objects
     */
    showCrossroad(crossroadPositions, routeCoordinates, userPosition, userHeading, instructions) {
        console.log('🛣️ ShowCrossroad called:', {
            crossroadPositions,
            userPosition,
            userHeading,
            instructions,
            mapExists: !!this.snapshotMap
        });

        if (!this.snapshotMap) {
            console.error('❌ Snapshot map not initialized');
            return;
        }

        // Handle single crossroad or multiple crossroads
        const crossroads = Array.isArray(crossroadPositions[0]) ? crossroadPositions : [crossroadPositions];
        const instructionArray = Array.isArray(instructions) ? instructions : [instructions];

        this.currentCrossroad = crossroads;
        this.userDirection = userHeading;

        // Always center on user position with appropriate zoom for crossroad view
        this.snapshotMap.setView(userPosition, 19);
        
        // Rotate map to user's direction
        this.rotateMapToUserDirection(userHeading);

        // Clear previous layers
        this.clearLayers();

        // Add route highlighting around user position
        this.highlightRoute(routeCoordinates, userPosition);

        // Add user position and direction (always at center)
        this.showUserPosition(userPosition, userHeading);

        // Add crossroad markers for all crossroads
        crossroads.forEach((crossroad, index) => {
            const instruction = instructionArray[index] || instructionArray[0];
            this.addCrossroadMarker(crossroad, instruction, index);
        });

        // Show the snapshot
        this.showSnapshot(false);

        const crossroadCount = crossroads.length;
        const instructionText = crossroadCount > 1 
            ? `${crossroadCount} carrefours à venir`
            : instructionArray[0]?.instruction || 'Navigation point';
            
        console.log(`✅ Crossroad snapshot displayed: ${instructionText}`);
    }

    /**
     * Update user position and rotation (for continuous tracking)
     * @param {Array} userPosition - Current user position [lat, lon]
     * @param {number} userHeading - User's heading in degrees
     */
    updateUserPosition(userPosition, userHeading) {
        if (!this.snapshotMap) return;

        // Always keep map centered on user
        this.snapshotMap.setView(userPosition, this.snapshotMap.getZoom(), { animate: false });
        
        // Update rotation to match user direction
        this.rotateMapToUserDirection(userHeading);
        
        // Update user marker if it exists
        if (this.userMarker) {
            this.userMarker.setLatLng(userPosition);
            
            // Update user icon rotation
            const userIcon = this.createDirectionalUserIcon(userHeading);
            this.userMarker.setIcon(userIcon);
        }
        
        // Update direction arrow if it exists
        if (this.directionArrow) {
            const directionEndPoint = this.calculatePointAtDistance(userPosition, userHeading, 25);
            this.directionArrow.setLatLngs([userPosition, directionEndPoint]);
        }
    }

    /**
     * Calculate center point between multiple crossroads
     * @param {Array} crossroads - Array of crossroad positions
     * @returns {Array} Center position [lat, lon]
     */
    calculateCenterPoint(crossroads) {
        if (crossroads.length === 1) {
            return crossroads[0];
        }

        const sumLat = crossroads.reduce((sum, crossroad) => sum + crossroad[0], 0);
        const sumLon = crossroads.reduce((sum, crossroad) => sum + crossroad[1], 0);
        
        return [sumLat / crossroads.length, sumLon / crossroads.length];
    }

    /**
     * Rotate map to orient in user's direction
     * @param {number} userHeading - User's heading in degrees
     */
    rotateMapToUserDirection(userHeading) {
        if (!this.snapshotMap) return;
        
        // Get the map's tile pane (where the actual map tiles are rendered)
        const mapPane = this.snapshotMap.getPane('mapPane');
        if (!mapPane) {
            console.warn('Map pane not found for rotation');
            return;
        }
        
        // Calculate rotation to align map with user's walking direction
        // User heading 0° = North, we want the map to show user walking "up"
        const rotation = -userHeading; // Negative to counter-rotate the map
        
        console.log(`🧭 Rotating map tiles to user direction: ${userHeading}° (map rotation: ${rotation}°)`);
        
        // Apply rotation to the map pane (this rotates the actual map content)
        mapPane.style.transform = `rotate(${rotation}deg)`;
        mapPane.style.transformOrigin = 'center center';
        mapPane.style.transition = 'transform 0.6s ease';
        
        // Also rotate other panes for consistency
        const overlayPane = this.snapshotMap.getPane('overlayPane');
        if (overlayPane) {
            overlayPane.style.transform = `rotate(${rotation}deg)`;
            overlayPane.style.transformOrigin = 'center center';
            overlayPane.style.transition = 'transform 0.6s ease';
        }
        
        // Update map size to account for rotation
        setTimeout(() => {
            this.snapshotMap.invalidateSize();
        }, 100);
    }

    /**
     * Highlight the route around the user position
     * @param {Array} routeCoordinates - Full route coordinates
     * @param {Array} userPosition - User position (center of view)
     */
    highlightRoute(routeCoordinates, userPosition) {
        if (!routeCoordinates || routeCoordinates.length < 2) return;

        // Find route segment around user position (within 100m radius)
        const routeSegment = this.extractCrossroadSegment(routeCoordinates, userPosition, 100);

        if (routeSegment.length > 1) {
            // Create highlighted route line
            this.routeLayer = L.polyline(routeSegment, {
                color: '#FF4444',
                weight: 6,
                opacity: 0.9,
                dashArray: '10, 5',
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(this.snapshotMap);

            // Add route direction arrows
            this.addRouteDirectionArrows(routeSegment);
        }
    }

    /**
     * Extract route segment around crossroad
     * @param {Array} coordinates - All route coordinates
     * @param {Array} center - Crossroad center
     * @param {number} radiusMeters - Radius in meters
     * @returns {Array} Route segment coordinates
     */
    extractCrossroadSegment(coordinates, center, radiusMeters) {
        const segment = [];
        
        for (const coord of coordinates) {
            const distance = this.calculateDistance(
                center[0], center[1], 
                coord[0], coord[1]
            );
            
            if (distance <= radiusMeters) {
                segment.push(coord);
            }
        }
        
        return segment;
    }

    /**
     * Show user position with direction indicator
     * @param {Array} userPosition - User position [lat, lon]
     * @param {number} heading - User heading in degrees
     */
    showUserPosition(userPosition, heading) {
        // Create custom user icon with direction
        const userIcon = this.createDirectionalUserIcon(heading);
        
        this.userMarker = L.marker(userPosition, { 
            icon: userIcon,
            zIndexOffset: 1000 
        }).addTo(this.snapshotMap);

        // Add user direction line
        const directionEndPoint = this.calculatePointAtDistance(userPosition, heading, 25); // 25m ahead
        this.directionArrow = L.polyline([userPosition, directionEndPoint], {
            color: '#0066FF',
            weight: 4,
            opacity: 0.8,
            dashArray: '5, 5'
        }).addTo(this.snapshotMap);
    }

    /**
     * Create directional user icon
     * @param {number} heading - Heading in degrees
     * @returns {L.Icon} Leaflet icon
     */
    createDirectionalUserIcon(heading) {
        const svgIcon = `
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="#0066FF" stroke="#FFFFFF" stroke-width="2"/>
                <polygon points="12,4 16,12 12,10 8,12" fill="#FFFFFF" transform="rotate(${heading} 12 12)"/>
            </svg>
        `;
        
        return L.divIcon({
            html: svgIcon,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            className: 'user-direction-icon'
        });
    }

    /**
     * Add crossroad center marker with instruction
     * @param {Array} position - Crossroad position
     * @param {Object} instruction - Navigation instruction
     * @param {number} index - Crossroad index for multiple crossroads
     */
    addCrossroadMarker(position, instruction, index = 0) {
        const crossroadIcon = L.divIcon({
            html: `
                <div class="crossroad-marker">
                    <div class="crossroad-icon">
                        <div class="crossroad-number">${index + 1}</div>
                        <div class="crossroad-direction">${this.getDirectionIcon(instruction?.type || 'straight')}</div>
                    </div>
                    <div class="crossroad-instruction">${instruction?.instruction || 'Continuer'}</div>
                </div>
            `,
            iconSize: [140, 70],
            iconAnchor: [70, 35],
            className: 'crossroad-info'
        });

        const marker = L.marker(position, { icon: crossroadIcon }).addTo(this.snapshotMap);
        this.crossroadLayers.push(marker);
    }

    /**
     * Add route direction arrows
     * @param {Array} segment - Route segment coordinates
     */
    addRouteDirectionArrows(segment) {
        for (let i = 0; i < segment.length - 1; i += 2) {
            const start = segment[i];
            const end = segment[i + 1];
            const midPoint = [
                (start[0] + end[0]) / 2,
                (start[1] + end[1]) / 2
            ];

            const bearing = this.calculateBearing(start[0], start[1], end[0], end[1]);
            
            const arrowIcon = L.divIcon({
                html: `<div class="route-arrow" style="transform: rotate(${bearing}deg)">➤</div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
                className: 'route-direction-arrow'
            });

            L.marker(midPoint, { icon: arrowIcon }).addTo(this.snapshotMap);
        }
    }

    /**
     * Add compass indicator
     */
    addCompassIndicator() {
        const compassControl = L.control({ position: 'topright' });
        
        compassControl.onAdd = () => {
            const div = L.DomUtil.create('div', 'compass-indicator');
            div.innerHTML = `
                <div class="compass-rose">
                    <div class="compass-needle"></div>
                    <div class="compass-n">N</div>
                </div>
            `;
            return div;
        };
        
        compassControl.addTo(this.snapshotMap);
    }

    /**
     * Show snapshot with content (always visible, just update content)
     * @param {boolean} autoHide - Whether to auto-hide after timeout (not used anymore)
     */
    showSnapshot(autoHide = false) {
        const container = document.getElementById('crossroadSnapshot');
        if (container) {
            // Remove any previous classes
            container.classList.remove('hidden');
            container.classList.add('visible');
            
            // Force full opacity via direct style
            container.style.opacity = '1';
            
            this.isVisible = true;
            
            console.log('📍 Crossroad snapshot content updated');
        }
    }

    /**
     * Hide crossroad snapshot content (make it semi-transparent)
     */
    hideSnapshot() {
        const container = document.getElementById('crossroadSnapshot');
        if (container) {
            container.classList.remove('visible');
            container.classList.add('hidden');
            
            // Make semi-transparent but still visible
            container.style.opacity = '0.4';
            
            this.isVisible = false;
            
            console.log('🔒 Crossroad snapshot hidden (no active crossroad)');
        }
    }

    /**
     * Check if user is following the correct path through crossroad
     * @param {Array} userPosition - Current user position [lat, lon]
     * @param {Array} routeCoordinates - Expected route coordinates
     * @param {number} toleranceMeters - Distance tolerance in meters
     * @returns {boolean} True if user is on correct path
     */
    isUserOnCorrectPath(userPosition, routeCoordinates, toleranceMeters = 15) {
        if (!routeCoordinates || routeCoordinates.length === 0) return true;

        // Find closest point on route
        let minDistance = Infinity;
        for (const routePoint of routeCoordinates) {
            const distance = this.calculateDistance(
                userPosition[0], userPosition[1],
                routePoint[0], routePoint[1]
            );
            minDistance = Math.min(minDistance, distance);
        }

        return minDistance <= toleranceMeters;
    }

    /**
     * Check if user has passed all crossroads in snapshot
     * @param {Array} userPosition - Current user position [lat, lon] 
     * @param {Array} crossroadPositions - Array of crossroad positions
     * @param {number} passedDistance - Distance to consider crossroad "passed"
     * @returns {boolean} True if all crossroads are behind user
     */
    hasPassedCrossroads(userPosition, crossroadPositions, passedDistance = 25) {
        if (!this.currentCrossroad) return false;

        const crossroads = Array.isArray(crossroadPositions[0]) ? crossroadPositions : [crossroadPositions];
        
        // Check if user has moved beyond all crossroads
        return crossroads.every(crossroad => {
            const distance = this.calculateDistance(
                userPosition[0], userPosition[1],
                crossroad[0], crossroad[1]
            );
            return distance > passedDistance;
        });
    }

    /**
     * Update snapshot based on user position - hide if user is on correct path and passed crossroads
     * @param {Array} userPosition - Current user position [lat, lon]
     * @param {Array} routeCoordinates - Route coordinates
     */
    updateSnapshotForUserPosition(userPosition, routeCoordinates) {
        if (!this.isVisible || !this.currentCrossroad) {
            return;
        }

        // Check if user is following correct path
        const onCorrectPath = this.isUserOnCorrectPath(userPosition, routeCoordinates);
        
        // Check if user has passed the crossroad(s)
        const passedCrossroads = this.hasPassedCrossroads(userPosition, this.currentCrossroad);
        
        // Hide snapshot if user is on correct path AND has passed crossroads
        if (onCorrectPath && passedCrossroads) {
            this.hideSnapshot();
            console.log('🛣️ User passed crossroad correctly - hiding snapshot');
        } else if (!onCorrectPath && passedCrossroads) {
            // User passed but took wrong path - keep showing or update
            console.log('⚠️ User took wrong path at crossroad');
        }
    }

    /**
     * Clear all map layers
     */
    clearLayers() {
        if (this.snapshotMap) {
            this.snapshotMap.eachLayer((layer) => {
                if (layer !== this.snapshotMap._layers[Object.keys(this.snapshotMap._layers)[0]]) {
                    this.snapshotMap.removeLayer(layer);
                }
            });
        }
        this.routeLayer = null;
        this.userMarker = null;
        this.directionArrow = null;
        this.crossroadLayers = []; // Clear crossroad markers array
    }

    // Utility functions
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Get direction icon for instruction type
     * @param {string} type - Instruction type
     * @returns {string} Unicode icon
     */
    getDirectionIcon(type) {
        switch (type) {
            case 'left':
            case 'turn-left':
            case 'sharp-left':
                return '⬅️';
            case 'right':
            case 'turn-right':
            case 'sharp-right':
                return '➡️';
            case 'straight':
            case 'continue':
                return '⬆️';
            case 'slight-left':
                return '↖️';
            case 'slight-right':
                return '↗️';
            case 'u-turn':
                return '🔄';
            case 'arrive':
            case 'destination':
                return '🎯';
            default:
                return '🛣️';
        }
    }

    calculateBearing(lat1, lon1, lat2, lon2) {
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    calculatePointAtDistance(position, bearing, distanceMeters) {
        const R = 6371000;
        const lat1 = position[0] * Math.PI / 180;
        const lon1 = position[1] * Math.PI / 180;
        const bearingRad = bearing * Math.PI / 180;
        
        const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distanceMeters / R) +
                              Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(bearingRad));
        const lon2 = lon1 + Math.atan2(Math.sin(bearingRad) * Math.sin(distanceMeters / R) * Math.cos(lat1),
                                       Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2));
        
        return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
    }
}
