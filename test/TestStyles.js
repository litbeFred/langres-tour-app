/**
 * CSS Styles component for test interface
 * Follows Single Responsibility Principle - handles only styling
 */
export class TestStyles {
    static getCSS() {
        return `
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
            }
            
            .container {
                display: grid;
                grid-template-columns: 1fr 400px;
                gap: 20px;
                max-width: 1400px;
                margin: 0 auto;
            }
            
            .map-section {
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .control-panel {
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                height: fit-content;
            }
            
            #map {
                height: 500px;
                border-radius: 4px;
                border: 2px solid #ddd;
            }
            
            .test-section {
                margin: 15px 0;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 6px;
                background: #f8f9fa;
            }
            
            .status-section {
                margin: 10px 0;
                padding: 10px;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .success { 
                background-color: #d4edda; 
                border-left: 4px solid #28a745; 
            }
            
            .error { 
                background-color: #f8d7da; 
                border-left: 4px solid #dc3545; 
            }
            
            .info { 
                background-color: #d1ecf1; 
                border-left: 4px solid #17a2b8; 
            }
            
            .warning { 
                background-color: #fff3cd; 
                border-left: 4px solid #ffc107; 
            }
            
            button {
                margin: 5px;
                padding: 8px 16px;
                background-color: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            }
            
            button:hover { 
                background-color: #0056b3; 
            }
            
            button:disabled { 
                background-color: #6c757d; 
                cursor: not-allowed; 
            }
            
            button.success { 
                background-color: #28a745; 
            }
            
            button.success:hover { 
                background-color: #218838; 
            }
            
            button.danger { 
                background-color: #dc3545; 
            }
            
            button.danger:hover { 
                background-color: #c82333; 
            }
            
            button.warning { 
                background-color: #ffc107; 
                color: #212529; 
            }
            
            button.warning:hover { 
                background-color: #e0a800; 
            }
            
            .position-controls {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin: 10px 0;
            }
            
            .position-display {
                background: #e9ecef;
                padding: 8px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
            }
            
            #log {
                height: 200px;
                overflow-y: auto;
                background-color: #f8f9fa;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
                white-space: pre-wrap;
            }
            
            .poi-list {
                max-height: 150px;
                overflow-y: auto;
                background: #f8f9fa;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 8px;
            }
            
            .poi-item {
                padding: 5px;
                margin: 2px 0;
                background: white;
                border-radius: 3px;
                cursor: pointer;
                font-size: 13px;
                transition: background-color 0.2s;
            }
            
            .poi-item:hover {
                background: #e9ecef;
            }
            
            .poi-item.current {
                background: #cce5ff;
                border-left: 3px solid #007bff;
            }

            /* Crossroad Snapshot Styles - Always visible, no animations */
            #crossroadSnapshot {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                height: 300px;
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(15px);
                border: 2px solid rgba(74, 144, 226, 0.3);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                z-index: 2000;
                overflow: hidden;
                /* Always visible - no transforms or transitions on container */
                opacity: 1;
                display: block;
            }

            #crossroadSnapshot.visible {
                opacity: 1;
            }

            #crossroadSnapshot.hidden {
                opacity: 0.4;
            }

            .crossroad-map-container {
                width: 100%;
                height: 220px;
                border-radius: 15px 15px 0 0;
                overflow: hidden;
                position: relative;
                background: #f8fafc;
            }

            .crossroad-info-panel {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 80px;
                background: linear-gradient(135deg, rgba(74, 144, 226, 0.95), rgba(99, 102, 241, 0.95));
                backdrop-filter: blur(10px);
                color: white;
                padding: 15px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .crossroad-title {
                font-size: 16px;
                font-weight: 600;
                margin: 0;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }

            .crossroad-distance {
                font-size: 12px;
                opacity: 0.9;
                margin-top: 3px;
            }

            .crossroad-compass {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transform-origin: center;
                transition: transform 0.3s ease;
            }

            /* Enhanced crossroad markers for multiple crossroads */
            .crossroad-marker {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 15px;
                padding: 8px 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                border: 2px solid rgba(74, 144, 226, 0.4);
                backdrop-filter: blur(10px);
                min-width: 120px;
                text-align: center;
            }

            .crossroad-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-bottom: 5px;
            }

            .crossroad-number {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: linear-gradient(135deg, #4a90e2, #6366f1);
                color: white;
                font-size: 12px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .crossroad-direction {
                font-size: 16px;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
            }

            .crossroad-instruction {
                font-size: 11px;
                color: #2d3748;
                font-weight: 500;
                line-height: 1.3;
                max-width: 100px;
                word-wrap: break-word;
            }

            /* User position marker with direction */
            .user-position-marker {
                background: linear-gradient(135deg, #48bb78, #38a169);
                border-radius: 50%;
                box-shadow: 0 0 0 3px rgba(72, 187, 120, 0.3);
                animation: pulse 2s infinite;
                position: relative;
            }

            .user-direction-arrow {
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 12px solid #2d3748;
                transform-origin: 50% 100%;
            }

            /* Route highlighting for crossroad view */
            .crossroad-route-highlight {
                stroke: #4a90e2 !important;
                stroke-width: 6 !important;
                stroke-opacity: 0.8 !important;
                stroke-dasharray: 10, 5 !important;
                animation: dashFlow 2s linear infinite;
            }

            @keyframes dashFlow {
                0% { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: 30; }
            }

            /* Multiple crossroads indicator */
            .multiple-crossroads-indicator {
                position: absolute;
                top: 10px;
                left: 10px;
                background: rgba(255, 193, 7, 0.9);
                color: #000;
                padding: 4px 8px;
                border-radius: 8px;
                font-size: 10px;
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            /* Rotation animation for map orientation */
            .map-rotating {
                animation: smoothRotate 0.6s ease-in-out;
            }

            @keyframes smoothRotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(var(--rotation-angle, 0deg)); }
            }

            /* Default state styles */
            .default-snapshot-state {
                background: rgba(255, 255, 255, 0.9);
                border-radius: 12px;
                padding: 8px 12px;
                text-align: center;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(74, 144, 226, 0.3);
            }

            .default-icon {
                font-size: 18px;
                margin-bottom: 2px;
            }

            .default-text {
                font-size: 10px;
                color: #666;
                font-weight: 500;
            }

            #crossroadSnapshot::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 30px;
                background: linear-gradient(135deg, #007bff, #0056b3);
                z-index: 1;
            }

            #crossroadSnapshot::after {
                content: '🛣️ Aperçu du carrefour';
                position: absolute;
                top: 5px;
                left: 15px;
                color: white;
                font-size: 12px;
                font-weight: bold;
                z-index: 2;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
            }

            /* Crossroad Markers */
            .crossroad-marker {
                text-align: center;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 8px;
                padding: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                border: 2px solid #007bff;
                min-width: 100px;
            }

            .crossroad-icon {
                font-size: 18px;
                margin-bottom: 4px;
            }

            .crossroad-instruction {
                font-size: 10px;
                font-weight: bold;
                color: #007bff;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* User Direction Icon */
            .user-direction-icon {
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
                transition: transform 0.3s ease;
            }

            /* Route Direction Arrows */
            .route-direction-arrow {
                color: #FF4444;
                font-size: 12px;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.2); opacity: 1; }
            }

            /* Compass Indicator */
            .compass-indicator {
                background: rgba(255, 255, 255, 0.9);
                border-radius: 50%;
                width: 40px;
                height: 40px;
                border: 2px solid #007bff;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }

            .compass-rose {
                position: relative;
                width: 100%;
                height: 100%;
                border-radius: 50%;
            }

            .compass-needle {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 2px;
                height: 15px;
                background: #FF4444;
                transform: translate(-50%, -100%);
                border-radius: 1px;
            }

            .compass-needle::after {
                content: '';
                position: absolute;
                top: -3px;
                left: -2px;
                width: 0;
                height: 0;
                border-left: 3px solid transparent;
                border-right: 3px solid transparent;
                border-bottom: 6px solid #FF4444;
            }

            .compass-n {
                position: absolute;
                top: 2px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 10px;
                font-weight: bold;
                color: #007bff;
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                #crossroadSnapshot {
                    width: 250px;
                    height: 200px;
                    top: 10px;
                    right: 10px;
                }
                
                .crossroad-instruction {
                    font-size: 9px;
                }
            }
            
            h1 {
                text-align: center;
                color: #333;
                margin-bottom: 30px;
            }
            
            h2 {
                color: #555;
                margin-top: 0;
                font-size: 18px;
            }
            
            .virtual-controls {
                background: #fff3cd;
                border: 1px solid #ffc107;
                border-radius: 4px;
                padding: 10px;
                margin: 10px 0;
            }
            
            input[type="number"] {
                width: 100%;
                padding: 5px;
                border: 1px solid #ddd;
                border-radius: 3px;
                font-size: 14px;
            }
            
            label {
                display: block;
                margin: 5px 0 2px 0;
                font-weight: bold;
                font-size: 13px;
            }
            
            .hidden {
                display: none;
            }
            
            #crossroadMap {
                height: 180px;
                border: none;
                border-radius: 12px;
                margin-top: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                overflow: hidden;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            }

            .crossroad-section {
                margin-top: 15px;
                padding: 15px;
                border: none;
                border-radius: 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
                display: none;
                -webkit-backdrop-filter: blur(10px);
                backdrop-filter: blur(10px);
            }

            .crossroad-section h3 {
                margin-top: 0;
                color: #ffffff;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                font-weight: 600;
            }

            .crossroad-info {
                margin-top: 8px;
                text-align: center;
                opacity: 0.9;
                font-style: italic;
                margin-bottom: 10px;
                font-weight: bold;
                color: #333;
            }

            .crossroad-info small {
                color: #f0f8ff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }

            .turn-arrow {
                background: rgba(255, 255, 255, 0.9);
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                border: 2px solid #FF5722;
            }

            .instruction-point {
                background-color: #ff6b35;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 0 4px rgba(0,0,0,0.5);
            }
        `;
    }

    static injectStyles() {
        const existingStyle = document.getElementById('test-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'test-styles';
        style.textContent = this.getCSS();
        document.head.appendChild(style);
    }
}
