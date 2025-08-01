/**
 * Location Service Interface
 * Defines the contract for location-based services following Interface Segregation Principle
 */
export class ILocationService {
    /**
     * Get current position
     * @returns {Promise<GeolocationPosition>}
     */
    getCurrentPosition() {
        throw new Error('Method must be implemented');
    }

    /**
     * Start watching position changes
     * @param {Function} callback - Position update callback
     */
    startWatching(callback) {
        throw new Error('Method must be implemented');
    }

    /**
     * Stop watching position changes
     */
    stopWatching() {
        throw new Error('Method must be implemented');
    }

    /**
     * Calculate distance between two points
     * @param {number} lat1 
     * @param {number} lon1 
     * @param {number} lat2 
     * @param {number} lon2 
     * @returns {number} Distance in meters
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        throw new Error('Method must be implemented');
    }
}

/**
 * GPS Simulator Interface - extends location service for testing
 */
export class IGPSSimulator extends ILocationService {
    /**
     * Enable simulated GPS mode
     */
    enableSimulatedMode() {
        throw new Error('Method must be implemented');
    }

    /**
     * Disable simulated GPS mode
     */
    disableSimulatedMode() {
        throw new Error('Method must be implemented');
    }

    /**
     * Set simulated position
     * @param {number} lat 
     * @param {number} lon 
     */
    setSimulatedPosition(lat, lon) {
        throw new Error('Method must be implemented');
    }

    /**
     * Move simulated position by delta
     * @param {number} deltaLat 
     * @param {number} deltaLon 
     */
    moveSimulatedPosition(deltaLat, deltaLon) {
        throw new Error('Method must be implemented');
    }
}