/**
 * Storage Service Interface
 * Single responsibility: Handle data persistence
 */
export class IStorageService {
    /**
     * Save tour progress
     * @param {Object} progress - Progress data
     */
    saveTourProgress(progress) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get tour progress
     * @returns {Object} Progress data
     */
    getTourProgress() {
        throw new Error('Method must be implemented');
    }

    /**
     * Save photo data
     * @param {number} poiId - POI identifier
     * @param {string} photoData - Photo data
     */
    savePhoto(poiId, photoData) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get all photos
     * @returns {Array} Array of photo objects
     */
    getPhotos() {
        throw new Error('Method must be implemented');
    }

    /**
     * Clear all stored data
     */
    clearAll() {
        throw new Error('Method must be implemented');
    }
}