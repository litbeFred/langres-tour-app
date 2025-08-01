# Known Issues & Risks

This document outlines potential issues and risks associated with the current implementation of the Langres Tour App. It serves as a reference for future development and maintenance.

---

## 🚨 **Known Issues**

### 1. **CORS Restrictions** ✅ RESOLVED
- **Description**: The OpenRouteService API was blocked by CORS policy, preventing direct browser access.
- **Resolution**: Switched to OSRM (Open Source Routing Machine), which is CORS-enabled and doesn't require API keys.
- **Impact**: No immediate issues, but fallback routing is used if OSRM fails.
- **Status**: ✅ Fixed - OSRM implementation completed

### 2. **Pedestrian Route Toggle Button Logic** ✅ RESOLVED  
- **Description**: The pedestrian route visibility toggle was inverted - routes appeared when button was unchecked and disappeared when checked.
- **Impact**: Confusing user experience with counter-intuitive button behavior.
- **Status**: ✅ Fixed - Button logic corrected, routes now show when checked and hide when unchecked

### 3. **Route Calculation Dependencies** ✅ RESOLVED
- **Description**: Route calculation button could be clicked before routes were calculated, and routes may be recalculated unnecessarily.
- **Impact**: Potential performance issues and user confusion.
- **Status**: ✅ Fixed - Toggle button disabled until route calculated, button hidden after calculation, duplicate calculations prevented

---

## ⚠️ **Risks**

### 1. **OSRM Public Server API Call Limits**
- **Description**: The OSRM public demo server may throttle or block requests if usage exceeds acceptable limits.
- **Impact**: High-frequency API calls could result in temporary service unavailability.
- **Mitigation**:
  - Monitor API usage and implement rate limiting (already added).
  - Consider hosting a self-managed OSRM instance for unlimited API calls if usage grows significantly.

### 2. **Fallback Routing Accuracy**
- **Description**: When API services fail, fallback routing generates straight-line paths between points.
- **Impact**: Fallback routes may not accurately reflect pedestrian paths, potentially impacting user experience.
- **Mitigation**: Ensure fallback routing is clearly indicated in the UI and provide warnings when fallback mode is active.

### 3. **Dependency on External Services**
- **Description**: The app relies on OSRM's public demo server for routing calculations.
- **Impact**: Any downtime or changes to the OSRM server could affect app functionality.
- **Mitigation**: Explore alternatives like hosting OSRM locally or using other routing services.

---

## 📋 **Future Considerations**
- **Self-Hosted OSRM**: If API call limits become a frequent issue, set up a self-hosted OSRM instance to ensure unlimited access.
- **Enhanced Fallback Routing**: Improve fallback routing to generate realistic pedestrian paths using local data.
- **Monitoring Tools**: Add real-time monitoring for API usage and server availability.

---

## 🔧 **Recent Fixes (August 2025)**
- ✅ **OSRM Integration**: Successfully replaced OpenRouteService with OSRM to resolve CORS blocking
- ✅ **Button Logic**: Fixed inverted pedestrian route toggle behavior 
- ✅ **Route State Management**: Improved button states and prevented unnecessary recalculations
- ✅ **User Experience**: Routes now show by default after calculation with proper toggle control

---

This document should be updated regularly as new issues or risks are identified.
