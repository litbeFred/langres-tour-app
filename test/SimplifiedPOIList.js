/**
 * Simplified POI List Component
 * Automatically starts guidance when POI is selected
 */
export class SimplifiedPOIList {
    constructor(mapManager = null, uiInterface = null, guidanceController = null) {
        this.mapManager = mapManager;
        this.ui = uiInterface;
        this.guidanceController = guidanceController;
        this.currentDestination = null;
        this.isGuidanceActive = false;
        
        this.testPOIs = [
            { id: 1, name: 'Porte des Moulins', lat: 47.8644, lon: 5.3353, description: 'Point de départ du tour' },
            { id: 2, name: 'Tour Saint-Ferjeux', lat: 47.8654, lon: 5.3363, description: 'Tour historique des remparts' },
            { id: 3, name: 'Tour de Navarre', lat: 47.8664, lon: 5.3373, description: 'Fortification Renaissance' },
            { id: 4, name: 'Cathédrale Saint-Mammès', lat: 47.8659, lon: 5.3349, description: 'Cathédrale du 12ème siècle' },
            { id: 5, name: 'Porte Gallo-Romaine', lat: 47.8634, lon: 5.3343, description: 'Vestiges gallo-romains' }
        ];
        
        this.initializePOIList();
    }

    initializePOIList() {
        const poiListElement = document.getElementById('poiList');
        if (!poiListElement) return;

        // Clear existing content
        poiListElement.innerHTML = '';

        // Add header
        const header = document.createElement('div');
        header.className = 'poi-header';
        header.innerHTML = `
            <h4>🏛️ Langres Historical Tour</h4>
            <p><small>Click any destination to start automatic guidance</small></p>
        `;
        poiListElement.appendChild(header);

        // Create POI items
        this.testPOIs.forEach((poi, index) => {
            const poiItem = this.createPOIItem(poi, index);
            poiListElement.appendChild(poiItem);
        });

        // Add current location button
        this.addCurrentLocationButton(poiListElement);
    }

    createPOIItem(poi, index) {
        const poiItem = document.createElement('div');
        poiItem.className = 'poi-item simplified-poi';
        poiItem.dataset.poiId = poi.id;
        
        poiItem.innerHTML = `
            <div class="poi-content">
                <div class="poi-name">
                    <span class="poi-number">${index + 1}</span>
                    <strong>${poi.name}</strong>
                </div>
                <div class="poi-description">${poi.description}</div>
                <div class="poi-actions">
                    <button class="poi-guide-btn" onclick="event.stopPropagation()">
                        🧭 Guide me here
                    </button>
                    <button class="poi-show-btn" onclick="event.stopPropagation()">
                        👁️ Show on map
                    </button>
                </div>
            </div>
        `;

        // Add click handlers
        this.setupPOIHandlers(poiItem, poi);
        
        return poiItem;
    }

    setupPOIHandlers(poiItem, poi) {
        // Main POI click - show on map and start guidance
        poiItem.addEventListener('click', () => {
            this.selectPOI(poi);
        });

        // Guide button - start guidance immediately
        const guideBtn = poiItem.querySelector('.poi-guide-btn');
        guideBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startGuidanceToPOI(poi);
        });

        // Show button - just show on map without guidance
        const showBtn = poiItem.querySelector('.poi-show-btn');
        showBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showPOIOnMap(poi);
        });
    }

    addCurrentLocationButton(container) {
        const currentLocationDiv = document.createElement('div');
        currentLocationDiv.className = 'current-location-section';
        currentLocationDiv.innerHTML = `
            <div class="poi-item current-location">
                <div class="poi-content">
                    <div class="poi-name">
                        <span class="poi-number">📍</span>
                        <strong>Current Location</strong>
                    </div>
                    <div class="poi-description">Set your starting position for guidance</div>
                    <div class="poi-actions">
                        <button class="poi-locate-btn">
                            🎯 Use my location
                        </button>
                        <button class="poi-manual-btn">
                            ✏️ Set manually
                        </button>
                    </div>
                </div>
            </div>
        `;

        const locateBtn = currentLocationDiv.querySelector('.poi-locate-btn');
        const manualBtn = currentLocationDiv.querySelector('.poi-manual-btn');

        locateBtn.addEventListener('click', () => {
            this.useCurrentLocation();
        });

        manualBtn.addEventListener('click', () => {
            this.showManualPositionControl();
        });

        container.appendChild(currentLocationDiv);
    }

    /**
     * Select POI and automatically start guidance
     */
    selectPOI(poi) {
        this.currentDestination = poi;
        this.updatePOISelection(poi);
        this.startGuidanceToPOI(poi);
    }

    /**
     * Start guidance to selected POI
     */
    startGuidanceToPOI(poi) {
        if (!this.guidanceController) {
            this.ui?.log('❌ Guidance controller not available');
            return;
        }

        // Update UI to show selection
        this.updatePOISelection(poi);
        
        // Show on map first
        this.showPOIOnMap(poi);
        
        // Start guidance through controller
        this.guidanceController.startGuidanceToPOI(poi);
        
        // Update UI state
        this.isGuidanceActive = true;
        if (this.ui && this.ui.onPOISelected) {
            this.ui.onPOISelected(poi);
        }
        
        this.ui?.log(`🎯 Starting guidance to ${poi.name}`);
    }

    /**
     * Show POI on map without starting guidance
     */
    showPOIOnMap(poi) {
        if (this.mapManager) {
            // Add POI marker to map
            this.mapManager.clearPOIMarkers();
            this.mapManager.addPOIMarker(poi);
            
            // Center map on POI
            this.mapManager.setView([poi.lat, poi.lon], 16);
            
            // Always show route when displaying POI
            this.mapManager.calculateAndDisplayRoute([poi.lat, poi.lon]);
            
            this.ui?.log(`🗺️ Showing ${poi.name} on map with route highlighted`);
        }
    }

    /**
     * Update visual selection state
     */
    updatePOISelection(selectedPOI) {
        // Remove previous selection
        document.querySelectorAll('.poi-item').forEach(item => {
            item.classList.remove('current');
        });

        // Add selection to current POI
        const selectedItem = document.querySelector(`[data-poi-id="${selectedPOI.id}"]`);
        if (selectedItem) {
            selectedItem.classList.add('current');
        }

        // Update current destination display
        this.updateCurrentDestination(selectedPOI);
    }

    updateCurrentDestination(poi) {
        // Find or create current destination display
        let destDisplay = document.getElementById('currentDestination');
        if (!destDisplay) {
            destDisplay = document.createElement('div');
            destDisplay.id = 'currentDestination';
            destDisplay.className = 'status-section current-destination';
            
            // Insert after system status
            const statusSection = document.querySelector('.status-section');
            if (statusSection && statusSection.parentNode) {
                statusSection.parentNode.insertBefore(destDisplay, statusSection.nextSibling);
            }
        }

        destDisplay.innerHTML = `
            <h4>🎯 Current Destination</h4>
            <div class="destination-info">
                <strong>${poi.name}</strong>
                <div class="destination-description">${poi.description}</div>
                <div class="destination-coords">
                    📍 ${poi.lat.toFixed(4)}, ${poi.lon.toFixed(4)}
                </div>
            </div>
        `;
    }

    /**
     * Use browser geolocation for current position
     */
    useCurrentLocation() {
        if (navigator.geolocation) {
            this.ui?.log('📍 Getting your current location...');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = [position.coords.latitude, position.coords.longitude];
                    this.mapManager?.setPosition(coords);
                    this.ui?.log(`📍 Location set: ${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`);
                },
                (error) => {
                    this.ui?.log(`❌ Location error: ${error.message}`);
                    this.ui?.log('📍 Using default Langres location');
                    this.mapManager?.setPosition([47.8644, 5.3353]);
                }
            );
        } else {
            this.ui?.log('❌ Geolocation not supported');
            this.mapManager?.setPosition([47.8644, 5.3353]);
        }
    }

    /**
     * Show manual position control
     */
    showManualPositionControl() {
        const virtualControls = document.querySelector('.virtual-controls');
        if (virtualControls) {
            virtualControls.style.display = 'block';
            virtualControls.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Get currently selected POI
     */
    getCurrentDestination() {
        return this.currentDestination;
    }

    /**
     * Stop current guidance
     */
    stopGuidance() {
        this.isGuidanceActive = false;
        this.currentDestination = null;
        
        // Remove selection highlighting
        document.querySelectorAll('.poi-item').forEach(item => {
            item.classList.remove('current');
        });

        // Hide current destination
        const destDisplay = document.getElementById('currentDestination');
        if (destDisplay) {
            destDisplay.style.display = 'none';
        }
    }

    /**
     * Update POI list with current guidance state
     */
    updateGuidanceState(isActive) {
        this.isGuidanceActive = isActive;
        
        // Update button states
        document.querySelectorAll('.poi-guide-btn').forEach(btn => {
            if (isActive) {
                btn.textContent = '🔄 Change destination';
            } else {
                btn.textContent = '🧭 Guide me here';
            }
        });
    }

    /**
     * Get all POIs
     */
    getPOIs() {
        return this.testPOIs;
    }
}
