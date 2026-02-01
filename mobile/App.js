import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, Animated, Dimensions, TextInput, SafeAreaView, Alert, Vibration, Linking, Switch, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout, Circle, Polyline } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { registerRootComponent } from 'expo';
import { useFonts, CormorantGaramond_400Regular } from '@expo-google-fonts/cormorant-garamond';
import * as Location from 'expo-location';
import { Home, Map, Users, User, Shield, MapPin, Phone, Bell, ChevronRight, Clock, Plus, X, Check, AlertTriangle, Navigation, Search, Crosshair, HelpCircle, ChevronLeft, Filter, Info } from 'lucide-react-native';
import { COLORS, SHADOWS } from './theme.js';
import { VT_CENTER, BLUE_LIGHTS, VT_LOCATIONS, ACTIVITY_ZONES, API_KEYS, INCIDENT_TYPES } from './constants.js';
import { db } from './src/config/firebase.js';
import { collection, onSnapshot, addDoc, updateDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';

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

// Geocode a location name to get accurate API coordinates
const geocodeLocation = async (name, hintCoords = null) => {
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

const getAddressSuggestions = async (text) => {
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

// Dynamic danger calculation based on time of day and crime data
const getZoneDangerLevel = (zone) => {
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
const getDynamicIntensity = (zone) => {
  const dangerLevel = getZoneDangerLevel(zone);
  if (dangerLevel >= 70) return 'high';
  if (dangerLevel >= 45) return 'medium';
  return 'low';
};

const getGeoapifyRoute = async (start, end, waypoints = []) => {
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
const zoneToPolygon = (zone, buffer = 20) => {
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
const getOpenRouteServiceRoute = async (start, end, avoidZones = []) => {
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
const getSafeRoute = async (start, end) => {
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

const getDistanceMeters = (coord1, coord2) => {
  const lat1 = coord1.latitude * Math.PI / 180, lat2 = coord2.latitude * Math.PI / 180;
  const dLat = lat2 - lat1, dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const formatDistance = (meters) => meters < 1609 ? `${Math.round(meters * 3.281 / 5280 * 100) / 100} mi` : `${(meters / 1609).toFixed(1)} mi`;

const formatTimeAgo = (timestamp) => {
  const mins = Math.floor((Date.now() - timestamp) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
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

function SOSScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  React.useEffect(() => { Animated.loop(Animated.sequence([Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }), Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })])).start(); Animated.loop(Animated.sequence([Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }), Animated.timing(glowAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true })])).start(); }, []);
  const triggerEmergency = () => { Vibration.vibrate([0, 200, 100, 200, 100, 200]); Alert.alert('EMERGENCY ACTIVATED', 'Alerting campus security...\nNearest Blue Light: War Memorial Hall', [{ text: 'Call 911', onPress: () => Linking.openURL('tel:911') }, { text: 'Cancel', style: 'cancel' }]); };
  const callNumber = (number) => Linking.openURL(`tel:${number}`);
  return (
    <View style={styles.sosScreenContainer}>
      <Text style={styles.sosScreenTitle}>Emergency</Text>
      <Text style={styles.sosScreenSubtitle}>Tap the button to trigger emergency alert</Text>
      <TouchableOpacity onPress={triggerEmergency} activeOpacity={0.8}><Animated.View style={[styles.sosMainButton, { transform: [{ scale: pulseAnim }], opacity: glowAnim }]}><AlertTriangle color={COLORS.text.primary} size={64} /><Text style={styles.sosMainButtonText}>SOS</Text></Animated.View></TouchableOpacity>
      <Text style={styles.emergencyContactsTitle}>Emergency Contacts</Text>
      <TouchableOpacity style={styles.emergencyContactItem} onPress={() => callNumber('911')}><View style={[styles.emergencyContactIcon, { backgroundColor: 'rgba(255, 59, 48, 0.2)' }]}><Phone color={COLORS.accent.danger} size={24} /></View><View style={styles.emergencyContactInfo}><Text style={styles.emergencyContactName}>911</Text><Text style={styles.emergencyContactDesc}>Emergency Services</Text></View><ChevronRight color={COLORS.text.muted} size={20} /></TouchableOpacity>
      <TouchableOpacity style={styles.emergencyContactItem} onPress={() => callNumber('5402316411')}><View style={[styles.emergencyContactIcon, { backgroundColor: 'rgba(30, 64, 175, 0.2)' }]}><Phone color="#1E40AF" size={24} /></View><View style={styles.emergencyContactInfo}><Text style={styles.emergencyContactName}>VT Police</Text><Text style={styles.emergencyContactDesc}>540-231-6411</Text></View><ChevronRight color={COLORS.text.muted} size={20} /></TouchableOpacity>
      <TouchableOpacity style={styles.emergencyContactItem} onPress={() => callNumber('5402315000')}><View style={[styles.emergencyContactIcon, { backgroundColor: 'rgba(255, 149, 0, 0.2)' }]}><Shield color={COLORS.accent.warning} size={24} /></View><View style={styles.emergencyContactInfo}><Text style={styles.emergencyContactName}>Campus Security</Text><Text style={styles.emergencyContactDesc}>540-231-5000</Text></View><ChevronRight color={COLORS.text.muted} size={20} /></TouchableOpacity>
    </View>
  );
}

function SOSTabButton({ onPress, onLongPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  React.useEffect(() => { Animated.loop(Animated.sequence([Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }), Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true })])).start(); }, []);
  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} delayLongPress={500} activeOpacity={0.8} style={styles.sosTabButtonContainer}>
      <Animated.View style={[styles.sosTabButton, { transform: [{ scale: pulseAnim }] }]}><AlertTriangle color={COLORS.text.primary} size={28} /></Animated.View>
    </TouchableOpacity>
  );
}

// Incident Feed Screen
function IncidentFeedScreen({ onBack }) {
  const [filter, setFilter] = useState('all');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStep, setReportStep] = useState(1);
  const [reportType, setReportType] = useState(null);
  const [reportLocation, setReportLocation] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // Firebase real-time listener for incidents
  useEffect(() => {
    const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incidentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis?.() || doc.data().createdAt || Date.now()
      }));
      setIncidents(incidentData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching incidents:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredIncidents = incidents.filter(inc => {
    if (filter === 'active') return (Date.now() - inc.createdAt) < 24 * 3600000;
    if (filter === 'verified') return inc.verifications >= 10;
    return true;
  }).sort((a, b) => b.createdAt - a.createdAt);

  const handleVerify = async (id) => {
    try {
      const incidentRef = doc(db, 'incidents', String(id));
      const incident = incidents.find(inc => inc.id === id || inc.id === String(id));
      if (incident) {
        await updateDoc(incidentRef, { verifications: (incident.verifications || 0) + 1 });
      }
    } catch (error) { console.error('Error verifying incident:', error); }
  };
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); };
  const resetReport = () => { setShowReportModal(false); setReportStep(1); setReportType(null); setReportLocation(''); setReportDescription(''); };
  const submitReport = async () => {
    if (reportType && reportLocation && reportDescription) {
      try {
        await addDoc(collection(db, 'incidents'), {
          type: reportType,
          title: INCIDENT_TYPES[reportType].label,
          location: reportLocation,
          description: reportDescription,
          isVTPD: false,
          verifications: 1,
          createdAt: Timestamp.now()
        });
        resetReport();
      } catch (error) { console.error('Error submitting report:', error); Alert.alert('Error', 'Failed to submit report'); }
    }
  };

  return (
    <View style={styles.incidentFeedContainer}>
      <View style={styles.feedHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}><ChevronLeft color={COLORS.text.primary} size={28} /></TouchableOpacity>
        <Text style={styles.feedTitle}>Campus Incidents</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.filterContainer}>
        {[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'verified', label: 'Verified' }].map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.incidentList} showsVerticalScrollIndicator={false} refreshControl={<View />}>
        {loading ? (
          <View style={styles.emptyState}><ActivityIndicator size="large" color={COLORS.accent.primary} /><Text style={[styles.emptyStateText, { marginTop: 12 }]}>Loading incidents...</Text></View>
        ) : filteredIncidents.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyStateText}>No incidents match this filter</Text></View>
        ) : filteredIncidents.map(incident => {
          const type = INCIDENT_TYPES[incident.type];
          const isExpanded = expandedId === incident.id;
          return (
            <TouchableOpacity key={incident.id} style={[styles.incidentCard, { borderLeftColor: type.color }]} onPress={() => setExpandedId(isExpanded ? null : incident.id)} activeOpacity={0.8}>
              <View style={styles.incidentHeader}>
                <Text style={styles.incidentTypeIcon}>{type.icon}</Text>
                <Text style={styles.incidentTitle} numberOfLines={1}>{incident.title}</Text>
                <View style={[styles.incidentBadge, incident.isVTPD ? styles.incidentBadgeVTPD : styles.incidentBadgeCommunity]}>
                  <Text style={styles.incidentBadgeText}>{incident.isVTPD ? 'VTPD' : 'Community'}</Text>
                </View>
              </View>
              <View style={styles.incidentMeta}>
                <MapPin color={COLORS.text.muted} size={14} /><Text style={styles.incidentLocation}>{incident.location}</Text>
                <Text style={styles.incidentTime}>{formatTimeAgo(incident.createdAt)}</Text>
              </View>
              <Text style={[styles.incidentDescription, !isExpanded && { numberOfLines: 2 }]} numberOfLines={isExpanded ? undefined : 2}>{incident.description}</Text>
              <View style={styles.incidentFooter}>
                <View style={[styles.verifyCount, { backgroundColor: incident.verifications >= 10 ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)' }]}>
                  <Check color={incident.verifications >= 10 ? COLORS.accent.success : COLORS.text.muted} size={14} />
                  <Text style={[styles.verifyCountText, incident.verifications >= 10 && { color: COLORS.accent.success }]}>{incident.verifications}</Text>
                </View>
                <TouchableOpacity style={styles.verifyButton} onPress={() => handleVerify(incident.id)}>
                  <Text style={styles.verifyButtonText}>Verify</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={() => setShowReportModal(true)}><Plus color={COLORS.text.primary} size={28} /></TouchableOpacity>
      <Modal visible={showReportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%', maxHeight: '80%' }]}>
            <TouchableOpacity style={styles.modalClose} onPress={resetReport}><X color={COLORS.text.primary} size={24} /></TouchableOpacity>
            {reportStep === 1 && (<>
              <Text style={styles.reportModalTitle}>Report Incident</Text>
              <Text style={styles.reportModalSubtitle}>Select incident type</Text>
              <View style={styles.typeGrid}>
                {Object.values(INCIDENT_TYPES).map(t => (
                  <TouchableOpacity key={t.id} style={[styles.typeButton, reportType === t.id && { borderColor: t.color, borderWidth: 2 }]} onPress={() => { setReportType(t.id); setReportStep(2); }}>
                    <Text style={styles.typeButtonIcon}>{t.icon}</Text>
                    <Text style={styles.typeButtonLabel}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>)}
            {reportStep === 2 && (<>
              <Text style={styles.reportModalTitle}>Location</Text>
              <Text style={styles.reportModalSubtitle}>Where is this happening?</Text>
              <TextInput style={styles.reportInput} placeholder="e.g., Newman Library 2nd Floor" placeholderTextColor={COLORS.text.muted} value={reportLocation} onChangeText={setReportLocation} />
              <View style={styles.reportNavButtons}>
                <TouchableOpacity style={styles.reportNavButton} onPress={() => setReportStep(1)}><Text style={styles.reportNavButtonText}>Back</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.reportNavButton, styles.reportNavButtonPrimary]} onPress={() => reportLocation && setReportStep(3)}><Text style={styles.reportNavButtonTextPrimary}>Next</Text></TouchableOpacity>
              </View>
            </>)}
            {reportStep === 3 && (<>
              <Text style={styles.reportModalTitle}>Description</Text>
              <Text style={styles.reportModalSubtitle}>Describe what you observed</Text>
              <TextInput style={[styles.reportInput, { height: 120, textAlignVertical: 'top' }]} placeholder="Provide details about the incident..." placeholderTextColor={COLORS.text.muted} value={reportDescription} onChangeText={setReportDescription} multiline />
              <View style={styles.reportNavButtons}>
                <TouchableOpacity style={styles.reportNavButton} onPress={() => setReportStep(2)}><Text style={styles.reportNavButtonText}>Back</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.reportNavButton, styles.reportNavButtonPrimary]} onPress={submitReport}><Text style={styles.reportNavButtonTextPrimary}>Submit</Text></TouchableOpacity>
              </View>
            </>)}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Screens
function HomeScreen({ setActiveTab, getDirectionsToBlueLight, walkingGroups = [], incidents = [] }) {
  const [nearbyBlueLight, setNearbyBlueLight] = useState(null);
  const [showIncidentFeed, setShowIncidentFeed] = useState(false);
  const activeIncidentCount = incidents.filter(i => (Date.now() - i.createdAt) < 24 * 3600000).length;
  React.useEffect(() => { (async () => { try { const { status } = await Location.requestForegroundPermissionsAsync(); if (status === 'granted') { const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); const userCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude }; let closest = null, minDist = Infinity; BLUE_LIGHTS.forEach(bl => { const dist = getDistanceMeters(userCoords, { latitude: bl.latitude, longitude: bl.longitude }); if (dist < minDist) { minDist = dist; closest = { ...bl, distanceMeters: dist, userCoords }; } }); setNearbyBlueLight(closest); } } catch (e) { console.log('Location error:', e); } })(); }, []);

  if (showIncidentFeed) return <IncidentFeedScreen onBack={() => setShowIncidentFeed(false)} />;

  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerLeft}><Shield color={COLORS.accent.primary} size={32} /><View><Text style={styles.headerTitle}>Lumina</Text><Text style={styles.headerSubtitle}>VT Campus Safety</Text></View></View>
        <TouchableOpacity style={styles.notificationButton} onPress={() => setShowIncidentFeed(true)}>
          <Bell color={COLORS.text.primary} size={24} />
          {activeIncidentCount > 0 && <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{activeIncidentCount}</Text></View>}
        </TouchableOpacity>
      </View>
      <View style={styles.statusCard}><View style={styles.statusDot} /><Text style={styles.statusText}>Campus Status: Safe</Text><Text style={styles.statusTime}>Updated 2 min ago</Text></View>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('map')}><View style={[styles.quickActionIcon, { backgroundColor: 'rgba(30, 64, 175, 0.15)' }]}><MapPin color="#1E40AF" size={24} /></View><Text style={styles.quickActionText}>Find Blue{'\n'}Light</Text></TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('groups')}><View style={[styles.quickActionIcon, { backgroundColor: COLORS.accent.success + '20' }]}><Users color={COLORS.accent.success} size={24} /></View><Text style={styles.quickActionText}>Join{'\n'}Group</Text></TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('sos')}><View style={[styles.quickActionIcon, { backgroundColor: COLORS.accent.primary + '20' }]}><Phone color={COLORS.accent.primary} size={24} /></View><Text style={styles.quickActionText}>Emergency{'\n'}Contacts</Text></TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Nearby Safety</Text>
      <SafetyCard title={nearbyBlueLight?.name || 'Locating...'} subtitle={nearbyBlueLight ? `Blue Light Station - ${formatDistance(nearbyBlueLight.distanceMeters)} away` : 'Finding nearest blue light...'} icon={<MapPin color="#1E40AF" size={24} />} color="#1E40AF" onPress={() => nearbyBlueLight && getDirectionsToBlueLight(nearbyBlueLight)}>
        <View style={styles.cardAction}><Text style={styles.cardActionText}>Get Directions</Text><ChevronRight color={COLORS.text.secondary} size={20} /></View>
      </SafetyCard>
      <Text style={styles.sectionTitle}>Active Walking Groups</Text>
      {walkingGroups.slice(0, 2).map((group) => (
        <SafetyCard key={group.id} title={group.name} subtitle={`${Array.isArray(group.members) ? group.members.length : group.members || 1} people - ${group.time}`} icon={<Users color={COLORS.accent.success} size={24} />} color={COLORS.accent.success} onPress={() => setActiveTab('groups')}>
          <View style={styles.cardAction}><Text style={styles.cardActionText}>Join Group</Text><ChevronRight color={COLORS.text.secondary} size={20} /></View>
        </SafetyCard>
      ))}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

function MapScreen({ viewingGroupRoute, setViewingGroupRoute, meetingGroupRoute, setMeetingGroupRoute, showActivityZones, showLegend, blueLightRoute, setBlueLightRoute, walkingGroups = [] }) {
  const mapRef = useRef(null);
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
  const [selectedZone, setSelectedZone] = useState(null);
  const [routeCalculated, setRouteCalculated] = useState(false);

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
        const start = viewingGroupRoute.startCoords;
        const end = viewingGroupRoute.destCoords;
        setIsLoadingRoute(true); setStartLocation(viewingGroupRoute.startLocation || 'Group Start'); setEndLocation(viewingGroupRoute.destination); setStartCoords(start); setEndCoords(end);
        try {
          const routeData = await getSafeRoute(start, end);
          if (routeData?.coordinates?.length > 0) {
            const fullRoute = [start, ...routeData.coordinates, end];
            setRouteCoords(fullRoute); setGeoapifySteps(routeData.steps || []);
            setRouteInfo({ distance: routeData.distance > 1000 ? `${(routeData.distance / 1000).toFixed(1)} km` : `${Math.round(routeData.distance)} m`, time: `${Math.ceil(routeData.duration / 60)} min` });
            setRouteCalculated(true);
            setTimeout(() => { mapRef.current?.fitToCoordinates(fullRoute, { edgePadding: { top: 100, right: 50, bottom: 200, left: 50 }, animated: true }); }, 100);
          } else {
            const localRoute = calculateLocalSafeRoute(start, end);
            setRouteCoords(localRoute); setGeoapifySteps([]);
            const distance = getDistanceMeters(start, end);
            setRouteInfo({ distance: distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`, time: `${Math.ceil(distance / 80)} min` });
            setRouteCalculated(true);
            setTimeout(() => { mapRef.current?.fitToCoordinates(localRoute, { edgePadding: { top: 100, right: 50, bottom: 200, left: 50 }, animated: true }); }, 100);
          }
        } catch (error) {
          console.error('Error fetching group route:', error);
          const fallbackRoute = [start, end];
          setRouteCoords(fallbackRoute); setRouteCalculated(true);
          setTimeout(() => { mapRef.current?.fitToCoordinates(fallbackRoute, { edgePadding: { top: 100, right: 50, bottom: 200, left: 50 }, animated: true }); }, 100);
        }
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
        const start = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        const end = meetingGroupRoute.startCoords;
        setIsLoadingRoute(true); setStartLocation('Your Location'); setEndLocation(meetingGroupRoute.startLocation || 'Meeting Point'); setStartCoords(start); setEndCoords(end);
        const routeData = await getSafeRoute(start, end);
        if (routeData?.coordinates?.length > 0) {
          const fullRoute = [start, ...routeData.coordinates, end];
          setRouteCoords(fullRoute); setGeoapifySteps(routeData.steps || []);
          setRouteInfo({ distance: routeData.distance > 1000 ? `${(routeData.distance / 1000).toFixed(1)} km` : `${Math.round(routeData.distance)} m`, time: `${Math.ceil(routeData.duration / 60)} min` });
          setRouteCalculated(true);
          setTimeout(() => { mapRef.current?.fitToCoordinates(fullRoute, { edgePadding: { top: 100, right: 50, bottom: 150, left: 50 }, animated: true }); }, 100);
        } else {
          const localRoute = calculateLocalSafeRoute(start, end);
          setRouteCoords(localRoute); setGeoapifySteps([]);
          const distance = getDistanceMeters(start, end);
          setRouteInfo({ distance: distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`, time: `${Math.ceil(distance / 80)} min` });
          setRouteCalculated(true);
          setTimeout(() => { mapRef.current?.fitToCoordinates(localRoute, { edgePadding: { top: 100, right: 50, bottom: 150, left: 50 }, animated: true }); }, 100);
        }
      } catch (error) {
        console.error('Error:', error);
      }
      setIsLoadingRoute(false); setMeetingGroupRoute(null);
    })();
  }, [meetingGroupRoute]);

  React.useEffect(() => {
    if (!blueLightRoute) return;
    (async () => {
      const start = blueLightRoute.userCoords;
      const end = { latitude: blueLightRoute.latitude, longitude: blueLightRoute.longitude };
      setIsLoadingRoute(true); setStartLocation('Your Location'); setEndLocation(blueLightRoute.name); setStartCoords(start); setEndCoords(end);
      try {
        const routeData = await getSafeRoute(start, end);
        if (routeData?.coordinates?.length > 0) {
          const fullRoute = [start, ...routeData.coordinates, end];
          setRouteCoords(fullRoute); setGeoapifySteps(routeData.steps || []);
          setRouteInfo({ distance: routeData.distance > 1000 ? `${(routeData.distance / 1000).toFixed(1)} km` : `${Math.round(routeData.distance)} m`, time: `${Math.ceil(routeData.duration / 60)} min` });
          setRouteCalculated(true);
          setTimeout(() => { mapRef.current?.fitToCoordinates(fullRoute, { edgePadding: { top: 100, right: 50, bottom: 150, left: 50 }, animated: true }); }, 100);
        } else {
          const localRoute = calculateLocalSafeRoute(start, end);
          setRouteCoords(localRoute); setGeoapifySteps([]);
          const distance = getDistanceMeters(start, end);
          setRouteInfo({ distance: distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`, time: `${Math.ceil(distance / 80)} min` });
          setRouteCalculated(true);
          setTimeout(() => { mapRef.current?.fitToCoordinates(localRoute, { edgePadding: { top: 100, right: 50, bottom: 150, left: 50 }, animated: true }); }, 100);
        }
      } catch (error) {
        console.error('Blue light route error:', error);
        const fallbackRoute = [start, end];
        setRouteCoords(fallbackRoute); setRouteCalculated(true);
        setTimeout(() => { mapRef.current?.fitToCoordinates(fallbackRoute, { edgePadding: { top: 100, right: 50, bottom: 150, left: 50 }, animated: true }); }, 100);
      }
      setIsLoadingRoute(false); setBlueLightRoute(null);
    })();
  }, [blueLightRoute]);

  const handleGetDirections = (station) => { setSelectedStation(station); setShowDirections(true); mapRef.current?.animateToRegion({ latitude: station.latitude, longitude: station.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 500); };
  const selectLocation = async (location, type) => {
    let coords = { latitude: location.latitude, longitude: location.longitude };
    const name = location.shortName || location.name;
    // If it's a preset, geocode to get accurate API coordinates
    if (location.needsGeocode || location.isPreset) {
      const apiCoords = await geocodeLocation(name + ', Virginia Tech, Blacksburg, VA', VT_CENTER);
      if (apiCoords) coords = apiCoords;
    }
    if (type === 'start') { setStartLocation(name); setStartCoords(coords); } else { setEndLocation(name); setEndCoords(coords); }
    setShowLocationPicker(null); setSearchText(''); setSuggestions([]);
    // Zoom to selected location
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 400);
  };
  const handleSearchChange = (text) => { setSearchText(text); if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); if (text.length < 3) { setSuggestions([]); return; } setIsLoadingSuggestions(true); searchTimeoutRef.current = setTimeout(async () => { setSuggestions(await getAddressSuggestions(text)); setIsLoadingSuggestions(false); }, 300); };
  const getLocationCoords = async (locationName) => {
    // First try to geocode via API for accuracy
    const apiCoords = await geocodeLocation(locationName + ', Blacksburg, VA', VT_CENTER);
    if (apiCoords) return apiCoords;
    // Fallback to preset if API fails
    const exactMatch = VT_LOCATIONS.find(l => l.name === locationName);
    if (exactMatch) return { latitude: exactMatch.latitude, longitude: exactMatch.longitude };
    const fuzzyMatch = findMatchingVTLocation(locationName);
    return fuzzyMatch ? { latitude: fuzzyMatch.latitude, longitude: fuzzyMatch.longitude } : null;
  };

  const handleFindRoute = async () => {
    // Get coordinates for start and end locations
    const start = startCoords || await getLocationCoords(startLocation);
    const end = endCoords || await getLocationCoords(endLocation);
    if (!start || !end) { alert('Please select valid locations'); return; }

    // Store coordinates if they weren't already set
    if (!startCoords) setStartCoords(start);
    if (!endCoords) setEndCoords(end);

    setIsLoadingRoute(true);

    try {
      const routeData = await getSafeRoute(start, end);
      let routePoints;
      let routeDistance;
      let routeDuration;

      if (routeData?.coordinates?.length > 0) {
        // Ensure start and end are included in route coordinates
        routePoints = [{ ...start }, ...routeData.coordinates.map(c => ({ ...c })), { ...end }];
        routeDistance = routeData.distance;
        routeDuration = routeData.duration;
        setGeoapifySteps(routeData.steps || []);
      } else {
        // Fallback to local safe route calculation if APIs fail
        console.log('APIs failed, using local safe route calculation');
        const localRoute = calculateLocalSafeRoute(start, end);
        routePoints = localRoute.map(c => ({ ...c }));
        routeDistance = getDistanceMeters(start, end);
        routeDuration = routeDistance / 1.33; // ~80m/min walking speed
        setGeoapifySteps([]);
      }

      // Set route state - always set these together
      setRouteCoords(routePoints);
      setRouteInfo({
        distance: routeDistance > 1000 ? `${(routeDistance / 1000).toFixed(1)} km` : `${Math.round(routeDistance)} m`,
        time: `${Math.ceil(routeDuration / 60)} min`
      });
      setRouteCalculated(true);
      setIsLoadingRoute(false);

      // Fit map to route after state is set
      setTimeout(() => {
        if (routePoints?.length > 0) {
          mapRef.current?.fitToCoordinates(routePoints, { edgePadding: { top: 150, right: 50, bottom: 180, left: 50 }, animated: true });
        }
      }, 150);

    } catch (error) {
      console.error('Route calculation error:', error);
      // Even on error, show a direct route as fallback
      const fallbackRoute = [{ ...start }, { ...end }];
      const distance = getDistanceMeters(start, end);

      setRouteCoords(fallbackRoute);
      setRouteInfo({
        distance: distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`,
        time: `${Math.ceil(distance / 80)} min`
      });
      setGeoapifySteps([]);
      setRouteCalculated(true);
      setIsLoadingRoute(false);

      setTimeout(() => {
        mapRef.current?.fitToCoordinates(fallbackRoute, { edgePadding: { top: 150, right: 50, bottom: 180, left: 50 }, animated: true });
      }, 150);
    }
  };

  const clearRoute = () => { stopLocationTracking(); setRouteCoords(null); setRouteInfo(null); setStartLocation(''); setEndLocation(''); setStartCoords(null); setEndCoords(null); setGeoapifySteps([]); setIsNavigating(false); setDirections([]); setCurrentStep(0); setRouteCalculated(false); };

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
    let dirs = geoapifySteps?.length > 0 ? [{ instruction: `Start at ${startLocation}`, detail: 'Begin your safe route', distance: '', icon: 'start', coordinate: routeCoords[0] }, ...geoapifySteps.map((step, i) => ({ instruction: step.instruction, detail: step.name || `Continue for ${Math.round(step.distance)}m`, distance: `${Math.round(step.distance)}m`, icon: 'navigate', coordinate: routeCoords[Math.min(i + 1, routeCoords.length - 1)] })), { instruction: `Arrive at ${endLocation}`, detail: 'Destination reached safely', distance: '', icon: 'destination', coordinate: routeCoords[routeCoords.length - 1] }] : generateDirections(routeCoords, startLocation, endLocation);
    setDirections(dirs); setCurrentStep(0); setIsNavigating(true);
    // Only zoom to start if user is near the starting location
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const userCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        if (getDistanceBetween(userCoords, routeCoords[0]) < 100) {
          mapRef.current?.animateCamera({ center: routeCoords[0], pitch: 60, zoom: 18 }, { duration: 500 });
        }
      }
    } catch (e) { /* If location fails, just don't zoom */ }
    await startLocationTracking();
  };

  const nextStep = () => { if (currentStep < directions.length - 1) { setCurrentStep(currentStep + 1); if (directions[currentStep + 1]?.coordinate) mapRef.current?.animateToRegion({ ...directions[currentStep + 1].coordinate, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500); } };
  const prevStep = () => { if (currentStep > 0) { setCurrentStep(currentStep - 1); if (directions[currentStep - 1]?.coordinate) mapRef.current?.animateToRegion({ ...directions[currentStep - 1].coordinate, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500); } };
  const exitNavigation = () => { stopLocationTracking(); setIsNavigating(false); setCurrentStep(0); if (routeCoords) mapRef.current?.fitToCoordinates(routeCoords, { edgePadding: { top: 150, right: 50, bottom: 200, left: 50 }, animated: true }); };

  return (
    <View style={styles.mapContainer}>
      <MapView ref={mapRef} style={styles.map} provider={undefined} initialRegion={VT_CENTER} showsUserLocation showsMyLocationButton={false}>
        {showActivityZones && ACTIVITY_ZONES.map((zone) => { const dynamicIntensity = getDynamicIntensity(zone); const colors = getZoneColor(dynamicIntensity); return <React.Fragment key={zone.id}><Circle center={{ latitude: zone.latitude, longitude: zone.longitude }} radius={zone.radius} fillColor={colors.fill} strokeColor={colors.stroke} strokeWidth={2} /><Marker coordinate={{ latitude: zone.latitude, longitude: zone.longitude }} onPress={() => setSelectedZone(zone)} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.zoneInfoPin}><Info color="#fff" size={14} /></View></Marker></React.Fragment>; })}
        {routeCoords?.length > 0 && <Polyline key={`route-${routeCoords.length}-${routeCoords[0]?.latitude}`} coordinates={[...routeCoords]} strokeColor={COLORS.accent.success} strokeWidth={4} />}
        {startCoords && <Marker key={`start-${startCoords.latitude}-${startCoords.longitude}`} coordinate={startCoords} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.startMarker}><Navigation color="#2D2D2D" size={14} /></View></Marker>}
        {endCoords && <Marker key={`end-${endCoords.latitude}-${endCoords.longitude}`} coordinate={endCoords} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.endMarker}><MapPin color="#2D2D2D" size={14} /></View></Marker>}
        {BLUE_LIGHTS.map((station) => <Marker key={station.id} coordinate={{ latitude: station.latitude, longitude: station.longitude }} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.blueLightMarker}><Phone color="#2D2D2D" size={10} /></View><Callout onPress={() => handleGetDirections(station)}><View style={styles.callout}><Text style={styles.calloutTitle}>Blue Light Station</Text><Text style={styles.calloutName}>{station.name}</Text></View></Callout></Marker>)}
        {walkingGroups.filter(g => g.startCoords).map((group) => <Marker key={group.id} coordinate={{ latitude: group.startCoords.latitude, longitude: group.startCoords.longitude }} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.groupMarker}><Users color="#2D2D2D" size={12} /></View><Callout><View style={styles.callout}><Text style={styles.calloutTitle}>{group.name}</Text><Text style={styles.calloutName}>To {group.destination}</Text><Text style={styles.calloutDistance}>{Array.isArray(group.members) ? group.members.length : group.members || 1} people</Text></View></Callout></Marker>)}
      </MapView>

      {!isNavigating && (
        <View style={styles.routePanel}>
          <View style={styles.routeInputContainer}>
            <View style={styles.routeInputWrapper}><View style={[styles.routeDot, { backgroundColor: COLORS.accent.success }]} /><TouchableOpacity style={styles.routeInput} onPress={() => setShowLocationPicker('start')}><Text style={startLocation ? styles.routeInputText : styles.routeInputPlaceholder}>{startLocation || 'Starting location'}</Text></TouchableOpacity></View>
            <View style={styles.routeInputDivider} />
            <View style={styles.routeInputWrapper}><View style={[styles.routeDot, { backgroundColor: COLORS.accent.danger }]} /><TouchableOpacity style={styles.routeInput} onPress={() => setShowLocationPicker('end')}><Text style={endLocation ? styles.routeInputText : styles.routeInputPlaceholder}>{endLocation || 'Destination'}</Text></TouchableOpacity></View>
          </View>
          <TouchableOpacity style={[styles.findRouteButton, isLoadingRoute && styles.findRouteButtonDisabled]} onPress={handleFindRoute} disabled={isLoadingRoute || !startLocation || !endLocation}>
            {isLoadingRoute ? <Text style={styles.findRouteButtonText}>Finding safe route...</Text> : <><Search color="#2D2D2D" size={18} /><Text style={styles.findRouteButtonText}>Find Safe Route</Text></>}
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

      {!isNavigating && routeCoords && <View style={styles.mapControls}><TouchableOpacity style={styles.controlButton} onPress={clearRoute}><X color={COLORS.text.primary} size={16} /><Text style={styles.controlButtonText}>Clear</Text></TouchableOpacity></View>}

      {!isNavigating && showLegend && <View style={styles.legend}><Text style={styles.legendTitle}>Legend</Text><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#B8DCEF' }]} /><Text style={styles.legendText}>Blue Light Stations</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#D4B8E8' }]} /><Text style={styles.legendText}>Walking Groups</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#A8E6CF' }]} /><Text style={styles.legendText}>Safe Route</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FFB5A7' }]} /><Text style={styles.legendText}>High Risk Zone</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FFE0B2' }]} /><Text style={styles.legendText}>Medium Risk Zone</Text></View></View>}

      {routeInfo && routeCalculated && !isNavigating && <View style={styles.routeInfoPanel}><View style={styles.routeInfoHeader}><Shield color={COLORS.accent.success} size={20} /><Text style={styles.routeInfoTitle}>Safe Route Found</Text></View><View style={styles.routeInfoStats}><View style={styles.routeInfoStat}><Text style={styles.routeInfoStatValue}>{routeInfo.distance}</Text><Text style={styles.routeInfoStatLabel}>Distance</Text></View><View style={styles.routeInfoStatDivider} /><View style={styles.routeInfoStat}><Text style={styles.routeInfoStatValue}>{routeInfo.time}</Text><Text style={styles.routeInfoStatLabel}>Time</Text></View></View><TouchableOpacity style={styles.startWalkingButton} onPress={startNavigation}><Navigation color="#2D2D2D" size={16} /><Text style={styles.startWalkingButtonText}>Start Walking</Text></TouchableOpacity></View>}

      {isNavigating && directions.length > 0 && (
        <View style={styles.navigationPanel}>
          <View style={styles.navigationHeader}><View style={styles.navigationHeaderLeft}><Navigation color={COLORS.accent.success} size={24} /><Text style={styles.navigationTitle}>{liveLocation ? 'Live Navigation' : 'Navigating'}</Text></View><TouchableOpacity onPress={exitNavigation} style={styles.exitNavButton}><X color={COLORS.accent.danger} size={20} /><Text style={styles.exitNavButtonText}>Exit</Text></TouchableOpacity></View>
          {distanceToNextStep !== null && <View style={styles.liveDistanceBanner}><Text style={styles.liveDistanceText}>In {distanceToNextStep < 1000 ? `${distanceToNextStep}m` : `${(distanceToNextStep / 1000).toFixed(1)}km`}</Text><Text style={styles.liveDistanceLabel}>to next turn</Text></View>}
          <View style={styles.navigationStep}><View style={styles.stepIndicator}><Text style={styles.stepNumber}>{currentStep + 1}</Text><Text style={styles.stepTotal}>/ {directions.length}</Text></View><View style={styles.stepContent}><Text style={styles.stepInstruction}>{directions[currentStep]?.instruction}</Text><Text style={styles.stepDetail}>{directions[currentStep]?.detail}</Text>{!distanceToNextStep && directions[currentStep]?.distance && <Text style={styles.stepDistance}>{directions[currentStep]?.distance}</Text>}</View></View>
          <View style={styles.navigationControls}><TouchableOpacity style={[styles.navControlButton, currentStep === 0 && styles.navControlButtonDisabled]} onPress={prevStep} disabled={currentStep === 0}><ChevronRight color={currentStep === 0 ? COLORS.text.muted : COLORS.text.primary} size={24} style={{ transform: [{ rotate: '180deg' }] }} /><Text style={[styles.navControlText, currentStep === 0 && styles.navControlTextDisabled]}>Previous</Text></TouchableOpacity><View style={styles.progressDots}>{directions.map((_, i) => <View key={i} style={[styles.progressDot, i === currentStep && styles.progressDotActive, i < currentStep && styles.progressDotCompleted]} />)}</View><TouchableOpacity style={[styles.navControlButton, currentStep === directions.length - 1 && styles.navControlButtonDisabled]} onPress={nextStep} disabled={currentStep === directions.length - 1}><Text style={[styles.navControlText, currentStep === directions.length - 1 && styles.navControlTextDisabled]}>Next</Text><ChevronRight color={currentStep === directions.length - 1 ? COLORS.text.muted : COLORS.text.primary} size={24} /></TouchableOpacity></View>
        </View>
      )}

      {showDirections && selectedStation && <View style={styles.directionsPanel}><View style={styles.directionsPanelHeader}><View><Text style={styles.directionsPanelTitle}>Directions</Text><Text style={styles.directionsPanelSubtitle}>{selectedStation.name}</Text></View><TouchableOpacity onPress={() => setShowDirections(false)}><X color={COLORS.text.primary} size={24} /></TouchableOpacity></View><View style={styles.directionsInfo}><Navigation color={COLORS.accent.info} size={20} /><Text style={styles.directionsInfoText}>{selectedStation.distance} - ~3 min walk</Text></View><TouchableOpacity style={styles.startButton}><Text style={styles.startButtonText}>Start Walking</Text></TouchableOpacity></View>}

      {selectedZone && (
        <Modal visible={true} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedZone(null)}>
            <View style={styles.zoneInfoModal}>
              <View style={styles.zoneInfoHeader}>
                <View style={[styles.zoneInfoDot, { backgroundColor: getZoneColor(getDynamicIntensity(selectedZone)).stroke }]} />
                <Text style={styles.zoneInfoTitle}>{selectedZone.name}</Text>
              </View>
              <View style={styles.zoneInfoDangerRow}>
                <Text style={styles.zoneInfoDangerLabel}>Current Danger Level</Text>
                <Text style={[styles.zoneInfoDangerValue, { color: getZoneColor(getDynamicIntensity(selectedZone)).stroke }]}>{getZoneDangerLevel(selectedZone)}%</Text>
              </View>
              <View style={styles.zoneInfoSection}>
                <Text style={styles.zoneInfoSectionTitle}>Recent Incidents - Since Nov 2025 ({selectedZone.recentIncidents})</Text>
                {selectedZone.recentCrimes?.length > 0 ? selectedZone.recentCrimes.map((crime, i) => <View key={i} style={styles.zoneInfoCrimeItem}><Text style={styles.zoneInfoCrimeBullet}>•</Text><Text style={styles.zoneInfoCrimeText}>{crime}</Text></View>) : <Text style={styles.zoneInfoPeakText}>No recent incidents</Text>}
              </View>
              <View style={styles.zoneInfoSection}>
                <Text style={styles.zoneInfoSectionTitle}>Peak Danger Hours</Text>
                <Text style={styles.zoneInfoPeakText}>{selectedZone.peakHours?.map(h => h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`).join(', ')}</Text>
              </View>
              <TouchableOpacity style={styles.zoneInfoCloseButton} onPress={() => setSelectedZone(null)}>
                <Text style={styles.zoneInfoCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

function GroupsScreen({ joinedGroups, setJoinedGroups, userGroups, setUserGroups, walkingGroups, groupsLoading, viewGroupRoute, getDirectionsToGroup }) {
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
  const selectCreateLocation = async (loc) => {
    let coords = { latitude: loc.latitude, longitude: loc.longitude };
    const name = loc.shortName || loc.name;
    if (loc.needsGeocode || loc.isPreset) {
      const apiCoords = await geocodeLocation(name + ', Virginia Tech, Blacksburg, VA', VT_CENTER);
      if (apiCoords) coords = apiCoords;
    }
    if (activeCreateField === 'start') { setNewGroupStart(name); setNewGroupStartCoords(coords); } else { setNewGroupDestination(name); setNewGroupDestCoords(coords); }
    setActiveCreateField(null); setCreateSearchText(''); setCreateSuggestions([]);
  };
  const useMyLocationForCreate = async () => { try { const { status } = await Location.requestForegroundPermissionsAsync(); if (status === 'granted') { const loc = await Location.getCurrentPositionAsync({}); setNewGroupStart('My Location'); setNewGroupStartCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }); setActiveCreateField(null); setCreateSearchText(''); setCreateSuggestions([]); } } catch (e) { alert('Could not get location'); } };
  const resetCreateModal = () => { setShowCreateModal(false); setNewGroupName(''); setNewGroupStart(''); setNewGroupStartCoords(null); setNewGroupDestination(''); setNewGroupDestCoords(null); setNewGroupDepartureMinutes(10); setActiveCreateField(null); setCreateSearchText(''); setCreateSuggestions([]); };

  const handleJoin = () => {
    if (selectedGroup && !isGroupJoined(selectedGroup.id)) { setJoinedGroups([...joinedGroups, selectedGroup.id]); setUserGroups(userGroups.map(g => g.id === selectedGroup.id ? { ...g, members: [...(g.members || []), { id: 'currentUser', name: 'You', isReady: false, isCreator: false }] } : g)); }
    setJoined(true); setTimeout(() => { setShowModal(false); setJoined(false); if (selectedGroup?.startCoords && getDirectionsToGroup) setTimeout(() => Alert.alert('Get Directions', `Get directions to meet ${selectedGroup.name}?`, [{ text: 'No Thanks', style: 'cancel' }, { text: 'Yes', onPress: () => getDirectionsToGroup(selectedGroup) }]), 300); }, 1500);
  };
  const handleLeave = (groupId) => { setJoinedGroups(joinedGroups.filter(id => id !== groupId)); setShowModal(false); };
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupStart || !newGroupDestination) { alert('Please fill all fields'); return; }
    try {
      const docRef = await addDoc(collection(db, 'walkingGroups'), {
        name: newGroupName.trim(),
        startLocation: newGroupStart,
        startCoords: newGroupStartCoords,
        destination: newGroupDestination,
        destCoords: newGroupDestCoords,
        departureMinutes: newGroupDepartureMinutes,
        createdAt: Timestamp.now(),
        members: [{ id: 'currentUser', name: 'You', isReady: true, isCreator: true }],
        isUserCreated: true
      });
      setJoinedGroups([...joinedGroups, docRef.id]);
      resetCreateModal();
    } catch (error) { console.error('Error creating group:', error); Alert.alert('Error', 'Failed to create group'); }
  };
  const handleCheckIn = async (groupId) => {
    try {
      const group = allGroups.find(g => g.id === groupId);
      if (group && Array.isArray(group.members)) {
        const updatedMembers = group.members.map(m => m.id === 'currentUser' ? { ...m, isReady: true } : m);
        await updateDoc(doc(db, 'walkingGroups', String(groupId)), { members: updatedMembers });
        alert("You've checked in!");
      }
    } catch (error) { console.error('Error checking in:', error); }
  };

  const allGroups = [...userGroups, ...walkingGroups];

  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Text style={[styles.screenTitle, { fontSize: 29 }]}>Walking Groups</Text><TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}><Plus color={COLORS.text.primary} size={20} /><Text style={styles.createButtonText}>Create</Text></TouchableOpacity></View>
      <View style={styles.infoCard}><Users color={COLORS.accent.primary} size={24} /><View style={styles.infoCardContent}><Text style={styles.infoCardTitle}>Walk Together, Stay Safe</Text><Text style={styles.infoCardText}>Join a group heading your direction.</Text></View></View>

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

function ProfileScreen({ showActivityZones, setShowActivityZones, showLegend, setShowLegend }) {
  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>Profile</Text>
      <View style={styles.profileCard}><View style={styles.avatarContainer}><User color={COLORS.text.primary} size={40} /></View><View style={styles.profileInfo}><Text style={styles.profileName}>Hokie User</Text><Text style={styles.profileEmail}>hokie@vt.edu</Text></View><TouchableOpacity style={styles.editButton}><Text style={styles.editButtonText}>Edit</Text></TouchableOpacity></View>
      <View style={styles.statsContainer}><View style={styles.statItem}><Text style={styles.statNumber}>12</Text><Text style={styles.statLabel}>Safe Walks</Text></View><View style={styles.statDivider} /><View style={styles.statItem}><Text style={styles.statNumber}>5</Text><Text style={styles.statLabel}>Groups Joined</Text></View><View style={styles.statDivider} /><View style={styles.statItem}><Text style={styles.statNumber}>3</Text><Text style={styles.statLabel}>Groups Created</Text></View></View>
      <Text style={styles.sectionTitle}>Emergency Contacts</Text>
      <View style={styles.settingsCard}><TouchableOpacity style={styles.settingItem}><View style={styles.settingIcon}><Phone color={COLORS.accent.danger} size={22} /></View><View style={styles.settingContent}><Text style={styles.settingTitle}>Campus Police</Text><Text style={styles.settingSubtitle}>540-231-6411</Text></View><ChevronRight color={COLORS.text.muted} size={20} /></TouchableOpacity></View>
      <Text style={styles.sectionTitle}>Map Settings</Text>
      <View style={styles.settingsCard}><View style={styles.settingItem}><View style={styles.settingIcon}><Text style={{ fontSize: 18 }}>⚠️</Text></View><View style={styles.settingContent}><Text style={styles.settingTitle}>Activity Zones</Text><Text style={styles.settingSubtitle}>Show danger zones on map</Text></View><Switch value={showActivityZones} onValueChange={setShowActivityZones} trackColor={{ false: COLORS.text.muted, true: COLORS.accent.primary }} thumbColor={COLORS.text.primary} /></View><View style={styles.settingItem}><View style={styles.settingIcon}><Map color={COLORS.accent.info} size={22} /></View><View style={styles.settingContent}><Text style={styles.settingTitle}>Map Legend</Text><Text style={styles.settingSubtitle}>Show legend on map</Text></View><Switch value={showLegend} onValueChange={setShowLegend} trackColor={{ false: COLORS.text.muted, true: COLORS.accent.primary }} thumbColor={COLORS.text.primary} /></View></View>
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.settingsCard}><TouchableOpacity style={styles.settingItem}><View style={styles.settingIcon}><Bell color={COLORS.accent.info} size={22} /></View><View style={styles.settingContent}><Text style={styles.settingTitle}>Notifications</Text><Text style={styles.settingSubtitle}>Safety alerts and updates</Text></View><ChevronRight color={COLORS.text.muted} size={20} /></TouchableOpacity><TouchableOpacity style={styles.settingItem}><View style={styles.settingIcon}><Shield color={COLORS.accent.primary} size={22} /></View><View style={styles.settingContent}><Text style={styles.settingTitle}>Safety Tips</Text><Text style={styles.settingSubtitle}>Campus safety guidelines</Text></View><ChevronRight color={COLORS.text.muted} size={20} /></TouchableOpacity><TouchableOpacity style={styles.settingItem}><View style={styles.settingIcon}><HelpCircle color={COLORS.text.secondary} size={22} /></View><View style={styles.settingContent}><Text style={styles.settingTitle}>Help & Support</Text><Text style={styles.settingSubtitle}>FAQs and contact us</Text></View><ChevronRight color={COLORS.text.muted} size={20} /></TouchableOpacity></View>
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// Main App
function App() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
  });

  const [activeTab, setActiveTab] = useState('home');
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [walkingGroups, setWalkingGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [viewingGroupRoute, setViewingGroupRoute] = useState(null);
  const [meetingGroupRoute, setMeetingGroupRoute] = useState(null);
  const [showActivityZones, setShowActivityZones] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [blueLightRoute, setBlueLightRoute] = useState(null);

  // Firebase listener for walking groups
  useEffect(() => {
    const q = query(collection(db, 'walkingGroups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis?.() || doc.data().createdAt || Date.now()
      }));
      setWalkingGroups(groupData);
      setGroupsLoading(false);
    }, (error) => {
      console.error('Error fetching walking groups:', error);
      setGroupsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firebase listener for incidents (for badge count)
  useEffect(() => {
    const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incidentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis?.() || doc.data().createdAt || Date.now()
      }));
      setIncidents(incidentData);
    }, (error) => {
      console.error('Error fetching incidents for badge:', error);
    });
    return () => unsubscribe();
  }, []);

  const viewGroupRoute = (group) => { setViewingGroupRoute(group); setActiveTab('map'); };
  const getDirectionsToGroup = (group) => { setMeetingGroupRoute(group); setActiveTab('map'); };
  const getDirectionsToBlueLight = (blueLight) => { setBlueLightRoute(blueLight); setActiveTab('map'); };

  // Show loading screen while fonts load
  if (!fontsLoaded) {
    return (
      <LinearGradient colors={COLORS.bg.gradient} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.accent.primary} />
      </LinearGradient>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen setActiveTab={setActiveTab} getDirectionsToBlueLight={getDirectionsToBlueLight} walkingGroups={walkingGroups} incidents={incidents} />;
      case 'map': return <MapScreen viewingGroupRoute={viewingGroupRoute} setViewingGroupRoute={setViewingGroupRoute} meetingGroupRoute={meetingGroupRoute} setMeetingGroupRoute={setMeetingGroupRoute} showActivityZones={showActivityZones} showLegend={showLegend} blueLightRoute={blueLightRoute} setBlueLightRoute={setBlueLightRoute} walkingGroups={walkingGroups} />;
      case 'groups': return <GroupsScreen joinedGroups={joinedGroups} setJoinedGroups={setJoinedGroups} userGroups={userGroups} setUserGroups={setUserGroups} walkingGroups={walkingGroups} groupsLoading={groupsLoading} viewGroupRoute={viewGroupRoute} getDirectionsToGroup={getDirectionsToGroup} />;
      case 'profile': return <ProfileScreen showActivityZones={showActivityZones} setShowActivityZones={setShowActivityZones} showLegend={showLegend} setShowLegend={setShowLegend} />;
      case 'sos': return <SOSScreen />;
      default: return <HomeScreen setActiveTab={setActiveTab} getDirectionsToBlueLight={getDirectionsToBlueLight} />;
    }
  };
  const handleSOSLongPress = () => { Vibration.vibrate([0, 200, 100, 200, 100, 200]); Alert.alert('EMERGENCY ACTIVATED', 'Alerting campus security...\nNearest Blue Light: War Memorial Hall', [{ text: 'Call 911', onPress: () => Linking.openURL('tel:911') }, { text: 'Cancel', style: 'cancel' }]); };

  const TabButton = ({ name, icon, label }) => <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab(name)}>{React.cloneElement(icon, { color: activeTab === name ? COLORS.accent.primary : COLORS.text.muted })}<Text style={[styles.tabLabel, activeTab === name && styles.tabLabelActive]}>{label}</Text></TouchableOpacity>;

  return (
    <LinearGradient colors={COLORS.bg.gradient} style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <StatusBar style="dark" />
        <View style={styles.screenWrapper}>{renderScreen()}</View>
        <View style={styles.tabBar}><TabButton name="home" icon={<Home size={24} />} label="Home" /><TabButton name="map" icon={<Map size={24} />} label="Map" /><SOSTabButton onPress={() => setActiveTab('sos')} onLongPress={handleSOSLongPress} /><TabButton name="groups" icon={<Users size={24} />} label="Groups" /><TabButton name="profile" icon={<User size={24} />} label="Profile" /></View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  containerInner: { flex: 1 },
  screenWrapper: { flex: 1 },
  screenContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10, backgroundColor: 'transparent' },
  screenTitle: { fontSize: 36, fontWeight: '400', color: COLORS.text.primary, marginBottom: 20, fontFamily: 'CormorantGaramond_400Regular' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 36, fontWeight: '400', color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular', textTransform: 'lowercase' },
  headerSubtitle: { fontSize: 16, fontWeight: '300', color: COLORS.text.secondary, fontStyle: 'italic', fontFamily: 'CormorantGaramond_400Regular' },
  notificationButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bg.card, justifyContent: 'center', alignItems: 'center', ...SHADOWS.card },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 16, marginBottom: 24, ...SHADOWS.card },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent.success, marginRight: 12 },
  statusText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#4CAF50', fontFamily: 'CormorantGaramond_400Regular' },
  statusTime: { fontSize: 12, color: COLORS.text.secondary, fontFamily: 'CormorantGaramond_400Regular' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary, marginBottom: 12, marginTop: 8, fontFamily: 'CormorantGaramond_400Regular' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  quickAction: { flex: 1, alignItems: 'center', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 16, marginHorizontal: 4, ...SHADOWS.card },
  quickActionIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 12, color: COLORS.text.primary, textAlign: 'center', fontWeight: '500', fontFamily: 'CormorantGaramond_400Regular' },
  card: { backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 16, marginBottom: 12, ...SHADOWS.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitleContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular' },
  cardSubtitle: { fontSize: 13, color: COLORS.text.secondary, marginTop: 2, fontFamily: 'CormorantGaramond_400Regular' },
  cardContent: { marginTop: 12 },
  cardAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  cardActionText: { fontSize: 14, color: COLORS.accent.primary, fontFamily: 'CormorantGaramond_400Regular' },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.bg.secondary, paddingBottom: 0, paddingTop: 10, ...SHADOWS.card },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabLabel: { fontSize: 11, color: COLORS.text.muted, marginTop: 4, fontWeight: '500', fontFamily: 'CormorantGaramond_400Regular' },
  tabLabelActive: { color: COLORS.accent.primary },
  sosTabButtonContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 },
  sosTabButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.accent.danger, justifyContent: 'center', alignItems: 'center', marginTop: -30, shadowColor: COLORS.accent.danger, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10, borderWidth: 3, borderColor: COLORS.bg.secondary },
  sosScreenContainer: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 20, paddingTop: 20, alignItems: 'center' },
  sosScreenTitle: { fontSize: 32, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 8, fontFamily: 'CormorantGaramond_400Regular' },
  sosScreenSubtitle: { fontSize: 16, color: COLORS.text.secondary, marginBottom: 40, textAlign: 'center', fontFamily: 'CormorantGaramond_400Regular' },
  sosMainButton: { width: 180, height: 180, borderRadius: 90, backgroundColor: COLORS.accent.danger, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.accent.danger, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 30, elevation: 15, marginBottom: 50 },
  sosMainButtonText: { color: COLORS.text.primary, fontSize: 32, fontWeight: 'bold', marginTop: 8, fontFamily: 'CormorantGaramond_400Regular' },
  emergencyContactsTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary, alignSelf: 'flex-start', marginBottom: 16, fontFamily: 'CormorantGaramond_400Regular' },
  emergencyContactItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 16, marginBottom: 12, width: '100%', ...SHADOWS.card },
  emergencyContactIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  emergencyContactInfo: { flex: 1 },
  emergencyContactName: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular' },
  emergencyContactDesc: { fontSize: 14, color: COLORS.text.secondary, marginTop: 2, fontFamily: 'CormorantGaramond_400Regular' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapControls: { position: 'absolute', top: 20, right: 20 },
  controlButton: { backgroundColor: COLORS.bg.cardSolid, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, ...SHADOWS.card },
  controlButtonActive: { backgroundColor: 'rgba(255, 140, 0, 0.3)', borderColor: '#FF8C00' },
  controlButtonIcon: { fontSize: 16 },
  controlButtonText: { color: COLORS.text.primary, fontSize: 14, fontWeight: '500', fontFamily: 'CormorantGaramond_400Regular' },
  legend: { position: 'absolute', bottom: 20, left: 20, backgroundColor: COLORS.bg.cardSolid, borderRadius: 16, padding: 16, ...SHADOWS.card },
  legendTitle: { color: COLORS.text.primary, fontWeight: '600', marginBottom: 10, fontSize: 14, fontFamily: 'CormorantGaramond_400Regular' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendText: { color: COLORS.text.secondary, fontSize: 12, fontFamily: 'CormorantGaramond_400Regular' },
  routePanel: { position: 'absolute', top: 10, left: 16, right: 16, backgroundColor: COLORS.bg.cardSolid, borderRadius: 16, padding: 12, ...SHADOWS.card },
  routeInputContainer: { marginBottom: 8 },
  routeInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeInput: { flex: 1, backgroundColor: COLORS.iconBg.peach, borderRadius: 10, padding: 10 },
  routeInputText: { color: COLORS.text.primary, fontSize: 13, fontFamily: 'CormorantGaramond_400Regular' },
  routeInputPlaceholder: { color: COLORS.text.muted, fontSize: 13, fontFamily: 'CormorantGaramond_400Regular' },
  routeInputDivider: { width: 2, height: 12, backgroundColor: COLORS.border, marginLeft: 4, marginVertical: 3 },
  findRouteButton: { backgroundColor: '#A8E6CF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 24, gap: 6, shadowColor: '#A8E6CF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  findRouteButtonDisabled: { backgroundColor: COLORS.text.muted },
  findRouteButtonText: { color: '#2D2D2D', fontSize: 14, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  startMarker: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#A8E6CF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  endMarker: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFB5A7', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  blueLightMarker: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#B8DCEF', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff' },
  groupMarker: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#D4B8E8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  locationPickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center' },
  locationPicker: { backgroundColor: COLORS.bg.card, borderRadius: 20, width: '85%', maxHeight: '70%', overflow: 'hidden', ...SHADOWS.card },
  locationPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  locationPickerTitle: { color: COLORS.text.primary, fontSize: 18, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  locationList: { padding: 10 },
  locationItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  presetMatchItem: { backgroundColor: 'rgba(255, 107, 53, 0.1)', borderRadius: 10, marginHorizontal: 10, marginVertical: 4, borderWidth: 1, borderColor: 'rgba(255, 107, 53, 0.3)' },
  locationItemText: { color: COLORS.text.primary, fontSize: 16, fontFamily: 'CormorantGaramond_400Regular' },
  locationItemContent: { flex: 1 },
  locationItemSubtext: { color: COLORS.text.muted, fontSize: 12, marginTop: 2, fontFamily: 'CormorantGaramond_400Regular' },
  locationSectionTitle: { color: COLORS.text.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, letterSpacing: 0.5, fontFamily: 'CormorantGaramond_400Regular' },
  myLocationItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: 'rgba(30, 64, 175, 0.1)', marginHorizontal: 10, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(30, 64, 175, 0.3)' },
  myLocationText: { color: '#1E40AF', fontSize: 16, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.iconBg.peach, borderRadius: 12, paddingHorizontal: 16, marginHorizontal: 20, marginBottom: 10, gap: 12 },
  searchInput: { flex: 1, color: COLORS.text.primary, fontSize: 16, paddingVertical: 14, fontFamily: 'CormorantGaramond_400Regular' },
  loadingText: { color: COLORS.text.muted, fontSize: 14, fontFamily: 'CormorantGaramond_400Regular' },
  routeInfoPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.bg.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 24, ...SHADOWS.card },
  routeInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  routeInfoTitle: { color: COLORS.accent.primary, fontSize: 15, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  routeInfoStats: { flexDirection: 'row', backgroundColor: COLORS.iconBg.peach, borderRadius: 12, padding: 12, marginBottom: 12 },
  routeInfoStat: { flex: 1, alignItems: 'center' },
  routeInfoStatValue: { color: COLORS.text.primary, fontSize: 18, fontWeight: 'bold', fontFamily: 'CormorantGaramond_400Regular' },
  routeInfoStatLabel: { color: COLORS.text.secondary, fontSize: 11, marginTop: 2, fontFamily: 'CormorantGaramond_400Regular' },
  routeInfoStatDivider: { width: 1, backgroundColor: COLORS.border },
  startWalkingButton: { backgroundColor: '#A8E6CF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 24, gap: 6, shadowColor: '#A8E6CF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  startWalkingButtonText: { color: '#2D2D2D', fontSize: 14, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  navigationPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.bg.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 24, ...SHADOWS.card },
  navigationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  navigationHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navigationTitle: { color: COLORS.accent.primary, fontSize: 16, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  exitNavButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 59, 48, 0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, gap: 4 },
  exitNavButtonText: { color: COLORS.accent.danger, fontSize: 13, fontWeight: '500', fontFamily: 'CormorantGaramond_400Regular' },
  navigationStep: { flexDirection: 'row', backgroundColor: COLORS.iconBg.peach, borderRadius: 12, padding: 12, marginBottom: 10, gap: 12 },
  stepIndicator: { flexDirection: 'row', alignItems: 'baseline' },
  stepNumber: { color: COLORS.accent.primary, fontSize: 24, fontWeight: 'bold', fontFamily: 'CormorantGaramond_400Regular' },
  stepTotal: { color: COLORS.text.muted, fontSize: 14, fontFamily: 'CormorantGaramond_400Regular' },
  stepContent: { flex: 1 },
  stepInstruction: { color: COLORS.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 2, fontFamily: 'CormorantGaramond_400Regular' },
  stepDetail: { color: COLORS.text.secondary, fontSize: 13, lineHeight: 18, fontFamily: 'CormorantGaramond_400Regular' },
  stepDistance: { color: COLORS.accent.primary, fontSize: 13, fontWeight: '500', marginTop: 4, fontFamily: 'CormorantGaramond_400Regular' },
  navigationControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navControlButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.iconBg.lavender, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, gap: 4 },
  navControlButtonDisabled: { backgroundColor: COLORS.borderLight },
  navControlText: { color: COLORS.text.primary, fontSize: 13, fontWeight: '500', fontFamily: 'CormorantGaramond_400Regular' },
  navControlTextDisabled: { color: COLORS.text.muted, fontFamily: 'CormorantGaramond_400Regular' },
  progressDots: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 120 },
  progressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.borderLight },
  progressDotActive: { backgroundColor: COLORS.accent.primary, width: 14 },
  progressDotCompleted: { backgroundColor: 'rgba(255, 155, 138, 0.5)' },
  liveDistanceBanner: { backgroundColor: COLORS.accent.primary, borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  liveDistanceText: { color: COLORS.text.primary, fontSize: 24, fontWeight: 'bold', fontFamily: 'CormorantGaramond_400Regular' },
  liveDistanceLabel: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 14, fontFamily: 'CormorantGaramond_400Regular' },
  callout: { padding: 10, minWidth: 160 },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 4, fontFamily: 'CormorantGaramond_400Regular' },
  calloutName: { fontSize: 13, color: '#333', fontFamily: 'CormorantGaramond_400Regular' },
  calloutDistance: { fontSize: 12, color: '#666', marginTop: 2, fontFamily: 'CormorantGaramond_400Regular' },
  directionsPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.bg.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, ...SHADOWS.card },
  directionsPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  directionsPanelTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular' },
  directionsPanelSubtitle: { fontSize: 14, color: COLORS.text.secondary, marginTop: 4, fontFamily: 'CormorantGaramond_400Regular' },
  directionsInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  directionsInfoText: { fontSize: 16, color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular' },
  startButton: { backgroundColor: COLORS.accent.primary, paddingVertical: 16, borderRadius: 24, alignItems: 'center', ...SHADOWS.button },
  startButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, gap: 6, ...SHADOWS.button },
  createButtonText: { color: COLORS.text.primary, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  infoCard: { flexDirection: 'row', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 16, marginBottom: 24, gap: 12, ...SHADOWS.card },
  infoCardContent: { flex: 1 },
  infoCardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.accent.primary, fontFamily: 'CormorantGaramond_400Regular' },
  infoCardText: { fontSize: 14, color: COLORS.text.secondary, marginTop: 4, fontFamily: 'CormorantGaramond_400Regular' },
  groupDetails: { flexDirection: 'column', gap: 4, marginBottom: 12 },
  groupDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  groupDetailText: { fontSize: 13, color: COLORS.text.secondary, flex: 1, fontFamily: 'CormorantGaramond_400Regular' },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center' },
  zoneInfoPin: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.4)' },
  zoneInfoModal: { backgroundColor: COLORS.bg.cardSolid, borderRadius: 20, padding: 20, width: '85%', maxWidth: 340, ...SHADOWS.card },
  zoneInfoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  zoneInfoDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  zoneInfoTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary, flex: 1, fontFamily: 'CormorantGaramond_400Regular' },
  zoneInfoDangerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.iconBg.peach, borderRadius: 12, padding: 14, marginBottom: 16 },
  zoneInfoDangerLabel: { fontSize: 14, color: COLORS.text.secondary, fontFamily: 'CormorantGaramond_400Regular' },
  zoneInfoDangerValue: { fontSize: 24, fontWeight: 'bold', fontFamily: 'CormorantGaramond_400Regular' },
  zoneInfoSection: { marginBottom: 16 },
  zoneInfoSectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text.secondary, marginBottom: 8, fontFamily: 'CormorantGaramond_400Regular' },
  zoneInfoCrimeItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  zoneInfoCrimeBullet: { color: COLORS.accent.danger, fontSize: 16, marginRight: 8, fontFamily: 'CormorantGaramond_400Regular' },
  zoneInfoCrimeText: { fontSize: 15, color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular' },
  zoneInfoPeakText: { fontSize: 14, color: COLORS.text.primary, lineHeight: 20, fontFamily: 'CormorantGaramond_400Regular' },
  zoneInfoCloseButton: { backgroundColor: COLORS.bg.secondary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  zoneInfoCloseText: { color: COLORS.text.primary, fontSize: 16, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  modalContent: { backgroundColor: COLORS.bg.card, borderRadius: 24, padding: 32, alignItems: 'center', width: '85%', ...SHADOWS.card },
  modalClose: { position: 'absolute', top: 16, right: 16 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text.primary, marginTop: 16, fontFamily: 'CormorantGaramond_400Regular' },
  modalText: { fontSize: 16, color: COLORS.text.secondary, marginTop: 8, fontFamily: 'CormorantGaramond_400Regular' },
  modalSubtext: { fontSize: 14, color: COLORS.accent.success, marginTop: 4, fontFamily: 'CormorantGaramond_400Regular' },
  joinButton: { backgroundColor: COLORS.accent.primary, paddingHorizontal: 48, paddingVertical: 16, borderRadius: 24, marginTop: 24, ...SHADOWS.button },
  joinButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: 'bold', fontFamily: 'CormorantGaramond_400Regular' },
  joinedContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 10 },
  joinedText: { color: COLORS.accent.primary, fontSize: 16, fontWeight: 'bold', fontFamily: 'CormorantGaramond_400Regular' },
  joinedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.iconBg.mint, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  joinedBadgeText: { color: COLORS.accent.primary, fontSize: 14, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyStateText: { color: COLORS.text.muted, fontSize: 14, fontFamily: 'CormorantGaramond_400Regular' },
  createFormContainer: { width: '100%', marginTop: 20 },
  createFormLabel: { color: COLORS.text.secondary, fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 16, fontFamily: 'CormorantGaramond_400Regular' },
  createFormInput: { backgroundColor: COLORS.iconBg.peach, borderRadius: 12, padding: 14, color: COLORS.text.primary, fontSize: 16, fontFamily: 'CormorantGaramond_400Regular' },
  createFormInputText: { color: COLORS.text.primary, fontSize: 16, fontFamily: 'CormorantGaramond_400Regular' },
  createFormPlaceholder: { color: COLORS.text.muted, fontSize: 16, fontFamily: 'CormorantGaramond_400Regular' },
  destinationPickerList: { maxHeight: 150, marginTop: 8, backgroundColor: COLORS.iconBg.peach, borderRadius: 12 },
  destinationPickerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  destinationPickerText: { color: COLORS.text.primary, fontSize: 14, flex: 1, fontFamily: 'CormorantGaramond_400Regular' },
  createFormInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  createLocationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  createLocationTitle: { color: COLORS.text.primary, fontSize: 18, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  createLocationList: { width: '100%', maxHeight: 350, marginTop: 12 },
  emergencyOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
  emergencyContent: { backgroundColor: '#1a1a2e', borderRadius: 24, padding: 32, alignItems: 'center', width: '85%', borderWidth: 2, borderColor: COLORS.accent.danger },
  emergencyTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.accent.danger, marginTop: 16, fontFamily: 'CormorantGaramond_400Regular' },
  emergencyText: { fontSize: 16, color: COLORS.text.primary, marginTop: 8, textAlign: 'center', fontFamily: 'CormorantGaramond_400Regular' },
  callButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.text.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30, marginTop: 24, gap: 8 },
  callButtonText: { color: COLORS.accent.danger, fontSize: 18, fontWeight: 'bold', fontFamily: 'CormorantGaramond_400Regular' },
  cancelButton: { paddingHorizontal: 32, paddingVertical: 12, marginTop: 16 },
  cancelButtonText: { color: COLORS.text.secondary, fontSize: 16, fontFamily: 'CormorantGaramond_400Regular' },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 20, marginBottom: 20, ...SHADOWS.card },
  avatarContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.accent.primary, justifyContent: 'center', alignItems: 'center' },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { fontSize: 20, fontWeight: '600', color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular' },
  profileEmail: { fontSize: 14, color: COLORS.text.secondary, marginTop: 2, fontFamily: 'CormorantGaramond_400Regular' },
  editButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.accent.primary },
  editButtonText: { color: COLORS.accent.primary, fontWeight: '500', fontFamily: 'CormorantGaramond_400Regular' },
  statsContainer: { flexDirection: 'row', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 20, marginBottom: 24, ...SHADOWS.card },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: COLORS.accent.primary, fontFamily: 'CormorantGaramond_400Regular' },
  statLabel: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4, fontFamily: 'CormorantGaramond_400Regular' },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  settingsCard: { backgroundColor: COLORS.bg.card, borderRadius: 16, marginBottom: 16, overflow: 'hidden', ...SHADOWS.card },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  settingIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.iconBg.peach, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 16, color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular' },
  settingSubtitle: { fontSize: 13, color: COLORS.text.muted, marginTop: 2, fontFamily: 'CormorantGaramond_400Regular' },
  departureTimeContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  departureTimeOption: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, backgroundColor: COLORS.iconBg.peach, alignItems: 'center' },
  departureTimeOptionActive: { backgroundColor: COLORS.accent.primary },
  departureTimeText: { color: COLORS.text.secondary, fontSize: 14, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  departureTimeTextActive: { color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular' },
  departureTimeHint: { fontSize: 12, color: COLORS.text.muted, marginTop: 8, textAlign: 'center', fontFamily: 'CormorantGaramond_400Regular' },
  countdownBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.iconBg.peach, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, gap: 6, marginTop: 8, marginBottom: 4 },
  countdownText: { color: COLORS.accent.primary, fontSize: 12, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  modalCountdown: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.iconBg.peach, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  modalCountdownText: { color: COLORS.accent.primary, fontSize: 14, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  memberListContainer: { width: '100%', marginTop: 16 },
  memberListTitle: { fontSize: 14, color: COLORS.text.muted, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'CormorantGaramond_400Regular' },
  memberItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberName: { color: COLORS.text.primary, fontSize: 16, fontFamily: 'CormorantGaramond_400Regular' },
  memberStatus: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  memberStatusReady: { backgroundColor: COLORS.iconBg.mint },
  memberStatusWaiting: { backgroundColor: COLORS.iconBg.peach },
  memberStatusText: { fontSize: 12, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  memberStatusTextReady: { color: '#4CAF50', fontFamily: 'CormorantGaramond_400Regular' },
  memberStatusTextWaiting: { color: '#FF9800', fontFamily: 'CormorantGaramond_400Regular' },
  memberSubtext: { color: COLORS.text.muted, fontSize: 14, textAlign: 'center', paddingVertical: 12, fontFamily: 'CormorantGaramond_400Regular' },
  imHereButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent.primary, paddingVertical: 14, borderRadius: 24, marginTop: 16, gap: 8, ...SHADOWS.button },
  imHereButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: 'bold', fontFamily: 'CormorantGaramond_400Regular' },
  viewRouteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.iconBg.lavender, paddingVertical: 14, borderRadius: 24, marginTop: 12, gap: 8 },
  viewRouteButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  // Notification badge
  notificationBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: COLORS.accent.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  notificationBadgeText: { color: COLORS.text.primary, fontSize: 10, fontWeight: 'bold', fontFamily: 'CormorantGaramond_400Regular' },
  // Incident Feed
  incidentFeedContainer: { flex: 1, backgroundColor: 'transparent' },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backButton: { padding: 4 },
  feedTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.bg.card, ...SHADOWS.card },
  filterChipActive: { backgroundColor: COLORS.accent.primary, borderColor: COLORS.accent.primary },
  filterChipText: { color: COLORS.text.secondary, fontSize: 14, fontWeight: '500', fontFamily: 'CormorantGaramond_400Regular' },
  filterChipTextActive: { color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular' },
  incidentList: { flex: 1, paddingHorizontal: 16 },
  incidentCard: { backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 14, marginBottom: 12, borderLeftWidth: 4, ...SHADOWS.card },
  incidentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  incidentTypeIcon: { fontSize: 18 },
  incidentTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular' },
  incidentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  incidentBadgeVTPD: { backgroundColor: 'rgba(30, 64, 175, 0.2)' },
  incidentBadgeCommunity: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  incidentBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.text.primary, fontFamily: 'CormorantGaramond_400Regular' },
  incidentMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  incidentLocation: { color: COLORS.text.secondary, fontSize: 13, flex: 1, fontFamily: 'CormorantGaramond_400Regular' },
  incidentTime: { color: COLORS.text.muted, fontSize: 12, fontFamily: 'CormorantGaramond_400Regular' },
  incidentDescription: { color: COLORS.text.secondary, fontSize: 13, lineHeight: 19, marginBottom: 10, fontFamily: 'CormorantGaramond_400Regular' },
  incidentFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verifyCount: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4 },
  verifyCountText: { color: COLORS.text.muted, fontSize: 13, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  verifyButton: { backgroundColor: 'rgba(255, 107, 53, 0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  verifyButtonText: { color: COLORS.accent.primary, fontSize: 13, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.accent.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.button },
  // Report Modal
  reportModalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text.primary, marginTop: 8, marginBottom: 4, fontFamily: 'CormorantGaramond_400Regular' },
  reportModalSubtitle: { fontSize: 14, color: COLORS.text.secondary, marginBottom: 20, fontFamily: 'CormorantGaramond_400Regular' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, width: '100%' },
  typeButton: { width: '48%', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 16, alignItems: 'center', ...SHADOWS.card },
  typeButtonIcon: { fontSize: 28, marginBottom: 8 },
  typeButtonLabel: { fontSize: 12, color: COLORS.text.primary, textAlign: 'center', fontWeight: '500', fontFamily: 'CormorantGaramond_400Regular' },
  reportInput: { width: '100%', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 16, color: COLORS.text.primary, fontSize: 16, marginBottom: 20, fontFamily: 'CormorantGaramond_400Regular', ...SHADOWS.card },
  reportNavButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  reportNavButton: { flex: 1, paddingVertical: 14, borderRadius: 24, alignItems: 'center', backgroundColor: COLORS.bg.card, ...SHADOWS.card },
  reportNavButtonPrimary: { backgroundColor: COLORS.accent.primary, ...SHADOWS.button },
  reportNavButtonText: { color: COLORS.text.secondary, fontSize: 16, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
  reportNavButtonTextPrimary: { color: COLORS.text.primary, fontSize: 16, fontWeight: '600', fontFamily: 'CormorantGaramond_400Regular' },
});

registerRootComponent(App);
