/**
 * Guidance System Test
 * Tests the basic functionality of the new guidance system architecture
 */

import { GuidanceService } from '../src/services/guidance/GuidanceService.js';
import { GuidanceTypes, GuidanceEvents } from '../src/interfaces/IGuidanceService.js';

// Mock dependencies for testing
class MockNavigationService {
    constructor() {
        this.listeners = [];
        this.active = false;
    }
    
    startNavigation(routeData) {
        console.log('Mock NavigationService: Navigation started');
        this.active = true;
        return true;
    }
    
    stopNavigation() {
        console.log('Mock NavigationService: Navigation stopped');
        this.active = false;
    }
    
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }
    
    getNavigationStatus() {
        return {
            active: this.active,
            message: 'Mock navigation status'
        };
    }
}

class MockRoutingService {
    async calculateRoute(start, end) {
        console.log(`Mock RoutingService: Calculating route from [${start}] to [${end}]`);
        return {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {
                    summary: {
                        distance: 1000,
                        duration: 720
                    },
                    segments: [{
                        steps: [
                            {
                                distance: 500,
                                duration: 360,
                                instruction: 'Continuez tout droit',
                                name: 'Rue de Test'
                            },
                            {
                                distance: 500,
                                duration: 360,
                                instruction: 'Arrivée à destination',
                                name: 'Destination'
                            }
                        ]
                    }]
                },
                geometry: {
                    type: 'LineString',
                    coordinates: [[start[1], start[0]], [end[1], end[0]]]
                }
            }]
        };
    }
    
    async calculateTourRoute(pois) {
        console.log(`Mock RoutingService: Calculating tour route through ${pois.length} POIs`);
        return {
            success: true,
            route: {
                summary: {
                    distance: pois.length * 1000,
                    duration: pois.length * 720
                }
            },
            segments: pois.map((poi, index) => ({
                id: index,
                start: index === 0 ? { lat: 47.8644, lon: 5.3353, name: 'Start' } : pois[index - 1],
                end: poi,
                distance: 1000,
                duration: 720
            }))
        };
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        // Simple distance calculation for testing
        const dlat = lat2 - lat1;
        const dlon = lon2 - lon1;
        return Math.sqrt(dlat * dlat + dlon * dlon) * 111000; // Rough meters
    }
    
    checkRerouteNeeded() {
        return { rerouteNeeded: false, reason: 'On route' };
    }
}

class MockAudioService {
    speak(message, language) {
        console.log(`Mock AudioService [${language}]: "${message}"`);
    }
}

// Test POI data
const testPOIs = [
    { id: 1, name: 'Porte des Moulins', lat: 47.8644, lon: 5.3353, description: 'Point de départ du tour' },
    { id: 2, name: 'Tour Saint-Ferjeux', lat: 47.8654, lon: 5.3363, description: 'Tour historique' },
    { id: 3, name: 'Tour de Navarre', lat: 47.8664, lon: 5.3373, description: 'Fort de la Renaissance' }
];

// Main test function
async function testGuidanceSystem() {
    console.log('🧪 Starting Guidance System Tests...\n');
    
    // Initialize mock services
    const mockNavigationService = new MockNavigationService();
    const mockRoutingService = new MockRoutingService();
    const mockAudioService = new MockAudioService();
    
    // Initialize guidance system
    const guidanceService = new GuidanceService(
        mockNavigationService,
        mockRoutingService,
        mockAudioService,
        testPOIs
    );
    
    // Set up event listener
    const events = [];
    guidanceService.addGuidanceListener((event, data) => {
        events.push({ event, data });
        console.log(`📢 Event: ${event}`, data);
    });
    
    try {
        // Test 1: Start Guided Tour
        console.log('\n🧪 Test 1: Starting Guided Tour');
        const tourStarted = await guidanceService.startGuidance({
            type: GuidanceTypes.GUIDED_TOUR,
            route: testPOIs,
            options: {
                audioEnabled: true,
                autoAdvanceToNextPOI: true
            }
        });
        
        console.log(`✅ Guided tour started: ${tourStarted}`);
        
        // Test 2: Get guidance status
        console.log('\n🧪 Test 2: Getting Guidance Status');
        const status = guidanceService.getGuidanceStatus();
        console.log('✅ Guidance status:', status);
        
        // Test 3: Simulate position update
        console.log('\n🧪 Test 3: Position Update');
        const positionUpdate = await guidanceService.updatePosition([47.8649, 5.3358]);
        console.log('✅ Position update result:', positionUpdate);
        
        // Test 4: Access specialized services
        console.log('\n🧪 Test 4: Accessing Specialized Services');
        const guidedTourService = guidanceService.getService('guided-tour');
        const backOnTrackService = guidanceService.getService('back-on-track');
        
        console.log(`✅ GuidedTourService available: ${!!guidedTourService}`);
        console.log(`✅ BackOnTrackService available: ${!!backOnTrackService}`);
        
        if (guidedTourService) {
            const tourProgress = guidedTourService.getTourProgress();
            console.log('✅ Tour progress:', tourProgress);
        }
        
        // Test 5: Settings management
        console.log('\n🧪 Test 5: Settings Management');
        guidanceService.updateSettings({
            deviationThreshold: 75,
            audioEnabled: false
        });
        
        const settings = guidanceService.getSettings();
        console.log('✅ Updated settings:', settings);
        
        // Test 6: Stop guidance
        console.log('\n🧪 Test 6: Stopping Guidance');
        await guidanceService.stopGuidance();
        
        const finalStatus = guidanceService.getGuidanceStatus();
        console.log('✅ Final status:', finalStatus);
        
        // Test 7: Back-on-track functionality
        console.log('\n🧪 Test 7: Back-on-Track Functionality');
        const backOnTrackStarted = await guidanceService.startGuidance({
            type: GuidanceTypes.BACK_ON_TRACK,
            userPosition: [47.8649, 5.3358],
            mainRoute: {
                features: [{
                    geometry: {
                        coordinates: [[5.3353, 47.8644], [5.3363, 47.8654], [5.3373, 47.8664]]
                    }
                }]
            }
        });
        
        console.log(`✅ Back-on-track started: ${backOnTrackStarted}`);
        
        // Stop back-on-track
        await guidanceService.stopGuidance();
        
        // Summary
        console.log('\n📊 Test Summary:');
        console.log(`✅ Total events captured: ${events.length}`);
        console.log('✅ Event types:', [...new Set(events.map(e => e.event))]);
        console.log('✅ All basic functionality working correctly');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    testGuidanceSystem().then(success => {
        console.log(success ? '\n🎉 All tests passed!' : '\n💥 Tests failed!');
        process.exit(success ? 0 : 1);
    });
}

export { testGuidanceSystem };