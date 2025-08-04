/**
 * Route Storage Backend Debug and Test Script
 * Provides debugging capabilities and testing for the route storage backend
 */

import { RouteStorageService } from '../services/routing/RouteStorageService.js';
import { RouteBackendService } from '../services/routing/RouteBackendService.js';
import { StoredRouteService } from '../services/routing/StoredRouteService.js';
import { OSMRoutingService } from '../services/routing/OSMRoutingService.js';
import { EnhancedGuidanceService } from '../services/guidance/EnhancedGuidanceService.js';

export class RouteStorageDebugger {
    constructor(poiData) {
        this.poiData = poiData;
        this.debugMode = true;
        
        // Initialize services
        this.osmRoutingService = new OSMRoutingService();
        this.routeStorageService = new RouteStorageService();
        this.routeBackendService = new RouteBackendService(
            this.osmRoutingService,
            this.routeStorageService,
            this.poiData
        );
        this.storedRouteService = new StoredRouteService(
            this.routeStorageService,
            this.osmRoutingService,
            this.poiData
        );
        
        // Setup debugging
        this.setupDebugListeners();
        
        console.log('🔧 RouteStorageDebugger initialized');
        console.log(`   POI count: ${this.poiData.length}`);
        console.log(`   Services initialized: Storage, Backend, StoredRoute`);
    }

    /**
     * Setup debug event listeners
     */
    setupDebugListeners() {
        // Backend service listeners
        this.routeBackendService.addListener((event, data) => {
            this.logDebugEvent('Backend', event, data);
        });
    }

    /**
     * Log debug events
     * @param {string} source - Event source
     * @param {string} event - Event type
     * @param {Object} data - Event data
     */
    logDebugEvent(source, event, data) {
        if (!this.debugMode) return;
        
        console.log(`🔧 [${source}] ${event}:`, data);
    }

    /**
     * Test route calculation and storage
     * @returns {Promise<Object>} Test results
     */
    async testRouteCalculationAndStorage() {
        console.log('🧪 Testing route calculation and storage...');
        
        const testResults = {
            startTime: new Date(),
            tests: [],
            success: true
        };
        
        try {
            // Test 1: Calculate and store tour route
            console.log('🧪 Test 1: Calculate and store tour route');
            const calculationResult = await this.routeBackendService.calculateAndStoreTourRoute({
                routeId: 'test_langres_tour_' + Date.now()
            });
            
            testResults.tests.push({
                name: 'Calculate and store tour route',
                success: calculationResult.success,
                result: calculationResult,
                error: calculationResult.error
            });
            
            if (!calculationResult.success) {
                testResults.success = false;
                console.error('❌ Test 1 failed:', calculationResult.error);
                return testResults;
            }
            
            console.log('✅ Test 1 passed');
            const routeId = calculationResult.routeId;
            
            // Test 2: Retrieve stored route
            console.log('🧪 Test 2: Retrieve stored route');
            const retrievalResult = await this.storedRouteService.getStoredTourRoute({
                routeId: routeId
            });
            
            testResults.tests.push({
                name: 'Retrieve stored route',
                success: retrievalResult.success,
                result: retrievalResult,
                error: retrievalResult.error
            });
            
            if (!retrievalResult.success) {
                testResults.success = false;
                console.error('❌ Test 2 failed:', retrievalResult.error);
                return testResults;
            }
            
            console.log('✅ Test 2 passed');
            
            // Test 3: Check route adherence
            console.log('🧪 Test 3: Check route adherence');
            const testPosition = [this.poiData[0].lat, this.poiData[0].lon]; // Start at first POI
            const adherenceCheck = this.storedRouteService.isOnStoredRoute(testPosition, 100);
            
            testResults.tests.push({
                name: 'Check route adherence',
                success: adherenceCheck.onRoute !== undefined,
                result: adherenceCheck,
                testPosition: testPosition
            });
            
            console.log('✅ Test 3 passed');
            
            // Test 4: Get backend status
            console.log('🧪 Test 4: Get backend status');
            const backendStatus = await this.routeBackendService.getBackendStatus();
            
            testResults.tests.push({
                name: 'Get backend status',
                success: backendStatus.error === undefined,
                result: backendStatus
            });
            
            console.log('✅ Test 4 passed');
            
            // Test 5: Storage statistics
            console.log('🧪 Test 5: Storage statistics');
            const storageStats = await this.routeStorageService.getStorageStats();
            
            testResults.tests.push({
                name: 'Storage statistics',
                success: storageStats.error === undefined,
                result: storageStats
            });
            
            console.log('✅ Test 5 passed');
            
            testResults.endTime = new Date();
            testResults.duration = testResults.endTime - testResults.startTime;
            
            console.log('🧪 All tests completed successfully!');
            console.log(`   Duration: ${testResults.duration}ms`);
            console.log(`   Tests passed: ${testResults.tests.filter(t => t.success).length}/${testResults.tests.length}`);
            
            return testResults;
            
        } catch (error) {
            console.error('🧪 Test suite failed:', error);
            testResults.success = false;
            testResults.error = error.message;
            testResults.endTime = new Date();
            testResults.duration = testResults.endTime - testResults.startTime;
            
            return testResults;
        }
    }

    /**
     * Test stored route vs OSRM performance comparison
     * @returns {Promise<Object>} Performance comparison results
     */
    async testPerformanceComparison() {
        console.log('🏁 Testing performance: Stored Route vs OSRM');
        
        const testResults = {
            storedRoute: {},
            osrmRoute: {},
            comparison: {}
        };
        
        try {
            // Test stored route performance
            console.log('🏁 Testing stored route retrieval...');
            const storedStartTime = Date.now();
            
            const storedResult = await this.storedRouteService.getTourRoute();
            const storedEndTime = Date.now();
            
            testResults.storedRoute = {
                success: storedResult.success,
                duration: storedEndTime - storedStartTime,
                source: storedResult.source,
                available: storedResult.success
            };
            
            console.log(`   Stored route: ${testResults.storedRoute.duration}ms`);
            
            // Test OSRM route performance
            console.log('🏁 Testing OSRM route calculation...');
            const osrmStartTime = Date.now();
            
            const sortedPOIs = this.poiData.sort((a, b) => a.order - b.order);
            const osrmResult = await this.osmRoutingService.calculateTourRoute(sortedPOIs);
            const osrmEndTime = Date.now();
            
            testResults.osrmRoute = {
                success: osrmResult.success,
                duration: osrmEndTime - osrmStartTime,
                fallbackSegments: osrmResult.fallbackSegments || 0
            };
            
            console.log(`   OSRM route: ${testResults.osrmRoute.duration}ms`);
            
            // Calculate comparison
            if (testResults.storedRoute.success && testResults.osrmRoute.success) {
                const speedImprovement = ((testResults.osrmRoute.duration - testResults.storedRoute.duration) / testResults.osrmRoute.duration) * 100;
                
                testResults.comparison = {
                    storedRouteFaster: testResults.storedRoute.duration < testResults.osrmRoute.duration,
                    speedImprovementPercent: speedImprovement,
                    timeSavedMs: testResults.osrmRoute.duration - testResults.storedRoute.duration,
                    recommendation: speedImprovement > 50 ? 'Use stored routes for better performance' : 'Minimal performance difference'
                };
                
                console.log('🏁 Performance Comparison Results:');
                console.log(`   Stored route is ${speedImprovement.toFixed(1)}% faster`);
                console.log(`   Time saved: ${testResults.comparison.timeSavedMs}ms`);
                console.log(`   Recommendation: ${testResults.comparison.recommendation}`);
            }
            
            return testResults;
            
        } catch (error) {
            console.error('🏁 Performance test failed:', error);
            testResults.error = error.message;
            return testResults;
        }
    }

    /**
     * Generate debug report
     * @returns {Promise<Object>} Debug report
     */
    async generateDebugReport() {
        console.log('📊 Generating debug report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            system: {
                userAgent: navigator.userAgent,
                localStorage: typeof localStorage !== 'undefined',
                indexedDB: typeof indexedDB !== 'undefined'
            },
            services: {},
            storage: {},
            routes: {},
            performance: {},
            recommendations: []
        };
        
        try {
            // Service status
            report.services = {
                osmRouting: !!this.osmRoutingService,
                routeStorage: !!this.routeStorageService,
                routeBackend: !!this.routeBackendService,
                storedRoute: !!this.storedRouteService
            };
            
            // Storage information
            report.storage = await this.routeStorageService.getStorageStats();
            
            // Backend status
            report.backend = await this.routeBackendService.getBackendStatus();
            
            // Available routes
            const storedRoutes = await this.routeStorageService.listStoredRoutes();
            report.routes = {
                count: storedRoutes.length,
                routes: storedRoutes.map(route => ({
                    id: route.id,
                    calculationDate: route.calculationDate,
                    totalDistance: route.totalDistance,
                    totalDuration: route.totalDuration,
                    poiCount: route.poiCount
                }))
            };
            
            // Performance test
            if (storedRoutes.length > 0) {
                report.performance = await this.testPerformanceComparison();
            }
            
            // Generate recommendations
            report.recommendations = this.generateRecommendations(report);
            
            console.log('✅ Debug report generated');
            return report;
            
        } catch (error) {
            console.error('📊 Failed to generate debug report:', error);
            report.error = error.message;
            return report;
        }
    }

    /**
     * Generate recommendations based on debug report
     * @param {Object} report - Debug report data
     * @returns {Array} Array of recommendations
     */
    generateRecommendations(report) {
        const recommendations = [];
        
        // Storage recommendations
        if (report.storage.routeCount === 0) {
            recommendations.push({
                type: 'action',
                priority: 'high',
                message: 'No stored routes found. Calculate and store tour route for better performance.',
                action: 'calculateAndStoreTourRoute'
            });
        }
        
        if (report.storage.routeCount > 5) {
            recommendations.push({
                type: 'maintenance',
                priority: 'medium',
                message: 'Multiple stored routes found. Consider cleaning up old routes.',
                action: 'cleanupOldRoutes'
            });
        }
        
        // Performance recommendations
        if (report.performance.comparison && report.performance.comparison.speedImprovementPercent > 50) {
            recommendations.push({
                type: 'optimization',
                priority: 'high',
                message: `Stored routes are ${report.performance.comparison.speedImprovementPercent.toFixed(1)}% faster. Use stored routes for better performance.`,
                action: 'preferStoredRoutes'
            });
        }
        
        // Backend recommendations
        if (report.backend.isCalculating) {
            recommendations.push({
                type: 'status',
                priority: 'info',
                message: 'Route calculation in progress. Wait for completion before starting guidance.',
                action: 'waitForCalculation'
            });
        }
        
        return recommendations;
    }

    /**
     * Execute debug recommendation
     * @param {string} action - Action to execute
     * @returns {Promise<Object>} Action result
     */
    async executeRecommendation(action) {
        console.log(`🔧 Executing recommendation: ${action}`);
        
        try {
            switch (action) {
                case 'calculateAndStoreTourRoute':
                    return await this.routeBackendService.calculateAndStoreTourRoute();
                    
                case 'cleanupOldRoutes':
                    return await this.cleanupOldRoutes();
                    
                case 'preferStoredRoutes':
                    this.storedRouteService.setPreferStoredRoutes(true);
                    return { success: true, message: 'Enabled prefer stored routes' };
                    
                case 'waitForCalculation':
                    return await this.waitForCalculationComplete();
                    
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            console.error(`🔧 Failed to execute recommendation ${action}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Cleanup old routes (keep only latest 3)
     * @returns {Promise<Object>} Cleanup result
     */
    async cleanupOldRoutes() {
        const storedRoutes = await this.routeStorageService.listStoredRoutes();
        
        if (storedRoutes.length <= 3) {
            return { success: true, message: 'No cleanup needed', routeCount: storedRoutes.length };
        }
        
        // Sort by calculation date, keep newest 3
        storedRoutes.sort((a, b) => new Date(b.calculationDate) - new Date(a.calculationDate));
        const routesToDelete = storedRoutes.slice(3);
        
        let deletedCount = 0;
        for (const route of routesToDelete) {
            const deleted = await this.routeStorageService.deleteRoute(route.id);
            if (deleted) deletedCount++;
        }
        
        return {
            success: true,
            message: `Cleaned up ${deletedCount} old routes`,
            deletedCount: deletedCount,
            remainingCount: storedRoutes.length - deletedCount
        };
    }

    /**
     * Wait for route calculation to complete
     * @returns {Promise<Object>} Wait result
     */
    async waitForCalculationComplete() {
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait
        
        while (this.routeBackendService.isCalculatingRoute() && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
            
            const progress = this.routeBackendService.getCalculationProgress();
            console.log(`   Waiting for calculation... ${progress}%`);
        }
        
        if (attempts >= maxAttempts) {
            return { success: false, error: 'Calculation timeout' };
        }
        
        return { success: true, message: 'Calculation completed', waitTime: attempts };
    }

    /**
     * Create debug UI elements for browser testing
     */
    createDebugUI() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'route-storage-debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 600px;
            background: #fff;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 16px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        debugPanel.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #333;">🔧 Route Storage Debug</h3>
            <div id="debug-status" style="margin-bottom: 16px; padding: 8px; background: #f0f0f0; border-radius: 4px;">
                Status: Initializing...
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button onclick="routeDebugger.testRouteCalculationAndStorage()" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">
                    🧪 Test Route Calculation & Storage
                </button>
                <button onclick="routeDebugger.testPerformanceComparison()" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">
                    🏁 Test Performance Comparison
                </button>
                <button onclick="routeDebugger.generateDebugReport()" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">
                    📊 Generate Debug Report
                </button>
                <button onclick="routeDebugger.routeStorageService.clearAllRoutes()" style="padding: 8px; border: 1px solid #f44; border-radius: 4px; cursor: pointer; color: #f44;">
                    🗑️ Clear All Routes
                </button>
            </div>
            <div id="debug-output" style="margin-top: 16px; padding: 8px; background: #f8f8f8; border-radius: 4px; max-height: 300px; overflow-y: auto; font-size: 11px;">
                Debug output will appear here...
            </div>
        `;
        
        document.body.appendChild(debugPanel);
        
        // Update status
        this.updateDebugStatus();
        
        // Make debugger globally accessible for button clicks
        window.routeDebugger = this;
        
        console.log('🔧 Debug UI created');
    }

    /**
     * Update debug status display
     */
    async updateDebugStatus() {
        const statusElement = document.getElementById('debug-status');
        if (!statusElement) return;
        
        try {
            const backendStatus = await this.routeBackendService.getBackendStatus();
            const storageStats = await this.routeStorageService.getStorageStats();
            
            statusElement.innerHTML = `
                <strong>Backend:</strong> ${backendStatus.isCalculating ? 'Calculating...' : 'Ready'}<br>
                <strong>Stored Routes:</strong> ${storageStats.routeCount}<br>
                <strong>Total Distance:</strong> ${(storageStats.totalDistance / 1000).toFixed(1)}km<br>
                <strong>Storage Size:</strong> ${(storageStats.totalSize / 1024).toFixed(1)}KB
            `;
        } catch (error) {
            statusElement.innerHTML = `<span style="color: red;">Error: ${error.message}</span>`;
        }
    }

    /**
     * Log debug output to UI
     * @param {string} message - Message to log
     */
    logToUI(message) {
        const outputElement = document.getElementById('debug-output');
        if (!outputElement) return;
        
        const timestamp = new Date().toLocaleTimeString();
        outputElement.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        outputElement.scrollTop = outputElement.scrollHeight;
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Debug mode state
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.routeBackendService.setDebugMode(enabled);
        console.log(`🔧 Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}