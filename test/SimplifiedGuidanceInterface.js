/**
 * Simplified Guidance Interface
 * Streamlined UI for automatic guidance system
 */
export class SimplifiedGuidanceInterface {
    constructor(testController = null) {
        this.testController = testController;
        this.isGuidanceActive = false;
        
        if (testController) {
            this.setupEventListeners();
            this.simplifyUI();
        }
    }

    /**
     * Simplify the UI by hiding complex controls and showing only essentials
     */
    simplifyUI() {
        // Hide manual initialization button initially
        const initBtn = document.getElementById('initBtn');
        if (initBtn) {
            initBtn.style.display = 'none';
        }

        // Hide complex guidance controls - user just needs to select POI
        const complexControls = ['startTourBtn', 'backOnTrackBtn', 'deviateBtn'];
        complexControls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });

        // Update UI labels for simplicity
        this.updateUILabels();
        
        // Add simplified instructions
        this.addSimplifiedInstructions();
    }

    updateUILabels() {
        // Update section titles for clarity
        const tourSection = document.querySelector('h3');
        if (tourSection && tourSection.textContent.includes('Guided Tour')) {
            tourSection.textContent = '🎯 Select Your Destination';
        }

        // Update status display
        this.updateSystemStatus('System ready - select a destination below');
    }

    addSimplifiedInstructions() {
        // Find the first test section and add instructions
        const firstSection = document.querySelector('.test-section');
        if (firstSection) {
            const instructions = document.createElement('div');
            instructions.className = 'simplified-instructions';
            instructions.innerHTML = `
                <div class="instruction-box">
                    <h4>🚶‍♂️ How to use:</h4>
                    <ol>
                        <li>Select any POI below to start guidance</li>
                        <li>The system automatically determines the best route</li>
                        <li>Follow the navigation instructions</li>
                        <li>Enjoy your guided tour of Langres!</li>
                    </ol>
                </div>
            `;
            firstSection.appendChild(instructions);
        }
    }

    setupEventListeners() {
        // Stop guidance button (keep this for emergencies)
        document.getElementById('stopBtn')?.addEventListener('click', () => {
            this.testController.stopGuidance();
            this.isGuidanceActive = false;
            this.updateGuidanceState();
        });

        // Manual position update (for testing)
        document.getElementById('updatePosBtn')?.addEventListener('click', () => {
            this.testController.updateVirtualPosition();
        });

        // Manual simulation stop
        document.getElementById('stopSimBtn')?.addEventListener('click', () => {
            this.testController.stopSimulation();
        });

        // Clear log
        document.getElementById('clearLogBtn')?.addEventListener('click', () => {
            this.clearLog();
        });
    }

    /**
     * Called when user selects a POI destination
     * @param {Object} poi - Selected POI
     */
    onPOISelected(poi) {
        if (this.testController) {
            this.testController.startGuidanceToPOI(poi);
            this.isGuidanceActive = true;
            this.updateGuidanceState();
        }
    }

    updateGuidanceState() {
        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn) {
            stopBtn.style.display = this.isGuidanceActive ? 'inline-block' : 'none';
        }
    }

    updateSystemStatus(status) {
        const element = document.getElementById('systemStatus');
        if (element) {
            element.textContent = status;
            element.className = 'status-section success';
        }
    }

    updateActiveGuidance(guidance) {
        const element = document.getElementById('activeGuidance');
        if (element) {
            element.textContent = guidance;
            
            // Update styling based on guidance type
            if (guidance === 'None') {
                element.className = 'status-section';
                this.isGuidanceActive = false;
            } else {
                element.className = 'status-section info';
                this.isGuidanceActive = true;
            }
            
            this.updateGuidanceState();
        }
    }

    updateCurrentPosition(position) {
        const element = document.getElementById('currentPosition');
        if (element) {
            element.textContent = `${position[0].toFixed(4)}, ${position[1].toFixed(4)}`;
        }
        
        // Update virtual position inputs for manual testing
        const latInput = document.getElementById('virtualLat');
        const lonInput = document.getElementById('virtualLon');
        if (latInput) latInput.value = position[0].toFixed(4);
        if (lonInput) lonInput.value = position[1].toFixed(4);
    }

    updateCurrentInstruction(instruction) {
        const element = document.getElementById('currentInstruction');
        if (element) {
            element.textContent = instruction;
            
            // Highlight important instructions
            if (instruction.includes('🎯')) {
                element.className = 'status-section success';
            } else if (instruction.includes('⚠️')) {
                element.className = 'status-section warning';
            } else if (instruction.includes('🧭')) {
                element.className = 'status-section info';
            } else {
                element.className = 'status-section';
            }
        }
    }

    log(message) {
        const logElement = document.getElementById('log');
        if (logElement) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `[${timestamp}] ${message}\n`;
            logElement.textContent += logEntry;
            logElement.scrollTop = logElement.scrollHeight;
        }
    }

    clearLog() {
        const logElement = document.getElementById('log');
        if (logElement) {
            logElement.textContent = '';
        }
    }

    getSettings() {
        return {
            audioEnabled: true,
            autoAdvance: true
        };
    }

    getVirtualPosition() {
        const latInput = document.getElementById('virtualLat');
        const lonInput = document.getElementById('virtualLon');
        
        if (latInput && lonInput) {
            return [
                parseFloat(latInput.value) || 47.8644,
                parseFloat(lonInput.value) || 5.3353
            ];
        }
        
        return [47.8644, 5.3353]; // Default Langres position
    }

    // Simplified button management
    enableButtons(enabled) {
        // In simplified mode, buttons are managed automatically
        // No manual enabling/disabling needed
    }

    enableStopButtons(enabled) {
        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn) {
            stopBtn.disabled = !enabled;
            stopBtn.style.display = enabled ? 'inline-block' : 'none';
        }
    }
}
