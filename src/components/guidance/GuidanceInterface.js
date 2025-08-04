/**
 * Production Guidance Interface
 * Modern UI for simplified guidance system in main application
 */

export class GuidanceInterface {
    constructor(guidanceController) {
        this.guidanceController = guidanceController;
        this.isGuidanceActive = false;
        this.currentInstruction = null;
        this.currentPosition = null;
        
        this.createInterface();
        this.setupEventListeners();
    }

    /**
     * Create the main guidance interface
     */
    createInterface() {
        const appContainer = document.getElementById('app');
        if (!appContainer) return;

        // Remove loading indicator
        const loading = document.getElementById('loading');
        if (loading) loading.remove();

        // Create main structure
        appContainer.innerHTML = `
            <div class="guidance-app">
                <header class="app-header">
                    <h1>🏰 Tour des Remparts de Langres</h1>
                    <p>Découvrez les remparts historiques avec votre guide intelligent</p>
                    <div class="status-bar">
                        <span class="status-label">État:</span>
                        <span id="systemStatus" class="status-value">Initialisation...</span>
                    </div>
                </header>

                <main class="main-content">
                    <div class="map-container">
                        <div id="map" class="map"></div>
                        <div class="map-overlay">
                            <div class="position-info">
                                <div class="current-position">
                                    <span class="label">📍 Position:</span>
                                    <span id="currentPosition">Localisation...</span>
                                </div>
                                <div class="current-instruction" id="instructionPanel" style="display: none;">
                                    <span class="label">🧭 Instruction:</span>
                                    <span id="currentInstruction">-</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="sidebar">
                        <div class="guidance-section">
                            <h3>🎯 Sélectionnez votre destination</h3>
                            <div class="instructions">
                                <p>Choisissez un point d'intérêt ci-dessous. Le système déterminera automatiquement le meilleur itinéraire.</p>
                            </div>
                            
                            <div id="poiList" class="poi-list">
                                <!-- POI list will be populated here -->
                            </div>
                        </div>

                        <div class="guidance-controls">
                            <button id="stopBtn" class="control-btn stop-btn" style="display: none;">
                                🛑 Arrêter le guidage
                            </button>
                        </div>

                        <div class="status-section">
                            <h4>📊 État du système</h4>
                            <div class="status-grid">
                                <div class="status-item">
                                    <span class="label">Guidage:</span>
                                    <span id="guidanceStatus" class="value">Inactif</span>
                                </div>
                                <div class="status-item">
                                    <span class="label">Position:</span>
                                    <span id="locationStatus" class="value">En attente</span>
                                </div>
                            </div>
                        </div>

                        <div class="log-section">
                            <h4>📝 Journal des événements</h4>
                            <div class="log-controls">
                                <button id="clearLogBtn" class="small-btn">🗑️ Effacer</button>
                            </div>
                            <div id="logContainer" class="log-container"></div>
                        </div>
                    </div>
                </main>
            </div>
        `;

        this.populatePOIList();
    }

    populatePOIList() {
        const poiList = document.getElementById('poiList');
        if (!poiList || !this.guidanceController) return;

        const pois = this.guidanceController.getTourPOIs();
        
        poiList.innerHTML = pois.map(poi => `
            <div class="poi-card" data-poi-id="${poi.id}">
                <div class="poi-header">
                    <h5 class="poi-name">${poi.name}</h5>
                    <button class="poi-select-btn" data-poi-id="${poi.id}">
                        🎯 Aller ici
                    </button>
                </div>
                <p class="poi-description">${poi.description}</p>
                <div class="poi-location">
                    📍 ${poi.lat.toFixed(4)}, ${poi.lon.toFixed(4)}
                </div>
            </div>
        `).join('');

        // Add click handlers for POI selection
        poiList.addEventListener('click', (e) => {
            if (e.target.classList.contains('poi-select-btn')) {
                const poiId = e.target.dataset.poiId;
                this.selectPOI(poiId);
            }
        });
    }

    setupEventListeners() {
        // Stop guidance button
        document.getElementById('stopBtn')?.addEventListener('click', () => {
            this.guidanceController.stopGuidance();
            this.setGuidanceActive(false);
        });

        // Clear log button
        document.getElementById('clearLogBtn')?.addEventListener('click', () => {
            this.clearLog();
        });
    }

    async selectPOI(poiId) {
        this.log(`🎯 POI sélectionné: ${poiId}`);
        
        // Visual feedback
        const selectedCard = document.querySelector(`[data-poi-id="${poiId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            setTimeout(() => selectedCard.classList.remove('selected'), 2000);
        }

        // Start guidance
        await this.guidanceController.startGuidanceToPOI(poiId);
        this.setGuidanceActive(true);
    }

    setGuidanceActive(active) {
        this.isGuidanceActive = active;
        
        const stopBtn = document.getElementById('stopBtn');
        const instructionPanel = document.getElementById('instructionPanel');
        
        if (active) {
            stopBtn.style.display = 'block';
            instructionPanel.style.display = 'block';
            this.updateGuidanceStatus('Actif');
        } else {
            stopBtn.style.display = 'none';
            instructionPanel.style.display = 'none';
            this.updateGuidanceStatus('Inactif');
            this.updateCurrentInstruction(null);
        }
    }

    // Status update methods
    updateSystemStatus(status) {
        const element = document.getElementById('systemStatus');
        if (element) {
            element.textContent = status;
        }
    }

    updateGuidanceStatus(status) {
        const element = document.getElementById('guidanceStatus');
        if (element) {
            element.textContent = status;
        }
    }

    updateCurrentPosition(position) {
        this.currentPosition = position;
        const element = document.getElementById('currentPosition');
        if (element && position) {
            element.textContent = `${position[0].toFixed(4)}, ${position[1].toFixed(4)}`;
        }
        
        const statusElement = document.getElementById('locationStatus');
        if (statusElement) {
            statusElement.textContent = position ? 'Localisé' : 'En attente';
        }
    }

    updateCurrentInstruction(instruction) {
        this.currentInstruction = instruction;
        const element = document.getElementById('currentInstruction');
        if (element) {
            if (instruction && instruction.text) {
                element.textContent = instruction.text;
            } else {
                element.textContent = '-';
            }
        }
    }

    // Logging system
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
            
            // Limit log entries to prevent memory issues
            const entries = logContainer.children;
            if (entries.length > 100) {
                logContainer.removeChild(entries[0]);
            }
        }
        
        // Also log to console for debugging
        console.log(`[Guidance] ${message}`);
    }

    clearLog() {
        const logContainer = document.getElementById('logContainer');
        if (logContainer) {
            logContainer.innerHTML = '';
        }
    }

    // Utility methods
    showNotification(message, type = 'info') {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    getMapContainer() {
        return document.getElementById('map');
    }
}
