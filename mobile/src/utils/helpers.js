// Helper utility functions
import { BLUE_LIGHTS } from '../../constants.js';

// Calculate distance between two coordinates in meters (Haversine formula)
export const getDistanceMeters = (coord1, coord2) => {
  const lat1 = coord1.latitude * Math.PI / 180, lat2 = coord2.latitude * Math.PI / 180;
  const dLat = lat2 - lat1, dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// Format meters to miles
export const formatDistance = (meters) => meters < 1609 ? `${Math.round(meters * 3.281 / 5280 * 100) / 100} mi` : `${(meters / 1609).toFixed(1)} mi`;

// Format timestamp to relative time
export const formatTimeAgo = (timestamp) => {
  const mins = Math.floor((Date.now() - timestamp) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

// Get zone color based on intensity
export const getZoneColor = (intensity) => {
  switch (intensity) {
    case 'high': return { fill: 'rgba(255, 59, 48, 0.3)', stroke: 'rgba(255, 59, 48, 0.6)' };
    case 'medium': return { fill: 'rgba(255, 149, 0, 0.25)', stroke: 'rgba(255, 149, 0, 0.5)' };
    case 'low': return { fill: 'rgba(255, 204, 0, 0.2)', stroke: 'rgba(255, 204, 0, 0.4)' };
    default: return { fill: 'rgba(255, 140, 0, 0.2)', stroke: 'rgba(255, 140, 0, 0.5)' };
  }
};

// Calculate local safe route via nearest Blue Light
export const calculateLocalSafeRoute = (startCoords, endCoords) => {
  let nearestBlueLight = null, minTotalDist = Infinity;
  BLUE_LIGHTS.forEach(bl => {
    const totalDist = Math.sqrt(Math.pow(bl.latitude - startCoords.latitude, 2) + Math.pow(bl.longitude - startCoords.longitude, 2)) + Math.sqrt(Math.pow(endCoords.latitude - bl.latitude, 2) + Math.pow(endCoords.longitude - bl.longitude, 2));
    if (totalDist < minTotalDist) { minTotalDist = totalDist; nearestBlueLight = bl; }
  });
  const route = [startCoords];
  if (nearestBlueLight) {
    route.push({ latitude: (startCoords.latitude + nearestBlueLight.latitude) / 2, longitude: (startCoords.longitude + nearestBlueLight.longitude) / 2 });
    route.push({ latitude: nearestBlueLight.latitude, longitude: nearestBlueLight.longitude });
    route.push({ latitude: (nearestBlueLight.latitude + endCoords.latitude) / 2, longitude: (nearestBlueLight.longitude + endCoords.longitude) / 2 });
  }
  route.push(endCoords);
  return route;
};

// Terms and Conditions Text
export const TERMS_TEXT = `Welcome to Lumina!

By creating an account, you agree to the following:

1. SAFETY COMMUNITY
Lumina is a safety-focused community app for Virginia Tech students. You agree to use this app responsibly and not abuse emergency features.

2. LOCATION DATA
We collect location data to provide safety features including:
• Showing nearby Blue Light emergency stations
• Connecting you with walking groups
• Calculating safe routes
• Alerting you to nearby safety concerns

3. COMMUNITY GUIDELINES
• Report incidents accurately and honestly
• Do not misuse the SOS feature
• Respect other users' privacy
• Do not share false safety information

4. DATA PRIVACY
Your data is stored securely and never sold to third parties. Location data is only used for safety features within the app.

5. EMERGENCY SERVICES
Lumina is not a replacement for 911. In case of real emergency, always contact emergency services directly.

By continuing, you confirm you are a Virginia Tech student or affiliate and agree to these terms.`;
