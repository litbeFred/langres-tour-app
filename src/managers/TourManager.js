/**
 * Tour Manager Implementation
 * Single Responsibility: Handle tour business logic and POI management
 * Open/Closed: Extensible for different tour types
 * Liskov Substitution: Can be extended with specialized tour managers
 * Interface Segregation: Focused tour management interface
 * Dependency Inversion: Depends on service abstractions
 */
export class TourManager {
    constructor(locationService, storageService, audioService, notificationService, tourData) {
        this.locationService = locationService;
        this.storageService = storageService;
        this.audioService = audioService;
        this.notificationService = notificationService;
        this.pois = tourData;
        this.progress = this.storageService.getTourProgress();
        this.callbacks = [];
        this.proximityAlerts = new Set();
    }

    // Event Management (KISS - simple callback system)
    addProgressCallback(callback) {
        this.callbacks.push(callback);
    }

    // Core Tour Logic (Single Responsibility)
    checkProximity(userLat, userLon) {
        this.pois.forEach(poi => {
            const distance = this.locationService.calculateDistance(
                userLat, userLon, poi.lat, poi.lon
            );
            
            // Show proximity alert at 100m (KISS - simple distance check)
            if (distance <= 100 && distance > poi.proximityRadius && !this.proximityAlerts.has(poi.id)) {
                this.notificationService.showProximityAlert(poi, distance);
                this.proximityAlerts.add(poi.id);
            }
            
            // Trigger discovery at proximity radius
            if (distance <= poi.proximityRadius && !this.isPOIVisited(poi.id)) {
                this.triggerPOIDiscovery(poi);
            }
        });
    }

    // POI Discovery Logic (Single Responsibility)
    triggerPOIDiscovery(poi) {
        if (!this.progress.visitedPOIs.includes(poi.id)) {
            this.progress.visitedPOIs.push(poi.id);
            this.progress.lastVisitTime = new Date().toISOString();
            this.storageService.saveTourProgress(this.progress);
            
            this.notificationService.showPOINotification(poi);
            this.audioService.speak(poi.description);
            
            this.callbacks.forEach(callback => callback('poi_discovered', poi));
        }
    }

    // Simulation Methods (for testing)
    simulatePOIDiscovery(poiId) {
        const poi = this.getPOI(poiId);
        if (poi && !this.isPOIVisited(poiId)) {
            this.triggerPOIDiscovery(poi);
        }
    }

    // POI Query Methods (KISS - simple data access)
    isPOIVisited(poiId) {
        return this.progress.visitedPOIs.includes(poiId);
    }

    getAllPOIs() {
        return this.pois.sort((a, b) => a.order - b.order);
    }

    getPOI(id) {
        return this.pois.find(poi => poi.id === id);
    }

    getNextPOI() {
        const unvisited = this.pois.filter(poi => !this.isPOIVisited(poi.id));
        return unvisited.sort((a, b) => a.order - b.order)[0];
    }

    // Progress Tracking (Single Responsibility)
    getTourProgress() {
        return {
            total: this.pois.length,
            visited: this.progress.visitedPOIs.length,
            percentage: Math.round((this.progress.visitedPOIs.length / this.pois.length) * 100),
            startTime: this.progress.startTime,
            lastVisitTime: this.progress.lastVisitTime
        };
    }

    startTour() {
        if (!this.progress.startTime) {
            this.progress.startTime = new Date().toISOString();
            this.storageService.saveTourProgress(this.progress);
        }
    }

    resetTour() {
        this.progress = { visitedPOIs: [], photos: [], startTime: null };
        this.proximityAlerts.clear();
        this.storageService.clearAll();
        this.callbacks.forEach(callback => callback('tour_reset'));
    }
}