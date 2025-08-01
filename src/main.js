// Debug test to check if the app loads
console.log('🔧 Debug: main.js loading...');

// Add CSS styles programmatically
const style = document.createElement('style');
style.textContent = `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        background: #f5f5f5;
        height: 100vh;
    }

    .loading {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 10000;
    }

    .loading.hidden {
        display: none;
    }

    .debug-container {
        padding: 2rem;
        text-align: center;
        max-width: 800px;
        margin: 0 auto;
    }

    .debug-button {
        padding: 1rem 2rem;
        margin: 0.5rem;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .debug-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .btn-primary {
        background: #3498db;
        color: white;
    }

    .btn-success {
        background: #27ae60;
        color: white;
    }

    .btn-warning {
        background: #f39c12;
        color: white;
    }

    .debug-info {
        margin-top: 2rem;
        padding: 1rem;
        background: #ecf0f1;
        border-radius: 8px;
        text-align: left;
    }

    .status-success {
        color: #27ae60;
        font-weight: bold;
    }

    .status-error {
        color: #e74c3c;
        font-weight: bold;
    }
`;
document.head.appendChild(style);

// Test basic functionality first
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Debug: DOM loaded');
    
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `
            <div class="debug-container">
                <h1>🏰 Langres Tour - Debug Mode</h1>
                <p style="margin: 1rem 0; color: #7f8c8d;">Application de visite interactive des remparts de Langres</p>
                
                <div style="margin: 2rem 0;">
                    <button id="test-location" class="debug-button btn-primary">📍 Test Location</button>
                    <button id="test-leaflet" class="debug-button btn-warning">🗺️ Test Leaflet</button>
                    <button id="load-main-app" class="debug-button btn-success">🚀 Load Main App</button>
                </div>
                
                <div id="debug-info" class="debug-info">
                    <h3>Status du système:</h3>
                    <div id="system-status">Vérification en cours...</div>
                </div>
            </div>
        `;
        
        // Check system capabilities
        checkSystemCapabilities();
        
        // Setup event listeners
        document.getElementById('test-location').addEventListener('click', testLocation);
        document.getElementById('test-leaflet').addEventListener('click', testLeaflet);
        document.getElementById('load-main-app').addEventListener('click', loadMainApp);
        
        console.log('🔧 Debug: UI loaded successfully');
    } else {
        console.error('🔧 Debug: App element not found');
    }
});

function checkSystemCapabilities() {
    const statusDiv = document.getElementById('system-status');
    let html = '';
    
    // Check Geolocation
    if (navigator.geolocation) {
        html += '<div class="status-success">✅ Géolocalisation: Disponible</div>';
    } else {
        html += '<div class="status-error">❌ Géolocalisation: Non disponible</div>';
    }
    
    // Check Camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        html += '<div class="status-success">✅ Caméra: Disponible</div>';
    } else {
        html += '<div class="status-error">❌ Caméra: Non disponible</div>';
    }
    
    // Check Speech Synthesis
    if (window.speechSynthesis) {
        html += '<div class="status-success">✅ Synthèse vocale: Disponible</div>';
    } else {
        html += '<div class="status-error">❌ Synthèse vocale: Non disponible</div>';
    }
    
    // Check Leaflet
    if (window.L) {
        html += '<div class="status-success">✅ Leaflet: Chargé</div>';
    } else {
        html += '<div class="status-error">❌ Leaflet: Non chargé</div>';
    }
    
    // Check Local Storage
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        html += '<div class="status-success">✅ Local Storage: Disponible</div>';
    } catch (e) {
        html += '<div class="status-error">❌ Local Storage: Non disponible</div>';
    }
    
    statusDiv.innerHTML = html;
}

async function testLocation() {
    const debugDiv = document.getElementById('debug-info');
    debugDiv.innerHTML = '<h3>Test de géolocalisation...</h3>';
    
    try {
        const position = await getCurrentPosition();
        debugDiv.innerHTML = `
            <h3 class="status-success">✅ Test de géolocalisation réussi</h3>
            <p><strong>Latitude:</strong> ${position.coords.latitude}</p>
            <p><strong>Longitude:</strong> ${position.coords.longitude}</p>
            <p><strong>Précision:</strong> ${position.coords.accuracy}m</p>
            <p><strong>Timestamp:</strong> ${new Date(position.timestamp).toLocaleString()}</p>
        `;
    } catch (error) {
        debugDiv.innerHTML = `
            <h3 class="status-error">❌ Test de géolocalisation échoué</h3>
            <p><strong>Erreur:</strong> ${error.message}</p>
        `;
    }
}

function testLeaflet() {
    const debugDiv = document.getElementById('debug-info');
    
    if (!window.L) {
        debugDiv.innerHTML = '<h3 class="status-error">❌ Leaflet non disponible</h3>';
        return;
    }
    
    debugDiv.innerHTML = `
        <h3 class="status-success">✅ Test Leaflet</h3>
        <div id="test-map" style="height: 300px; margin: 1rem 0; border-radius: 8px;"></div>
    `;
    
    try {
        const map = L.map('test-map').setView([47.8625, 5.3350], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        L.marker([47.8625, 5.3350]).addTo(map)
            .bindPopup('Langres - Centre historique')
            .openPopup();
            
        debugDiv.innerHTML += '<p class="status-success">Carte Leaflet chargée avec succès!</p>';
    } catch (error) {
        debugDiv.innerHTML += `<p class="status-error">Erreur Leaflet: ${error.message}</p>`;
    }
}

async function loadMainApp() {
    console.log('🔧 Loading main application...');
    
    const debugDiv = document.getElementById('debug-info');
    debugDiv.innerHTML = '<h3>Chargement de l\'application principale...</h3>';
    
    try {
        // Show loading
        const loading = document.getElementById('loading');
        if (loading) loading.classList.remove('hidden');
        
        // Load the full application
        const response = await fetch('/src/main-full.js');
        const appCode = await response.text();
        
        // Create and execute the main app script
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = appCode;
        document.head.appendChild(script);
        
        debugDiv.innerHTML = `
            <h3 class="status-success">✅ Application principale chargée!</h3>
            <p>L'application complète avec toutes les fonctionnalités est maintenant active:</p>
            <ul style="text-align: left; margin: 1rem 0;">
                <li>🗺️ Carte interactive avec 21 POIs</li>
                <li>📍 Géolocalisation en temps réel</li>
                <li>🔊 Synthèse vocale</li>
                <li>📷 Prise de photos</li>
                <li>🔔 Notifications de proximité</li>
                <li>💾 Sauvegarde locale</li>
            </ul>
            <p style="margin-top: 1rem; color: #27ae60;">La page va se recharger dans 3 secondes...</p>
        `;
        
        // Reload to show full app
        setTimeout(() => {
            window.location.href = '/src/main-full.js';
        }, 3000);
        
    } catch (error) {
        console.error('🔧 Error loading main app:', error);
        debugDiv.innerHTML = `
            <h3 class="status-error">❌ Erreur de chargement</h3>
            <p><strong>Erreur:</strong> ${error.message}</p>
            <p>Essayez de modifier l'index.html pour charger main-full.js directement.</p>
        `;
    }
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Géolocalisation non supportée'));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        });
    });
}

// Hide loading when ready
window.addEventListener('load', () => {
    const loading = document.getElementById('loading');
    if (loading) {
        setTimeout(() => loading.classList.add('hidden'), 500);
    }
});
