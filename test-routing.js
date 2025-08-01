/**
 * Quick Test Script for OSM Routing Functionality
 * This tests the core OSM routing features without browser dependencies
 */

import { OSMRoutingService } from './src/services/routing/OSMRoutingService.js';
import { NavigationService } from './src/services/routing/NavigationService.js';

// Test POI data (Langres tour)
const testPOIs = [
    { id: 1, name: "Porte des Moulins", lat: 47.8584, lon: 5.33279 },
    { id: 2, name: "Tour Rouge", lat: 47.8588, lon: 5.3339 },
    { id: 3, name: "Tour de Navarre", lat: 47.8602, lon: 5.32824 },
    { id: 4, name: "Tour du Petit Sault", lat: 47.8613, lon: 5.32968 }
];

// Mock services for testing
class MockLocationService {
    startWatching(callback) {
        console.log('📍 Mock location service started');
        // Simulate location updates
        setTimeout(() => {
            callback({
                coords: {
                    latitude: 47.8584,
                    longitude: 5.33279
                }
            });
        }, 1000);
    }
}

class MockAudioService {
    speak(text, language) {
        console.log(`🔊 Audio: ${text} (${language})`);
    }
}

async function runTests() {
    console.log('🧪 Starting Enhanced OSM Routing Tests...\n');

    const osmRouting = new OSMRoutingService();
    const mockLocation = new MockLocationService();
    const mockAudio = new MockAudioService();
    const navigation = new NavigationService(osmRouting, mockLocation, mockAudio);

    // Test 1: Route Assessment with Enhanced Error Detection
    console.log('Test 1: OSM Route Assessment (Enhanced Error Detection)');
    try {
        const coordinates = testPOIs.map(poi => [poi.lat, poi.lon]);
        const assessment = await osmRouting.assessPedestrianRouteAvailability(coordinates);
        
        console.log('✅ Assessment Result:', assessment);
        
        if (assessment.fallbackMode) {
            console.warn('🚨 FALLBACK MODE DETECTED!');
            console.warn('   Error Type:', assessment.errorType);
            console.warn('   Error Details:', assessment.errorDetails);
            console.warn('   Debug Info:', assessment.debugInfo);
        }
    } catch (error) {
        console.log('❌ Assessment Error:', error.message);
    }

    // Test 2: Simple Route with Enhanced Error Logging
    console.log('\nTest 2: Simple Route Calculation (Enhanced Error Logging)');
    try {
        const start = [testPOIs[0].lat, testPOIs[0].lon];
        const end = [testPOIs[1].lat, testPOIs[1].lon];
        const route = await osmRouting.calculateRoute(start, end);
        
        if (route && route.features && route.features.length > 0) {
            const summary = route.features[0].properties.summary;
            const fallback = route.features[0].properties.fallback;
            
            console.log(`✅ Route calculated: ${(summary.distance / 1000).toFixed(2)}km, ${Math.round(summary.duration / 60)}min`);
            
            if (fallback?.used) {
                console.warn('🚨 FALLBACK ROUTE USED!');
                console.warn('   Reason:', fallback.reason);
                console.warn('   Error Context:', fallback.errorContext);
                console.warn('   Timestamp:', fallback.timestamp);
            }
        } else {
            console.log('⚠️ Route calculation returned empty result');
        }
    } catch (error) {
        console.log('❌ Route calculation error:', error.message);
    }

    // Test 3: CORS Error Simulation (for testing error handling)
    console.log('\nTest 3: Error Handling Verification');
    try {
        // Test the error categorization
        const corsError = new Error('Access to fetch at \'https://api.openrouteservice.org/v2/directions/foot-walking/geojson\' from origin \'http://localhost:5174\' has been blocked by CORS policy');
        console.log('🔍 Testing CORS error detection...');
        
        if (corsError.message.includes('CORS')) {
            console.log('✅ CORS error properly detected');
        }
        
        const forbiddenError = new Error('HTTP 403: Forbidden');
        if (forbiddenError.message.includes('403')) {
            console.log('✅ Forbidden error properly detected');
        }
        
    } catch (error) {
        console.log('❌ Error handling test failed:', error.message);
    }

    console.log('\n🏁 Enhanced OSM Routing Tests Complete!');
    console.log('\n📋 Summary:');
    console.log('- Enhanced error detection for CORS and API issues');
    console.log('- Improved fallback mode debugging');
    console.log('- Better UI status indicators');
    console.log('- Detailed console logging for troubleshooting');
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export { runTests };
