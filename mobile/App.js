import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, Animated, Dimensions, TextInput, SafeAreaView, Alert } from 'react-native';
import MapView, { Marker, Callout, Circle, Polyline } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import * as Location from 'expo-location';
import { Home, Map, Users, User, Shield, MapPin, Phone, Bell, ChevronRight, Clock, Plus, X, Check, AlertTriangle, Navigation, Search, Crosshair, HelpCircle } from 'lucide-react-native';
import { COLORS } from './theme';
import { VT_CENTER, BLUE_LIGHTS, VT_LOCATIONS, ACTIVITY_ZONES, API_KEYS, WALKING_GROUPS } from './constants';

const { width, height } = Dimensions.get('window');

// Utility functions
const findMatchingVTLocation = (text) => {
  if (!text || text.length < 2) return null;
  const searchText = text.toLowerCase().trim();
  for (const location of VT_LOCATIONS) {
    if (location.aliases?.some(alias => alias === searchText || alias.includes(searchText) || searchText.includes(alias))) return location;
    if (location.name.toLowerCase().includes(searchText)) return location;
  }
  return null;
};

const getAddressSuggestions = async (text) => {
  if (!text || text.length < 2) return [];
  const results = [];
  const searchText = text.toLowerCase().trim();
  const matchingPresets = VT_LOCATIONS.filter(loc => loc.name.toLowerCase().includes(searchText) || loc.aliases?.some(alias => alias.includes(searchText) || searchText.includes(alias))).map(loc => ({ name: loc.name, shortName: loc.name, latitude: loc.latitude, longitude: loc.longitude, isPreset: true }));
  results.push(...matchingPresets);
  if (results.length < 5 && text.length >= 3) {
    try {
      const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&filter=circle:-80.4234,37.2284,5000&bias=proximity:-80.4234,37.2284&limit=5&apiKey=${API_KEYS.geoapifyAutocomplete}`);
      const data = await response.json();
      const geoapifyResults = data.features?.map(f => ({ name: f.properties.formatted, shortName: f.properties.name || f.properties.street || f.properties.formatted.split(',')[0], latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0], isPreset: false })) || [];
      for (const geoResult of geoapifyResults) {
        if (!results.some(r => Math.abs(r.latitude - geoResult.latitude) < 0.0005 && Math.abs(r.longitude - geoResult.longitude) < 0.0005)) results.push(geoResult);
      }
    } catch (error) { console.error('Autocomplete error:', error); }
  }
  return results.slice(0, 8);
};

const getGeoapifyRoute = async (start, end) => {
  try {
    const response = await fetch(`https://api.geoapify.com/v1/routing?waypoints=${start.latitude},${start.longitude}|${end.latitude},${end.longitude}&mode=walk&apiKey=${API_KEYS.geoapifyRouting}`);
    const data = await response.json();
    if (data.features?.length > 0) {
      const route = data.features[0];
      const geometry = route.geometry;
      let allCoords = [];
      if (geometry.type === 'MultiLineString') geometry.coordinates.forEach(line => line.forEach(([lon, lat]) => allCoords.push({ latitude: lat, longitude: lon })));
      else if (geometry.type === 'LineString') allCoords = geometry.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
      const properties = route.properties;
      const steps = properties.legs?.[0]?.steps || [];
      return { coordinates: allCoords, distance: properties.distance, duration: properties.time, steps: steps.map(step => ({ instruction: step.instruction?.text || 'Continue', distance: step.distance, duration: step.time, name: step.name || '' })) };
    }
    return null;
  } catch (error) { console.error('Geoapify routing error:', error); return null; }
};

const getZoneColor = (intensity) => {
  switch (intensity) {
    case 'high': return { fill: 'rgba(255, 59, 48, 0.3)', stroke: 'rgba(255, 59, 48, 0.6)' };
    case 'medium': return { fill: 'rgba(255, 149, 0, 0.25)', stroke: 'rgba(255, 149, 0, 0.5)' };
    case 'low': return { fill: 'rgba(255, 204, 0, 0.2)', stroke: 'rgba(255, 204, 0, 0.4)' };
    default: return { fill: 'rgba(255, 140, 0, 0.2)', stroke: 'rgba(255, 140, 0, 0.5)' };
  }
};

const calculateLocalSafeRoute = (startCoords, endCoords) => {
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

const getSafeRoute = async (startCoords, endCoords) => {
  try {
    const prompt = `You are a campus safety routing AI for Virginia Tech. Given these locations:\n\nBlue Light Stations: ${JSON.stringify(BLUE_LIGHTS.map(b => ({ name: b.name, lat: b.latitude, lng: b.longitude })))}\n\nActivity Zones to AVOID: ${JSON.stringify(ACTIVITY_ZONES.map(z => ({ lat: z.latitude, lng: z.longitude, radius: z.radius, danger: z.intensity })))}\n\nCalculate the SAFEST walking route from Start: ${startCoords.latitude}, ${startCoords.longitude} to End: ${endCoords.latitude}, ${endCoords.longitude}\n\nReturn ONLY a valid JSON array of coordinates: [{"latitude": 37.xxx, "longitude": -80.xxx}, ...]`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEYS.gemini}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1 } }) });
    const data = await response.json();
    if (data.error) return calculateLocalSafeRoute(startCoords, endCoords);
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      let routeText = data.candidates[0].content.parts[0].text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(routeText);
    }
    return calculateLocalSafeRoute(startCoords, endCoords);
  } catch (error) { return calculateLocalSafeRoute(startCoords, endCoords); }
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
];

// Components
function SafetyCard({ title, subtitle, icon, color = COLORS.accent.primary, onPress, children }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        {icon && <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>{icon}</View>}
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {children && <View style={styles.cardContent}>{children}</View>}
    </TouchableOpacity>
  );
}

function SOSButton() {
  const [showModal, setShowModal] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const handleLongPress = () => { setShowModal(true); Animated.loop(Animated.sequence([Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }), Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })])).start(); };
  return (
    <>
      <TouchableOpacity style={styles.sosButton} onLongPress={handleLongPress} delayLongPress={1000} activeOpacity={0.8}>
        <AlertTriangle color={COLORS.text.primary} size={24} /><Text style={styles.sosButtonText}>SOS</Text>
      </TouchableOpacity>
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.emergencyOverlay}>
          <View style={styles.emergencyContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowModal(false)}><X color={COLORS.text.primary} size={24} /></TouchableOpacity>
            <AlertTriangle color={COLORS.accent.danger} size={64} />
            <Text style={styles.emergencyTitle}>EMERGENCY ACTIVATED</Text>
            <Text style={styles.emergencyText}>Alerting campus security...</Text>
            <Text style={styles.emergencyText}>Nearest Blue Light: War Memorial Hall</Text>
            <TouchableOpacity style={styles.callButton}><Phone color={COLORS.accent.danger} size={24} /><Text style={styles.callButtonText}>Call 911</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}><Text style={styles.cancelButtonText}>Cancel Alert</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Screens
function HomeScreen({ setActiveTab }) {
  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerLeft}><Shield color={COLORS.accent.primary} size={32} /><View><Text style={styles.headerTitle}>Lumina</Text><Text style={styles.headerSubtitle}>VT Campus Safety</Text></View></View>
        <TouchableOpacity style={styles.notificationButton}><Bell color={COLORS.text.primary} size={24} /></TouchableOpacity>
      </View>
      <View style={styles.statusCard}><View style={styles.statusDot} /><Text style={styles.statusText}>Campus Status: Safe</Text><Text style={styles.statusTime}>Updated 2 min ago</Text></View>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('map')}><View style={[styles.quickActionIcon, { backgroundColor: COLORS.accent.info + '20' }]}><MapPin color={COLORS.accent.info} size={24} /></View><Text style={styles.quickActionText}>Find Blue{'\n'}Light</Text></TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('groups')}><View style={[styles.quickActionIcon, { backgroundColor: COLORS.accent.success + '20' }]}><Users color={COLORS.accent.success} size={24} /></View><Text style={styles.quickActionText}>Join{'\n'}Group</Text></TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}><View style={[styles.quickActionIcon, { backgroundColor: COLORS.accent.primary + '20' }]}><Phone color={COLORS.accent.primary} size={24} /></View><Text style={styles.quickActionText}>Emergency{'\n'}Contacts</Text></TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Nearby Safety</Text>
      <SafetyCard title="War Memorial Hall" subtitle="Blue Light Station - 0.2 mi away" icon={<MapPin color={COLORS.accent.info} size={24} />} color={COLORS.accent.info} onPress={() => setActiveTab('map')}>
        <View style={styles.cardAction}><Text style={styles.cardActionText}>Get Directions</Text><ChevronRight color={COLORS.text.secondary} size={20} /></View>
      </SafetyCard>
      <Text style={styles.sectionTitle}>Active Walking Groups</Text>
      {WALKING_GROUPS.slice(0, 2).map((group) => (
        <SafetyCard key={group.id} title={group.name} subtitle={`${Array.isArray(group.members) ? group.members.length : group.members || 1} people - ${group.time}`} icon={<Users color={COLORS.accent.success} size={24} />} color={COLORS.accent.success} onPress={() => setActiveTab('groups')}>
          <View style={styles.cardAction}><Text style={styles.cardActionText}>Join Group</Text><ChevronRight color={COLORS.text.secondary} size={20} /></View>
        </SafetyCard>
      ))}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

function MapScreen({ viewingGroupRoute, setViewingGroupRoute, meetingGroupRoute, setMeetingGroupRoute }) {
  const mapRef = useRef(null);
  const [showActivityZones, setShowActivityZones] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [geoapifySteps, setGeoapifySteps] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [directions, setDirections] = useState([]);
  const [liveLocation, setLiveLocation] = useState(null);
  const [distanceToNextStep, setDistanceToNextStep] = useState(null);
  const locationSubscription = useRef(null);

  const getDistanceBetween = (coord1, coord2) => {
    if (!coord1 || !coord2) return Infinity;
    const lat1 = coord1.latitude * Math.PI / 180, lat2 = coord2.latitude * Math.PI / 180;
    const dLat = lat2 - lat1, dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { alert('Location permission needed'); return false; }
      locationSubscription.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 }, (location) => setLiveLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude, heading: location.coords.heading }));
      return true;
    } catch (error) { return false; }
  };

  const stopLocationTracking = () => { locationSubscription.current?.remove(); locationSubscription.current = null; setLiveLocation(null); setDistanceToNextStep(null); };

  React.useEffect(() => {
    if (!isNavigating || !liveLocation || !directions.length) return;
    const currentDir = directions[currentStep];
    if (currentDir?.coordinate) {
      const distToCurrent = getDistanceBetween(liveLocation, currentDir.coordinate);
      setDistanceToNextStep(distToCurrent);
      if (distToCurrent < 15 && currentStep < directions.length - 1) setCurrentStep(prev => prev + 1);
    }
    mapRef.current?.animateCamera({ center: liveLocation, pitch: 60, heading: liveLocation.heading || 0, zoom: 18 }, { duration: 500 });
  }, [liveLocation, isNavigating, currentStep, directions]);

  React.useEffect(() => {
    if (viewingGroupRoute?.startCoords && viewingGroupRoute?.destCoords) {
      (async () => {
        setIsLoadingRoute(true); setStartLocation(viewingGroupRoute.startLocation || 'Group Start'); setEndLocation(viewingGroupRoute.destination); setStartCoords(viewingGroupRoute.startCoords); setEndCoords(viewingGroupRoute.destCoords);
        try {
          const routeData = await getGeoapifyRoute(viewingGroupRoute.startCoords, viewingGroupRoute.destCoords);
          if (routeData?.coordinates.length > 0) {
            setRouteCoords(routeData.coordinates); setGeoapifySteps(routeData.steps);
            setRouteInfo({ distance: routeData.distance > 1000 ? `${(routeData.distance / 1000).toFixed(1)} km` : `${Math.round(routeData.distance)} m`, time: `${Math.ceil(routeData.duration / 60)} min` });
            mapRef.current?.fitToCoordinates(routeData.coordinates, { edgePadding: { top: 100, right: 50, bottom: 200, left: 50 }, animated: true });
          }
        } catch (error) { console.error('Error fetching group route:', error); }
        setIsLoadingRoute(false); setViewingGroupRoute(null);
      })();
    }
  }, [viewingGroupRoute]);

  React.useEffect(() => {
    if (!meetingGroupRoute?.startCoords) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { alert('Location permission needed'); setMeetingGroupRoute(null); return; }
        const location = await Location.getCurrentPositionAsync({});
        const userCoords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        setIsLoadingRoute(true); setStartLocation('Your Location'); setEndLocation(meetingGroupRoute.startLocation || 'Meeting Point'); setStartCoords(userCoords); setEndCoords(meetingGroupRoute.startCoords);
        const routeData = await getGeoapifyRoute(userCoords, meetingGroupRoute.startCoords);
        if (routeData?.coordinates.length > 0) {
          setRouteCoords(routeData.coordinates); setGeoapifySteps(routeData.steps);
          setRouteInfo({ distance: routeData.distance > 1000 ? `${(routeData.distance / 1000).toFixed(1)} km` : `${Math.round(routeData.distance)} m`, time: `${Math.ceil(routeData.duration / 60)} min` });
          mapRef.current?.fitToCoordinates(routeData.coordinates, { edgePadding: { top: 100, right: 50, bottom: 200, left: 50 }, animated: true });
        }
      } catch (error) { console.error('Error:', error); }
      setIsLoadingRoute(false); setMeetingGroupRoute(null);
    })();
  }, [meetingGroupRoute]);

  const handleGetDirections = (station) => { setSelectedStation(station); setShowDirections(true); mapRef.current?.animateToRegion({ latitude: station.latitude, longitude: station.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 500); };
  const selectLocation = (location, type) => { const coords = { latitude: location.latitude, longitude: location.longitude }; const name = location.shortName || location.name; if (type === 'start') { setStartLocation(name); setStartCoords(coords); } else { setEndLocation(name); setEndCoords(coords); } setShowLocationPicker(null); setSearchText(''); setSuggestions([]); };
  const handleSearchChange = (text) => { setSearchText(text); if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); if (text.length < 3) { setSuggestions([]); return; } setIsLoadingSuggestions(true); searchTimeoutRef.current = setTimeout(async () => { setSuggestions(await getAddressSuggestions(text)); setIsLoadingSuggestions(false); }, 300); };
  const getLocationCoords = (locationName) => { const exactMatch = VT_LOCATIONS.find(l => l.name === locationName); if (exactMatch) return { latitude: exactMatch.latitude, longitude: exactMatch.longitude }; const fuzzyMatch = findMatchingVTLocation(locationName); return fuzzyMatch ? { latitude: fuzzyMatch.latitude, longitude: fuzzyMatch.longitude } : null; };

  const handleFindRoute = async () => {
    let start = startCoords || getLocationCoords(startLocation), end = endCoords || getLocationCoords(endLocation);
    if (!start || !end) { alert('Please select valid locations'); return; }
    setIsLoadingRoute(true); setRouteCoords(null); setRouteInfo(null); setGeoapifySteps([]);
    try {
      const routeData = await getGeoapifyRoute(start, end);
      if (routeData?.coordinates.length > 0) {
        setRouteCoords(routeData.coordinates); setGeoapifySteps(routeData.steps);
        setRouteInfo({ distance: routeData.distance > 1000 ? `${(routeData.distance / 1000).toFixed(1)} km` : `${Math.round(routeData.distance)} m`, time: `${Math.ceil(routeData.duration / 60)} min` });
        mapRef.current?.fitToCoordinates(routeData.coordinates, { edgePadding: { top: 150, right: 50, bottom: 200, left: 50 }, animated: true });
      } else alert('Could not find route');
    } catch (error) { alert('Failed to calculate route'); }
    setIsLoadingRoute(false);
  };

  const clearRoute = () => { stopLocationTracking(); setRouteCoords(null); setRouteInfo(null); setStartLocation(''); setEndLocation(''); setStartCoords(null); setEndCoords(null); setGeoapifySteps([]); setIsNavigating(false); setDirections([]); setCurrentStep(0); };

  const generateDirections = (coords, start, end) => {
    if (!coords || coords.length < 2) return [];
    const getDirection = (from, to) => Math.abs(to.latitude - from.latitude) > Math.abs(to.longitude - from.longitude) ? (to.latitude > from.latitude ? 'north' : 'south') : (to.longitude > from.longitude ? 'east' : 'west');
    const getDistance = (from, to) => { const lat1 = from.latitude * Math.PI / 180, lat2 = to.latitude * Math.PI / 180, dLat = lat2 - lat1, dLon = (to.longitude - from.longitude) * Math.PI / 180; const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2; return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); };
    const steps = [{ instruction: `Start at ${start}`, detail: 'Begin your safe route', distance: '', icon: 'start' }];
    for (let i = 0; i < coords.length - 1; i++) { const distance = getDistance(coords[i], coords[i + 1]); steps.push({ instruction: `Head ${getDirection(coords[i], coords[i + 1])}`, detail: `Continue for ${distance}m`, distance: `${distance}m`, icon: getDirection(coords[i], coords[i + 1]), coordinate: coords[i + 1] }); }
    steps.push({ instruction: `Arrive at ${end}`, detail: 'You have reached your destination safely', distance: '', icon: 'destination' });
    return steps;
  };

  const startNavigation = async () => {
    if (!routeCoords || routeCoords.length < 2) return;
    await startLocationTracking();
    let dirs = geoapifySteps?.length > 0 ? [{ instruction: `Start at ${startLocation}`, detail: 'Begin your safe route', distance: '', icon: 'start', coordinate: routeCoords[0] }, ...geoapifySteps.map((step, i) => ({ instruction: step.instruction, detail: step.name || `Continue for ${Math.round(step.distance)}m`, distance: `${Math.round(step.distance)}m`, icon: 'navigate', coordinate: routeCoords[Math.min(i + 1, routeCoords.length - 1)] })), { instruction: `Arrive at ${endLocation}`, detail: 'Destination reached safely', distance: '', icon: 'destination', coordinate: routeCoords[routeCoords.length - 1] }] : generateDirections(routeCoords, startLocation, endLocation);
    setDirections(dirs); setCurrentStep(0); setIsNavigating(true);
    mapRef.current?.animateCamera({ center: routeCoords[0], pitch: 60, zoom: 18 }, { duration: 500 });
  };

  const nextStep = () => { if (currentStep < directions.length - 1) { setCurrentStep(currentStep + 1); if (directions[currentStep + 1]?.coordinate) mapRef.current?.animateToRegion({ ...directions[currentStep + 1].coordinate, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500); } };
  const prevStep = () => { if (currentStep > 0) { setCurrentStep(currentStep - 1); if (directions[currentStep - 1]?.coordinate) mapRef.current?.animateToRegion({ ...directions[currentStep - 1].coordinate, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500); } };
  const exitNavigation = () => { stopLocationTracking(); setIsNavigating(false); setCurrentStep(0); if (routeCoords) mapRef.current?.fitToCoordinates(routeCoords, { edgePadding: { top: 150, right: 50, bottom: 200, left: 50 }, animated: true }); };

  return (
    <View style={styles.mapContainer}>
      <MapView ref={mapRef} style={styles.map} provider={undefined} initialRegion={VT_CENTER} customMapStyle={darkMapStyle} showsUserLocation showsMyLocationButton={false}>
        {showActivityZones && ACTIVITY_ZONES.map((zone) => { const colors = getZoneColor(zone.intensity); return <Circle key={zone.id} center={{ latitude: zone.latitude, longitude: zone.longitude }} radius={zone.radius} fillColor={colors.fill} strokeColor={colors.stroke} strokeWidth={2} />; })}
        {routeCoords?.length > 0 && <Polyline coordinates={routeCoords} strokeColor={COLORS.accent.success} strokeWidth={4} />}
        {startCoords && <Marker coordinate={routeCoords?.length > 0 ? routeCoords[0] : startCoords} pinColor={COLORS.accent.success} title="Start" />}
        {endCoords && <Marker coordinate={routeCoords?.length > 1 ? routeCoords[routeCoords.length - 1] : endCoords} pinColor={COLORS.accent.danger} title="Destination" />}
        {BLUE_LIGHTS.map((station) => <Marker key={station.id} coordinate={{ latitude: station.latitude, longitude: station.longitude }} pinColor={COLORS.accent.info}><Callout onPress={() => handleGetDirections(station)}><View style={styles.callout}><Text style={styles.calloutTitle}>Blue Light Station</Text><Text style={styles.calloutName}>{station.name}</Text><Text style={styles.calloutDistance}>{station.distance} away</Text></View></Callout></Marker>)}
        {WALKING_GROUPS.map((group) => <Marker key={group.id} coordinate={{ latitude: group.latitude, longitude: group.longitude }} pinColor={COLORS.accent.success}><Callout><View style={styles.callout}><Text style={styles.calloutTitle}>{group.name}</Text><Text style={styles.calloutName}>To {group.destination}</Text><Text style={styles.calloutDistance}>{Array.isArray(group.members) ? group.members.length : group.members || 1} people</Text></View></Callout></Marker>)}
      </MapView>

      {!isNavigating && (
        <View style={styles.routePanel}>
          <View style={styles.routeInputContainer}>
            <View style={styles.routeInputWrapper}><View style={[styles.routeDot, { backgroundColor: COLORS.accent.success }]} /><TouchableOpacity style={styles.routeInput} onPress={() => setShowLocationPicker('start')}><Text style={startLocation ? styles.routeInputText : styles.routeInputPlaceholder}>{startLocation || 'Starting location'}</Text></TouchableOpacity></View>
            <View style={styles.routeInputDivider} />
            <View style={styles.routeInputWrapper}><View style={[styles.routeDot, { backgroundColor: COLORS.accent.danger }]} /><TouchableOpacity style={styles.routeInput} onPress={() => setShowLocationPicker('end')}><Text style={endLocation ? styles.routeInputText : styles.routeInputPlaceholder}>{endLocation || 'Destination'}</Text></TouchableOpacity></View>
          </View>
          <TouchableOpacity style={[styles.findRouteButton, isLoadingRoute && styles.findRouteButtonDisabled]} onPress={handleFindRoute} disabled={isLoadingRoute || !startLocation || !endLocation}>
            {isLoadingRoute ? <Text style={styles.findRouteButtonText}>Finding safe route...</Text> : <><Search color={COLORS.text.primary} size={18} /><Text style={styles.findRouteButtonText}>Find Safe Route</Text></>}
          </TouchableOpacity>
        </View>
      )}

      {showLocationPicker && (
        <View style={styles.locationPickerOverlay}>
          <View style={styles.locationPicker}>
            <View style={styles.locationPickerHeader}><Text style={styles.locationPickerTitle}>{showLocationPicker === 'start' ? 'Starting' : 'Destination'} Location</Text><TouchableOpacity onPress={() => { setShowLocationPicker(null); setSearchText(''); setSuggestions([]); }}><X color={COLORS.text.primary} size={24} /></TouchableOpacity></View>
            <View style={styles.searchInputContainer}><Search color={COLORS.text.muted} size={20} /><TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor={COLORS.text.muted} value={searchText} onChangeText={handleSearchChange} autoFocus />{isLoadingSuggestions && <Text style={styles.loadingText}>...</Text>}</View>
            <ScrollView style={styles.locationList}>
              {showLocationPicker === 'start' && <TouchableOpacity style={styles.myLocationItem} onPress={async () => { try { const { status } = await Location.requestForegroundPermissionsAsync(); if (status === 'granted') { const location = await Location.getCurrentPositionAsync({}); selectLocation({ name: 'My Location', shortName: 'My Location', latitude: location.coords.latitude, longitude: location.coords.longitude }, showLocationPicker); } } catch (e) { alert('Could not get location'); } }}><Crosshair color={COLORS.accent.info} size={22} /><Text style={styles.myLocationText}>Use My Location</Text></TouchableOpacity>}
              {suggestions.filter(s => s.isPreset).map((loc, i) => <TouchableOpacity key={`p-${i}`} style={[styles.locationItem, styles.presetMatchItem]} onPress={() => selectLocation(loc, showLocationPicker)}><MapPin color={COLORS.accent.primary} size={20} /><View style={styles.locationItemContent}><Text style={styles.locationItemText}>{loc.shortName}</Text></View><Check color={COLORS.accent.success} size={18} /></TouchableOpacity>)}
              {suggestions.filter(s => !s.isPreset).map((loc, i) => <TouchableOpacity key={`s-${i}`} style={styles.locationItem} onPress={() => selectLocation(loc, showLocationPicker)}><Search color={COLORS.text.muted} size={20} /><View style={styles.locationItemContent}><Text style={styles.locationItemText}>{loc.shortName}</Text><Text style={styles.locationItemSubtext} numberOfLines={1}>{loc.name}</Text></View></TouchableOpacity>)}
              <Text style={styles.locationSectionTitle}>VT Campus Locations</Text>
              {VT_LOCATIONS.map((loc, i) => <TouchableOpacity key={`vt-${i}`} style={styles.locationItem} onPress={() => selectLocation(loc, showLocationPicker)}><MapPin color={COLORS.accent.primary} size={20} /><Text style={styles.locationItemText}>{loc.name}</Text></TouchableOpacity>)}
            </ScrollView>
          </View>
        </View>
      )}

      {!isNavigating && <View style={styles.mapControls}><TouchableOpacity style={[styles.controlButton, showActivityZones && styles.controlButtonActive]} onPress={() => setShowActivityZones(!showActivityZones)}><Text style={styles.controlButtonIcon}>⚠️</Text><Text style={styles.controlButtonText}>Zones</Text></TouchableOpacity>{routeCoords && <TouchableOpacity style={[styles.controlButton, { marginTop: 8 }]} onPress={clearRoute}><X color={COLORS.text.primary} size={16} /><Text style={styles.controlButtonText}>Clear</Text></TouchableOpacity>}</View>}

      {!isNavigating && <View style={styles.legend}><Text style={styles.legendTitle}>Legend</Text><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.accent.info }]} /><Text style={styles.legendText}>Blue Light Stations</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.accent.success }]} /><Text style={styles.legendText}>Safe Route / Groups</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.accent.danger }]} /><Text style={styles.legendText}>High Risk Zone</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.accent.warning }]} /><Text style={styles.legendText}>Medium Risk Zone</Text></View></View>}

      {routeInfo && !isNavigating && <View style={styles.routeInfoPanel}><View style={styles.routeInfoHeader}><Shield color={COLORS.accent.success} size={24} /><Text style={styles.routeInfoTitle}>Safe Route Found</Text></View><View style={styles.routeInfoStats}><View style={styles.routeInfoStat}><Text style={styles.routeInfoStatValue}>{routeInfo.distance}</Text><Text style={styles.routeInfoStatLabel}>Distance</Text></View><View style={styles.routeInfoStatDivider} /><View style={styles.routeInfoStat}><Text style={styles.routeInfoStatValue}>{routeInfo.time}</Text><Text style={styles.routeInfoStatLabel}>Walking Time</Text></View></View><TouchableOpacity style={styles.startWalkingButton} onPress={startNavigation}><Navigation color={COLORS.text.primary} size={18} /><Text style={styles.startWalkingButtonText}>Start Walking</Text></TouchableOpacity></View>}

      {isNavigating && directions.length > 0 && (
        <View style={styles.navigationPanel}>
          <View style={styles.navigationHeader}><View style={styles.navigationHeaderLeft}><Navigation color={COLORS.accent.success} size={24} /><Text style={styles.navigationTitle}>{liveLocation ? 'Live Navigation' : 'Navigating'}</Text></View><TouchableOpacity onPress={exitNavigation} style={styles.exitNavButton}><X color={COLORS.accent.danger} size={20} /><Text style={styles.exitNavButtonText}>Exit</Text></TouchableOpacity></View>
          {distanceToNextStep !== null && <View style={styles.liveDistanceBanner}><Text style={styles.liveDistanceText}>In {distanceToNextStep < 1000 ? `${distanceToNextStep}m` : `${(distanceToNextStep / 1000).toFixed(1)}km`}</Text><Text style={styles.liveDistanceLabel}>to next turn</Text></View>}
          <View style={styles.navigationStep}><View style={styles.stepIndicator}><Text style={styles.stepNumber}>{currentStep + 1}</Text><Text style={styles.stepTotal}>/ {directions.length}</Text></View><View style={styles.stepContent}><Text style={styles.stepInstruction}>{directions[currentStep]?.instruction}</Text><Text style={styles.stepDetail}>{directions[currentStep]?.detail}</Text>{!distanceToNextStep && directions[currentStep]?.distance && <Text style={styles.stepDistance}>{directions[currentStep]?.distance}</Text>}</View></View>
          <View style={styles.navigationControls}><TouchableOpacity style={[styles.navControlButton, currentStep === 0 && styles.navControlButtonDisabled]} onPress={prevStep} disabled={currentStep === 0}><ChevronRight color={currentStep === 0 ? COLORS.text.muted : COLORS.text.primary} size={24} style={{ transform: [{ rotate: '180deg' }] }} /><Text style={[styles.navControlText, currentStep === 0 && styles.navControlTextDisabled]}>Previous</Text></TouchableOpacity><View style={styles.progressDots}>{directions.map((_, i) => <View key={i} style={[styles.progressDot, i === currentStep && styles.progressDotActive, i < currentStep && styles.progressDotCompleted]} />)}</View><TouchableOpacity style={[styles.navControlButton, currentStep === directions.length - 1 && styles.navControlButtonDisabled]} onPress={nextStep} disabled={currentStep === directions.length - 1}><Text style={[styles.navControlText, currentStep === directions.length - 1 && styles.navControlTextDisabled]}>Next</Text><ChevronRight color={currentStep === directions.length - 1 ? COLORS.text.muted : COLORS.text.primary} size={24} /></TouchableOpacity></View>
        </View>
      )}

      {showDirections && selectedStation && <View style={styles.directionsPanel}><View style={styles.directionsPanelHeader}><View><Text style={styles.directionsPanelTitle}>Directions</Text><Text style={styles.directionsPanelSubtitle}>{selectedStation.name}</Text></View><TouchableOpacity onPress={() => setShowDirections(false)}><X color={COLORS.text.primary} size={24} /></TouchableOpacity></View><View style={styles.directionsInfo}><Navigation color={COLORS.accent.info} size={20} /><Text style={styles.directionsInfoText}>{selectedStation.distance} - ~3 min walk</Text></View><TouchableOpacity style={styles.startButton}><Text style={styles.startButtonText}>Start Walking</Text></TouchableOpacity></View>}
    </View>
  );
}

function GroupsScreen({ joinedGroups, setJoinedGroups, userGroups, setUserGroups, viewGroupRoute, getDirectionsToGroup }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [joined, setJoined] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupStart, setNewGroupStart] = useState('');
  const [newGroupStartCoords, setNewGroupStartCoords] = useState(null);
  const [newGroupDestination, setNewGroupDestination] = useState('');
  const [newGroupDestCoords, setNewGroupDestCoords] = useState(null);
  const [newGroupDepartureMinutes, setNewGroupDepartureMinutes] = useState(10);
  const [activeCreateField, setActiveCreateField] = useState(null);
  const [createSearchText, setCreateSearchText] = useState('');
  const [createSuggestions, setCreateSuggestions] = useState([]);
  const [isLoadingCreateSuggestions, setIsLoadingCreateSuggestions] = useState(false);
  const createSearchTimeoutRef = React.useRef(null);

  React.useEffect(() => { (async () => { const { status } = await Location.requestForegroundPermissionsAsync(); if (status === 'granted') { const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }); } })(); }, []);

  const getWalkingMinutes = (from, to) => { if (!from || !to) return Infinity; const lat1 = from.latitude * Math.PI / 180, lat2 = to.latitude * Math.PI / 180, dLat = lat2 - lat1, dLon = (to.longitude - from.longitude) * Math.PI / 180; const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2; return Math.ceil((6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3) / 80); };
  const getTimeRemaining = (group) => { if (!group.createdAt || !group.departureMinutes) return null; const remaining = Math.ceil((group.createdAt + group.departureMinutes * 60000 - Date.now()) / 60000); return remaining > 0 ? remaining : 0; };
  const filterGroupsByDistance = (groups) => !userLocation ? groups : groups.filter(g => !g.startCoords || getTimeRemaining(g) === null || getWalkingMinutes(userLocation, g.startCoords) <= getTimeRemaining(g));
  const isGroupJoined = (groupId) => joinedGroups.includes(groupId);

  const handleCreateSearchChange = async (text) => { setCreateSearchText(text); if (createSearchTimeoutRef.current) clearTimeout(createSearchTimeoutRef.current); if (text.length < 2) { setCreateSuggestions([]); return; } setIsLoadingCreateSuggestions(true); createSearchTimeoutRef.current = setTimeout(async () => { setCreateSuggestions(await getAddressSuggestions(text)); setIsLoadingCreateSuggestions(false); }, 300); };
  const selectCreateLocation = (loc) => { const coords = { latitude: loc.latitude, longitude: loc.longitude }, name = loc.shortName || loc.name; if (activeCreateField === 'start') { setNewGroupStart(name); setNewGroupStartCoords(coords); } else { setNewGroupDestination(name); setNewGroupDestCoords(coords); } setActiveCreateField(null); setCreateSearchText(''); setCreateSuggestions([]); };
  const useMyLocationForCreate = async () => { try { const { status } = await Location.requestForegroundPermissionsAsync(); if (status === 'granted') { const loc = await Location.getCurrentPositionAsync({}); setNewGroupStart('My Location'); setNewGroupStartCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }); setActiveCreateField(null); setCreateSearchText(''); setCreateSuggestions([]); } } catch (e) { alert('Could not get location'); } };
  const resetCreateModal = () => { setShowCreateModal(false); setNewGroupName(''); setNewGroupStart(''); setNewGroupStartCoords(null); setNewGroupDestination(''); setNewGroupDestCoords(null); setNewGroupDepartureMinutes(10); setActiveCreateField(null); setCreateSearchText(''); setCreateSuggestions([]); };

  const handleJoin = () => {
    if (selectedGroup && !isGroupJoined(selectedGroup.id)) { setJoinedGroups([...joinedGroups, selectedGroup.id]); setUserGroups(userGroups.map(g => g.id === selectedGroup.id ? { ...g, members: [...(g.members || []), { id: 'currentUser', name: 'You', isReady: false, isCreator: false }] } : g)); }
    setJoined(true); setTimeout(() => { setShowModal(false); setJoined(false); if (selectedGroup?.startCoords && getDirectionsToGroup) setTimeout(() => Alert.alert('Get Directions', `Get directions to meet ${selectedGroup.name}?`, [{ text: 'No Thanks', style: 'cancel' }, { text: 'Yes', onPress: () => getDirectionsToGroup(selectedGroup) }]), 300); }, 1500);
  };
  const handleLeave = (groupId) => { setJoinedGroups(joinedGroups.filter(id => id !== groupId)); setShowModal(false); };
  const handleCreateGroup = () => { if (!newGroupName.trim() || !newGroupStart || !newGroupDestination) { alert('Please fill all fields'); return; } const newGroup = { id: Date.now(), name: newGroupName.trim(), startLocation: newGroupStart, startCoords: newGroupStartCoords, destination: newGroupDestination, destCoords: newGroupDestCoords, departureMinutes: newGroupDepartureMinutes, createdAt: Date.now(), members: [{ id: 'currentUser', name: 'You', isReady: true, isCreator: true }], isUserCreated: true }; setUserGroups([newGroup, ...userGroups]); setJoinedGroups([...joinedGroups, newGroup.id]); resetCreateModal(); };
  const handleCheckIn = (groupId) => { setUserGroups(userGroups.map(g => g.id === groupId && Array.isArray(g.members) ? { ...g, members: g.members.map(m => m.id === 'currentUser' ? { ...m, isReady: true } : m) } : g)); alert("You've checked in!"); };

  const allGroups = [...userGroups, ...WALKING_GROUPS];

  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Text style={styles.screenTitle}>Walking Groups</Text><TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}><Plus color={COLORS.text.primary} size={20} /><Text style={styles.createButtonText}>Create</Text></TouchableOpacity></View>
      <View style={styles.infoCard}><Users color={COLORS.accent.success} size={24} /><View style={styles.infoCardContent}><Text style={styles.infoCardTitle}>Walk Together, Stay Safe</Text><Text style={styles.infoCardText}>Join a group heading your direction.</Text></View></View>

      {joinedGroups.length > 0 && <><Text style={styles.sectionTitle}>Your Groups</Text>{allGroups.filter(g => isGroupJoined(g.id)).map(group => { const timeRemaining = getTimeRemaining(group), memberCount = Array.isArray(group.members) ? group.members.length : group.members || 1, readyCount = Array.isArray(group.members) ? group.members.filter(m => m.isReady).length : 0; return <SafetyCard key={`j-${group.id}`} title={group.name} subtitle={`${memberCount} members - ${readyCount}/${memberCount} ready`} icon={<Users color={COLORS.accent.info} size={24} />} color={COLORS.accent.info} onPress={() => { setSelectedGroup(group); setShowModal(true); }}>{timeRemaining !== null && <View style={styles.countdownBanner}><Clock color={COLORS.accent.primary} size={14} /><Text style={styles.countdownText}>{timeRemaining > 0 ? `Departing in ${timeRemaining} min` : 'Departing now!'}</Text></View>}<View style={styles.groupDetails}>{group.startLocation && <View style={styles.groupDetailItem}><Navigation color={COLORS.accent.success} size={16} /><Text style={styles.groupDetailText} numberOfLines={1}>From {group.startLocation}</Text></View>}<View style={styles.groupDetailItem}><MapPin color={COLORS.accent.danger} size={16} /><Text style={styles.groupDetailText} numberOfLines={1}>To {group.destination}</Text></View></View><View style={styles.cardAction}><View style={styles.joinedBadge}><Check color={COLORS.accent.success} size={16} /><Text style={styles.joinedBadgeText}>Joined</Text></View></View></SafetyCard>; })}</>}

      <Text style={styles.sectionTitle}>Active Groups Near You</Text>
      {filterGroupsByDistance(allGroups.filter(g => !isGroupJoined(g.id))).map(group => { const timeRemaining = getTimeRemaining(group), memberCount = Array.isArray(group.members) ? group.members.length : group.members || 1, walkTime = userLocation && group.startCoords ? getWalkingMinutes(userLocation, group.startCoords) : null; return <SafetyCard key={group.id} title={group.name} subtitle={`${memberCount} members${walkTime ? ` - ${walkTime} min walk` : ''}`} icon={<Users color={COLORS.accent.success} size={24} />} color={COLORS.accent.success} onPress={() => { setSelectedGroup(group); setJoined(false); setShowModal(true); }}>{timeRemaining !== null && <View style={styles.countdownBanner}><Clock color={COLORS.accent.primary} size={14} /><Text style={styles.countdownText}>{timeRemaining > 0 ? `Departing in ${timeRemaining} min` : 'Departing now!'}</Text></View>}<View style={styles.groupDetails}>{group.startLocation && <View style={styles.groupDetailItem}><Navigation color={COLORS.accent.success} size={16} /><Text style={styles.groupDetailText} numberOfLines={1}>From {group.startLocation}</Text></View>}<View style={styles.groupDetailItem}><MapPin color={COLORS.accent.danger} size={16} /><Text style={styles.groupDetailText} numberOfLines={1}>To {group.destination}</Text></View></View><View style={styles.cardAction}><Text style={[styles.cardActionText, { color: COLORS.accent.success }]}>Join Group</Text><ChevronRight color={COLORS.accent.success} size={20} /></View></SafetyCard>; })}
      {allGroups.filter(g => !isGroupJoined(g.id)).length === 0 && <View style={styles.emptyState}><Text style={styles.emptyStateText}>You've joined all available groups!</Text></View>}
      <View style={{ height: 120 }} />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { maxHeight: '80%' }]}><TouchableOpacity style={styles.modalClose} onPress={() => { setShowModal(false); setJoined(false); }}><X color={COLORS.text.primary} size={24} /></TouchableOpacity><Users color={isGroupJoined(selectedGroup?.id) ? COLORS.accent.info : COLORS.accent.success} size={56} /><Text style={styles.modalTitle}>{selectedGroup?.name}</Text><Text style={styles.modalText}>{selectedGroup?.startLocation ? `${selectedGroup.startLocation} → ` : ''}{selectedGroup?.destination}</Text>
          {selectedGroup && <View style={styles.modalCountdown}><Clock color={COLORS.accent.primary} size={16} /><Text style={styles.modalCountdownText}>{getTimeRemaining(selectedGroup) > 0 ? `Departing in ${getTimeRemaining(selectedGroup)} min` : 'Departing now!'}</Text></View>}
          {isGroupJoined(selectedGroup?.id) ? <ScrollView style={styles.memberListContainer} nestedScrollEnabled><Text style={styles.memberListTitle}>Members</Text>{Array.isArray(selectedGroup?.members) ? selectedGroup.members.map((m, i) => <View key={`${i}-${m.id}`} style={styles.memberItem}><View style={styles.memberInfo}><User color={COLORS.text.muted} size={20} /><Text style={styles.memberName}>{m.name}{m.isCreator && ' (Creator)'}</Text></View><View style={[styles.memberStatus, m.isReady ? styles.memberStatusReady : styles.memberStatusWaiting]}>{m.isReady ? <Check color={COLORS.accent.success} size={16} /> : <Clock color={COLORS.accent.warning} size={16} />}<Text style={[styles.memberStatusText, m.isReady ? styles.memberStatusTextReady : styles.memberStatusTextWaiting]}>{m.isReady ? 'Ready' : 'Waiting'}</Text></View></View>) : <Text style={styles.memberSubtext}>{selectedGroup?.members || 1} member(s)</Text>}<TouchableOpacity style={styles.imHereButton} onPress={() => handleCheckIn(selectedGroup?.id)}><Check color={COLORS.text.primary} size={20} /><Text style={styles.imHereButtonText}>I'm Here!</Text></TouchableOpacity>{selectedGroup?.startCoords && selectedGroup?.destCoords && <TouchableOpacity style={styles.viewRouteButton} onPress={() => { setShowModal(false); viewGroupRoute(selectedGroup); }}><Navigation color={COLORS.accent.info} size={20} /><Text style={styles.viewRouteButtonText}>View Route on Map</Text></TouchableOpacity>}<TouchableOpacity style={[styles.joinButton, { backgroundColor: 'rgba(255, 59, 48, 0.15)', marginTop: 12 }]} onPress={() => handleLeave(selectedGroup?.id)}><Text style={[styles.joinButtonText, { color: COLORS.accent.danger }]}>Leave Group</Text></TouchableOpacity></ScrollView> : joined ? <View style={styles.joinedContainer}><Check color={COLORS.accent.success} size={32} /><Text style={styles.joinedText}>You've joined!</Text></View> : <><Text style={styles.modalSubtext}>{Array.isArray(selectedGroup?.members) ? selectedGroup.members.length : selectedGroup?.members || 1} people in group</Text><TouchableOpacity style={styles.joinButton} onPress={handleJoin}><Text style={styles.joinButtonText}>Join Group</Text></TouchableOpacity></>}
        </View></View>
      </Modal>

      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { maxHeight: '85%' }]}><TouchableOpacity style={styles.modalClose} onPress={resetCreateModal}><X color={COLORS.text.primary} size={24} /></TouchableOpacity>
          {!activeCreateField ? <><Plus color={COLORS.accent.primary} size={56} /><Text style={styles.modalTitle}>Create Walking Group</Text><Text style={styles.modalSubtext}>Start a group and others can join</Text><View style={styles.createFormContainer}><Text style={styles.createFormLabel}>Group Name</Text><TextInput style={styles.createFormInput} placeholder="e.g., Late Night Crew" placeholderTextColor={COLORS.text.muted} value={newGroupName} onChangeText={setNewGroupName} /><Text style={styles.createFormLabel}>Starting Location</Text><TouchableOpacity style={[styles.createFormInput, styles.createFormInputRow]} onPress={() => setActiveCreateField('start')}><View style={[styles.routeDot, { backgroundColor: COLORS.accent.success }]} /><Text style={newGroupStart ? styles.createFormInputText : styles.createFormPlaceholder}>{newGroupStart || 'Where are you starting?'}</Text></TouchableOpacity><Text style={styles.createFormLabel}>Destination</Text><TouchableOpacity style={[styles.createFormInput, styles.createFormInputRow]} onPress={() => setActiveCreateField('destination')}><View style={[styles.routeDot, { backgroundColor: COLORS.accent.danger }]} /><Text style={newGroupDestination ? styles.createFormInputText : styles.createFormPlaceholder}>{newGroupDestination || 'Where are you heading?'}</Text></TouchableOpacity><Text style={styles.createFormLabel}>Departure Time</Text><View style={styles.departureTimeContainer}>{[5, 10, 15, 20].map(mins => <TouchableOpacity key={mins} style={[styles.departureTimeOption, newGroupDepartureMinutes === mins && styles.departureTimeOptionActive]} onPress={() => setNewGroupDepartureMinutes(mins)}><Text style={[styles.departureTimeText, newGroupDepartureMinutes === mins && styles.departureTimeTextActive]}>{mins} min</Text></TouchableOpacity>)}</View><Text style={styles.departureTimeHint}>Only nearby users will see your group</Text></View><TouchableOpacity style={[styles.joinButton, { backgroundColor: COLORS.accent.primary }]} onPress={handleCreateGroup}><Text style={styles.joinButtonText}>Create Group</Text></TouchableOpacity></>
          : <><View style={styles.createLocationHeader}><TouchableOpacity onPress={() => { setActiveCreateField(null); setCreateSearchText(''); setCreateSuggestions([]); }}><ChevronRight color={COLORS.text.primary} size={24} style={{ transform: [{ rotate: '180deg' }] }} /></TouchableOpacity><Text style={styles.createLocationTitle}>{activeCreateField === 'start' ? 'Starting Location' : 'Destination'}</Text><View style={{ width: 24 }} /></View><View style={styles.searchInputContainer}><Search color={COLORS.text.muted} size={20} /><TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor={COLORS.text.muted} value={createSearchText} onChangeText={handleCreateSearchChange} autoFocus />{isLoadingCreateSuggestions && <Text style={styles.loadingText}>...</Text>}</View><ScrollView style={styles.createLocationList} nestedScrollEnabled>{activeCreateField === 'start' && <TouchableOpacity style={styles.myLocationItem} onPress={useMyLocationForCreate}><Crosshair color={COLORS.accent.info} size={22} /><Text style={styles.myLocationText}>Use My Location</Text></TouchableOpacity>}{createSuggestions.filter(s => s.isPreset).map((loc, i) => <TouchableOpacity key={`p-${i}`} style={[styles.destinationPickerItem, styles.presetMatchItem]} onPress={() => selectCreateLocation(loc)}><MapPin color={COLORS.accent.primary} size={18} /><Text style={styles.destinationPickerText}>{loc.name}</Text><Check color={COLORS.accent.success} size={16} /></TouchableOpacity>)}{createSuggestions.filter(s => !s.isPreset).map((loc, i) => <TouchableOpacity key={`o-${i}`} style={styles.destinationPickerItem} onPress={() => selectCreateLocation(loc)}><Search color={COLORS.text.muted} size={18} /><Text style={styles.destinationPickerText}>{loc.shortName || loc.name}</Text></TouchableOpacity>)}<Text style={styles.locationSectionTitle}>VT Campus Locations</Text>{VT_LOCATIONS.map((loc, i) => <TouchableOpacity key={`vt-${i}`} style={styles.destinationPickerItem} onPress={() => selectCreateLocation({ name: loc.name, shortName: loc.name, latitude: loc.latitude, longitude: loc.longitude, isPreset: true })}><MapPin color={COLORS.accent.primary} size={18} /><Text style={styles.destinationPickerText}>{loc.name}</Text></TouchableOpacity>)}</ScrollView></>}
        </View></View>
      </Modal>
    </ScrollView>
  );
}

function ProfileScreen() {
  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>Profile</Text>
      <View style={styles.profileCard}><View style={styles.avatarContainer}><User color={COLORS.text.primary} size={40} /></View><View style={styles.profileInfo}><Text style={styles.profileName}>Hokie User</Text><Text style={styles.profileEmail}>hokie@vt.edu</Text></View><TouchableOpacity style={styles.editButton}><Text style={styles.editButtonText}>Edit</Text></TouchableOpacity></View>
      <View style={styles.statsContainer}><View style={styles.statItem}><Text style={styles.statNumber}>12</Text><Text style={styles.statLabel}>Safe Walks</Text></View><View style={styles.statDivider} /><View style={styles.statItem}><Text style={styles.statNumber}>5</Text><Text style={styles.statLabel}>Groups Joined</Text></View><View style={styles.statDivider} /><View style={styles.statItem}><Text style={styles.statNumber}>3</Text><Text style={styles.statLabel}>Groups Created</Text></View></View>
      <Text style={styles.sectionTitle}>Emergency Contacts</Text>
      <View style={styles.settingsCard}><TouchableOpacity style={styles.settingItem}><View style={styles.settingIcon}><Phone color={COLORS.accent.danger} size={22} /></View><View style={styles.settingContent}><Text style={styles.settingTitle}>Campus Police</Text><Text style={styles.settingSubtitle}>540-231-6411</Text></View><ChevronRight color={COLORS.text.muted} size={20} /></TouchableOpacity></View>
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.settingsCard}><TouchableOpacity style={styles.settingItem}><View style={styles.settingIcon}><Bell color={COLORS.accent.info} size={22} /></View><View style={styles.settingContent}><Text style={styles.settingTitle}>Notifications</Text><Text style={styles.settingSubtitle}>Safety alerts and updates</Text></View><ChevronRight color={COLORS.text.muted} size={20} /></TouchableOpacity><TouchableOpacity style={styles.settingItem}><View style={styles.settingIcon}><Shield color={COLORS.accent.primary} size={22} /></View><View style={styles.settingContent}><Text style={styles.settingTitle}>Safety Tips</Text><Text style={styles.settingSubtitle}>Campus safety guidelines</Text></View><ChevronRight color={COLORS.text.muted} size={20} /></TouchableOpacity><TouchableOpacity style={styles.settingItem}><View style={styles.settingIcon}><HelpCircle color={COLORS.text.secondary} size={22} /></View><View style={styles.settingContent}><Text style={styles.settingTitle}>Help & Support</Text><Text style={styles.settingSubtitle}>FAQs and contact us</Text></View><ChevronRight color={COLORS.text.muted} size={20} /></TouchableOpacity></View>
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// Main App
function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [viewingGroupRoute, setViewingGroupRoute] = useState(null);
  const [meetingGroupRoute, setMeetingGroupRoute] = useState(null);
  const viewGroupRoute = (group) => { setViewingGroupRoute(group); setActiveTab('map'); };
  const getDirectionsToGroup = (group) => { setMeetingGroupRoute(group); setActiveTab('map'); };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen setActiveTab={setActiveTab} />;
      case 'map': return <MapScreen viewingGroupRoute={viewingGroupRoute} setViewingGroupRoute={setViewingGroupRoute} meetingGroupRoute={meetingGroupRoute} setMeetingGroupRoute={setMeetingGroupRoute} />;
      case 'groups': return <GroupsScreen joinedGroups={joinedGroups} setJoinedGroups={setJoinedGroups} userGroups={userGroups} setUserGroups={setUserGroups} viewGroupRoute={viewGroupRoute} getDirectionsToGroup={getDirectionsToGroup} />;
      case 'profile': return <ProfileScreen />;
      default: return <HomeScreen setActiveTab={setActiveTab} />;
    }
  };

  const TabButton = ({ name, icon, label }) => <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab(name)}>{React.cloneElement(icon, { color: activeTab === name ? COLORS.accent.primary : COLORS.text.muted })}<Text style={[styles.tabLabel, activeTab === name && styles.tabLabelActive]}>{label}</Text></TouchableOpacity>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.screenWrapper}>{renderScreen()}</View>
      <SOSButton />
      <View style={styles.tabBar}><TabButton name="home" icon={<Home size={24} />} label="Home" /><TabButton name="map" icon={<Map size={24} />} label="Map" /><TabButton name="groups" icon={<Users size={24} />} label="Groups" /><TabButton name="profile" icon={<User size={24} />} label="Profile" /></View>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  screenWrapper: { flex: 1 },
  screenContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  screenTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.accent.primary },
  headerSubtitle: { fontSize: 14, color: COLORS.text.secondary },
  notificationButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bg.card, justifyContent: 'center', alignItems: 'center' },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52, 199, 89, 0.15)', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(52, 199, 89, 0.3)' },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent.success, marginRight: 12 },
  statusText: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.accent.success },
  statusTime: { fontSize: 12, color: COLORS.text.secondary },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginBottom: 12, marginTop: 8 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  quickAction: { flex: 1, alignItems: 'center', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 16, marginHorizontal: 4, borderWidth: 1, borderColor: COLORS.border },
  quickActionIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 12, color: COLORS.text.primary, textAlign: 'center', fontWeight: '500' },
  card: { backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitleContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
  cardSubtitle: { fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  cardContent: { marginTop: 12 },
  cardAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  cardActionText: { fontSize: 14, color: COLORS.text.secondary },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.bg.secondary, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 25, paddingTop: 10 },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabLabel: { fontSize: 11, color: COLORS.text.muted, marginTop: 4, fontWeight: '500' },
  tabLabelActive: { color: COLORS.accent.primary },
  sosButton: { position: 'absolute', bottom: 100, right: 20, width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.accent.danger, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.accent.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8, zIndex: 100 },
  sosButtonText: { color: COLORS.text.primary, fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapControls: { position: 'absolute', top: 20, right: 20 },
  controlButton: { backgroundColor: COLORS.bg.cardSolid, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border },
  controlButtonActive: { backgroundColor: 'rgba(255, 140, 0, 0.3)', borderColor: '#FF8C00' },
  controlButtonIcon: { fontSize: 16 },
  controlButtonText: { color: COLORS.text.primary, fontSize: 14, fontWeight: '500' },
  legend: { position: 'absolute', bottom: 20, left: 20, backgroundColor: COLORS.bg.cardSolid, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  legendTitle: { color: COLORS.text.primary, fontWeight: '600', marginBottom: 10, fontSize: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendText: { color: COLORS.text.secondary, fontSize: 12 },
  routePanel: { position: 'absolute', top: 10, left: 20, right: 20, backgroundColor: COLORS.bg.cardSolid, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  routeInputContainer: { marginBottom: 12 },
  routeInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6 },
  routeInput: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, padding: 12 },
  routeInputText: { color: COLORS.text.primary, fontSize: 14 },
  routeInputPlaceholder: { color: COLORS.text.muted, fontSize: 14 },
  routeInputDivider: { width: 2, height: 16, backgroundColor: COLORS.border, marginLeft: 5, marginVertical: 4 },
  findRouteButton: { backgroundColor: COLORS.accent.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  findRouteButtonDisabled: { backgroundColor: COLORS.text.muted },
  findRouteButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: '600' },
  locationPickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center' },
  locationPicker: { backgroundColor: COLORS.bg.secondary, borderRadius: 20, width: '85%', maxHeight: '70%', overflow: 'hidden' },
  locationPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  locationPickerTitle: { color: COLORS.text.primary, fontSize: 18, fontWeight: '600' },
  locationList: { padding: 10 },
  locationItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  presetMatchItem: { backgroundColor: 'rgba(255, 107, 53, 0.1)', borderRadius: 10, marginHorizontal: 10, marginVertical: 4, borderWidth: 1, borderColor: 'rgba(255, 107, 53, 0.3)' },
  locationItemText: { color: COLORS.text.primary, fontSize: 16 },
  locationItemContent: { flex: 1 },
  locationItemSubtext: { color: COLORS.text.muted, fontSize: 12, marginTop: 2 },
  locationSectionTitle: { color: COLORS.text.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, letterSpacing: 0.5 },
  myLocationItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: 'rgba(0, 122, 255, 0.1)', marginHorizontal: 10, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 122, 255, 0.3)' },
  myLocationText: { color: COLORS.accent.info, fontSize: 16, fontWeight: '600' },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, paddingHorizontal: 16, marginHorizontal: 20, marginBottom: 10, gap: 12 },
  searchInput: { flex: 1, color: COLORS.text.primary, fontSize: 16, paddingVertical: 14 },
  loadingText: { color: COLORS.text.muted, fontSize: 14 },
  routeInfoPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(30, 41, 59, 0.98)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  routeInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  routeInfoTitle: { color: COLORS.accent.success, fontSize: 18, fontWeight: '600' },
  routeInfoStats: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, padding: 16, marginBottom: 16 },
  routeInfoStat: { flex: 1, alignItems: 'center' },
  routeInfoStatValue: { color: COLORS.text.primary, fontSize: 24, fontWeight: 'bold' },
  routeInfoStatLabel: { color: COLORS.text.secondary, fontSize: 12, marginTop: 4 },
  routeInfoStatDivider: { width: 1, backgroundColor: COLORS.border },
  startWalkingButton: { backgroundColor: COLORS.accent.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8 },
  startWalkingButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: '600' },
  navigationPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(30, 41, 59, 0.98)', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 20 },
  navigationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  navigationHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navigationTitle: { color: COLORS.accent.success, fontSize: 16, fontWeight: '600' },
  exitNavButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 59, 48, 0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, gap: 4 },
  exitNavButtonText: { color: COLORS.accent.danger, fontSize: 13, fontWeight: '500' },
  navigationStep: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, padding: 12, marginBottom: 10, gap: 12 },
  stepIndicator: { flexDirection: 'row', alignItems: 'baseline' },
  stepNumber: { color: COLORS.accent.success, fontSize: 24, fontWeight: 'bold' },
  stepTotal: { color: COLORS.text.muted, fontSize: 14 },
  stepContent: { flex: 1 },
  stepInstruction: { color: COLORS.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  stepDetail: { color: COLORS.text.secondary, fontSize: 13, lineHeight: 18 },
  stepDistance: { color: COLORS.accent.success, fontSize: 13, fontWeight: '500', marginTop: 4 },
  navigationControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navControlButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, gap: 4 },
  navControlButtonDisabled: { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
  navControlText: { color: COLORS.text.primary, fontSize: 13, fontWeight: '500' },
  navControlTextDisabled: { color: COLORS.text.muted },
  progressDots: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 120 },
  progressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  progressDotActive: { backgroundColor: COLORS.accent.success, width: 14 },
  progressDotCompleted: { backgroundColor: 'rgba(52, 199, 89, 0.5)' },
  liveDistanceBanner: { backgroundColor: COLORS.accent.success, borderRadius: 10, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  liveDistanceText: { color: COLORS.text.primary, fontSize: 24, fontWeight: 'bold' },
  liveDistanceLabel: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 },
  callout: { padding: 10, minWidth: 160 },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  calloutName: { fontSize: 13, color: '#333' },
  calloutDistance: { fontSize: 12, color: '#666', marginTop: 2 },
  directionsPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(30, 41, 59, 0.98)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  directionsPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  directionsPanelTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary },
  directionsPanelSubtitle: { fontSize: 14, color: COLORS.text.secondary, marginTop: 4 },
  directionsInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  directionsInfoText: { fontSize: 16, color: COLORS.text.primary },
  startButton: { backgroundColor: COLORS.accent.info, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  startButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: '600' },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 },
  createButtonText: { color: COLORS.text.primary, fontWeight: '600' },
  infoCard: { flexDirection: 'row', backgroundColor: 'rgba(52, 199, 89, 0.15)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(52, 199, 89, 0.3)', gap: 12 },
  infoCardContent: { flex: 1 },
  infoCardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.accent.success },
  infoCardText: { fontSize: 14, color: COLORS.text.secondary, marginTop: 4 },
  groupDetails: { flexDirection: 'column', gap: 4, marginBottom: 12 },
  groupDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  groupDetailText: { fontSize: 13, color: COLORS.text.secondary, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.bg.secondary, borderRadius: 24, padding: 32, alignItems: 'center', width: '85%' },
  modalClose: { position: 'absolute', top: 16, right: 16 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text.primary, marginTop: 16 },
  modalText: { fontSize: 16, color: COLORS.text.secondary, marginTop: 8 },
  modalSubtext: { fontSize: 14, color: COLORS.accent.success, marginTop: 4 },
  joinButton: { backgroundColor: COLORS.accent.success, paddingHorizontal: 48, paddingVertical: 16, borderRadius: 25, marginTop: 24 },
  joinButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: 'bold' },
  joinedContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 10 },
  joinedText: { color: COLORS.accent.success, fontSize: 16, fontWeight: 'bold' },
  joinedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52, 199, 89, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  joinedBadgeText: { color: COLORS.accent.success, fontSize: 14, fontWeight: '600' },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyStateText: { color: COLORS.text.muted, fontSize: 14 },
  createFormContainer: { width: '100%', marginTop: 20 },
  createFormLabel: { color: COLORS.text.secondary, fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  createFormInput: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 14, color: COLORS.text.primary, fontSize: 16 },
  createFormInputText: { color: COLORS.text.primary, fontSize: 16 },
  createFormPlaceholder: { color: COLORS.text.muted, fontSize: 16 },
  destinationPickerList: { maxHeight: 150, marginTop: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12 },
  destinationPickerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  destinationPickerText: { color: COLORS.text.primary, fontSize: 14, flex: 1 },
  createFormInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  createLocationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  createLocationTitle: { color: COLORS.text.primary, fontSize: 18, fontWeight: '600' },
  createLocationList: { width: '100%', maxHeight: 350, marginTop: 12 },
  emergencyOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
  emergencyContent: { backgroundColor: '#1a1a2e', borderRadius: 24, padding: 32, alignItems: 'center', width: '85%', borderWidth: 2, borderColor: COLORS.accent.danger },
  emergencyTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.accent.danger, marginTop: 16 },
  emergencyText: { fontSize: 16, color: COLORS.text.primary, marginTop: 8, textAlign: 'center' },
  callButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.text.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30, marginTop: 24, gap: 8 },
  callButtonText: { color: COLORS.accent.danger, fontSize: 18, fontWeight: 'bold' },
  cancelButton: { paddingHorizontal: 32, paddingVertical: 12, marginTop: 16 },
  cancelButtonText: { color: COLORS.text.secondary, fontSize: 16 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  avatarContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.accent.primary, justifyContent: 'center', alignItems: 'center' },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { fontSize: 20, fontWeight: '600', color: COLORS.text.primary },
  profileEmail: { fontSize: 14, color: COLORS.text.secondary, marginTop: 2 },
  editButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.accent.primary },
  editButtonText: { color: COLORS.accent.primary, fontWeight: '500' },
  statsContainer: { flexDirection: 'row', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: COLORS.accent.primary },
  statLabel: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  settingsCard: { backgroundColor: COLORS.bg.card, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  settingIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 16, color: COLORS.text.primary },
  settingSubtitle: { fontSize: 13, color: COLORS.text.muted, marginTop: 2 },
  departureTimeContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  departureTimeOption: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center' },
  departureTimeOptionActive: { backgroundColor: COLORS.accent.primary },
  departureTimeText: { color: COLORS.text.secondary, fontSize: 14, fontWeight: '600' },
  departureTimeTextActive: { color: COLORS.text.primary },
  departureTimeHint: { fontSize: 12, color: COLORS.text.muted, marginTop: 8, textAlign: 'center' },
  countdownBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 107, 53, 0.15)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, gap: 6, marginTop: 8, marginBottom: 4 },
  countdownText: { color: COLORS.accent.primary, fontSize: 12, fontWeight: '600' },
  modalCountdown: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255, 107, 53, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  modalCountdownText: { color: COLORS.accent.primary, fontSize: 14, fontWeight: '600' },
  memberListContainer: { width: '100%', marginTop: 16 },
  memberListTitle: { fontSize: 14, color: COLORS.text.muted, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  memberItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberName: { color: COLORS.text.primary, fontSize: 16 },
  memberStatus: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  memberStatusReady: { backgroundColor: 'rgba(52, 199, 89, 0.15)' },
  memberStatusWaiting: { backgroundColor: 'rgba(255, 149, 0, 0.15)' },
  memberStatusText: { fontSize: 12, fontWeight: '600' },
  memberStatusTextReady: { color: COLORS.accent.success },
  memberStatusTextWaiting: { color: COLORS.accent.warning },
  memberSubtext: { color: COLORS.text.muted, fontSize: 14, textAlign: 'center', paddingVertical: 12 },
  imHereButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent.success, paddingVertical: 14, borderRadius: 12, marginTop: 16, gap: 8 },
  imHereButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: 'bold' },
  viewRouteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 122, 255, 0.15)', paddingVertical: 14, borderRadius: 12, marginTop: 12, gap: 8 },
  viewRouteButtonText: { color: COLORS.accent.info, fontSize: 16, fontWeight: '600' },
});

registerRootComponent(App);
