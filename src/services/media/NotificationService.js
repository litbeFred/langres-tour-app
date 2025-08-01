import { INotificationService } from '../../interfaces/IMediaServices.js';

/**
 * Notification Service Implementation
 * Single Responsibility: Handle notifications and alerts
 * Open/Closed: Extensible for different notification backends
 * Liskov Substitution: Can substitute INotificationService
 * Interface Segregation: Focused notification interface
 * Dependency Inversion: Depends on notification abstraction
 */
export class NotificationService extends INotificationService {
    constructor() {
        super();
        this.permission = null;
        this.init();
    }

    // Initialization (KISS - simple permission request)
    async init() {
        if ('Notification' in window) {
            this.permission = await Notification.requestPermission();
        }
    }

    // Core Notification Methods
    showPOINotification(poi) {
        this.showInAppNotification(poi);

        // Browser notification (if permission granted)
        if (this.permission === 'granted') {
            new Notification(`Point d'intérêt découvert!`, {
                body: poi.name,
                icon: '/vite.svg',
                badge: '/vite.svg',
                tag: `poi-${poi.id}`,
                requireInteraction: true
            });
        }

        // Haptic feedback (if available)
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
    }

    showInAppNotification(poi) {
        const notification = this.createNotificationElement(poi);
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds (KISS - simple timeout)
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    showProximityAlert(poi, distance) {
        const existing = document.querySelector('.proximity-alert');
        if (existing) existing.remove();

        const alert = this.createProximityAlertElement(poi, distance);
        document.body.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => alert.remove(), 5000);
    }

    // UI Creation Methods (Single Responsibility)
    createNotificationElement(poi) {
        const notification = document.createElement('div');
        notification.className = 'notification-popup';
        notification.innerHTML = `
            <div class="notification-content">
                <h3>🏛️ Point d'intérêt découvert!</h3>
                <h4>${poi.name}</h4>
                <p>${poi.description}</p>
                <div class="notification-actions">
                    <button onclick="window.app.showPOIDetails(${poi.id})" class="btn-details">En savoir plus</button>
                    <button onclick="window.app.services.audio.speak('${poi.description.replace(/'/g, "\\'")}')" class="btn-listen">🔊</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-close">✕</button>
                </div>
            </div>
        `;
        return notification;
    }

    createProximityAlertElement(poi, distance) {
        const alert = document.createElement('div');
        alert.className = 'proximity-alert';
        alert.innerHTML = `
            <div class="alert-content">
                <p>📍 ${poi.name} à ${Math.round(distance)}m</p>
                <button onclick="this.parentElement.parentElement.remove()" class="btn-dismiss">✓</button>
            </div>
        `;
        return alert;
    }
}