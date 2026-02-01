// Location-related utility functions
import { VT_LOCATIONS, API_KEYS } from '../../constants.js';

// Find matching VT location by text/alias
export const findMatchingVTLocation = (text) => {
  if (!text || text.length < 2) return null;
  const searchText = text.toLowerCase().trim();
  for (const location of VT_LOCATIONS) {
    if (location.aliases?.some(alias => alias === searchText || alias.includes(searchText) || searchText.includes(alias))) return location;
    if (location.name.toLowerCase().includes(searchText)) return location;
  }
  return null;
};

// Geocode a location name to get accurate API coordinates
export const geocodeLocation = async (name, hintCoords = null) => {
  try {
    const bias = hintCoords ? `&bias=proximity:${hintCoords.longitude},${hintCoords.latitude}` : '';
    const response = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(name)}&limit=1${bias}&apiKey=${API_KEYS.geoapifyAutocomplete}`);
    const data = await response.json();
    if (data.features?.length > 0) {
      const f = data.features[0];
      return { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] };
    }
  } catch (error) { console.error('Geocoding error:', error); }
  return null;
};

// Get address suggestions for autocomplete
export const getAddressSuggestions = async (text) => {
  if (!text || text.length < 2) return [];
  const results = [];
  const searchText = text.toLowerCase().trim();

  // Always query Geoapify API for accurate coordinates
  try {
    const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&filter=circle:-80.4234,37.2284,5000&bias=proximity:-80.4234,37.2284&limit=8&apiKey=${API_KEYS.geoapifyAutocomplete}`);
    const data = await response.json();
    const geoapifyResults = data.features?.map(f => ({
      name: f.properties.formatted,
      shortName: f.properties.name || f.properties.street || f.properties.formatted.split(',')[0],
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
      isPreset: false
    })) || [];
    results.push(...geoapifyResults);
  } catch (error) { console.error('Autocomplete error:', error); }

  // Add VT preset matches that might not be in API results (for common aliases)
  const matchingPresets = VT_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(searchText) ||
    loc.aliases?.some(alias => alias.includes(searchText) || searchText.includes(alias))
  );
  for (const preset of matchingPresets) {
    // Only add if not already in results (by name similarity)
    if (!results.some(r => r.shortName?.toLowerCase().includes(preset.name.toLowerCase().split(' ')[0]))) {
      results.push({ name: preset.name, shortName: preset.name, latitude: preset.latitude, longitude: preset.longitude, isPreset: true, needsGeocode: true });
    }
  }

  return results.slice(0, 8);
};
