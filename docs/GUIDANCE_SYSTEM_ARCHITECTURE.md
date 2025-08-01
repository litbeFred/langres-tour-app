# Guidance System Architecture

This document outlines the architecture and implementation of the Guidance System for the Langres Tour App, which provides turn-by-turn navigation with clear separation between guided tour functionality and back-on-track correction.

## Overview

The Guidance System implements a clean separation of concerns between two main navigation scenarios:

1. **Guided Tour Navigation** (`guidedTour`): Main tour experience through all POIs
2. **Back-on-Track Navigation** (`backOnTrack`): Generic deviation correction functionality

## Architecture

### Core Components

```
GuidanceService (Main Orchestrator)
├── GuidedTourService (Tour-specific navigation)
├── BackOnTrackService (Deviation correction)
└── NavigationService (Underlying turn-by-turn engine)
```

### Service Hierarchy

#### 1. GuidanceService
**Responsibility**: Main coordinator and unified API for all guidance functionality

- Orchestrates between GuidedTourService and BackOnTrackService
- Provides unified interface for starting/stopping guidance
- Handles switching between guidance modes
- Manages overall guidance state and settings

#### 2. GuidedTourService
**Responsibility**: Handle main tour navigation through all POIs

- **Optimized for**: Always-same tour route with known POIs
- **Features**:
  - POI-to-POI navigation with progress tracking
  - Tour completion celebration and statistics
  - Enhanced POI-specific announcements
  - Strategic tour route optimization
  - Auto-advance between POIs
  - Tour progress and timing analytics

#### 3. BackOnTrackService
**Responsibility**: Generic deviation correction functionality

- **Optimized for**: Any routing scenario, not tour-specific
- **Features**:
  - Deviation detection from any route
  - Strategic reconnection point finding
  - Generic route correction calculations
  - Deviation history and analytics
  - Robust fallback for any navigation scenario

#### 4. NavigationService (Existing)
**Responsibility**: Core turn-by-turn navigation engine

- **Used by**: Both GuidedTourService and BackOnTrackService
- **Features**:
  - Turn-by-turn instructions
  - Audio guidance in French
  - Real-time position tracking
  - Route following and rerouting

## Implementation Details

### Separation Strategy

The implementation follows these architectural principles:

1. **Initially Shared Implementation**: Both `guidedTour` and `backOnTrack` use the same underlying NavigationService
2. **Clear Interface Separation**: Different interfaces and event models for each use case
3. **Future Extensibility**: Architecture allows for divergent optimization paths

### Future Development Path

#### GuidedTour Evolution
- **Tour-Specific Optimizations**: Pre-calculated routes, offline caching
- **Enhanced Features**: Virtual guides, rich media integration, gamification
- **Tour Analytics**: Detailed visitor behavior analysis
- **Accessibility**: Enhanced accessibility features for guided tours

#### BackOnTrack Evolution
- **Generic Robustness**: Enhanced support for any route type
- **Smart Reconnection**: AI-powered optimal reconnection point selection
- **Multi-Modal Support**: Support for different transportation modes
- **Emergency Features**: Safety-focused corrections and alerts

### Service Communication

```typescript
// Guidance orchestration flow
GuidanceService.startGuidance({
  type: 'guided-tour' | 'back-on-track',
  route: [...],
  options: {...}
})

// Service coordination
GuidanceService -> GuidedTourService.startGuidedTour()
GuidanceService -> BackOnTrackService.startBackOnTrackNavigation()

// Automatic switching
DeviationDetected -> GuidanceService.handleDeviation()
  -> Stop GuidedTour
  -> Start BackOnTrack
  
ReturnToMainRoute -> GuidanceService.handleReturnToMainRoute()
  -> Stop BackOnTrack  
  -> Resume GuidedTour
```

## API Reference

### GuidanceService

```typescript
// Main guidance coordination
await guidanceService.startGuidance({
  type: GuidanceTypes.GUIDED_TOUR,
  route: tourPOIs,
  options: { audioEnabled: true }
});

// Get unified status
const status = guidanceService.getGuidanceStatus();

// Stop any active guidance
await guidanceService.stopGuidance();
```

### GuidedTourService

```typescript
// Start guided tour
await guidedTourService.startGuidedTour(tourPOIs, {
  autoAdvanceToNextPOI: true,
  pauseAtPOI: true,
  tourCompletionCelebration: true
});

// Get tour progress
const progress = guidedTourService.getTourProgress();
// Returns: { currentPOIIndex, totalPOIs, progressPercentage, ... }

// Skip current POI
await guidedTourService.skipCurrentPOI();
```

### BackOnTrackService

```typescript
// Start back-on-track navigation
await backOnTrackService.startBackOnTrackNavigation(
  currentPosition,
  mainRoute
);

// Check for deviations
const deviationCheck = backOnTrackService.checkDeviation(
  userPosition, 
  mainRoute
);

// Get deviation information
const deviationInfo = backOnTrackService.getDeviationInfo();
```

## Event System

### Guidance Events

The system emits standardized events for different guidance scenarios:

```typescript
// General guidance events
GuidanceEvents.GUIDANCE_STARTED
GuidanceEvents.GUIDANCE_STOPPED
GuidanceEvents.POSITION_UPDATED

// Guided tour specific events
GuidanceEvents.TOUR_STARTED
GuidanceEvents.POI_APPROACHED
GuidanceEvents.POI_REACHED
GuidanceEvents.TOUR_COMPLETED

// Back-on-track specific events
GuidanceEvents.DEVIATION_DETECTED
GuidanceEvents.BACK_ON_TRACK_STARTED
GuidanceEvents.RETURNED_TO_MAIN_ROUTE
```

### Event Listening

```typescript
guidanceService.addGuidanceListener((event, data) => {
  switch (event) {
    case GuidanceEvents.TOUR_STARTED:
      console.log(`Tour started with ${data.totalPOIs} POIs`);
      break;
    case GuidanceEvents.DEVIATION_DETECTED:
      console.log(`User deviated ${data.deviationDistance}m from route`);
      break;
    case GuidanceEvents.POI_REACHED:
      console.log(`Reached ${data.poi.name}`);
      break;
  }
});
```

## Configuration

### Default Settings

```typescript
const DefaultGuidanceSettings = {
  // Audio settings
  audioEnabled: true,
  language: 'fr-FR',
  
  // Navigation thresholds
  deviationThreshold: 50, // meters
  poiProximityThreshold: 30, // meters
  instructionAnnouncementDistance: 100, // meters
  
  // Tour settings
  autoAdvanceToNextPOI: true,
  pauseAtPOI: true,
  tourCompletionCelebration: true
};
```

### Settings Management

```typescript
// Update settings globally
guidanceService.updateSettings({
  deviationThreshold: 75,
  audioEnabled: false
});

// Service-specific settings
guidedTourService.updateSettings({
  autoAdvanceToNextPOI: false
});
```

## Integration Example

### Basic Tour Setup

```typescript
import { GuidanceService } from './services/guidance/index.js';
import { GuidanceTypes } from './interfaces/IGuidanceService.js';

// Initialize guidance system
const guidanceService = new GuidanceService(
  navigationService,
  routingService, 
  audioService,
  poiData
);

// Start guided tour
await guidanceService.startGuidance({
  type: GuidanceTypes.GUIDED_TOUR,
  route: langresourPOIs,
  options: {
    audioEnabled: true,
    autoAdvanceToNextPOI: true,
    deviationThreshold: 50
  }
});

// Listen for events
guidanceService.addGuidanceListener((event, data) => {
  switch (event) {
    case 'tour-started':
      showTourUI(data.totalPOIs);
      break;
    case 'deviation-detected':
      showDeviationAlert(data.deviationDistance);
      break;
    case 'poi-reached':
      showPOIInfo(data.poi);
      break;
  }
});
```

## Testing Strategy

### Unit Tests
- Individual service functionality
- Event emission and handling
- Settings management
- Error handling

### Integration Tests
- Service coordination
- Mode switching (guided tour ↔ back-on-track)
- Event propagation
- Configuration inheritance

### System Tests
- Complete tour scenarios
- Deviation and correction scenarios
- Audio guidance functionality
- Real GPS simulation integration

## Benefits of This Architecture

1. **Clear Separation of Concerns**: Each service has a well-defined responsibility
2. **Future-Proof Design**: Services can evolve independently
3. **Reusable Components**: BackOnTrackService can be used for any navigation scenario
4. **Unified Interface**: Single entry point through GuidanceService
5. **Event-Driven**: Loose coupling through standardized events
6. **Configurable**: Flexible settings system for different use cases
7. **Extensible**: Easy to add new guidance types or features

## Development Roadmap

### Phase 1: Foundation (Current)
- [x] Core architecture implementation
- [x] Basic guided tour functionality  
- [x] Basic back-on-track functionality
- [x] Event system and interfaces

### Phase 2: Enhancement
- [ ] Advanced POI features
- [ ] Tour analytics and statistics
- [ ] Enhanced audio guidance
- [ ] Accessibility improvements

### Phase 3: Optimization
- [ ] Tour-specific route caching
- [ ] AI-powered reconnection points
- [ ] Performance optimizations
- [ ] Advanced tour features

### Phase 4: Advanced Features
- [ ] Multi-language support
- [ ] Rich media integration
- [ ] Social features
- [ ] Gamification elements