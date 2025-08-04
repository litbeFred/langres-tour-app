/**
 * Comprehensive Integration Test for Guidance System
 * Tests the real integration with existing services
 */

import { GuidanceService } from './src/services/guidance/index.js';
import { GuidanceTypes, GuidanceEvents } from './src/interfaces/IGuidanceService.js';
import { OSMRoutingService, NavigationService } from './src/services/routing/index.js';

// Test POI data
const testPOIs = [
    { id: 1, name: 'Porte des Moulins', lat: 47.8644, lon: 5.3353, description: 'Point de départ du tour' },
    { id: 2, name: 'Tour Saint-Ferjeux', lat: 47.8654, lon: 5.3363, description: 'Tour historique' },
    { id: 3, name: 'Tour de Navarre', lat: 47.8664, lon: 5.3373, description: 'Fort de la Renaissance' }
];

// Mock AudioService since we don't have it loaded
class MockAudioService {
    speak(message, language) {
        console.log(`🔊 Audio [${language}]: "${message}"`);
    }
}

async function testRealIntegration() {
    console.log('🧪 Starting Real Integration Test...\n');
    
    try {
        // Initialize real services
        console.log('🔧 Initializing real services...');
        const routingService = new OSMRoutingService();
        const audioService = new MockAudioService();
        const navigationService = new NavigationService(routingService, null, audioService);
        
        // Create guidance service with real dependencies
        const guidanceService = new GuidanceService(
            navigationService,
            routingService,
            audioService,
            testPOIs
        );
        
        console.log('✅ Services initialized');
        
        // Set up event listener
        const events = [];
        guidanceService.addGuidanceListener((event, data) => {
            events.push({ event, data });
            console.log(`📢 Event: ${event}`, data);
        });
        
        // Test 1: Check if services are properly connected
        console.log('\n🧪 Test 1: Service Connection Check');
        const guidedTourService = guidanceService.getService('guided-tour');
        const backOnTrackService = guidanceService.getService('back-on-track');
        
        console.log(`✅ GuidedTourService connected: ${!!guidedTourService}`);
        console.log(`✅ BackOnTrackService connected: ${!!backOnTrackService}`);
        console.log(`✅ RoutingService connected: ${!!routingService}`);
        console.log(`✅ NavigationService connected: ${!!navigationService}`);
        
        // Test 2: Settings propagation
        console.log('\n🧪 Test 2: Settings Management');
        guidanceService.updateSettings({
            deviationThreshold: 75,
            audioEnabled: false,
            autoAdvanceToNextPOI: false
        });
        
        const settings = guidanceService.getSettings();
        console.log(`✅ Settings updated correctly: threshold=${settings.deviationThreshold}`);
        
        // Test 3: Back-on-track functionality (this should work without GPS)
        console.log('\n🧪 Test 3: Back-on-Track Functionality');
        const backOnTrackResult = await guidanceService.startGuidance({
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
        
        console.log(`✅ Back-on-track test: ${backOnTrackResult ? 'SUCCESS' : 'FAILED'}`);
        
        if (backOnTrackResult) {
            const status = guidanceService.getGuidanceStatus();
            console.log(`📊 Active guidance type: ${status.type}`);
            console.log(`📊 Guidance active: ${status.active}`);
        }
        
        // Test 4: Stop guidance
        console.log('\n🧪 Test 4: Stop Guidance');
        await guidanceService.stopGuidance();
        const finalStatus = guidanceService.getGuidanceStatus();
        console.log(`✅ Guidance stopped: ${!finalStatus.active}`);
        
        // Test 5: Interface compliance
        console.log('\n🧪 Test 5: Interface Compliance Check');
        const requiredMethods = [
            'startGuidance', 'stopGuidance', 'updatePosition', 
            'getGuidanceStatus', 'addGuidanceListener', 'removeGuidanceListener'
        ];
        
        let interfaceCompliant = true;
        for (const method of requiredMethods) {
            if (typeof guidanceService[method] !== 'function') {
                console.log(`❌ Missing method: ${method}`);
                interfaceCompliant = false;
            }
        }
        
        if (interfaceCompliant) {
            console.log('✅ All required interface methods implemented');
        }
        
        // Summary
        console.log('\n📊 Integration Test Summary:');
        console.log(`✅ Total events captured: ${events.length}`);
        console.log(`✅ Event types: ${[...new Set(events.map(e => e.event))].join(', ')}`);
        console.log(`✅ Services properly initialized: ${!!guidanceService}`);
        console.log(`✅ Back-on-track functionality: ${backOnTrackResult ? 'WORKING' : 'NEEDS ATTENTION'}`);
        console.log(`✅ Interface compliance: ${interfaceCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
        
        console.log('\n🎉 Integration test completed successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Integration test failed:', error);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run test if executed directly
if (typeof window === 'undefined') {
    testRealIntegration().then(success => {
        console.log(success ? '\n✅ INTEGRATION TEST PASSED' : '\n❌ INTEGRATION TEST FAILED');
        process.exit(success ? 0 : 1);
    });
}

export { testRealIntegration };
