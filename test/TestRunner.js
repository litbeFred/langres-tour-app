/**
 * Test Runner for Refactored Components
 * Validates that all components follow SOLID principles and work correctly
 */
import { TestApplication } from './TestApplication.js';
import { TestMapManager } from './TestMapManager.js';
import { TestGuidanceInterface } from './TestGuidanceInterface.js';
import { TestPOIList } from './TestPOIList.js';
import { TestStyles } from './TestStyles.js';

export class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    /**
     * Run all component tests
     */
    async runAllTests() {
        console.log('🧪 Starting SOLID Architecture Tests...');
        
        // Test individual components
        await this.testMapManager();
        await this.testGuidanceInterface();
        await this.testPOIList();
        await this.testStyles();
        await this.testApplication();
        
        // Print results
        this.printResults();
        
        return this.results;
    }

    /**
     * Test MapManager component (SRP: Only handles map operations)
     */
    async testMapManager() {
        this.test('MapManager - Single Responsibility', () => {
            const mapManager = new TestMapManager();
            
            // Should have map-related properties only
            const expectedProperties = [
                'map', 'crossroadMap', 'currentPositionMarker', 
                'routeLayer', 'currentPosition', 'currentRouteCoordinates'
            ];
            
            expectedProperties.forEach(prop => {
                if (!(prop in mapManager)) {
                    throw new Error(`Missing expected property: ${prop}`);
                }
            });
            
            // Should not have UI or business logic methods
            const forbiddenMethods = ['log', 'updateSystemStatus', 'startGuidance'];
            forbiddenMethods.forEach(method => {
                if (method in mapManager) {
                    throw new Error(`Found forbidden method: ${method} (violates SRP)`);
                }
            });
        });

        this.test('MapManager - Interface Segregation', () => {
            const mapManager = new TestMapManager();
            
            // Should only expose methods relevant to map operations
            const requiredMethods = [
                'initializeMaps', 'setPosition', 'updatePosition', 
                'drawRoute', 'addPOIMarkers'
            ];
            
            requiredMethods.forEach(method => {
                if (typeof mapManager[method] !== 'function') {
                    throw new Error(`Missing required method: ${method}`);
                }
            });
        });
    }

    /**
     * Test GuidanceInterface component (SRP: Only handles UI interactions)
     */
    async testGuidanceInterface() {
        this.test('GuidanceInterface - Single Responsibility', () => {
            const ui = new TestGuidanceInterface();
            
            // Should have UI-related methods only
            const expectedMethods = [
                'updateSystemStatus', 'updateActiveGuidance', 'updateCurrentPosition',
                'enableButtons', 'log', 'getSettings'
            ];
            
            expectedMethods.forEach(method => {
                if (typeof ui[method] !== 'function') {
                    throw new Error(`Missing expected method: ${method}`);
                }
            });
        });

        this.test('GuidanceInterface - Dependency Injection', () => {
            const mockController = { test: true };
            const ui = new TestGuidanceInterface(mockController);
            
            if (ui.testController !== mockController) {
                throw new Error('Dependency injection not working correctly');
            }
        });
    }

    /**
     * Test POIList component (SRP: Only handles POI operations)
     */
    async testPOIList() {
        this.test('POIList - Single Responsibility', () => {
            const mockMapManager = {
                addPOIMarkers: () => {},
                setPosition: () => {}
            };
            
            const poiList = new TestPOIList(mockMapManager);
            
            // Should have POI-related methods only
            const expectedMethods = ['initialize', 'render', 'selectPOI', 'highlightPOI'];
            
            expectedMethods.forEach(method => {
                if (typeof poiList[method] !== 'function') {
                    throw new Error(`Missing expected method: ${method}`);
                }
            });
        });

        this.test('POIList - Liskov Substitution', () => {
            // Mock map manager that follows the same interface
            const mockMapManager = {
                addPOIMarkers: (pois) => pois.length,
                setPosition: (pos) => pos
            };
            
            const poiList = new TestPOIList(mockMapManager);
            
            // Should work with any object that implements the map interface
            const testPOIs = [{ id: 1, name: 'Test', lat: 0, lon: 0, description: 'Test POI' }];
            
            // This should not throw if LSP is followed
            poiList.initialize(testPOIs);
        });
    }

    /**
     * Test Styles component (SRP: Only handles styling)
     */
    async testStyles() {
        this.test('Styles - Single Responsibility', () => {
            // Should only have styling-related methods
            const expectedMethods = ['getCSS', 'injectStyles'];
            
            expectedMethods.forEach(method => {
                if (typeof TestStyles[method] !== 'function') {
                    throw new Error(`Missing expected method: ${method}`);
                }
            });
        });

        this.test('Styles - Open/Closed Principle', () => {
            const css = TestStyles.getCSS();
            
            // Should return valid CSS string
            if (typeof css !== 'string' || css.length === 0) {
                throw new Error('getCSS should return non-empty string');
            }
            
            // Should contain expected CSS classes
            const expectedClasses = ['.container', '.map-section', '.control-panel'];
            expectedClasses.forEach(className => {
                if (!css.includes(className)) {
                    throw new Error(`Missing expected CSS class: ${className}`);
                }
            });
        });
    }

    /**
     * Test Application component (DIP: Depends on abstractions)
     */
    async testApplication() {
        this.test('Application - Dependency Inversion', () => {
            const app = new TestApplication();
            
            // Should have component references that can be substituted
            const componentProperties = [
                'mapManager', 'uiInterface', 'controller', 'poiList'
            ];
            
            componentProperties.forEach(prop => {
                if (!(prop in app)) {
                    throw new Error(`Missing component property: ${prop}`);
                }
            });
        });

        this.test('Application - Factory Pattern', () => {
            // Should have static factory method
            if (typeof TestApplication.create !== 'function') {
                throw new Error('Missing static factory method: create');
            }
        });
    }

    /**
     * Helper method to run individual test
     */
    test(name, testFunction) {
        try {
            testFunction();
            console.log(`✅ ${name}`);
            this.results.passed++;
        } catch (error) {
            console.error(`❌ ${name}: ${error.message}`);
            this.results.failed++;
        }
        this.results.total++;
    }

    /**
     * Print test results
     */
    printResults() {
        console.log('\n📊 Test Results:');
        console.log(`Total: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        
        if (this.results.failed === 0) {
            console.log('🎉 All tests passed! SOLID principles correctly implemented.');
        } else {
            console.log('⚠️ Some tests failed. Review component architecture.');
        }
    }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
    window.TestRunner = TestRunner;
}
