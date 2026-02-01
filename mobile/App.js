import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  Platform,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import MapView, { Marker, Polygon, Callout, PROVIDER_GOOGLE, Circle, Polyline } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import * as Location from 'expo-location';
import {
  Home,
  Map,
  Users,
  User,
  Shield,
  MapPin,
  Phone,
  Bell,
  ChevronRight,
  Clock,
  Plus,
  X,
  Check,
  AlertTriangle,
  Navigation,
  Settings,
  HelpCircle,
  LogOut,
  Moon,
  Share2,
  Search,
  Crosshair,
  Loader,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// ============ DATA ============
const VT_CENTER = {
  latitude: 37.2284,
  longitude: -80.4234,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

const BLUE_LIGHTS = [
  { id: 1, name: 'Squires Student Center', latitude: 37.2295934, longitude: -80.4179647, distance: '0.3 mi' },
  { id: 2, name: 'War Memorial Hall', latitude: 37.2262611, longitude: -80.4206256, distance: '0.2 mi' },
  { id: 3, name: 'Newman Library', latitude: 37.2288144, longitude: -80.4194466, distance: '0.25 mi' },
  { id: 4, name: 'Torgersen Hall', latitude: 37.2297057, longitude: -80.4201748, distance: '0.35 mi' },
  { id: 5, name: 'Burruss Hall', latitude: 37.2290460, longitude: -80.4237089, distance: '0.15 mi' },
];

const WALKING_GROUPS = [
  {
    id: 1,
    name: 'Wolfpack Group',
    startLocation: 'Squires Student Center',
    startCoords: { latitude: 37.2295934, longitude: -80.4179647 },
    destination: 'Ambler Johnston Hall',
    destCoords: { latitude: 37.2230926, longitude: -80.4209309 },
    departureMinutes: 120,
    createdAt: Date.now(),
    members: [
      { id: 'user1', name: 'Alex H.', isReady: true, isCreator: true },
      { id: 'user2', name: 'Jordan M.', isReady: true, isCreator: false },
      { id: 'user3', name: 'Sam K.', isReady: false, isCreator: false },
    ],
  },
  {
    id: 2,
    name: 'Night Owls',
    startLocation: 'Newman Library',
    startCoords: { latitude: 37.2288144, longitude: -80.4194466 },
    destination: 'D2 (Dietrick)',
    destCoords: { latitude: 37.22417, longitude: -80.42139 },
    departureMinutes: 120,
    createdAt: Date.now(),
    members: [
      { id: 'user4', name: 'Taylor B.', isReady: true, isCreator: true },
      { id: 'user5', name: 'Casey L.', isReady: true, isCreator: false },
    ],
  },
  {
    id: 3,
    name: 'Library Squad',
    startLocation: 'Torgersen Hall',
    startCoords: { latitude: 37.2297057, longitude: -80.4201748 },
    destination: 'Newman Library',
    destCoords: { latitude: 37.2288144, longitude: -80.4194466 },
    departureMinutes: 120,
    createdAt: Date.now(),
    members: [
      { id: 'user9', name: 'Jamie R.', isReady: true, isCreator: true },
      { id: 'user10', name: 'Drew T.', isReady: true, isCreator: false },
    ],
  },
  {
    id: 4,
    name: 'Drillfield Walkers',
    startLocation: 'Burruss Hall',
    startCoords: { latitude: 37.2284, longitude: -80.4236 },
    destination: 'War Memorial Hall',
    destCoords: { latitude: 37.2271281, longitude: -80.4171392 },
    departureMinutes: 120,
    createdAt: Date.now(),
    members: [
      { id: 'user11', name: 'Chris M.', isReady: true, isCreator: true },
      { id: 'user12', name: 'Pat L.', isReady: false, isCreator: false },
    ],
  },
];

// Spotted activity zones (replacing broad rectangle)
const ACTIVITY_ZONES = [
  { id: 1, latitude: 37.2295, longitude: -80.4225, radius: 80, intensity: 'high' },
  { id: 2, latitude: 37.2270, longitude: -80.4195, radius: 60, intensity: 'medium' },
  { id: 3, latitude: 37.2305, longitude: -80.4160, radius: 50, intensity: 'low' },
  { id: 4, latitude: 37.2260, longitude: -80.4240, radius: 70, intensity: 'high' },
  { id: 5, latitude: 37.2285, longitude: -80.4210, radius: 45, intensity: 'medium' },
  { id: 6, latitude: 37.2275, longitude: -80.4170, radius: 55, intensity: 'low' },
  { id: 7, latitude: 37.2310, longitude: -80.4200, radius: 65, intensity: 'medium' },
];

// Campus location presets with VERIFIED coordinates from Geoapify Places API
const VT_LOCATIONS = [
  // Dorms (verified via Geoapify)
  { name: 'Ambler Johnston Hall (West AJ)', latitude: 37.2230926, longitude: -80.4209309, aliases: ['west aj', 'waj', 'east aj', 'ambler johnston', 'aj'] },
  { name: 'Pritchard Hall', latitude: 37.2242440, longitude: -80.4200104, aliases: ['pritchard'] },

  // Dining (verified via Geoapify)
  { name: 'D2 (Dietrick)', latitude: 37.22417, longitude: -80.42139, aliases: ['d2', 'd2 dining', 'dietrick', 'dds'] },
  { name: 'West End Market', latitude: 37.2232473, longitude: -80.4220072, aliases: ['west end', 'wem'] },

  // Academic (verified via Geoapify)
  { name: 'Newman Library', latitude: 37.2288144, longitude: -80.4194466, aliases: ['library', 'newman library', 'newman lib'] },
  { name: 'Torgersen Hall', latitude: 37.2297057, longitude: -80.4201748, aliases: ['torg', 'torgersen'] },
  { name: 'McBryde Hall', latitude: 37.2305949, longitude: -80.4217943, aliases: ['mcbryde'] },
  { name: 'Goodwin Hall', latitude: 37.2322881, longitude: -80.4259801, aliases: ['goodwin'] },

  // Student Life (verified via Geoapify)
  { name: 'Squires Student Center', latitude: 37.2295934, longitude: -80.4179647, aliases: ['squires', 'student center'] },
  { name: 'War Memorial Hall', latitude: 37.2262611, longitude: -80.4206256, aliases: ['war memorial', 'gym', 'war mem'] },
  { name: 'Drillfield', latitude: 37.229, longitude: -80.421, aliases: ['drillfield', 'drill field'] },

  // Other (verified via Geoapify)
  { name: 'Burruss Hall', latitude: 37.2290460, longitude: -80.4237089, aliases: ['burruss'] },
  { name: 'Lane Stadium', latitude: 37.2198923, longitude: -80.4180039, aliases: ['lane', 'stadium', 'lane stadium'] },
];

// Gemini API Key
const GEMINI_API_KEY = 'AIzaSyCpE13VC-Pf0OKiTKrsg0EFU0tnezdPOdU';

// Geoapify API Keys (separate keys for better rate limits)
const GEOAPIFY_AUTOCOMPLETE_KEY = '84e16742fa54436489f86ea8562d4ddc';
const GEOAPIFY_PLACES_KEY = '79ae9dcc178e421c923852cf69ba3f5b';
const GEOAPIFY_ROUTING_KEY = 'd71af4a47bf8434ea3a24100091cb45e';

// Fuzzy match for VT locations (case-insensitive)
const findMatchingVTLocation = (text) => {
  if (!text || text.length < 2) return null;
  const searchText = text.toLowerCase().trim();

  // First, try exact alias match
  for (const location of VT_LOCATIONS) {
    if (location.aliases?.some(alias => alias === searchText)) {
      return location;
    }
  }

  // Then, try partial match in aliases
  for (const location of VT_LOCATIONS) {
    if (location.aliases?.some(alias => alias.includes(searchText) || searchText.includes(alias))) {
      return location;
    }
  }

  // Finally, try name match
  for (const location of VT_LOCATIONS) {
    if (location.name.toLowerCase().includes(searchText)) {
      return location;
    }
  }

  return null;
};

// Geoapify Address Autocomplete - prioritizes VT preset locations
const getAddressSuggestions = async (text) => {
  if (!text || text.length < 2) return [];

  const results = [];

  // First, check for matching VT preset locations
  const searchText = text.toLowerCase().trim();
  const matchingPresets = VT_LOCATIONS.filter(loc => {
    const nameMatch = loc.name.toLowerCase().includes(searchText);
    const aliasMatch = loc.aliases?.some(alias =>
      alias.includes(searchText) || searchText.includes(alias)
    );
    return nameMatch || aliasMatch;
  }).map(loc => ({
    name: loc.name,
    shortName: loc.name,
    latitude: loc.latitude,
    longitude: loc.longitude,
    isPreset: true, // Mark as preset for priority display
  }));

  // Add matching presets first
  results.push(...matchingPresets);

  // Only fetch from Geoapify if we need more results and text is long enough
  if (results.length < 5 && text.length >= 3) {
    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&filter=circle:-80.4234,37.2284,5000&bias=proximity:-80.4234,37.2284&limit=5&apiKey=${GEOAPIFY_AUTOCOMPLETE_KEY}`
      );
      const data = await response.json();

      const geoapifyResults = data.features?.map(f => ({
        name: f.properties.formatted,
        shortName: f.properties.name || f.properties.street || f.properties.formatted.split(',')[0],
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
        isPreset: false,
      })) || [];

      // Add Geoapify results, but filter out duplicates
      for (const geoResult of geoapifyResults) {
        const isDuplicate = results.some(r =>
          Math.abs(r.latitude - geoResult.latitude) < 0.0005 &&
          Math.abs(r.longitude - geoResult.longitude) < 0.0005
        );
        if (!isDuplicate) {
          results.push(geoResult);
        }
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  }

  return results.slice(0, 8); // Return top 8 results
};

// Geoapify Walking Route
const getGeoapifyRoute = async (start, end) => {
  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/routing?waypoints=${start.latitude},${start.longitude}|${end.latitude},${end.longitude}&mode=walk&apiKey=${GEOAPIFY_ROUTING_KEY}`
    );
    const data = await response.json();

    if (data.features?.length > 0) {
      const route = data.features[0];
      const geometry = route.geometry;

      // Handle both LineString and MultiLineString geometries
      let allCoords = [];
      if (geometry.type === 'MultiLineString') {
        geometry.coordinates.forEach(line => {
          line.forEach(([lon, lat]) => {
            allCoords.push({ latitude: lat, longitude: lon });
          });
        });
      } else if (geometry.type === 'LineString') {
        allCoords = geometry.coordinates.map(([lon, lat]) => ({
          latitude: lat,
          longitude: lon,
        }));
      }

      const properties = route.properties;
      const legs = properties.legs || [];
      const steps = legs[0]?.steps || [];

      return {
        coordinates: allCoords,
        distance: properties.distance, // meters
        duration: properties.time, // seconds
        steps: steps.map(step => ({
          instruction: step.instruction?.text || 'Continue',
          distance: step.distance,
          duration: step.time,
          name: step.name || '',
        })),
      };
    }
    return null;
  } catch (error) {
    console.error('Geoapify routing error:', error);
    return null;
  }
};

// Get color based on zone intensity
const getZoneColor = (intensity) => {
  switch (intensity) {
    case 'high': return { fill: 'rgba(255, 59, 48, 0.3)', stroke: 'rgba(255, 59, 48, 0.6)' };
    case 'medium': return { fill: 'rgba(255, 149, 0, 0.25)', stroke: 'rgba(255, 149, 0, 0.5)' };
    case 'low': return { fill: 'rgba(255, 204, 0, 0.2)', stroke: 'rgba(255, 204, 0, 0.4)' };
    default: return { fill: 'rgba(255, 140, 0, 0.2)', stroke: 'rgba(255, 140, 0, 0.5)' };
  }
};

// Calculate a safe route locally (fallback when API unavailable)
const calculateLocalSafeRoute = (startCoords, endCoords) => {
  // Find the nearest blue light to pass through
  let nearestBlueLight = null;
  let minTotalDist = Infinity;

  BLUE_LIGHTS.forEach(bl => {
    const distFromStart = Math.sqrt(
      Math.pow(bl.latitude - startCoords.latitude, 2) +
      Math.pow(bl.longitude - startCoords.longitude, 2)
    );
    const distToEnd = Math.sqrt(
      Math.pow(endCoords.latitude - bl.latitude, 2) +
      Math.pow(endCoords.longitude - bl.longitude, 2)
    );
    const totalDist = distFromStart + distToEnd;

    if (totalDist < minTotalDist) {
      minTotalDist = totalDist;
      nearestBlueLight = bl;
    }
  });

  // Create waypoints: start -> blue light -> end
  const route = [startCoords];

  if (nearestBlueLight) {
    // Add intermediate point between start and blue light
    route.push({
      latitude: (startCoords.latitude + nearestBlueLight.latitude) / 2,
      longitude: (startCoords.longitude + nearestBlueLight.longitude) / 2,
    });
    // Add the blue light station
    route.push({
      latitude: nearestBlueLight.latitude,
      longitude: nearestBlueLight.longitude,
    });
    // Add intermediate point between blue light and end
    route.push({
      latitude: (nearestBlueLight.latitude + endCoords.latitude) / 2,
      longitude: (nearestBlueLight.longitude + endCoords.longitude) / 2,
    });
  }

  route.push(endCoords);
  return route;
};

// Gemini API function to get safe route
const getSafeRoute = async (startCoords, endCoords) => {
  try {
    const prompt = `You are a campus safety routing AI for Virginia Tech. Given these locations:

Blue Light Stations (safe points): ${JSON.stringify(BLUE_LIGHTS.map(b => ({ name: b.name, lat: b.latitude, lng: b.longitude })))}

Activity Zones to AVOID: ${JSON.stringify(ACTIVITY_ZONES.map(z => ({ lat: z.latitude, lng: z.longitude, radius: z.radius, danger: z.intensity })))}

Calculate the SAFEST walking route from:
Start: latitude ${startCoords.latitude}, longitude ${startCoords.longitude}
End: latitude ${endCoords.latitude}, longitude ${endCoords.longitude}

Create a route with 6-10 waypoints that:
1. Stays CLOSE to blue light stations when possible
2. AVOIDS high and medium intensity activity zones
3. Takes reasonable walking paths (not straight lines through buildings)

IMPORTANT: Return ONLY a valid JSON array of coordinates, nothing else. Format:
[{"latitude": 37.xxx, "longitude": -80.xxx}, {"latitude": 37.xxx, "longitude": -80.xxx}, ...]

The route must start at the start coordinates and end at the end coordinates.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
          }
        })
      }
    );

    const data = await response.json();
    console.log('Gemini API Response:', JSON.stringify(data, null, 2));

    if (data.error) {
      console.error('Gemini API Error:', data.error.message);
      // Use local calculation as fallback
      console.log('Using local safe route calculation...');
      return calculateLocalSafeRoute(startCoords, endCoords);
    }

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      let routeText = data.candidates[0].content.parts[0].text.trim();
      // Clean up the response - remove markdown code blocks if present
      routeText = routeText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      console.log('Parsed route text:', routeText);
      const route = JSON.parse(routeText);
      return route;
    }

    // Fallback to local calculation
    return calculateLocalSafeRoute(startCoords, endCoords);
  } catch (error) {
    console.error('Gemini API Error:', error);
    // Fallback: use local safe route calculation
    return calculateLocalSafeRoute(startCoords, endCoords);
  }
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
];

// ============ COMPONENTS ============

// Safety Card Component
function SafetyCard({ title, subtitle, icon, color = '#FF6B35', onPress, children }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            {icon}
          </View>
        )}
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {children && <View style={styles.cardContent}>{children}</View>}
    </TouchableOpacity>
  );
}

// SOS Button Component
function SOSButton() {
  const [showModal, setShowModal] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleLongPress = () => {
    setShowModal(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.sosButton}
        onLongPress={handleLongPress}
        delayLongPress={1000}
        activeOpacity={0.8}
      >
        <AlertTriangle color="#fff" size={24} />
        <Text style={styles.sosButtonText}>SOS</Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.emergencyOverlay}>
          <View style={styles.emergencyContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowModal(false)}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
            <AlertTriangle color="#FF3B30" size={64} />
            <Text style={styles.emergencyTitle}>EMERGENCY ACTIVATED</Text>
            <Text style={styles.emergencyText}>Alerting campus security...</Text>
            <Text style={styles.emergencyText}>Nearest Blue Light: War Memorial Hall</Text>
            <TouchableOpacity style={styles.callButton}>
              <Phone color="#FF3B30" size={24} />
              <Text style={styles.callButtonText}>Call 911</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel Alert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ============ SCREENS ============

// Home Screen
function HomeScreen({ setActiveTab }) {
  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Shield color="#FF6B35" size={32} />
          <View>
            <Text style={styles.headerTitle}>Lumina</Text>
            <Text style={styles.headerSubtitle}>VT Campus Safety</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Bell color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>Campus Status: Safe</Text>
        <Text style={styles.statusTime}>Updated 2 min ago</Text>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('map')}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#007AFF20' }]}>
            <MapPin color="#007AFF" size={24} />
          </View>
          <Text style={styles.quickActionText}>Find Blue{'\n'}Light</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('groups')}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#34C75920' }]}>
            <Users color="#34C759" size={24} />
          </View>
          <Text style={styles.quickActionText}>Join{'\n'}Group</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#FF6B3520' }]}>
            <Phone color="#FF6B35" size={24} />
          </View>
          <Text style={styles.quickActionText}>Emergency{'\n'}Contacts</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Nearby Safety</Text>
      <SafetyCard
        title="War Memorial Hall"
        subtitle="Blue Light Station • 0.2 mi away"
        icon={<MapPin color="#007AFF" size={24} />}
        color="#007AFF"
        onPress={() => setActiveTab('map')}
      >
        <View style={styles.cardAction}>
          <Text style={styles.cardActionText}>Get Directions</Text>
          <ChevronRight color="#8892b0" size={20} />
        </View>
      </SafetyCard>

      <Text style={styles.sectionTitle}>Active Walking Groups</Text>
      {WALKING_GROUPS.slice(0, 2).map((group) => (
        <SafetyCard
          key={group.id}
          title={group.name}
          subtitle={`${Array.isArray(group.members) ? group.members.length : group.members || 1} people • ${group.time}`}
          icon={<Users color="#34C759" size={24} />}
          color="#34C759"
          onPress={() => setActiveTab('groups')}
        >
          <View style={styles.cardAction}>
            <Text style={styles.cardActionText}>Join Group</Text>
            <ChevronRight color="#8892b0" size={20} />
          </View>
        </SafetyCard>
      ))}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// Map Screen
function MapScreen({ viewingGroupRoute, setViewingGroupRoute, meetingGroupRoute, setMeetingGroupRoute }) {
  const mapRef = useRef(null);
  const [showActivityZones, setShowActivityZones] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showDirections, setShowDirections] = useState(false);

  // Route planning state
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(null); // 'start' or 'end'
  const [routeInfo, setRouteInfo] = useState(null);
  const [geoapifySteps, setGeoapifySteps] = useState([]);

  // Autocomplete state
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Navigation mode state
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [directions, setDirections] = useState([]);

  // Live location tracking state
  const [liveLocation, setLiveLocation] = useState(null);
  const [distanceToNextStep, setDistanceToNextStep] = useState(null);
  const locationSubscription = useRef(null);

  // Calculate distance between two coordinates (in meters)
  const getDistanceBetween = (coord1, coord2) => {
    if (!coord1 || !coord2) return Infinity;
    const lat1 = coord1.latitude * Math.PI / 180;
    const lat2 = coord2.latitude * Math.PI / 180;
    const dLat = lat2 - lat1;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(6371000 * c); // Earth radius in meters
  };

  // Start live location tracking
  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Location permission is needed for live navigation');
        return false;
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 3,
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading,
          };
          setLiveLocation(newLocation);
        }
      );
      return true;
    } catch (error) {
      console.error('Location tracking error:', error);
      return false;
    }
  };

  // Stop live location tracking
  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setLiveLocation(null);
    setDistanceToNextStep(null);
  };

  // Auto-advance steps based on user location
  React.useEffect(() => {
    if (!isNavigating || !liveLocation || !directions.length) return;

    // Find current step's target coordinate
    const currentDir = directions[currentStep];
    const nextDir = directions[currentStep + 1];

    if (currentDir?.coordinate) {
      const distToCurrent = getDistanceBetween(liveLocation, currentDir.coordinate);
      setDistanceToNextStep(distToCurrent);

      // Auto-advance when within 15 meters of current waypoint
      if (distToCurrent < 15 && currentStep < directions.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }

    // Center map on user during navigation
    if (mapRef.current) {
      mapRef.current.animateCamera({
        center: liveLocation,
        pitch: 60, // Tilted view like Apple Maps
        heading: liveLocation.heading || 0,
        zoom: 18,
      }, { duration: 500 });
    }
  }, [liveLocation, isNavigating, currentStep, directions]);

  // Handle viewing a group's route
  React.useEffect(() => {
    if (viewingGroupRoute && viewingGroupRoute.startCoords && viewingGroupRoute.destCoords) {
      const fetchGroupRoute = async () => {
        setIsLoadingRoute(true);
        setStartLocation(viewingGroupRoute.startLocation || 'Group Start');
        setEndLocation(viewingGroupRoute.destination);
        setStartCoords(viewingGroupRoute.startCoords);
        setEndCoords(viewingGroupRoute.destCoords);

        try {
          const routeData = await getGeoapifyRoute(viewingGroupRoute.startCoords, viewingGroupRoute.destCoords);
          if (routeData && routeData.coordinates.length > 0) {
            setRouteCoords(routeData.coordinates);
            setGeoapifySteps(routeData.steps);
            const distanceM = routeData.distance;
            const durationSec = routeData.duration;
            setRouteInfo({
              distance: distanceM > 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${Math.round(distanceM)} m`,
              time: `${Math.ceil(durationSec / 60)} min`,
            });

            if (mapRef.current) {
              mapRef.current.fitToCoordinates(routeData.coordinates, {
                edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
                animated: true,
              });
            }
          }
        } catch (error) {
          console.error('Error fetching group route:', error);
        }
        setIsLoadingRoute(false);
        setViewingGroupRoute(null);
      };
      fetchGroupRoute();
    }
  }, [viewingGroupRoute]);

  // Handle getting directions to meet a group
  React.useEffect(() => {
    const fetchMeetingRoute = async () => {
      if (!meetingGroupRoute || !meetingGroupRoute.startCoords) return;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          alert('Location permission needed for directions');
          setMeetingGroupRoute(null);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setIsLoadingRoute(true);
        setStartLocation('Your Location');
        setEndLocation(meetingGroupRoute.startLocation || 'Meeting Point');
        setStartCoords(userCoords);
        setEndCoords(meetingGroupRoute.startCoords);

        const routeData = await getGeoapifyRoute(userCoords, meetingGroupRoute.startCoords);
        if (routeData && routeData.coordinates.length > 0) {
          setRouteCoords(routeData.coordinates);
          setGeoapifySteps(routeData.steps);
          const distanceM = routeData.distance;
          const durationSec = routeData.duration;
          setRouteInfo({
            distance: distanceM > 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${Math.round(distanceM)} m`,
            time: `${Math.ceil(durationSec / 60)} min`,
          });

          if (mapRef.current) {
            mapRef.current.fitToCoordinates(routeData.coordinates, {
              edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
              animated: true,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching meeting route:', error);
      }
      setIsLoadingRoute(false);
      setMeetingGroupRoute(null);
    };

    fetchMeetingRoute();
  }, [meetingGroupRoute]);

  const handleGetDirections = (station) => {
    setSelectedStation(station);
    setShowDirections(true);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: station.latitude,
        longitude: station.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 500);
    }
  };

  const selectLocation = (location, type) => {
    const coords = { latitude: location.latitude, longitude: location.longitude };
    const name = location.shortName || location.name;

    if (type === 'start') {
      setStartLocation(name);
      setStartCoords(coords);
    } else {
      setEndLocation(name);
      setEndCoords(coords);
    }
    setShowLocationPicker(null);
    setSearchText('');
    setSuggestions([]);
  };

  // Handle autocomplete search
  const handleSearchChange = (text) => {
    setSearchText(text);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    // Debounce API call
    setIsLoadingSuggestions(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await getAddressSuggestions(text);
      setSuggestions(results);
      setIsLoadingSuggestions(false);
    }, 300);
  };

  const getLocationCoords = (locationName) => {
    // First try exact name match
    const exactMatch = VT_LOCATIONS.find(l => l.name === locationName);
    if (exactMatch) {
      return { latitude: exactMatch.latitude, longitude: exactMatch.longitude };
    }
    // Then try fuzzy match
    const fuzzyMatch = findMatchingVTLocation(locationName);
    return fuzzyMatch ? { latitude: fuzzyMatch.latitude, longitude: fuzzyMatch.longitude } : null;
  };

  const calculateDistance = (coords) => {
    if (!coords || coords.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const lat1 = coords[i].latitude * Math.PI / 180;
      const lat2 = coords[i + 1].latitude * Math.PI / 180;
      const dLat = lat2 - lat1;
      const dLon = (coords[i + 1].longitude - coords[i].longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += 6371000 * c; // Earth radius in meters
    }
    return total;
  };

  const handleFindRoute = async () => {
    // Use stored coords if available, otherwise look up from presets
    let start = startCoords || getLocationCoords(startLocation);
    let end = endCoords || getLocationCoords(endLocation);

    if (!start || !end) {
      alert('Please select valid start and end locations');
      return;
    }

    setIsLoadingRoute(true);
    setRouteCoords(null);
    setRouteInfo(null);
    setGeoapifySteps([]);

    try {
      // Use Geoapify for real walking route
      const routeData = await getGeoapifyRoute(start, end);

      if (routeData && routeData.coordinates.length > 0) {
        setRouteCoords(routeData.coordinates);
        setGeoapifySteps(routeData.steps);

        // Format distance and time from Geoapify data
        const distanceM = routeData.distance;
        const durationSec = routeData.duration;

        setRouteInfo({
          distance: distanceM > 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${Math.round(distanceM)} m`,
          time: `${Math.ceil(durationSec / 60)} min`,
        });

        // Fit map to show entire route
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(routeData.coordinates, {
            edgePadding: { top: 150, right: 50, bottom: 200, left: 50 },
            animated: true,
          });
        }
      } else {
        alert('Could not find a walking route. Please try different locations.');
      }
    } catch (error) {
      console.error('Route error:', error);
      alert('Failed to calculate route. Please try again.');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const clearRoute = () => {
    stopLocationTracking();
    setRouteCoords(null);
    setRouteInfo(null);
    setStartLocation('');
    setEndLocation('');
    setStartCoords(null);
    setEndCoords(null);
    setGeoapifySteps([]);
    setIsNavigating(false);
    setDirections([]);
    setCurrentStep(0);
  };

  // Generate turn-by-turn directions from route coordinates
  const generateDirections = (coords, start, end) => {
    if (!coords || coords.length < 2) return [];

    const getDirection = (from, to) => {
      const dLat = to.latitude - from.latitude;
      const dLon = to.longitude - from.longitude;

      if (Math.abs(dLat) > Math.abs(dLon)) {
        return dLat > 0 ? 'north' : 'south';
      } else {
        return dLon > 0 ? 'east' : 'west';
      }
    };

    const getDistance = (from, to) => {
      const lat1 = from.latitude * Math.PI / 180;
      const lat2 = to.latitude * Math.PI / 180;
      const dLat = lat2 - lat1;
      const dLon = (to.longitude - from.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(6371000 * c); // meters
    };

    // Find nearby blue lights for safety instructions
    const findNearbyBlueLights = (coord) => {
      return BLUE_LIGHTS.filter(bl => {
        const dist = getDistance(coord, { latitude: bl.latitude, longitude: bl.longitude });
        return dist < 150; // within 150m
      });
    };

    const steps = [];

    // Starting instruction
    steps.push({
      instruction: `Start at ${start}`,
      detail: 'Begin your safe route',
      distance: '',
      icon: 'start',
    });

    // Generate directions for each segment
    for (let i = 0; i < coords.length - 1; i++) {
      const from = coords[i];
      const to = coords[i + 1];
      const direction = getDirection(from, to);
      const distance = getDistance(from, to);
      const nearbyBlueLights = findNearbyBlueLights(to);

      let instruction = `Head ${direction}`;
      let detail = `Continue for ${distance}m`;

      if (nearbyBlueLights.length > 0) {
        detail += ` • Blue Light near: ${nearbyBlueLights[0].name}`;
      }

      steps.push({
        instruction,
        detail,
        distance: `${distance}m`,
        icon: direction,
        coordinate: to,
      });
    }

    // Arrival instruction
    steps.push({
      instruction: `Arrive at ${end}`,
      detail: 'You have reached your destination safely',
      distance: '',
      icon: 'destination',
    });

    return steps;
  };

  // Start navigation mode with live location tracking
  const startNavigation = async () => {
    if (!routeCoords || routeCoords.length < 2) return;

    // Start location tracking first
    const trackingStarted = await startLocationTracking();
    if (!trackingStarted) {
      // Continue without live tracking if permission denied
      console.log('Continuing without live location tracking');
    }

    // Use Geoapify steps if available, otherwise fall back to generated directions
    let dirs;
    if (geoapifySteps && geoapifySteps.length > 0) {
      dirs = [
        {
          instruction: `Start at ${startLocation}`,
          detail: 'Begin your safe route',
          distance: '',
          icon: 'start',
          coordinate: routeCoords[0],
        },
        ...geoapifySteps.map((step, index) => ({
          instruction: step.instruction,
          detail: step.name || `Continue for ${Math.round(step.distance)}m`,
          distance: `${Math.round(step.distance)}m`,
          icon: 'navigate',
          coordinate: routeCoords[Math.min(index + 1, routeCoords.length - 1)],
        })),
        {
          instruction: `Arrive at ${endLocation}`,
          detail: 'You have reached your destination safely',
          distance: '',
          icon: 'destination',
          coordinate: routeCoords[routeCoords.length - 1],
        },
      ];
    } else {
      dirs = generateDirections(routeCoords, startLocation, endLocation);
    }

    setDirections(dirs);
    setCurrentStep(0);
    setIsNavigating(true);

    // Zoom to user's current location or first step
    if (mapRef.current) {
      mapRef.current.animateCamera({
        center: routeCoords[0],
        pitch: 60,
        zoom: 18,
      }, { duration: 500 });
    }
  };

  // Navigate to next step
  const nextStep = () => {
    if (currentStep < directions.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);

      // Zoom to current waypoint
      if (mapRef.current && directions[newStep]?.coordinate) {
        mapRef.current.animateToRegion({
          latitude: directions[newStep].coordinate.latitude,
          longitude: directions[newStep].coordinate.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);
      }
    }
  };

  // Navigate to previous step
  const prevStep = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);

      if (mapRef.current && directions[newStep]?.coordinate) {
        mapRef.current.animateToRegion({
          latitude: directions[newStep].coordinate.latitude,
          longitude: directions[newStep].coordinate.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);
      }
    }
  };

  // Exit navigation mode
  const exitNavigation = () => {
    // Stop location tracking
    stopLocationTracking();

    setIsNavigating(false);
    setCurrentStep(0);

    // Zoom out to show full route
    if (mapRef.current && routeCoords) {
      mapRef.current.fitToCoordinates(routeCoords, {
        edgePadding: { top: 150, right: 50, bottom: 200, left: 50 },
        animated: true,
      });
    }
  };

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={VT_CENTER}
        customMapStyle={darkMapStyle}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {/* Activity Zones as spotted circles */}
        {showActivityZones && ACTIVITY_ZONES.map((zone) => {
          const colors = getZoneColor(zone.intensity);
          return (
            <Circle
              key={zone.id}
              center={{ latitude: zone.latitude, longitude: zone.longitude }}
              radius={zone.radius}
              fillColor={colors.fill}
              strokeColor={colors.stroke}
              strokeWidth={2}
            />
          );
        })}

        {/* Safe Route Polyline */}
        {routeCoords && routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#34C759"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}

        {/* Start Location Marker - shows when selected */}
        {startCoords && (
          <Marker
            coordinate={routeCoords?.length > 0 ? routeCoords[0] : startCoords}
            pinColor="#34C759"
            title="Start"
          />
        )}

        {/* Destination Marker - shows when selected */}
        {endCoords && (
          <Marker
            coordinate={routeCoords?.length > 1 ? routeCoords[routeCoords.length - 1] : endCoords}
            pinColor="#FF3B30"
            title="Destination"
          />
        )}

        {BLUE_LIGHTS.map((station) => (
          <Marker
            key={station.id}
            coordinate={{ latitude: station.latitude, longitude: station.longitude }}
            pinColor="#007AFF"
          >
            <Callout onPress={() => handleGetDirections(station)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>🔵 Blue Light Station</Text>
                <Text style={styles.calloutName}>{station.name}</Text>
                <Text style={styles.calloutDistance}>{station.distance} away</Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {WALKING_GROUPS.map((group) => (
          <Marker
            key={group.id}
            coordinate={{ latitude: group.latitude, longitude: group.longitude }}
            pinColor="#34C759"
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>🚶 {group.name}</Text>
                <Text style={styles.calloutName}>To {group.destination}</Text>
                <Text style={styles.calloutDistance}>{Array.isArray(group.members) ? group.members.length : group.members || 1} people</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Route Search Panel - Hide during navigation */}
      {!isNavigating && (
      <View style={styles.routePanel}>
        <View style={styles.routeInputContainer}>
          <View style={styles.routeInputWrapper}>
            <View style={[styles.routeDot, { backgroundColor: '#34C759' }]} />
            <TouchableOpacity
              style={styles.routeInput}
              onPress={() => setShowLocationPicker('start')}
            >
              <Text style={startLocation ? styles.routeInputText : styles.routeInputPlaceholder}>
                {startLocation || 'Starting location'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.routeInputDivider} />

          <View style={styles.routeInputWrapper}>
            <View style={[styles.routeDot, { backgroundColor: '#FF3B30' }]} />
            <TouchableOpacity
              style={styles.routeInput}
              onPress={() => setShowLocationPicker('end')}
            >
              <Text style={endLocation ? styles.routeInputText : styles.routeInputPlaceholder}>
                {endLocation || 'Destination'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.findRouteButton, isLoadingRoute && styles.findRouteButtonDisabled]}
          onPress={handleFindRoute}
          disabled={isLoadingRoute || !startLocation || !endLocation}
        >
          {isLoadingRoute ? (
            <Text style={styles.findRouteButtonText}>Finding safe route...</Text>
          ) : (
            <>
              <Search color="#fff" size={18} />
              <Text style={styles.findRouteButtonText}>Find Safe Route</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      )}

      {/* Location Picker Modal with Autocomplete */}
      {showLocationPicker && (
        <View style={styles.locationPickerOverlay}>
          <View style={styles.locationPicker}>
            <View style={styles.locationPickerHeader}>
              <Text style={styles.locationPickerTitle}>
                {showLocationPicker === 'start' ? 'Starting' : 'Destination'} Location
              </Text>
              <TouchableOpacity onPress={() => {
                setShowLocationPicker(null);
                setSearchText('');
                setSuggestions([]);
              }}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <Search color="#64748b" size={20} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a location..."
                placeholderTextColor="#64748b"
                value={searchText}
                onChangeText={handleSearchChange}
                autoFocus
              />
              {isLoadingSuggestions && (
                <Text style={styles.loadingText}>...</Text>
              )}
            </View>

            <ScrollView style={styles.locationList}>
              {/* My Location Option - Only for starting location */}
              {showLocationPicker === 'start' && (
                <TouchableOpacity
                  style={styles.myLocationItem}
                  onPress={async () => {
                    try {
                      const { status } = await Location.requestForegroundPermissionsAsync();
                      if (status === 'granted') {
                        const location = await Location.getCurrentPositionAsync({
                          accuracy: Location.Accuracy.Balanced,
                        });
                        selectLocation({
                          name: 'My Location',
                          shortName: 'My Location',
                          latitude: location.coords.latitude,
                          longitude: location.coords.longitude,
                        }, showLocationPicker);
                      } else {
                        alert('Location permission is required');
                      }
                    } catch (error) {
                      alert('Could not get your location');
                    }
                  }}
                >
                  <Crosshair color="#007AFF" size={22} />
                  <Text style={styles.myLocationText}>Use My Location</Text>
                </TouchableOpacity>
              )}

              {/* Autocomplete Suggestions - VT Presets shown first */}
              {suggestions.length > 0 && (
                <>
                  {suggestions.some(s => s.isPreset) && (
                    <>
                      <Text style={styles.locationSectionTitle}>VT Campus Matches</Text>
                      {suggestions.filter(s => s.isPreset).map((location, index) => (
                        <TouchableOpacity
                          key={`preset-match-${index}`}
                          style={[styles.locationItem, styles.presetMatchItem]}
                          onPress={() => selectLocation(location, showLocationPicker)}
                        >
                          <MapPin color="#FF6B35" size={20} />
                          <View style={styles.locationItemContent}>
                            <Text style={styles.locationItemText}>{location.shortName}</Text>
                            <Text style={styles.locationItemSubtext}>VT Campus Location</Text>
                          </View>
                          <Check color="#34C759" size={18} />
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                  {suggestions.some(s => !s.isPreset) && (
                    <>
                      <Text style={styles.locationSectionTitle}>Other Results</Text>
                      {suggestions.filter(s => !s.isPreset).map((location, index) => (
                        <TouchableOpacity
                          key={`suggestion-${index}`}
                          style={styles.locationItem}
                          onPress={() => selectLocation(location, showLocationPicker)}
                        >
                          <Search color="#64748b" size={20} />
                          <View style={styles.locationItemContent}>
                            <Text style={styles.locationItemText}>{location.shortName}</Text>
                            <Text style={styles.locationItemSubtext} numberOfLines={1}>{location.name}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* VT Campus Presets */}
              <Text style={styles.locationSectionTitle}>VT Campus Locations</Text>
              {VT_LOCATIONS.map((location, index) => (
                <TouchableOpacity
                  key={`preset-${index}`}
                  style={styles.locationItem}
                  onPress={() => selectLocation(location, showLocationPicker)}
                >
                  <MapPin color="#FF6B35" size={20} />
                  <Text style={styles.locationItemText}>{location.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Map Controls - Hide during navigation */}
      {!isNavigating && (
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.controlButton, showActivityZones && styles.controlButtonActive]}
            onPress={() => setShowActivityZones(!showActivityZones)}
          >
            <Text style={styles.controlButtonIcon}>⚠️</Text>
            <Text style={styles.controlButtonText}>Zones</Text>
          </TouchableOpacity>
          {routeCoords && (
            <TouchableOpacity
              style={[styles.controlButton, { marginTop: 8 }]}
              onPress={clearRoute}
            >
              <X color="#fff" size={16} />
              <Text style={styles.controlButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Legend - Hide during navigation */}
      {!isNavigating && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.legendText}>Blue Light Stations</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
            <Text style={styles.legendText}>Safe Route / Groups</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
            <Text style={styles.legendText}>High Risk Zone</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.legendText}>Medium Risk Zone</Text>
          </View>
        </View>
      )}

      {/* Route Info Panel */}
      {routeInfo && !isNavigating && (
        <View style={styles.routeInfoPanel}>
          <View style={styles.routeInfoHeader}>
            <Shield color="#34C759" size={24} />
            <Text style={styles.routeInfoTitle}>Safe Route Found</Text>
          </View>
          <View style={styles.routeInfoStats}>
            <View style={styles.routeInfoStat}>
              <Text style={styles.routeInfoStatValue}>{routeInfo.distance}</Text>
              <Text style={styles.routeInfoStatLabel}>Distance</Text>
            </View>
            <View style={styles.routeInfoStatDivider} />
            <View style={styles.routeInfoStat}>
              <Text style={styles.routeInfoStatValue}>{routeInfo.time}</Text>
              <Text style={styles.routeInfoStatLabel}>Walking Time</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.startWalkingButton} onPress={startNavigation}>
            <Navigation color="#fff" size={18} />
            <Text style={styles.startWalkingButtonText}>Start Walking</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Navigation Mode Panel */}
      {isNavigating && directions.length > 0 && (
        <View style={styles.navigationPanel}>
          <View style={styles.navigationHeader}>
            <View style={styles.navigationHeaderLeft}>
              <Navigation color="#34C759" size={24} />
              <Text style={styles.navigationTitle}>
                {liveLocation ? 'Live Navigation' : 'Navigating'}
              </Text>
            </View>
            <TouchableOpacity onPress={exitNavigation} style={styles.exitNavButton}>
              <X color="#FF3B30" size={20} />
              <Text style={styles.exitNavButtonText}>Exit</Text>
            </TouchableOpacity>
          </View>

          {/* Live Distance Banner */}
          {distanceToNextStep !== null && (
            <View style={styles.liveDistanceBanner}>
              <Text style={styles.liveDistanceText}>
                In {distanceToNextStep < 1000 ? `${distanceToNextStep}m` : `${(distanceToNextStep / 1000).toFixed(1)}km`}
              </Text>
              <Text style={styles.liveDistanceLabel}>to next turn</Text>
            </View>
          )}

          <View style={styles.navigationStep}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepNumber}>{currentStep + 1}</Text>
              <Text style={styles.stepTotal}>/ {directions.length}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepInstruction}>{directions[currentStep]?.instruction}</Text>
              <Text style={styles.stepDetail}>{directions[currentStep]?.detail}</Text>
              {!distanceToNextStep && directions[currentStep]?.distance && (
                <Text style={styles.stepDistance}>{directions[currentStep]?.distance}</Text>
              )}
            </View>
          </View>

          <View style={styles.navigationControls}>
            <TouchableOpacity
              style={[styles.navControlButton, currentStep === 0 && styles.navControlButtonDisabled]}
              onPress={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronRight color={currentStep === 0 ? '#64748b' : '#fff'} size={24} style={{ transform: [{ rotate: '180deg' }] }} />
              <Text style={[styles.navControlText, currentStep === 0 && styles.navControlTextDisabled]}>Previous</Text>
            </TouchableOpacity>

            <View style={styles.progressDots}>
              {directions.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep && styles.progressDotActive,
                    index < currentStep && styles.progressDotCompleted,
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.navControlButton, currentStep === directions.length - 1 && styles.navControlButtonDisabled]}
              onPress={nextStep}
              disabled={currentStep === directions.length - 1}
            >
              <Text style={[styles.navControlText, currentStep === directions.length - 1 && styles.navControlTextDisabled]}>Next</Text>
              <ChevronRight color={currentStep === directions.length - 1 ? '#64748b' : '#fff'} size={24} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showDirections && selectedStation && (
        <View style={styles.directionsPanel}>
          <View style={styles.directionsPanelHeader}>
            <View>
              <Text style={styles.directionsPanelTitle}>Directions</Text>
              <Text style={styles.directionsPanelSubtitle}>{selectedStation.name}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowDirections(false)}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>
          <View style={styles.directionsInfo}>
            <Navigation color="#007AFF" size={20} />
            <Text style={styles.directionsInfoText}>{selectedStation.distance} • ~3 min walk</Text>
          </View>
          <TouchableOpacity style={styles.startButton}>
            <Text style={styles.startButtonText}>Start Walking</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Groups Screen
function GroupsScreen({ joinedGroups, setJoinedGroups, userGroups, setUserGroups, viewGroupRoute, getDirectionsToGroup }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [joined, setJoined] = useState(false);

  // User location for distance filtering
  const [userLocation, setUserLocation] = useState(null);

  // Create group modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupStart, setNewGroupStart] = useState('');
  const [newGroupStartCoords, setNewGroupStartCoords] = useState(null);
  const [newGroupDestination, setNewGroupDestination] = useState('');
  const [newGroupDestCoords, setNewGroupDestCoords] = useState(null);
  const [newGroupDepartureMinutes, setNewGroupDepartureMinutes] = useState(10);

  // Location picker state for create modal
  const [activeCreateField, setActiveCreateField] = useState(null); // 'start' or 'destination'
  const [createSearchText, setCreateSearchText] = useState('');
  const [createSuggestions, setCreateSuggestions] = useState([]);
  const [isLoadingCreateSuggestions, setIsLoadingCreateSuggestions] = useState(false);
  const createSearchTimeoutRef = React.useRef(null);

  // Get user location on mount
  React.useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    })();
  }, []);

  // Calculate walking time in minutes between two points
  const getWalkingMinutes = (from, to) => {
    if (!from || !to) return Infinity;
    const lat1 = from.latitude * Math.PI / 180;
    const lat2 = to.latitude * Math.PI / 180;
    const dLat = lat2 - lat1;
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightLineMeters = 6371000 * c;
    // Multiply by 1.3 to account for actual walking paths (not straight line)
    const walkingMeters = straightLineMeters * 1.3;
    // Average walking speed: 80 meters per minute (~3 mph)
    return Math.ceil(walkingMeters / 80);
  };

  // Calculate time remaining until departure
  const getTimeRemaining = (group) => {
    if (!group.createdAt || !group.departureMinutes) return null;
    const departureTime = group.createdAt + (group.departureMinutes * 60 * 1000);
    const remaining = Math.ceil((departureTime - Date.now()) / 60000);
    return remaining > 0 ? remaining : 0;
  };

  // Filter groups by walking distance
  const filterGroupsByDistance = (groups) => {
    if (!userLocation) return groups; // Show all if no location
    return groups.filter(group => {
      if (!group.startCoords) return true; // Show groups without coords
      const walkTime = getWalkingMinutes(userLocation, group.startCoords);
      const timeRemaining = getTimeRemaining(group);
      if (timeRemaining === null) return true;
      return walkTime <= timeRemaining;
    });
  };

  const isGroupJoined = (groupId) => joinedGroups.includes(groupId);

  // Handle search for create group location fields
  const handleCreateSearchChange = async (text) => {
    setCreateSearchText(text);

    if (createSearchTimeoutRef.current) {
      clearTimeout(createSearchTimeoutRef.current);
    }

    if (text.length < 2) {
      setCreateSuggestions([]);
      return;
    }

    setIsLoadingCreateSuggestions(true);
    createSearchTimeoutRef.current = setTimeout(async () => {
      const results = await getAddressSuggestions(text);
      setCreateSuggestions(results);
      setIsLoadingCreateSuggestions(false);
    }, 300);
  };

  // Select location for create group
  const selectCreateLocation = (location) => {
    const coords = { latitude: location.latitude, longitude: location.longitude };
    const name = location.shortName || location.name;

    if (activeCreateField === 'start') {
      setNewGroupStart(name);
      setNewGroupStartCoords(coords);
    } else {
      setNewGroupDestination(name);
      setNewGroupDestCoords(coords);
    }
    setActiveCreateField(null);
    setCreateSearchText('');
    setCreateSuggestions([]);
  };

  // Use current location for start
  const useMyLocationForCreate = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setNewGroupStart('My Location');
        setNewGroupStartCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setActiveCreateField(null);
        setCreateSearchText('');
        setCreateSuggestions([]);
      } else {
        alert('Location permission is required');
      }
    } catch (error) {
      alert('Could not get your location');
    }
  };

  // Reset create modal
  const resetCreateModal = () => {
    setShowCreateModal(false);
    setNewGroupName('');
    setNewGroupStart('');
    setNewGroupStartCoords(null);
    setNewGroupDestination('');
    setNewGroupDestCoords(null);
    setNewGroupDepartureMinutes(10);
    setActiveCreateField(null);
    setCreateSearchText('');
    setCreateSuggestions([]);
  };

  const handleJoin = () => {
    if (selectedGroup && !isGroupJoined(selectedGroup.id)) {
      setJoinedGroups([...joinedGroups, selectedGroup.id]);

      // Add current user to the group's members
      const updatedGroups = userGroups.map(g => {
        if (g.id === selectedGroup.id) {
          return {
            ...g,
            members: [...(g.members || []), { id: 'currentUser', name: 'You', isReady: false, isCreator: false }]
          };
        }
        return g;
      });
      setUserGroups(updatedGroups);
    }
    setJoined(true);
    setTimeout(() => {
      setShowModal(false);
      setJoined(false);
      // Prompt for directions
      if (selectedGroup?.startCoords && getDirectionsToGroup) {
        setTimeout(() => {
          Alert.alert(
            'Get Directions',
            `Get directions to meet ${selectedGroup.name} at ${selectedGroup.startLocation}?`,
            [
              { text: 'No Thanks', style: 'cancel' },
              { text: 'Yes', onPress: () => getDirectionsToGroup(selectedGroup) }
            ]
          );
        }, 300);
      }
    }, 1500);
  };

  const handleLeave = (groupId) => {
    setJoinedGroups(joinedGroups.filter(id => id !== groupId));
    setShowModal(false);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !newGroupStart || !newGroupDestination) {
      alert('Please enter a group name, starting location, and destination');
      return;
    }

    const newGroup = {
      id: Date.now(),
      name: newGroupName.trim(),
      startLocation: newGroupStart,
      startCoords: newGroupStartCoords,
      destination: newGroupDestination,
      destCoords: newGroupDestCoords,
      departureMinutes: newGroupDepartureMinutes,
      createdAt: Date.now(),
      members: [
        { id: 'currentUser', name: 'You', isReady: true, isCreator: true }
      ],
      isUserCreated: true,
    };

    setUserGroups([newGroup, ...userGroups]);
    setJoinedGroups([...joinedGroups, newGroup.id]);
    resetCreateModal();
  };

  // Toggle member ready status
  const toggleMemberReady = (groupId) => {
    setUserGroups(userGroups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          members: g.members.map(m =>
            m.id === 'currentUser' ? { ...m, isReady: !m.isReady } : m
          )
        };
      }
      return g;
    }));
  };

  // Check if all members are ready
  const allMembersReady = (group) => {
    if (!group.members || !Array.isArray(group.members)) return false;
    return group.members.every(m => m.isReady);
  };

  // Handle check-in for current user
  const handleCheckIn = (groupId) => {
    // Update user-created groups
    setUserGroups(userGroups.map(g => {
      if (g.id === groupId && Array.isArray(g.members)) {
        return {
          ...g,
          members: g.members.map(m =>
            m.id === 'currentUser' ? { ...m, isReady: true } : m
          )
        };
      }
      return g;
    }));

    // For non-user groups, we could add the user as ready to a local state
    // For now, just show visual feedback
    alert('You\'ve checked in! Other members will see you\'re ready.');
  };

  const allGroups = [...userGroups, ...WALKING_GROUPS];

  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Walking Groups</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
          <Plus color="#fff" size={20} />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Users color="#34C759" size={24} />
        <View style={styles.infoCardContent}>
          <Text style={styles.infoCardTitle}>Walk Together, Stay Safe</Text>
          <Text style={styles.infoCardText}>Join a group heading your direction.</Text>
        </View>
      </View>

      {/* Your Groups Section */}
      {joinedGroups.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Your Groups</Text>
          {allGroups.filter(g => isGroupJoined(g.id)).map((group) => {
            const timeRemaining = getTimeRemaining(group);
            const memberCount = Array.isArray(group.members) ? group.members.length : group.members || 1;
            const readyCount = Array.isArray(group.members) ? group.members.filter(m => m.isReady).length : 0;

            return (
            <SafetyCard
              key={`joined-${group.id}`}
              title={group.name}
              subtitle={`${memberCount} members • ${readyCount}/${memberCount} ready`}
              icon={<Users color="#007AFF" size={24} />}
              color="#007AFF"
              onPress={() => {
                setSelectedGroup(group);
                setShowModal(true);
              }}
            >
              {timeRemaining !== null && (
                <View style={styles.countdownBanner}>
                  <Clock color="#FF6B35" size={14} />
                  <Text style={styles.countdownText}>
                    {timeRemaining > 0 ? `Departing in ${timeRemaining} min` : 'Departing now!'}
                  </Text>
                </View>
              )}
              <View style={styles.groupDetails}>
                {group.startLocation && (
                  <View style={styles.groupDetailItem}>
                    <Navigation color="#34C759" size={16} />
                    <Text style={styles.groupDetailText} numberOfLines={1}>From {group.startLocation}</Text>
                  </View>
                )}
                <View style={styles.groupDetailItem}>
                  <MapPin color="#FF3B30" size={16} />
                  <Text style={styles.groupDetailText} numberOfLines={1}>To {group.destination}</Text>
                </View>
              </View>
              <View style={styles.cardAction}>
                <View style={styles.joinedBadge}>
                  <Check color="#34C759" size={16} />
                  <Text style={styles.joinedBadgeText}>Joined</Text>
                </View>
              </View>
            </SafetyCard>
          )})}
        </>
      )}

      <Text style={styles.sectionTitle}>Active Groups Near You</Text>
      {filterGroupsByDistance(allGroups.filter(g => !isGroupJoined(g.id))).map((group) => {
        const timeRemaining = getTimeRemaining(group);
        const memberCount = Array.isArray(group.members) ? group.members.length : group.members || 1;
        const walkTime = userLocation && group.startCoords ? getWalkingMinutes(userLocation, group.startCoords) : null;

        return (
        <SafetyCard
          key={group.id}
          title={group.name}
          subtitle={`${memberCount} members${walkTime ? ` • ${walkTime} min walk` : ''}`}
          icon={<Users color="#34C759" size={24} />}
          color="#34C759"
          onPress={() => {
            setSelectedGroup(group);
            setJoined(false);
            setShowModal(true);
          }}
        >
          {timeRemaining !== null && (
            <View style={styles.countdownBanner}>
              <Clock color="#FF6B35" size={14} />
              <Text style={styles.countdownText}>
                {timeRemaining > 0 ? `Departing in ${timeRemaining} min` : 'Departing now!'}
              </Text>
            </View>
          )}
          <View style={styles.groupDetails}>
            {group.startLocation && (
              <View style={styles.groupDetailItem}>
                <Navigation color="#34C759" size={16} />
                <Text style={styles.groupDetailText} numberOfLines={1}>From {group.startLocation}</Text>
              </View>
            )}
            <View style={styles.groupDetailItem}>
              <MapPin color="#FF3B30" size={16} />
              <Text style={styles.groupDetailText} numberOfLines={1}>To {group.destination}</Text>
            </View>
          </View>
          <View style={styles.cardAction}>
            <Text style={[styles.cardActionText, { color: '#34C759' }]}>Join Group</Text>
            <ChevronRight color="#34C759" size={20} />
          </View>
        </SafetyCard>
      );
      })}

      {allGroups.filter(g => !isGroupJoined(g.id)).length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>You've joined all available groups!</Text>
        </View>
      )}

      <View style={{ height: 120 }} />

      {/* Join/View Group Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => { setShowModal(false); setJoined(false); }}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
            <Users color={isGroupJoined(selectedGroup?.id) ? '#007AFF' : '#34C759'} size={56} />
            <Text style={styles.modalTitle}>{selectedGroup?.name}</Text>
            <Text style={styles.modalText}>
              {selectedGroup?.startLocation ? `${selectedGroup.startLocation} → ` : ''}
              {selectedGroup?.destination}
            </Text>

            {/* Countdown Timer */}
            {selectedGroup && (
              <View style={styles.modalCountdown}>
                <Clock color="#FF6B35" size={16} />
                <Text style={styles.modalCountdownText}>
                  {getTimeRemaining(selectedGroup) > 0
                    ? `Departing in ${getTimeRemaining(selectedGroup)} min`
                    : 'Departing now!'
                  }
                </Text>
              </View>
            )}

            {isGroupJoined(selectedGroup?.id) ? (
              <ScrollView style={styles.memberListContainer} nestedScrollEnabled>
                {/* Member List with Check-in Status */}
                <Text style={styles.memberListTitle}>Members</Text>
                {Array.isArray(selectedGroup?.members) ? (
                  selectedGroup.members.map((member, index) => (
                    <View key={`${index}-${member.id}`} style={styles.memberItem}>
                      <View style={styles.memberInfo}>
                        <User color="#64748b" size={20} />
                        <Text style={styles.memberName}>
                          {member.name}
                          {member.isCreator && ' (Creator)'}
                        </Text>
                      </View>
                      <View style={[
                        styles.memberStatus,
                        member.isReady ? styles.memberStatusReady : styles.memberStatusWaiting
                      ]}>
                        {member.isReady ? (
                          <Check color="#34C759" size={16} />
                        ) : (
                          <Clock color="#FF9500" size={16} />
                        )}
                        <Text style={[
                          styles.memberStatusText,
                          member.isReady ? styles.memberStatusTextReady : styles.memberStatusTextWaiting
                        ]}>
                          {member.isReady ? 'Ready' : 'Waiting'}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.memberSubtext}>
                    {selectedGroup?.members || 1} member(s) in group
                  </Text>
                )}

                {/* I'm Here Button */}
                <TouchableOpacity
                  style={styles.imHereButton}
                  onPress={() => handleCheckIn(selectedGroup?.id)}
                >
                  <Check color="#fff" size={20} />
                  <Text style={styles.imHereButtonText}>I'm Here!</Text>
                </TouchableOpacity>

                {/* View Route Button */}
                {selectedGroup?.startCoords && selectedGroup?.destCoords && (
                  <TouchableOpacity
                    style={styles.viewRouteButton}
                    onPress={() => {
                      setShowModal(false);
                      viewGroupRoute(selectedGroup);
                    }}
                  >
                    <Navigation color="#007AFF" size={20} />
                    <Text style={styles.viewRouteButtonText}>View Route on Map</Text>
                  </TouchableOpacity>
                )}

                {/* Leave Group Button */}
                <TouchableOpacity
                  style={[styles.joinButton, { backgroundColor: 'rgba(255, 59, 48, 0.15)', marginTop: 12 }]}
                  onPress={() => handleLeave(selectedGroup?.id)}
                >
                  <Text style={[styles.joinButtonText, { color: '#FF3B30' }]}>Leave Group</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : joined ? (
              <View style={styles.joinedContainer}>
                <Check color="#34C759" size={32} />
                <Text style={styles.joinedText}>You've joined!</Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalSubtext}>
                  {Array.isArray(selectedGroup?.members)
                    ? `${selectedGroup.members.length} people in group`
                    : `${selectedGroup?.members || 1} people in group`
                  }
                </Text>
                <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
                  <Text style={styles.joinButtonText}>Join Group</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Group Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <TouchableOpacity style={styles.modalClose} onPress={resetCreateModal}>
              <X color="#fff" size={24} />
            </TouchableOpacity>

            {!activeCreateField ? (
              // Main Create Form
              <>
                <Plus color="#FF6B35" size={56} />
                <Text style={styles.modalTitle}>Create Walking Group</Text>
                <Text style={styles.modalSubtext}>Start a group and others can join you</Text>

                <View style={styles.createFormContainer}>
                  <Text style={styles.createFormLabel}>Group Name</Text>
                  <TextInput
                    style={styles.createFormInput}
                    placeholder="e.g., Late Night Library Crew"
                    placeholderTextColor="#64748b"
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                  />

                  <Text style={styles.createFormLabel}>Starting Location</Text>
                  <TouchableOpacity
                    style={[styles.createFormInput, styles.createFormInputRow]}
                    onPress={() => setActiveCreateField('start')}
                  >
                    <View style={[styles.routeDot, { backgroundColor: '#34C759' }]} />
                    <Text style={newGroupStart ? styles.createFormInputText : styles.createFormPlaceholder}>
                      {newGroupStart || 'Where are you starting from?'}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.createFormLabel}>Destination</Text>
                  <TouchableOpacity
                    style={[styles.createFormInput, styles.createFormInputRow]}
                    onPress={() => setActiveCreateField('destination')}
                  >
                    <View style={[styles.routeDot, { backgroundColor: '#FF3B30' }]} />
                    <Text style={newGroupDestination ? styles.createFormInputText : styles.createFormPlaceholder}>
                      {newGroupDestination || 'Where are you heading?'}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.createFormLabel}>Departure Time</Text>
                  <View style={styles.departureTimeContainer}>
                    {[5, 10, 15, 20].map((mins) => (
                      <TouchableOpacity
                        key={mins}
                        style={[
                          styles.departureTimeOption,
                          newGroupDepartureMinutes === mins && styles.departureTimeOptionActive
                        ]}
                        onPress={() => setNewGroupDepartureMinutes(mins)}
                      >
                        <Text style={[
                          styles.departureTimeText,
                          newGroupDepartureMinutes === mins && styles.departureTimeTextActive
                        ]}>
                          {mins} min
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.departureTimeHint}>
                    Only users within walking distance will see your group
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.joinButton, { backgroundColor: '#FF6B35' }]}
                  onPress={handleCreateGroup}
                >
                  <Text style={styles.joinButtonText}>Create Group</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Location Search View
              <>
                <View style={styles.createLocationHeader}>
                  <TouchableOpacity onPress={() => {
                    setActiveCreateField(null);
                    setCreateSearchText('');
                    setCreateSuggestions([]);
                  }}>
                    <ChevronRight color="#fff" size={24} style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                  <Text style={styles.createLocationTitle}>
                    {activeCreateField === 'start' ? 'Starting Location' : 'Destination'}
                  </Text>
                  <View style={{ width: 24 }} />
                </View>

                <View style={styles.searchInputContainer}>
                  <Search color="#64748b" size={20} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search for a location..."
                    placeholderTextColor="#64748b"
                    value={createSearchText}
                    onChangeText={handleCreateSearchChange}
                    autoFocus
                  />
                  {isLoadingCreateSuggestions && (
                    <Text style={styles.loadingText}>...</Text>
                  )}
                </View>

                <ScrollView style={styles.createLocationList} nestedScrollEnabled>
                  {/* My Location Option - Only for start */}
                  {activeCreateField === 'start' && (
                    <TouchableOpacity style={styles.myLocationItem} onPress={useMyLocationForCreate}>
                      <Crosshair color="#007AFF" size={22} />
                      <Text style={styles.myLocationText}>Use My Location</Text>
                    </TouchableOpacity>
                  )}

                  {/* Search Results */}
                  {createSuggestions.length > 0 && (
                    <>
                      {createSuggestions.filter(s => s.isPreset).length > 0 && (
                        <>
                          <Text style={styles.locationSectionTitle}>VT Campus</Text>
                          {createSuggestions.filter(s => s.isPreset).map((loc, index) => (
                            <TouchableOpacity
                              key={`preset-${index}`}
                              style={[styles.destinationPickerItem, styles.presetMatchItem]}
                              onPress={() => selectCreateLocation(loc)}
                            >
                              <MapPin color="#FF6B35" size={18} />
                              <Text style={styles.destinationPickerText}>{loc.name}</Text>
                              <Check color="#34C759" size={16} />
                            </TouchableOpacity>
                          ))}
                        </>
                      )}
                      {createSuggestions.filter(s => !s.isPreset).length > 0 && (
                        <>
                          <Text style={styles.locationSectionTitle}>Other Results</Text>
                          {createSuggestions.filter(s => !s.isPreset).map((loc, index) => (
                            <TouchableOpacity
                              key={`other-${index}`}
                              style={styles.destinationPickerItem}
                              onPress={() => selectCreateLocation(loc)}
                            >
                              <Search color="#64748b" size={18} />
                              <Text style={styles.destinationPickerText}>{loc.shortName || loc.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </>
                      )}
                    </>
                  )}

                  {/* VT Campus Presets */}
                  <Text style={styles.locationSectionTitle}>VT Campus Locations</Text>
                  {VT_LOCATIONS.map((loc, index) => (
                    <TouchableOpacity
                      key={`vt-${index}`}
                      style={styles.destinationPickerItem}
                      onPress={() => selectCreateLocation({
                        name: loc.name,
                        shortName: loc.name,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        isPreset: true,
                      })}
                    >
                      <MapPin color="#FF6B35" size={18} />
                      <Text style={styles.destinationPickerText}>{loc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Profile Screen
function ProfileScreen() {
  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <User color="#fff" size={40} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Hokie User</Text>
          <Text style={styles.profileEmail}>hokie@vt.edu</Text>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Safe Walks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>5</Text>
          <Text style={styles.statLabel}>Groups Joined</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>3</Text>
          <Text style={styles.statLabel}>Groups Created</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Emergency Contacts</Text>
      <View style={styles.settingsCard}>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}><Phone color="#FF3B30" size={22} /></View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Campus Police</Text>
            <Text style={styles.settingSubtitle}>540-231-6411</Text>
          </View>
          <ChevronRight color="#64748b" size={20} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.settingsCard}>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}><Bell color="#007AFF" size={22} /></View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Notifications</Text>
            <Text style={styles.settingSubtitle}>Safety alerts and updates</Text>
          </View>
          <ChevronRight color="#64748b" size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}><Shield color="#FF6B35" size={22} /></View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Safety Tips</Text>
            <Text style={styles.settingSubtitle}>Campus safety guidelines</Text>
          </View>
          <ChevronRight color="#64748b" size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}><HelpCircle color="#8892b0" size={22} /></View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Help & Support</Text>
            <Text style={styles.settingSubtitle}>FAQs and contact us</Text>
          </View>
          <ChevronRight color="#64748b" size={20} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// ============ MAIN APP ============
function App() {
  const [activeTab, setActiveTab] = useState('home');

  // Persistent group state - lifted from GroupsScreen
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);

  // Group route viewing - shared between Groups and Map
  const [viewingGroupRoute, setViewingGroupRoute] = useState(null); // Group to show route for
  const [meetingGroupRoute, setMeetingGroupRoute] = useState(null); // Route to meet group

  // Navigate to map with group route
  const viewGroupRoute = (group) => {
    setViewingGroupRoute(group);
    setActiveTab('map');
  };

  // Navigate to map with directions to meet group
  const getDirectionsToGroup = (group) => {
    setMeetingGroupRoute(group);
    setActiveTab('map');
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen setActiveTab={setActiveTab} />;
      case 'map': return <MapScreen
        viewingGroupRoute={viewingGroupRoute}
        setViewingGroupRoute={setViewingGroupRoute}
        meetingGroupRoute={meetingGroupRoute}
        setMeetingGroupRoute={setMeetingGroupRoute}
      />;
      case 'groups': return <GroupsScreen
        joinedGroups={joinedGroups}
        setJoinedGroups={setJoinedGroups}
        userGroups={userGroups}
        setUserGroups={setUserGroups}
        viewGroupRoute={viewGroupRoute}
        getDirectionsToGroup={getDirectionsToGroup}
      />;
      case 'profile': return <ProfileScreen />;
      default: return <HomeScreen setActiveTab={setActiveTab} />;
    }
  };

  const TabButton = ({ name, icon, label }) => (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={() => setActiveTab(name)}
    >
      {React.cloneElement(icon, { color: activeTab === name ? '#FF6B35' : '#64748b' })}
      <Text style={[styles.tabLabel, activeTab === name && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.screenWrapper}>
        {renderScreen()}
      </View>

      <SOSButton />

      <View style={styles.tabBar}>
        <TabButton name="home" icon={<Home size={24} />} label="Home" />
        <TabButton name="map" icon={<Map size={24} />} label="Map" />
        <TabButton name="groups" icon={<Users size={24} />} label="Groups" />
        <TabButton name="profile" icon={<User size={24} />} label="Profile" />
      </View>
    </SafeAreaView>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  screenWrapper: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8892b0',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Status Card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    marginRight: 12,
  },
  statusText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  statusTime: {
    fontSize: 12,
    color: '#8892b0',
  },
  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Card
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#8892b0',
    marginTop: 2,
  },
  cardContent: {
    marginTop: 12,
  },
  cardAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardActionText: {
    fontSize: 14,
    color: '#8892b0',
  },
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 25,
    paddingTop: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#FF6B35',
  },
  // SOS Button
  sosButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  // Map
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 140, 0, 0.3)',
    borderColor: '#FF8C00',
  },
  controlButtonIcon: {
    fontSize: 16,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  legendTitle: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 10,
    fontSize: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendText: {
    color: '#8892b0',
    fontSize: 12,
  },
  // Route Panel
  routePanel: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  routeInputContainer: {
    marginBottom: 12,
  },
  routeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
  },
  routeInputText: {
    color: '#fff',
    fontSize: 14,
  },
  routeInputPlaceholder: {
    color: '#64748b',
    fontSize: 14,
  },
  routeInputDivider: {
    width: 2,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 5,
    marginVertical: 4,
  },
  findRouteButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  findRouteButtonDisabled: {
    backgroundColor: '#64748b',
  },
  findRouteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Location Picker
  locationPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationPicker: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '85%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  locationPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  locationPickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  locationList: {
    padding: 10,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  presetMatchItem: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 10,
    marginHorizontal: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  locationItemText: {
    color: '#fff',
    fontSize: 16,
  },
  locationItemContent: {
    flex: 1,
  },
  locationItemSubtext: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  locationSectionTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  myLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  myLocationText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
  },
  // Route Info Panel
  routeInfoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  routeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  routeInfoTitle: {
    color: '#34C759',
    fontSize: 18,
    fontWeight: '600',
  },
  routeInfoStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  routeInfoStat: {
    flex: 1,
    alignItems: 'center',
  },
  routeInfoStatValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  routeInfoStatLabel: {
    color: '#8892b0',
    fontSize: 12,
    marginTop: 4,
  },
  routeInfoStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  startWalkingButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  startWalkingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Navigation Panel - Compact design
  navigationPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 20, // Compact - sits just above tab bar
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  navigationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navigationTitle: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: '600',
  },
  exitNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  exitNavButtonText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '500',
  },
  navigationStep: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stepNumber: {
    color: '#34C759',
    fontSize: 24,
    fontWeight: 'bold',
  },
  stepTotal: {
    color: '#64748b',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  stepDetail: {
    color: '#8892b0',
    fontSize: 13,
    lineHeight: 18,
  },
  stepDistance: {
    color: '#34C759',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 4,
  },
  navControlButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  navControlText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  navControlTextDisabled: {
    color: '#64748b',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 120,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressDotActive: {
    backgroundColor: '#34C759',
    width: 14,
  },
  progressDotCompleted: {
    backgroundColor: 'rgba(52, 199, 89, 0.5)',
  },
  // Live Distance Banner - Compact
  liveDistanceBanner: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  liveDistanceText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  liveDistanceLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  callout: {
    padding: 10,
    minWidth: 160,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutName: {
    fontSize: 13,
    color: '#333',
  },
  calloutDistance: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  directionsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  directionsPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  directionsPanelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  directionsPanelSubtitle: {
    fontSize: 14,
    color: '#8892b0',
    marginTop: 4,
  },
  directionsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  directionsInfoText: {
    fontSize: 16,
    color: '#fff',
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Groups
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    gap: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  infoCardText: {
    fontSize: 14,
    color: '#8892b0',
    marginTop: 4,
  },
  groupDetails: {
    flexDirection: 'column',
    gap: 4,
    marginBottom: 12,
  },
  groupDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  groupDetailText: {
    fontSize: 13,
    color: '#8892b0',
    flex: 1,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '85%',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#8892b0',
    marginTop: 8,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#34C759',
    marginTop: 4,
  },
  joinButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 24,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  joinedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 10,
  },
  joinedText: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Joined Badge
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  joinedBadgeText: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: 14,
  },
  // Create Group Form
  createFormContainer: {
    width: '100%',
    marginTop: 20,
  },
  createFormLabel: {
    color: '#8892b0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  createFormInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  createFormInputText: {
    color: '#fff',
    fontSize: 16,
  },
  createFormPlaceholder: {
    color: '#64748b',
    fontSize: 16,
  },
  destinationPickerList: {
    maxHeight: 150,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  destinationPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  destinationPickerText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  // Create Group Location Picker
  createFormInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  createLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  createLocationTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  createLocationList: {
    width: '100%',
    maxHeight: 350,
    marginTop: 12,
  },
  // Emergency
  emergencyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '85%',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
  },
  emergencyText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 24,
    gap: 8,
  },
  callButtonText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 16,
  },
  cancelButtonText: {
    color: '#8892b0',
    fontSize: 16,
  },
  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  profileEmail: {
    fontSize: 14,
    color: '#8892b0',
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  editButtonText: {
    color: '#FF6B35',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  statLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#fff',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  // Departure Time Picker
  departureTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  departureTimeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  departureTimeOptionActive: {
    backgroundColor: '#FF6B35',
  },
  departureTimeText: {
    color: '#8892b0',
    fontSize: 14,
    fontWeight: '600',
  },
  departureTimeTextActive: {
    color: '#fff',
  },
  departureTimeHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  // Countdown Banner
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  countdownText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal Countdown
  modalCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  modalCountdownText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  // Member List
  memberListContainer: {
    width: '100%',
    marginTop: 16,
  },
  memberListTitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberName: {
    color: '#fff',
    fontSize: 16,
  },
  memberStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  memberStatusReady: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  memberStatusWaiting: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  memberStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberStatusTextReady: {
    color: '#34C759',
  },
  memberStatusTextWaiting: {
    color: '#FF9500',
  },
  memberSubtext: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  // Check-in Button
  imHereButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  imHereButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // View Route Button
  viewRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  viewRouteButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

registerRootComponent(App);
