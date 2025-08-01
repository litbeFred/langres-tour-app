import { ICameraService } from '../../interfaces/IMediaServices.js';
import { IStorageService } from '../../interfaces/IStorageService.js';

/**
 * Camera Service Implementation
 * Single Responsibility: Handle camera and photo functionality
 * Open/Closed: Extensible for different camera backends
 * Liskov Substitution: Can substitute ICameraService
 * Interface Segregation: Focused camera interface
 * Dependency Inversion: Depends on storage abstraction
 */
export class CameraService extends ICameraService {
    constructor(storageService) {
        super();
        this.storageService = storageService;
    }

    // Core Camera Methods
    async takePicture(poiId) {
        try {
            // Web Camera API implementation (KISS - simple camera access)
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                });

                return new Promise((resolve) => {
                    const video = document.createElement('video');
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    
                    video.srcObject = stream;
                    video.play();
                    
                    const modal = this.createCameraModal(video, canvas, context, stream, poiId, resolve);
                    document.body.appendChild(modal);
                });
            } else {
                throw new Error('Camera not available');
            }
        } catch (error) {
            console.error('Camera error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // UI Creation Method (Single Responsibility)
    createCameraModal(video, canvas, context, stream, poiId, resolve) {
        const modal = document.createElement('div');
        modal.className = 'camera-modal';
        modal.innerHTML = `
            <div class="camera-content">
                <div class="camera-preview"></div>
                <div class="camera-controls">
                    <button id="capture-btn" class="btn-capture">📷 Capturer</button>
                    <button id="cancel-btn" class="btn-cancel">❌ Annuler</button>
                </div>
            </div>
        `;
        
        document.querySelector('.camera-preview').appendChild(video);
        
        // Capture functionality
        document.getElementById('capture-btn').onclick = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);
            
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            this.storageService.savePhoto(poiId, imageData);
            
            this.cleanupCamera(stream, modal);
            
            resolve({
                success: true,
                imageUrl: imageData
            });
        };
        
        // Cancel functionality
        document.getElementById('cancel-btn').onclick = () => {
            this.cleanupCamera(stream, modal);
            resolve({ success: false, error: 'Annulé par l\'utilisateur' });
        };

        return modal;
    }

    // Cleanup Method (KISS - simple cleanup)
    cleanupCamera(stream, modal) {
        stream.getTracks().forEach(track => track.stop());
        modal.remove();
    }

    // Photo Retrieval
    getPhotosForPOI(poiId) {
        return this.storageService.getPhotos().filter(photo => photo.poiId === poiId);
    }
}