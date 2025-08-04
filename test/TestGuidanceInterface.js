/**
 * Test interface component for guidance system testing
 * Follows Single Responsibility Principle - handles only UI interactions
 */
export class TestGuidanceInterface {
    constructor(testController = null) {
        this.testController = testController;
        if (testController) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Initialize system
        document.getElementById('initBtn')?.addEventListener('click', () => {
            this.testController.initializeSystem();
        });

        // Guided tour controls
        document.getElementById('startTourBtn')?.addEventListener('click', () => {
            this.testController.startGuidedTour();
        });

        document.getElementById('stopBtn')?.addEventListener('click', () => {
            this.testController.stopGuidance();
        });

        // Back-on-track controls
        document.getElementById('backOnTrackBtn')?.addEventListener('click', () => {
            this.testController.testBackOnTrack();
        });

        document.getElementById('deviateBtn')?.addEventListener('click', () => {
            this.testController.simulateDeviation();
        });

        // Virtual position controls
        document.getElementById('updatePosBtn')?.addEventListener('click', () => {
            this.testController.updateVirtualPosition();
        });

        document.getElementById('simulateBtn')?.addEventListener('click', () => {
            this.testController.simulateMovement();
        });

        document.getElementById('stopSimBtn')?.addEventListener('click', () => {
            this.testController.stopSimulation();
        });

        // Clear log
        document.getElementById('clearLogBtn')?.addEventListener('click', () => {
            this.clearLog();
        });
    }

    updateSystemStatus(status) {
        const element = document.getElementById('systemStatus');
        if (element) element.textContent = status;
    }

    updateActiveGuidance(guidance) {
        const element = document.getElementById('activeGuidance');
        if (element) element.textContent = guidance;
    }

    updateCurrentPosition(position) {
        const element = document.getElementById('currentPosition');
        if (element) element.textContent = `${position[0].toFixed(4)}, ${position[1].toFixed(4)}`;
        
        const latInput = document.getElementById('virtualLat');
        const lonInput = document.getElementById('virtualLon');
        if (latInput) latInput.value = position[0].toFixed(4);
        if (lonInput) lonInput.value = position[1].toFixed(4);
    }

    updateCurrentInstruction(instruction) {
        const element = document.getElementById('currentInstruction');
        if (element) element.textContent = instruction;
    }

    enableButtons(enabled) {
        const buttons = ['startTourBtn', 'backOnTrackBtn'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = !enabled;
        });
    }

    enableStopButtons(enabled) {
        const buttons = ['stopBtn', 'deviateBtn'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = !enabled;
        });
    }

    log(message) {
        const logElement = document.getElementById('log');
        if (logElement) {
            const timestamp = new Date().toLocaleTimeString();
            logElement.textContent += `[${timestamp}] ${message}\n`;
            logElement.scrollTop = logElement.scrollHeight;
        }
        console.log(message);
    }

    clearLog() {
        const logElement = document.getElementById('log');
        if (logElement) logElement.textContent = '';
    }

    getVirtualPosition() {
        const lat = parseFloat(document.getElementById('virtualLat')?.value || '47.8644');
        const lon = parseFloat(document.getElementById('virtualLon')?.value || '5.3353');
        return [lat, lon];
    }

    getSettings() {
        return {
            audioEnabled: document.getElementById('audioEnabled')?.checked ?? true,
            autoAdvance: document.getElementById('autoAdvance')?.checked ?? true
        };
    }

    updateSelectedPOI(poi) {
        this.log(`🎯 Selected destination: ${poi.name}`);
        // Could add visual indicator of selected POI here
    }

    updateRouteInfo(route) {
        if (route?.features?.[0]?.properties?.summary) {
            const summary = route.features[0].properties.summary;
            const distance = (summary.distance / 1000).toFixed(2);
            const duration = Math.round(summary.duration / 60);
            this.log(`📏 Route: ${distance}km, ~${duration} min walking`);
        }
    }
}
