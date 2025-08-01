import { IStorageService } from '../../interfaces/IStorageService.js';

/**
 * Storage Service Implementation
 * Single Responsibility: Handle data persistence and retrieval
 * Open/Closed: Extensible for different storage backends
 * Liskov Substitution: Can substitute IStorageService
 * Interface Segregation: Focused storage interface
 * Dependency Inversion: Depends on storage abstraction
 */
export class StorageService extends IStorageService {
    constructor() {
        super();
        this.storageKey = 'langres_tour_data';
        this.photosKey = 'langres_photos';
    }

    // Tour Progress Management (KISS - simple data operations)
    saveTourProgress(progress) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(progress));
        } catch (error) {
            console.error('Failed to save tour progress:', error);
        }
    }

    getTourProgress() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : { 
                visitedPOIs: [], 
                photos: [], 
                startTime: null,
                lastVisitTime: null 
            };
        } catch (error) {
            console.error('Failed to get tour progress:', error);
            return { visitedPOIs: [], photos: [], startTime: null, lastVisitTime: null };
        }
    }

    // Photo Management (Single Responsibility)
    savePhoto(poiId, photoData) {
        try {
            const photos = this.getPhotos();
            photos.push({
                id: Date.now(),
                poiId,
                timestamp: new Date().toISOString(),
                data: photoData
            });
            localStorage.setItem(this.photosKey, JSON.stringify(photos));
        } catch (error) {
            console.error('Failed to save photo:', error);
        }
    }

    getPhotos() {
        try {
            const data = localStorage.getItem(this.photosKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get photos:', error);
            return [];
        }
    }

    // Utility Methods
    clearAll() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.photosKey);
        } catch (error) {
            console.error('Failed to clear storage:', error);
        }
    }
}