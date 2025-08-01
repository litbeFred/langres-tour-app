/**
 * Audio Service Interface
 * Single responsibility: Handle audio-related functionality
 */
export class IAudioService {
    /**
     * Speak text using text-to-speech
     * @param {string} text - Text to speak
     * @param {string} language - Language code (optional)
     */
    speak(text, language) {
        throw new Error('Method must be implemented');
    }

    /**
     * Toggle audio on/off
     * @returns {boolean} New audio state
     */
    toggle() {
        throw new Error('Method must be implemented');
    }

    /**
     * Stop current speech
     */
    stop() {
        throw new Error('Method must be implemented');
    }
}

/**
 * Camera Service Interface
 * Single responsibility: Handle camera and photo functionality
 */
export class ICameraService {
    /**
     * Take a picture
     * @param {number} poiId - POI identifier
     * @returns {Promise<Object>} Result object with success status
     */
    takePicture(poiId) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get photos for a specific POI
     * @param {number} poiId - POI identifier
     * @returns {Array} Array of photo objects
     */
    getPhotosForPOI(poiId) {
        throw new Error('Method must be implemented');
    }
}

/**
 * Notification Service Interface
 * Single responsibility: Handle notifications and alerts
 */
export class INotificationService {
    /**
     * Show POI discovery notification
     * @param {Object} poi - POI object
     */
    showPOINotification(poi) {
        throw new Error('Method must be implemented');
    }

    /**
     * Show proximity alert
     * @param {Object} poi - POI object
     * @param {number} distance - Distance to POI
     */
    showProximityAlert(poi, distance) {
        throw new Error('Method must be implemented');
    }

    /**
     * Show in-app notification
     * @param {Object} poi - POI object
     */
    showInAppNotification(poi) {
        throw new Error('Method must be implemented');
    }
}