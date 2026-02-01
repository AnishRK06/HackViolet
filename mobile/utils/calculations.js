// Distance and time calculation utilities

// Calculate straight-line distance using Haversine formula
export const calculateDistance = (coords) => {
  if (!coords || coords.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return total;
};

// Calculate walking time between two coordinates (with 1.3x path multiplier)
export const getWalkingMinutes = (from, to) => {
  if (!from || !to) return Infinity;
  const lat1 = from.latitude * Math.PI / 180;
  const lat2 = to.latitude * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLon = (to.longitude - from.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineMeters = 6371000 * c;
  const walkingMeters = straightLineMeters * 1.3;
  return Math.ceil(walkingMeters / 80); // 80 meters/min walking speed
};

// Calculate remaining minutes from creation time
export const getRemainingMinutes = (createdAt, departureMinutes) => {
  const elapsed = (Date.now() - createdAt) / 60000;
  return Math.max(0, Math.ceil(departureMinutes - elapsed));
};

// Format distance for display
export const formatDistance = (meters) => {
  if (meters > 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

// Format duration for display
export const formatDuration = (seconds) => {
  return `${Math.ceil(seconds / 60)} min`;
};
