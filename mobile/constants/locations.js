// Virginia Tech campus location data
export const VT_CENTER = {
  latitude: 37.2284,
  longitude: -80.4234,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export const BLUE_LIGHTS = [
  { id: 1, name: 'Squires Student Center', latitude: 37.2295934, longitude: -80.4179647, distance: '0.2 mi' },
  { id: 2, name: 'War Memorial Hall', latitude: 37.2271281, longitude: -80.4171392, distance: '0.3 mi' },
  { id: 3, name: 'Newman Library', latitude: 37.2288144, longitude: -80.4194466, distance: '0.4 mi' },
  { id: 4, name: 'Torgersen Hall', latitude: 37.2297057, longitude: -80.4201748, distance: '0.5 mi' },
  { id: 5, name: 'Burruss Hall', latitude: 37.2284, longitude: -80.4236, distance: '0.6 mi' },
];

export const VT_LOCATIONS = [
  { name: 'Ambler Johnston Hall', latitude: 37.2230926, longitude: -80.4209309, aliases: ['aj', 'west aj', 'ambler'] },
  { name: 'Pritchard Hall', latitude: 37.22385, longitude: -80.42232, aliases: ['pritchard'] },
  { name: 'D2 (Dietrick)', latitude: 37.22417, longitude: -80.42139, aliases: ['d2', 'dietrick', 'dining'] },
  { name: 'West End Market', latitude: 37.22291, longitude: -80.42305, aliases: ['west end', 'wem'] },
  { name: 'Newman Library', latitude: 37.2288144, longitude: -80.4194466, aliases: ['library', 'newman'] },
  { name: 'Torgersen Hall', latitude: 37.2297057, longitude: -80.4201748, aliases: ['torg', 'torgersen'] },
  { name: 'McBryde Hall', latitude: 37.2283, longitude: -80.4252, aliases: ['mcbryde', 'math'] },
  { name: 'Goodwin Hall', latitude: 37.2308, longitude: -80.4208, aliases: ['goodwin', 'engineering'] },
  { name: 'Squires Student Center', latitude: 37.2295934, longitude: -80.4179647, aliases: ['squires', 'student center'] },
  { name: 'War Memorial Hall', latitude: 37.2271281, longitude: -80.4171392, aliases: ['war memorial', 'gym'] },
  { name: 'Drillfield', latitude: 37.2273, longitude: -80.4235, aliases: ['drillfield', 'drill field'] },
  { name: 'Burruss Hall', latitude: 37.2284, longitude: -80.4236, aliases: ['burruss'] },
  { name: 'Lane Stadium', latitude: 37.2200, longitude: -80.4181, aliases: ['lane', 'stadium', 'football'] },
];

export const ACTIVITY_ZONES = [
  { id: 1, latitude: 37.2270, longitude: -80.4180, radius: 150, intensity: 'high' },
  { id: 2, latitude: 37.2255, longitude: -80.4220, radius: 100, intensity: 'medium' },
  { id: 3, latitude: 37.2310, longitude: -80.4195, radius: 80, intensity: 'low' },
];

// API Keys
export const API_KEYS = {
  geoapifyAutocomplete: '84e16742fa54436489f86ea8562d4ddc',
  geoapifyPlaces: '79ae9dcc178e421c923852cf69ba3f5b',
  geoapifyRouting: 'd71af4a47bf8434ea3a24100091cb45e',
  gemini: 'AIzaSyCpE13VC-Pf0OKiTKrsg0EFU0tnezdPOdU',
};
