// Routing-related utility functions
import { ACTIVITY_ZONES, API_KEYS } from '../../constants.js';

// Dynamic danger calculation based on time of day and crime data
export const getZoneDangerLevel = (zone) => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  let multiplier = 1;
  if (zone.peakHours?.includes(hour)) multiplier *= 1.5;
  if (zone.peakDays?.includes(day)) multiplier *= 1.3;
  if (hour >= 22 || hour <= 2) multiplier *= 1.4;
  return Math.min(100, Math.round((zone.score || 50) * multiplier));
};

// Get dynamic intensity based on current danger level
export const getDynamicIntensity = (zone) => {
  const dangerLevel = getZoneDangerLevel(zone);
  if (dangerLevel >= 70) return 'high';
  if (dangerLevel >= 45) return 'medium';
  return 'low';
};

// Get route from Geoapify API
export const getGeoapifyRoute = async (start, end, waypoints = []) => {
  try {
    let waypointStr = `${start.latitude},${start.longitude}`;
    waypoints.forEach(wp => { waypointStr += `|${wp.latitude},${wp.longitude}`; });
    waypointStr += `|${end.latitude},${end.longitude}`;
    const url = `https://api.geoapify.com/v1/routing?waypoints=${waypointStr}&mode=walk&apiKey=${API_KEYS.geoapifyRouting}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.features?.length > 0) {
      const route = data.features[0];
      const geometry = route.geometry;
      let allCoords = [];
      if (geometry.type === 'MultiLineString') {
        geometry.coordinates.forEach((line, lineIndex) => {
          line.forEach(([lon, lat], pointIndex) => {
            // Skip first point of subsequent legs (duplicate of previous leg's end)
            if (lineIndex > 0 && pointIndex === 0) return;
            allCoords.push({ latitude: lat, longitude: lon });
          });
        });
      }
      else if (geometry.type === 'LineString') allCoords = geometry.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
      const properties = route.properties;
      const steps = properties.legs?.flatMap(leg => leg.steps || []) || [];
      return { coordinates: allCoords, distance: properties.distance, duration: properties.time, steps: steps.map(step => ({ instruction: step.instruction?.text || 'Continue', distance: step.distance, duration: step.time, name: step.name || '' })) };
    }
    return null;
  } catch (error) { console.error('Geoapify routing error:', error); return null; }
};

// Convert a circular zone to a GeoJSON polygon (for ORS avoid_polygons)
export const zoneToPolygon = (zone, buffer = 20) => {
  const points = 16; // Number of points to approximate circle
  const coords = [];
  const radius = zone.radius + buffer; // Add buffer for safety margin

  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const latOffset = (radius / 111000) * Math.cos(angle);
    const lonOffset = (radius / (111000 * Math.cos(zone.latitude * Math.PI / 180))) * Math.sin(angle);
    coords.push([zone.longitude + lonOffset, zone.latitude + latOffset]);
  }

  return [coords]; // Return as polygon ring
};

// OpenRouteService routing with polygon avoidance
export const getOpenRouteServiceRoute = async (start, end, avoidZones = []) => {
  try {
    const body = {
      coordinates: [[start.longitude, start.latitude], [end.longitude, end.latitude]],
    };

    // Add polygon avoidance if zones exist
    if (avoidZones.length > 0) {
      const polygons = avoidZones.map(zone => zoneToPolygon(zone));
      body.options = {
        avoid_polygons: {
          type: 'MultiPolygon',
          coordinates: polygons
        }
      };
    }

    const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
      method: 'POST',
      headers: {
        'Authorization': API_KEYS.openRouteService,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.error) {
      console.log('ORS API error:', data.error);
      return null;
    }

    if (data.features?.length > 0) {
      const route = data.features[0];
      const geometry = route.geometry;
      const coords = geometry.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
      const summary = route.properties?.summary || {};

      return {
        coordinates: coords,
        distance: summary.distance || 0,
        duration: summary.duration || 0,
        steps: []
      };
    }
    return null;
  } catch (error) {
    console.error('ORS routing error:', error);
    return null;
  }
};

// Get safe route avoiding danger zones using ORS polygon avoidance
export const getSafeRoute = async (start, end) => {
  const dangerZones = ACTIVITY_ZONES.filter(z => {
    const intensity = getDynamicIntensity(z);
    return intensity === 'high' || intensity === 'medium';
  });

  // Try ORS with polygon avoidance first
  const orsRoute = await getOpenRouteServiceRoute(start, end, dangerZones);
  if (orsRoute?.coordinates?.length) {
    console.log('ORS route successful with polygon avoidance');
    return orsRoute;
  }

  console.log('ORS failed, falling back to Geoapify');
  // Fallback to Geoapify without avoidance
  return await getGeoapifyRoute(start, end);
};
