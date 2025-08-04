/**
 * HTML Template Generator for Guidance Test Interface
 * Follows Single Responsibility Principle - handles only HTML structure generation
 */
export class TestTemplate {
    static generateHTML() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guidance System Test with Virtual Navigation</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</head>
<body>
    <h1>🎯 Guidance System Test with Virtual Navigation</h1>
    
    <div class="container">
        <div class="map-section">
            <h2>🗺️ Interactive Navigation Map</h2>
            <div id="map"></div>
            
            <div class="virtual-controls">
                <h3>Virtual Position Control</h3>
                <div class="position-controls">
                    <div>
                        <label for="virtualLat">Latitude:</label>
                        <input type="number" id="virtualLat" step="0.0001" value="47.8644" title="Current latitude position">
                    </div>
                    <div>
                        <label for="virtualLon">Longitude:</label>
                        <input type="number" id="virtualLon" step="0.0001" value="5.3353" title="Current longitude position">
                    </div>
                </div>
                <button id="updatePosBtn">📍 Update Position</button>
                <button id="simulateBtn" class="warning">🚶 Simulate Walk</button>
                <button id="stopSimBtn" class="danger">⏹️ Stop Simulation</button>
            </div>
        </div>
        
        <div class="control-panel">
            <h2>🎮 Navigation Controls</h2>
            
            <div class="test-section info">
                <div class="status-section info">
                    <strong>System Status:</strong> <span id="systemStatus">Not initialized</span>
                </div>
                
                <div class="status-section">
                    <strong>Active Guidance:</strong> <span id="activeGuidance">None</span>
                </div>
                
                <div class="status-section">
                    <strong>Current Position:</strong> 
                    <div class="position-display" id="currentPosition">47.8644, 5.3353</div>
                </div>
                
                <div class="status-section info">
                    <strong>Current Instruction:</strong>
                    <div class="position-display" id="currentInstruction">No active navigation</div>
                </div>
                
                <div class="status-section warning hidden" id="upcomingInstruction">
                    <strong>Upcoming:</strong>
                    <div class="position-display" id="upcomingInstructionText"></div>
                </div>
                
                <div class="status-section crossroad-section hidden" id="crossroadView">
                    <h3>🛣️ Crossroad Preview</h3>
                    <div id="crossroadMap"></div>
                    <div class="crossroad-info">
                        <small>📍 Upcoming turn location</small>
                    </div>
                </div>
            </div>
            
            <div class="test-section">
                <h3>Initialize System</h3>
                <button id="initBtn" class="success">🚀 Initialize Guidance System</button>
            </div>
            
            <div class="test-section">
                <h3>Guided Tour</h3>
                <button id="startTourBtn" disabled>🎯 Start Guided Tour</button>
                <button id="stopBtn" disabled class="danger">⏹️ Stop Guidance</button>
                
                <div class="poi-list" id="poiList">
                    <div class="poi-item">Loading POIs...</div>
                </div>
            </div>
            
            <div class="test-section">
                <h3>Back-on-Track</h3>
                <button id="backOnTrackBtn" disabled class="warning">🔄 Test Back-on-Track</button>
                <button id="deviateBtn" disabled>📍 Simulate Deviation</button>
            </div>
            
            <div class="test-section">
                <h3>Settings</h3>
                <label>
                    <input type="checkbox" id="audioEnabled" checked> Audio Enabled
                </label>
                <br>
                <label>
                    <input type="checkbox" id="autoAdvance" checked> Auto Advance POI
                </label>
            </div>
            
            <div class="test-section">
                <h3>Event Log</h3>
                <div id="log"></div>
                <button id="clearLogBtn">Clear Log</button>
            </div>
        </div>
    </div>
    
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</body>
</html>
        `.trim();
    }

    static injectHTML() {
        document.documentElement.innerHTML = this.generateHTML();
    }

    static createFromTemplate() {
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.generateHTML(), 'text/html');
        
        // Replace current document content
        document.documentElement.innerHTML = doc.documentElement.innerHTML;
    }
}
