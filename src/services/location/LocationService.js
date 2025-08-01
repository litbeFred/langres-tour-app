import { IGPSSimulator } from '../../interfaces/ILocationService.js';

/**
 * Location Service Implementation
 * Single Responsibility: Handle GPS location functionality
 * Open/Closed: Extensible through inheritance and composition
 * Liskov Substitution: Can substitute IGPSSimulator
 * Interface Segregation: Implements focused location interface
 * Dependency Inversion: Depends on abstractions
 */
export class LocationService extends IGPSSimulator {
    constructor() {
        super();
        this.watchId = null;
        this.currentPosition = null;
        this.callbacks = [];
        this.simulatedMode = false;
        this.simulatedPosition = {
            coords: {
                latitude: 47.8625,  // Start at Langres center
                longitude: 5.3350,
                accuracy: 10
            },
            timestamp: Date.now()
        };
    }

    // GPS Simulation Methods (KISS principle - simple and focused)
    enableSimulatedMode() {
        this.simulatedMode = true;
        console.log('📍 Simulated GPS mode enabled');
    }

    disableSimulatedMode() {
        this.simulatedMode = false;
        console.log('📍 Real GPS mode enabled');
    }

    setSimulatedPosition(lat, lon) {
        this.simulatedPosition.coords.latitude = lat;
        this.simulatedPosition.coords.longitude = lon;
        this.simulatedPosition.timestamp = Date.now();
        
        if (this.simulatedMode) {
            this.currentPosition = this.simulatedPosition;
            this.callbacks.forEach(cb => cb(this.simulatedPosition));
        }
    }

    moveSimulatedPosition(deltaLat, deltaLon) {
        this.setSimulatedPosition(
            this.simulatedPosition.coords.latitude + deltaLat,
            this.simulatedPosition.coords.longitude + deltaLon
        );
    }

    // Core Location Methods
    async getCurrentPosition() {
        if (this.simulatedMode) {
            return Promise.resolve(this.simulatedPosition);
        }
        
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
        });
    }

    startWatching(callback) {
        this.callbacks.push(callback);
        
        if (this.simulatedMode) {
            // In simulated mode, just call the callback with current position
            this.currentPosition = this.simulatedPosition;
            callback(this.simulatedPosition);
            return;
        }
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = position;
                this.callbacks.forEach(cb => cb(position));
            },
            (error) => console.error('GPS Error:', error),
            { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
        );
    }

    stopWatching() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    // Utility Methods (Single Responsibility)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }
}