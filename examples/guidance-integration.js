/**
 * Guidance System Integration Example
 * Demonstrates how to integrate the new guidance system into the Langres tour app
 */

import { GuidanceService } from '../src/services/guidance/index.js';
import { GuidanceTypes, GuidanceEvents } from '../src/interfaces/IGuidanceService.js';
import { OSMRoutingService, NavigationService } from '../src/services/routing/index.js';
import { AudioService } from '../src/services/media/index.js';

/**
 * Example integration of the Guidance System
 * This shows how to use the new guidance system in a real application
 */
class TourAppGuidanceIntegration {
    constructor() {
        this.guidanceService = null;
        this.currentTour = null;
        this.isInitialized = false;
    }
    
    /**
     * Initialize the guidance system with required services
     */
    async initializeGuidanceSystem() {
        try {
            console.log('🎯 Initializing Guidance System...');
            
            // Initialize underlying services
            const routingService = new OSMRoutingService();
            const audioService = new AudioService();
            const navigationService = new NavigationService(routingService, null, audioService);
            
            // Load POI data (this would come from your data source)
            const poiData = await this.loadTourPOIs();
            
            // Create guidance service
            this.guidanceService = new GuidanceService(
                navigationService,
                routingService,
                audioService,
                poiData
            );
            
            // Set up event listeners
            this.setupGuidanceEventListeners();
            
            // Configure default settings
            this.guidanceService.updateSettings({
                audioEnabled: true,
                language: 'fr-FR',
                deviationThreshold: 50,
                autoAdvanceToNextPOI: true,
                pauseAtPOI: true,
                tourCompletionCelebration: true
            });
            
            this.isInitialized = true;
            console.log('✅ Guidance System initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Guidance System:', error);
            throw error;
        }
    }
    
    /**
     * Start a guided tour through all Langres POIs
     */
    async startGuidedTour() {
        if (!this.isInitialized) {
            throw new Error('Guidance system not initialized');
        }
        
        try {
            console.log('🎯 Starting Langres guided tour...');
            
            // Load POIs for the tour
            const tourPOIs = await this.loadTourPOIs();
            
            // Start guided tour
            const success = await this.guidanceService.startGuidance({
                type: GuidanceTypes.GUIDED_TOUR,
                route: tourPOIs,
                options: {
                    audioEnabled: true,
                    autoAdvanceToNextPOI: true,
                    pauseAtPOI: true
                }
            });
            
            if (success) {
                this.currentTour = 'guided-tour';
                this.updateUIForGuidedTour();
                console.log('✅ Guided tour started successfully');
            } else {
                throw new Error('Failed to start guided tour');
            }
            
        } catch (error) {
            console.error('❌ Failed to start guided tour:', error);
            this.showErrorMessage('Impossible de démarrer la visite guidée', error.message);
        }
    }
    
    /**
     * Handle user position updates from GPS
     * @param {Array} position - [latitude, longitude]
     */
    async handlePositionUpdate(position) {
        if (!this.guidanceService || !this.currentTour) return;
        
        try {
            // Update guidance system with new position
            const guidanceUpdate = await this.guidanceService.updatePosition(position);
            
            if (guidanceUpdate.guidance) {
                this.updateNavigationUI(guidanceUpdate);
            }
            
        } catch (error) {
            console.error('❌ Error handling position update:', error);
        }
    }
    
    /**
     * Stop current guidance
     */
    async stopCurrentGuidance() {
        if (!this.guidanceService) return;
        
        try {
            await this.guidanceService.stopGuidance();
            this.currentTour = null;
            this.resetNavigationUI();
            console.log('✅ Guidance stopped');
            
        } catch (error) {
            console.error('❌ Error stopping guidance:', error);
        }
    }
    
    /**
     * Handle manual back-on-track request (when user manually requests correction)
     */
    async requestBackOnTrack() {
        if (!this.guidanceService) return;
        
        try {
            console.log('🔄 User requested back-on-track navigation...');
            
            // Get current position
            const currentPosition = await this.getCurrentPosition();
            
            // Get main tour route (stored from guided tour)
            const mainRoute = this.getMainTourRoute();
            
            if (!mainRoute) {
                throw new Error('No main route available for back-on-track');
            }
            
            // Start back-on-track guidance
            const success = await this.guidanceService.startGuidance({
                type: GuidanceTypes.BACK_ON_TRACK,
                userPosition: currentPosition,
                mainRoute: mainRoute
            });
            
            if (success) {
                this.currentTour = 'back-on-track';
                this.updateUIForBackOnTrack();
                console.log('✅ Back-on-track guidance started');
            }
            
        } catch (error) {
            console.error('❌ Failed to start back-on-track:', error);
            this.showErrorMessage('Impossible de revenir sur le parcours', error.message);
        }
    }
    
    /**
     * Setup event listeners for guidance events
     */
    setupGuidanceEventListeners() {
        this.guidanceService.addGuidanceListener((event, data) => {
            console.log(`📢 Guidance Event: ${event}`, data);
            
            switch (event) {
                case GuidanceEvents.TOUR_STARTED:
                    this.onTourStarted(data);
                    break;
                    
                case GuidanceEvents.POI_APPROACHED:
                    this.onPOIApproached(data);
                    break;
                    
                case GuidanceEvents.POI_REACHED:
                    this.onPOIReached(data);
                    break;
                    
                case GuidanceEvents.TOUR_COMPLETED:
                    this.onTourCompleted(data);
                    break;
                    
                case GuidanceEvents.DEVIATION_DETECTED:
                    this.onDeviationDetected(data);
                    break;
                    
                case GuidanceEvents.BACK_ON_TRACK_STARTED:
                    this.onBackOnTrackStarted(data);
                    break;
                    
                case GuidanceEvents.RETURNED_TO_MAIN_ROUTE:
                    this.onReturnedToMainRoute(data);
                    break;
                    
                case GuidanceEvents.GUIDANCE_ERROR:
                    this.onGuidanceError(data);
                    break;
            }
        });
    }
    
    // Event handlers
    onTourStarted(data) {
        this.showNotification(`Visite guidée démarrée - ${data.totalPOIs} points d'intérêt à découvrir`);
        this.updateTourProgress(0, data.totalPOIs);
    }
    
    onPOIApproached(data) {
        this.showPOINotification(`Vous approchez de ${data.poi.name}`, 'approach');
        this.highlightPOIOnMap(data.poi.id);
    }
    
    onPOIReached(data) {
        this.showPOIDetails(data.poi);
        this.updateTourProgress(data.poiIndex + 1, data.totalPOIs);
        this.celebratePOIReached(data.poi);
    }
    
    onTourCompleted(data) {
        this.showTourCompletionDialog(data);
        this.resetNavigationUI();
        this.currentTour = null;
    }
    
    onDeviationDetected(data) {
        this.showDeviationAlert(data.deviationDistance);
        this.offerBackOnTrackOption();
    }
    
    onBackOnTrackStarted(data) {
        this.showNotification('Recalcul de l\'itinéraire pour revenir sur le parcours');
        this.updateUIForBackOnTrack();
    }
    
    onReturnedToMainRoute(data) {
        this.showNotification('Parfait! Vous êtes de retour sur le parcours principal');
        this.updateUIForGuidedTour();
        this.currentTour = 'guided-tour';
    }
    
    onGuidanceError(data) {
        this.showErrorMessage('Erreur de navigation', data.error);
    }
    
    // UI update methods (these would interact with your actual UI framework)
    updateUIForGuidedTour() {
        // Update UI to show guided tour controls
        console.log('🎯 UI: Switched to guided tour mode');
        // Example: Show tour progress, next POI info, skip POI button
    }
    
    updateUIForBackOnTrack() {
        // Update UI to show back-on-track controls
        console.log('🔄 UI: Switched to back-on-track mode');
        // Example: Show deviation distance, correction route, cancel button
    }
    
    updateNavigationUI(guidanceUpdate) {
        // Update navigation UI with current guidance info
        console.log('🎯 UI: Navigation updated', guidanceUpdate);
        // Example: Update current instruction, progress, ETA
    }
    
    resetNavigationUI() {
        // Reset navigation UI to default state
        console.log('🎯 UI: Navigation reset');
    }
    
    showNotification(message) {
        console.log(`🔔 Notification: ${message}`);
        // Example: Show toast notification
    }
    
    showPOINotification(message, type) {
        console.log(`📍 POI Notification [${type}]: ${message}`);
        // Example: Show POI-specific notification
    }
    
    showPOIDetails(poi) {
        console.log(`📍 Showing POI details: ${poi.name}`);
        // Example: Show POI information panel
    }
    
    showDeviationAlert(distance) {
        console.log(`⚠️ Deviation Alert: ${distance.toFixed(0)}m from route`);
        // Example: Show deviation warning with correction options
    }
    
    showErrorMessage(title, message) {
        console.error(`❌ Error: ${title} - ${message}`);
        // Example: Show error dialog
    }
    
    showTourCompletionDialog(data) {
        console.log(`🎉 Tour completed! Visited ${data.poiVisited}/${data.totalPOIs} POIs`);
        // Example: Show celebration dialog with tour statistics
    }
    
    // Helper methods
    async loadTourPOIs() {
        // This would load your actual POI data
        return [
            { id: 1, name: 'Porte des Moulins', lat: 47.8644, lon: 5.3353, description: 'Point de départ du tour de Langres' },
            { id: 2, name: 'Tour Saint-Ferjeux', lat: 47.8654, lon: 5.3363, description: 'Tour historique des remparts' },
            { id: 3, name: 'Tour de Navarre', lat: 47.8664, lon: 5.3373, description: 'Fortification de la Renaissance' },
            // ... add more POIs
        ];
    }
    
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                position => resolve([position.coords.latitude, position.coords.longitude]),
                error => reject(error),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }
    
    getMainTourRoute() {
        // Return the main tour route if available
        return this.guidanceService?.getService('guided-tour')?.tourRoute?.route;
    }
    
    updateTourProgress(current, total) {
        console.log(`📊 Tour Progress: ${current}/${total} POIs visited`);
        // Update progress bar or indicator
    }
    
    highlightPOIOnMap(poiId) {
        console.log(`🗺️ Highlighting POI ${poiId} on map`);
        // Highlight POI marker on map
    }
    
    celebratePOIReached(poi) {
        console.log(`🎉 Celebrating POI reached: ${poi.name}`);
        // Show celebration animation or effect
    }
    
    offerBackOnTrackOption() {
        console.log('🔄 Offering back-on-track option to user');
        // Show "Return to route" button
    }
}

// Usage example
export async function initializeTourApp() {
    const tourApp = new TourAppGuidanceIntegration();
    
    try {
        // Initialize the guidance system
        await tourApp.initializeGuidanceSystem();
        
        // Set up GPS tracking
        navigator.geolocation.watchPosition(
            position => {
                tourApp.handlePositionUpdate([
                    position.coords.latitude, 
                    position.coords.longitude
                ]);
            },
            error => console.error('GPS error:', error),
            { enableHighAccuracy: true, maximumAge: 5000 }
        );
        
        // Return tour app instance for further use
        return tourApp;
        
    } catch (error) {
        console.error('Failed to initialize tour app:', error);
        throw error;
    }
}

export { TourAppGuidanceIntegration };