/**
 * Route Storage Service Implementation
 * Single Responsibility: Handle persistent storage and retrieval of pre-calculated routes
 * Open/Closed: Extensible for different storage backends (localStorage, IndexedDB, remote API)
 * Liskov Substitution: Can substitute any route storage interface
 * Interface Segregation: Focused route storage interface
 * Dependency Inversion: Depends on storage abstraction, not concrete implementation
 */
export class RouteStorageService {
    constructor(storageBackend = null) {
        this.storageBackend = storageBackend || this.createDefaultStorage();
        this.routeKey = 'langres_tour_routes';
        this.metadataKey = 'langres_route_metadata';
        this.versionKey = 'langres_route_version';
        
        // Current route format version for compatibility
        this.currentVersion = '1.0.0';
        
        console.log('💾 RouteStorageService initialized with storage backend');
    }

    /**
     * Create default localStorage-based storage
     * @returns {Object} Storage backend interface
     */
    createDefaultStorage() {
        return {
            get: (key) => {
                try {
                    const data = localStorage.getItem(key);
                    return data ? JSON.parse(data) : null;
                } catch (error) {
                    console.error(`Storage get error for key ${key}:`, error);
                    return null;
                }
            },
            
            set: (key, value) => {
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (error) {
                    console.error(`Storage set error for key ${key}:`, error);
                    return false;
                }
            },
            
            remove: (key) => {
                try {
                    localStorage.removeItem(key);
                    return true;
                } catch (error) {
                    console.error(`Storage remove error for key ${key}:`, error);
                    return false;
                }
            },
            
            clear: () => {
                try {
                    // Only clear route-related keys
                    const keys = Object.keys(localStorage).filter(key => 
                        key.startsWith('langres_tour_routes') || 
                        key.startsWith('langres_route_')
                    );
                    keys.forEach(key => localStorage.removeItem(key));
                    return true;
                } catch (error) {
                    console.error('Storage clear error:', error);
                    return false;
                }
            }
        };
    }

    /**
     * Store a complete tour route with metadata
     * @param {string} routeId - Unique identifier for the route
     * @param {Object} routeData - Complete route data from OSRM
     * @param {Object} metadata - Route metadata (POIs, creation date, etc.)
     * @returns {Promise<boolean>} Success status
     */
    async storeRoute(routeId, routeData, metadata = {}) {
        try {
            console.log(`💾 Storing route: ${routeId}`);
            
            // Validate route data
            if (!this.validateRouteData(routeData)) {
                throw new Error('Invalid route data provided');
            }

            // Prepare storage object
            const storageData = {
                id: routeId,
                version: this.currentVersion,
                timestamp: new Date().toISOString(),
                routeData: routeData,
                metadata: {
                    ...metadata,
                    totalDistance: routeData.summary?.distance || 0,
                    totalDuration: routeData.summary?.duration || 0,
                    segmentCount: routeData.segments?.length || 0,
                    poiCount: metadata.pois?.length || 0
                }
            };

            // Store main route data
            const routeKey = `${this.routeKey}_${routeId}`;
            const stored = this.storageBackend.set(routeKey, storageData);
            
            if (!stored) {
                throw new Error('Failed to store route data');
            }

            // Update route index
            await this.updateRouteIndex(routeId, storageData.metadata);
            
            // Update version info
            this.storageBackend.set(this.versionKey, this.currentVersion);
            
            console.log(`✅ Route ${routeId} stored successfully`);
            return true;
            
        } catch (error) {
            console.error(`💾 Failed to store route ${routeId}:`, error);
            return false;
        }
    }

    /**
     * Retrieve a stored route by ID
     * @param {string} routeId - Route identifier
     * @returns {Promise<Object|null>} Stored route data or null if not found
     */
    async getRoute(routeId) {
        try {
            console.log(`💾 Retrieving route: ${routeId}`);
            
            const routeKey = `${this.routeKey}_${routeId}`;
            const storedData = this.storageBackend.get(routeKey);
            
            if (!storedData) {
                console.log(`💾 Route ${routeId} not found in storage`);
                return null;
            }

            // Check version compatibility
            if (!this.isVersionCompatible(storedData.version)) {
                console.warn(`💾 Route ${routeId} version ${storedData.version} not compatible with current ${this.currentVersion}`);
                return null;
            }

            // Validate stored route data
            if (!this.validateRouteData(storedData.routeData)) {
                console.warn(`💾 Stored route ${routeId} data is invalid`);
                return null;
            }

            console.log(`✅ Route ${routeId} retrieved successfully`);
            return storedData;
            
        } catch (error) {
            console.error(`💾 Failed to retrieve route ${routeId}:`, error);
            return null;
        }
    }

    /**
     * Check if a route exists in storage
     * @param {string} routeId - Route identifier
     * @returns {Promise<boolean>} True if route exists
     */
    async hasRoute(routeId) {
        try {
            const routeKey = `${this.routeKey}_${routeId}`;
            const storedData = this.storageBackend.get(routeKey);
            return storedData !== null && this.isVersionCompatible(storedData.version);
        } catch (error) {
            console.error(`💾 Error checking route existence ${routeId}:`, error);
            return false;
        }
    }

    /**
     * Get list of all stored routes with metadata
     * @returns {Promise<Array>} Array of route metadata objects
     */
    async listStoredRoutes() {
        try {
            const index = this.storageBackend.get(this.metadataKey) || {};
            return Object.values(index).filter(route => 
                this.isVersionCompatible(route.version)
            );
        } catch (error) {
            console.error('💾 Failed to list stored routes:', error);
            return [];
        }
    }

    /**
     * Delete a stored route
     * @param {string} routeId - Route identifier
     * @returns {Promise<boolean>} Success status
     */
    async deleteRoute(routeId) {
        try {
            console.log(`💾 Deleting route: ${routeId}`);
            
            const routeKey = `${this.routeKey}_${routeId}`;
            const removed = this.storageBackend.remove(routeKey);
            
            if (removed) {
                // Remove from index
                await this.removeFromRouteIndex(routeId);
                console.log(`✅ Route ${routeId} deleted successfully`);
            }
            
            return removed;
            
        } catch (error) {
            console.error(`💾 Failed to delete route ${routeId}:`, error);
            return false;
        }
    }

    /**
     * Clear all stored routes
     * @returns {Promise<boolean>} Success status
     */
    async clearAllRoutes() {
        try {
            console.log('💾 Clearing all stored routes');
            
            const cleared = this.storageBackend.clear();
            
            if (cleared) {
                console.log('✅ All routes cleared successfully');
            }
            
            return cleared;
            
        } catch (error) {
            console.error('💾 Failed to clear routes:', error);
            return false;
        }
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage usage statistics
     */
    async getStorageStats() {
        try {
            const routes = await this.listStoredRoutes();
            let totalSize = 0;
            let totalDistance = 0;
            let totalDuration = 0;
            
            for (const route of routes) {
                totalSize += this.estimateRouteSize(route.id);
                totalDistance += route.totalDistance || 0;
                totalDuration += route.totalDuration || 0;
            }
            
            return {
                routeCount: routes.length,
                totalSize: totalSize,
                totalDistance: totalDistance,
                totalDuration: totalDuration,
                averageDistance: routes.length > 0 ? totalDistance / routes.length : 0,
                averageDuration: routes.length > 0 ? totalDuration / routes.length : 0,
                storageVersion: this.currentVersion
            };
            
        } catch (error) {
            console.error('💾 Failed to get storage stats:', error);
            return {
                routeCount: 0,
                totalSize: 0,
                error: error.message
            };
        }
    }

    /**
     * Update route index for fast lookups
     * @param {string} routeId - Route identifier
     * @param {Object} metadata - Route metadata
     */
    async updateRouteIndex(routeId, metadata) {
        try {
            const index = this.storageBackend.get(this.metadataKey) || {};
            
            index[routeId] = {
                id: routeId,
                version: this.currentVersion,
                timestamp: new Date().toISOString(),
                ...metadata
            };
            
            this.storageBackend.set(this.metadataKey, index);
            
        } catch (error) {
            console.error(`💾 Failed to update route index for ${routeId}:`, error);
        }
    }

    /**
     * Remove route from index
     * @param {string} routeId - Route identifier
     */
    async removeFromRouteIndex(routeId) {
        try {
            const index = this.storageBackend.get(this.metadataKey) || {};
            delete index[routeId];
            this.storageBackend.set(this.metadataKey, index);
        } catch (error) {
            console.error(`💾 Failed to remove route from index ${routeId}:`, error);
        }
    }

    /**
     * Validate route data structure
     * @param {Object} routeData - Route data to validate
     * @returns {boolean} True if valid
     */
    validateRouteData(routeData) {
        if (!routeData || typeof routeData !== 'object') return false;
        
        // Check for required route properties
        const requiredProperties = ['segments', 'route'];
        for (const prop of requiredProperties) {
            if (!routeData.hasOwnProperty(prop)) {
                console.warn(`💾 Route validation failed: missing ${prop}`);
                return false;
            }
        }
        
        // Validate segments
        if (!Array.isArray(routeData.segments) || routeData.segments.length === 0) {
            console.warn('💾 Route validation failed: invalid segments');
            return false;
        }
        
        // Validate route structure (GeoJSON-like)
        if (!routeData.route || !routeData.route.features || !Array.isArray(routeData.route.features)) {
            console.warn('💾 Route validation failed: invalid route structure');
            return false;
        }
        
        return true;
    }

    /**
     * Check version compatibility
     * @param {string} version - Version to check
     * @returns {boolean} True if compatible
     */
    isVersionCompatible(version) {
        if (!version) return false;
        
        // Simple semantic version check (major version must match)
        const currentMajor = this.currentVersion.split('.')[0];
        const versionMajor = version.split('.')[0];
        
        return currentMajor === versionMajor;
    }

    /**
     * Estimate storage size of a route
     * @param {string} routeId - Route identifier
     * @returns {number} Estimated size in bytes
     */
    estimateRouteSize(routeId) {
        try {
            const routeKey = `${this.routeKey}_${routeId}`;
            const data = this.storageBackend.get(routeKey);
            return data ? JSON.stringify(data).length : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Create backup of all stored routes
     * @returns {Promise<Object>} Backup data
     */
    async createBackup() {
        try {
            console.log('💾 Creating route backup...');
            
            const routes = await this.listStoredRoutes();
            const backup = {
                version: this.currentVersion,
                timestamp: new Date().toISOString(),
                routes: {}
            };
            
            for (const routeMetadata of routes) {
                const routeData = await this.getRoute(routeMetadata.id);
                if (routeData) {
                    backup.routes[routeMetadata.id] = routeData;
                }
            }
            
            console.log(`✅ Backup created for ${Object.keys(backup.routes).length} routes`);
            return backup;
            
        } catch (error) {
            console.error('💾 Failed to create backup:', error);
            return null;
        }
    }

    /**
     * Restore routes from backup
     * @param {Object} backupData - Backup data to restore
     * @returns {Promise<boolean>} Success status
     */
    async restoreFromBackup(backupData) {
        try {
            console.log('💾 Restoring routes from backup...');
            
            if (!backupData || !backupData.routes) {
                throw new Error('Invalid backup data');
            }
            
            let restoredCount = 0;
            
            for (const [routeId, routeData] of Object.entries(backupData.routes)) {
                const success = await this.storeRoute(
                    routeId, 
                    routeData.routeData, 
                    routeData.metadata
                );
                
                if (success) {
                    restoredCount++;
                }
            }
            
            console.log(`✅ Restored ${restoredCount} routes from backup`);
            return restoredCount > 0;
            
        } catch (error) {
            console.error('💾 Failed to restore from backup:', error);
            return false;
        }
    }
}