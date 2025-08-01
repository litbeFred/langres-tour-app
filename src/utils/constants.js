/**
 * Application Constants
 * Single place for configuration values (KISS principle)
 */

export const APP_CONFIG = {
    // Default Langres coordinates
    DEFAULT_LOCATION: {
        latitude: 47.8625,
        longitude: 5.3350
    },
    
    // Map settings
    MAP_CONFIG: {
        defaultZoom: 16,
        minZoom: 12,
        maxZoom: 19,
        tileServer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
    },
    
    // GPS settings
    GPS_CONFIG: {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
        watchTimeout: 15000,
        watchMaxAge: 30000
    },
    
    // Camera settings
    CAMERA_CONFIG: {
        video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        },
        imageQuality: 0.8
    },
    
    // Audio settings
    AUDIO_CONFIG: {
        defaultLanguage: 'fr-FR',
        rate: 0.9,
        pitch: 1,
        volume: 0.8,
        availableLanguages: {
            'fr-FR': 'Français',
            'en-US': 'English',
            'de-DE': 'Deutsch',
            'es-ES': 'Español'
        }
    },
    
    // Notification settings
    NOTIFICATION_CONFIG: {
        autoRemoveDelay: 10000,
        proximityAlertDelay: 5000,
        proximityThreshold: 100,
        vibrationPattern: [200, 100, 200]
    },
    
    // Storage keys
    STORAGE_KEYS: {
        tourProgress: 'langres_tour_data',
        photos: 'langres_photos'
    }
};