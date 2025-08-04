/**
 * Navigation Instruction Service for guidance testing
 * Follows Single Responsibility Principle - handles only navigation instruction generation
 * Follows Open/Closed Principle - extensible for different instruction types
 */
export class TestNavigationInstructor {
    constructor() {
        this.currentPosition = null;
        this.routeCoordinates = [];
        this.currentInstructionIndex = 0;
        this.instructions = [];
        this.lastDistanceToNext = null;
    }

    /**
     * Initialize with route coordinates and generate instructions
     * @param {Array} coordinates - Route coordinates [[lat, lon], ...]
     */
    setRoute(coordinates) {
        this.routeCoordinates = coordinates;
        this.currentInstructionIndex = 0;
        this.instructions = this.generateInstructions(coordinates);
        console.log(`🧭 Generated ${this.instructions.length} navigation instructions`);
    }

    /**
     * Update current position and get appropriate instruction
     * @param {Array} position - Current position [lat, lon]
     * @param {number} routeProgress - Progress along route (0 to coordinates.length-1)
     * @returns {Object} Current instruction object
     */
    /**
     * Update position and get navigation instruction
     * @param {Array} position - User position [lat, lon]
     * @param {number} routeProgress - Progress along route (0 to route.length-1)
     * @returns {Object} Current instruction object
     */
    updatePosition(position, routeProgress) {
        this.currentPosition = position;
        
        if (!this.routeCoordinates.length || !this.instructions.length) {
            return { instruction: "Suivez le chemin", type: "continue" };
        }

        // Find current position-based instruction
        const currentInstruction = this.getCurrentInstruction(position, routeProgress);
        
        // Detect multiple crossroads within 50m radius
        const upcomingCrossroads = this.detectUpcomingCrossroads(position, routeProgress);
        
        // Handle crossroad snapshots
        if (upcomingCrossroads.length > 0 && window.testApp?.crossroadSnapshot) {
            const userHeading = this.calculateUserHeading(position, routeProgress);
            const positions = upcomingCrossroads.map(c => c.position);
            const instructions = upcomingCrossroads.map(c => c.instruction);
            
            console.log(`🛣️ Showing crossroad snapshot: ${upcomingCrossroads.length} crossroads detected`);
            window.testApp.crossroadSnapshot.showCrossroad(
                positions,
                this.routeCoordinates,
                position,
                userHeading,
                instructions
            );
        } else if (window.testApp?.crossroadSnapshot) {
            // Update existing snapshot for user progress or hide if no crossroads
            window.testApp.crossroadSnapshot.updateSnapshotForUserPosition(
                position,
                this.routeCoordinates
            );
            
            // If no crossroads ahead, hide the snapshot content
            if (upcomingCrossroads.length === 0 && window.testApp.crossroadSnapshot.isVisible) {
                window.testApp.crossroadSnapshot.hideSnapshot();
            }
        }
        
        return currentInstruction;
    }

    /**
     * Get current navigation instruction based on actual position
     * @param {Array} position - Current user position [lat, lon]
     * @param {number} routeProgress - Progress along route
     * @returns {Object} Current instruction object
     */
    getCurrentInstruction(position, routeProgress) {
        // Find closest waypoint ahead of current position
        const currentIndex = Math.floor(routeProgress);
        const lookAheadDistance = 30; // meters
        
        for (let i = currentIndex; i < this.routeCoordinates.length - 1; i++) {
            const currentWaypoint = this.routeCoordinates[i];
            const nextWaypoint = this.routeCoordinates[i + 1];
            
            const distanceToCurrent = this.calculateDistance(
                position[0], position[1],
                currentWaypoint[0], currentWaypoint[1]
            );
            
            const distanceToNext = this.calculateDistance(
                position[0], position[1],
                nextWaypoint[0], nextWaypoint[1]
            );
            
            // If we're approaching the next waypoint
            if (distanceToNext <= lookAheadDistance) {
                const instruction = this.generateDirectionalInstruction(
                    currentWaypoint, 
                    nextWaypoint, 
                    this.routeCoordinates[i + 2] || nextWaypoint,
                    distanceToNext
                );
                return instruction;
            }
        }
        
        // Default continuing instruction
        return {
            instruction: `Continuez tout droit`,
            type: "continue",
            distance: 0
        };
    }

    /**
     * Detect upcoming crossroads within detection radius
     * @param {Array} position - Current user position [lat, lon]
     * @param {number} routeProgress - Progress along route
     * @returns {Array} Array of crossroad objects with position and instruction
     */
    detectUpcomingCrossroads(position, routeProgress) {
        const crossroads = [];
        const detectionRadius = 50; // meters
        
        // Look ahead in route coordinates
        const currentIndex = Math.floor(routeProgress);
        const lookAheadPoints = 20; // Check next 20 waypoints
        const endIndex = Math.min(currentIndex + lookAheadPoints, this.routeCoordinates.length);
        
        for (let i = currentIndex + 1; i < endIndex - 1; i++) {
            const currentPoint = this.routeCoordinates[i];
            const nextPoint = this.routeCoordinates[i + 1];
            const afterPoint = this.routeCoordinates[i + 2];
            
            if (!currentPoint || !nextPoint || !afterPoint) continue;
            
            const distance = this.calculateDistance(
                position[0], position[1],
                nextPoint[0], nextPoint[1]
            );
            
            // Check if within detection radius
            if (distance <= detectionRadius) {
                // Generate instruction for this potential crossroad
                const instruction = this.generateDirectionalInstruction(
                    currentPoint, nextPoint, afterPoint, distance
                );
                
                // Only include if it's a significant turn (not straight)
                if (instruction.type !== 'straight') {
                    crossroads.push({
                        position: nextPoint,
                        instruction: instruction,
                        distance: distance,
                        index: i
                    });
                }
            }
        }
        
        // Sort by distance (closest first)
        return crossroads.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Generate directional instruction between waypoints
     * @param {Array} fromPoint - Starting waypoint [lat, lon]
     * @param {Array} toPoint - Next waypoint [lat, lon]
     * @param {Array} afterPoint - Point after next waypoint [lat, lon]
     * @param {number} distance - Distance to next waypoint
     * @returns {Object} Instruction object
     */
    generateDirectionalInstruction(fromPoint, toPoint, afterPoint, distance) {
        // Calculate bearing from current to next point
        const currentBearing = this.calculateBearing(
            fromPoint[0], fromPoint[1],
            toPoint[0], toPoint[1]
        );
        
        // Calculate bearing from next to after point
        const nextBearing = this.calculateBearing(
            toPoint[0], toPoint[1],
            afterPoint[0], afterPoint[1]
        );
        
        // Calculate turn angle
        let turnAngle = nextBearing - currentBearing;
        if (turnAngle > 180) turnAngle -= 360;
        if (turnAngle < -180) turnAngle += 360;
        
        // Determine instruction type and text
        const distanceText = distance < 10 ? "Dans quelques mètres" : `Dans ${Math.round(distance)}m`;
        
        if (Math.abs(turnAngle) < 15) {
            return {
                instruction: `${distanceText}, continuez tout droit`,
                type: "straight",
                distance: distance,
                position: toPoint
            };
        } else if (turnAngle > 45) {
            return {
                instruction: `${distanceText}, tournez à droite`,
                type: "right",
                distance: distance,
                position: toPoint
            };
        } else if (turnAngle < -45) {
            return {
                instruction: `${distanceText}, tournez à gauche`,
                type: "left",
                distance: distance,
                position: toPoint
            };
        } else if (turnAngle > 15) {
            return {
                instruction: `${distanceText}, légèrement à droite`,
                type: "slight-right",
                distance: distance,
                position: toPoint
            };
        } else {
            return {
                instruction: `${distanceText}, légèrement à gauche`,
                type: "slight-left",
                distance: distance,
                position: toPoint
            };
        }
    }

    /**
     * Generate navigation instructions from route coordinates
     * @param {Array} coordinates - Route coordinates
     * @returns {Array} Array of instruction objects
     */
    generateInstructions(coordinates) {
        if (coordinates.length < 2) {
            return [{ instruction: "Destination atteinte", type: "arrive" }];
        }

        const instructions = [];
        
        // Start instruction
        instructions.push({
            instruction: "Commencez votre parcours",
            type: "start",
            position: coordinates[0]
        });

        // Generate instructions for route segments
        const segmentSize = Math.max(1, Math.floor(coordinates.length / 5)); // 5 instruction points along route
        
        for (let i = segmentSize; i < coordinates.length - segmentSize; i += segmentSize) {
            const instruction = this.generateSegmentInstruction(coordinates, i);
            instructions.push({
                ...instruction,
                position: coordinates[i]
            });
        }

        // Final instruction
        instructions.push({
            instruction: "Vous arrivez à destination",
            type: "arrive",
            position: coordinates[coordinates.length - 1]
        });

        return instructions;
    }

    /**
     * Generate instruction for a route segment
     * @param {Array} coordinates - All route coordinates  
     * @param {number} index - Current coordinate index
     * @returns {Object} Instruction object
     */
    generateSegmentInstruction(coordinates, index) {
        const current = coordinates[index];
        const previous = coordinates[index - 1];
        const next = coordinates[index + 1];

        if (!previous || !next) {
            return { instruction: "Continuez tout droit", type: "continue" };
        }

        // Calculate bearing change to determine turn direction
        const bearingIn = this.calculateBearing(previous[0], previous[1], current[0], current[1]);
        const bearingOut = this.calculateBearing(current[0], current[1], next[0], next[1]);
        const turnAngle = this.normalizeBearing(bearingOut - bearingIn);

        // Generate instruction based on turn angle
        if (Math.abs(turnAngle) < 15) {
            return { instruction: "Continuez tout droit", type: "continue" };
        } else if (turnAngle > 15 && turnAngle < 45) {
            return { instruction: "Tournez légèrement à droite", type: "slight_right" };
        } else if (turnAngle < -15 && turnAngle > -45) {
            return { instruction: "Tournez légèrement à gauche", type: "slight_left" };
        } else if (turnAngle >= 45 && turnAngle < 135) {
            return { instruction: "Tournez à droite", type: "turn_right" };
        } else if (turnAngle <= -45 && turnAngle > -135) {
            return { instruction: "Tournez à gauche", type: "turn_left" };
        } else {
            return { instruction: "Faites demi-tour", type: "u_turn" };
        }
    }

    /**
     * Create instruction with distance information
     * @param {Object} currentInstruction - Current instruction
     * @param {Object} nextInstruction - Next instruction
     * @param {number} distance - Distance to next instruction in meters
     * @returns {Object} Instruction with distance
     */
    createDistanceBasedInstruction(currentInstruction, nextInstruction, distance) {
        if (distance > 100) {
            return {
                instruction: `${currentInstruction.instruction} (dans ${Math.round(distance)}m: ${nextInstruction.instruction.toLowerCase()})`,
                type: currentInstruction.type,
                distance: distance
            };
        } else if (distance > 20) {
            return {
                instruction: `Dans ${Math.round(distance)}m: ${nextInstruction.instruction.toLowerCase()}`,
                type: "approaching",
                distance: distance
            };
        } else {
            return {
                instruction: nextInstruction.instruction,
                type: nextInstruction.type,
                distance: distance
            };
        }
    }

    /**
     * Calculate distance between two points in meters
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Calculate bearing between two points
     */
    calculateBearing(lat1, lon1, lat2, lon2) {
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        
        return Math.atan2(y, x) * 180 / Math.PI;
    }

    /**
     * Normalize bearing to -180 to 180 range
     */
    normalizeBearing(bearing) {
        while (bearing > 180) bearing -= 360;
        while (bearing < -180) bearing += 360;
        return bearing;
    }

    /**
     * Calculate user's current heading based on route progress
     * @param {Array} position - Current position
     * @param {number} routeProgress - Route progress
     * @returns {number} Heading in degrees
     */
    calculateUserHeading(position, routeProgress) {
        if (routeProgress < 1 || routeProgress >= this.routeCoordinates.length - 1) {
            return 0;
        }

        const currentIndex = Math.floor(routeProgress);
        const nextIndex = Math.min(currentIndex + 1, this.routeCoordinates.length - 1);
        const current = this.routeCoordinates[currentIndex];
        const next = this.routeCoordinates[nextIndex];

        return this.calculateBearing(current[0], current[1], next[0], next[1]);
    }
}
