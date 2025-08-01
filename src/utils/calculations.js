/**
 * Calculation Utilities
 * Single Responsibility: Handle mathematical calculations
 */

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param {number} lat1 - First point latitude
 * @param {number} lon1 - First point longitude
 * @param {number} lat2 - Second point latitude
 * @param {number} lon2 - Second point longitude
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
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

/**
 * Calculate total distance for an array of coordinates
 * @param {Array} coordinates - Array of [lat, lon] pairs
 * @returns {number} Total distance in meters
 */
export function calculateTotalDistance(coordinates) {
    let totalDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        const [lat1, lon1] = coordinates[i];
        const [lat2, lon2] = coordinates[i + 1];
        totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
    }
    return totalDistance;
}

/**
 * Convert meters to kilometers with specified decimal places
 * @param {number} meters - Distance in meters
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {number} Distance in kilometers
 */
export function metersToKilometers(meters, decimals = 1) {
    return Math.round(meters / 1000 * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Calculate bearing between two points
 * @param {number} lat1 - First point latitude
 * @param {number} lon1 - First point longitude
 * @param {number} lat2 - Second point latitude
 * @param {number} lon2 - Second point longitude
 * @returns {number} Bearing in degrees
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);

    return (θ * 180/Math.PI + 360) % 360; // Convert to degrees and normalize
}