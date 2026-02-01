// Map Screen - Optimized
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import MapView, { Marker, Callout, Circle, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { MapPin, Phone, Users, X, Search, Crosshair, Navigation, Shield, ChevronRight, Check, Info } from 'lucide-react-native';
import { COLORS } from '../../theme.js';
import { VT_CENTER, BLUE_LIGHTS, VT_LOCATIONS, ACTIVITY_ZONES } from '../../constants.js';
import { getDistanceMeters, getZoneColor, calculateLocalSafeRoute } from '../utils/helpers.js';
import { getZoneDangerLevel, getDynamicIntensity, getSafeRoute } from '../utils/routingUtils.js';
import { findMatchingVTLocation, geocodeLocation, getAddressSuggestions } from '../utils/locationUtils.js';
import styles from '../styles/styles.js';

const formatDist = d => d > 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`;
const EDGE_PADDING = { top: 100, right: 50, bottom: 150, left: 50 };

export default function MapScreen({ viewingGroupRoute, setViewingGroupRoute, meetingGroupRoute, setMeetingGroupRoute, showActivityZones, showLegend, blueLightRoute, setBlueLightRoute, walkingGroups = [] }) {
  const mapRef = useRef(null), searchTimeoutRef = useRef(null), locationSubscription = useRef(null);
  const [state, setState] = useState({ selectedStation: null, showDirections: false, startLocation: '', endLocation: '', startCoords: null, endCoords: null, routeCoords: null, isLoadingRoute: false, showLocationPicker: null, routeInfo: null, geoapifySteps: [], searchText: '', suggestions: [], isLoadingSuggestions: false, isNavigating: false, currentStep: 0, directions: [], liveLocation: null, distanceToNextStep: null, selectedZone: null, routeCalculated: false });
  const { selectedStation, showDirections, startLocation, endLocation, startCoords, endCoords, routeCoords, isLoadingRoute, showLocationPicker, routeInfo, geoapifySteps, searchText, suggestions, isLoadingSuggestions, isNavigating, currentStep, directions, liveLocation, distanceToNextStep, selectedZone, routeCalculated } = state;
  const set = updates => setState(s => ({ ...s, ...updates }));

  const getDistanceBetween = (c1, c2) => c1 && c2 ? getDistanceMeters(c1, c2) : Infinity;

  const processRoute = async (start, end, onComplete) => {
    set({ isLoadingRoute: true });
    try {
      const routeData = await getSafeRoute(start, end);
      if (routeData?.coordinates?.length > 0) {
        const fullRoute = [start, ...routeData.coordinates, end];
        set({ routeCoords: fullRoute, geoapifySteps: routeData.steps || [], routeInfo: { distance: formatDist(routeData.distance), time: `${Math.ceil(routeData.duration / 60)} min` }, routeCalculated: true });
        setTimeout(() => mapRef.current?.fitToCoordinates(fullRoute, { edgePadding: EDGE_PADDING, animated: true }), 100);
      } else {
        const localRoute = calculateLocalSafeRoute(start, end), distance = getDistanceMeters(start, end);
        set({ routeCoords: localRoute, geoapifySteps: [], routeInfo: { distance: formatDist(distance), time: `${Math.ceil(distance / 80)} min` }, routeCalculated: true });
        setTimeout(() => mapRef.current?.fitToCoordinates(localRoute, { edgePadding: EDGE_PADDING, animated: true }), 100);
      }
    } catch (e) {
      const fallback = [start, end];
      set({ routeCoords: fallback, routeCalculated: true });
      setTimeout(() => mapRef.current?.fitToCoordinates(fallback, { edgePadding: EDGE_PADDING, animated: true }), 100);
    }
    set({ isLoadingRoute: false });
    onComplete?.();
  };

  useEffect(() => {
    if (!isNavigating || !liveLocation || !directions.length) return;
    const curr = directions[currentStep];
    if (curr?.coordinate) {
      const dist = getDistanceBetween(liveLocation, curr.coordinate);
      set({ distanceToNextStep: dist });
      if (dist < 15 && currentStep < directions.length - 1) set({ currentStep: currentStep + 1 });
    }
    mapRef.current?.animateCamera({ center: liveLocation, pitch: 60, heading: liveLocation.heading || 0, zoom: 18 }, { duration: 500 });
  }, [liveLocation, isNavigating, currentStep, directions]);

  useEffect(() => {
    if (!viewingGroupRoute?.startCoords || !viewingGroupRoute?.destCoords) return;
    set({ startLocation: viewingGroupRoute.startLocation || 'Group Start', endLocation: viewingGroupRoute.destination, startCoords: viewingGroupRoute.startCoords, endCoords: viewingGroupRoute.destCoords });
    processRoute(viewingGroupRoute.startCoords, viewingGroupRoute.destCoords, () => setViewingGroupRoute(null));
  }, [viewingGroupRoute]);

  useEffect(() => {
    if (!meetingGroupRoute?.startCoords) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { alert('Location permission needed'); setMeetingGroupRoute(null); return; }
      const loc = await Location.getCurrentPositionAsync({});
      const start = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      set({ startLocation: 'Your Location', endLocation: meetingGroupRoute.startLocation || 'Meeting Point', startCoords: start, endCoords: meetingGroupRoute.startCoords });
      processRoute(start, meetingGroupRoute.startCoords, () => setMeetingGroupRoute(null));
    })();
  }, [meetingGroupRoute]);

  useEffect(() => {
    if (!blueLightRoute) return;
    const start = blueLightRoute.userCoords, end = { latitude: blueLightRoute.latitude, longitude: blueLightRoute.longitude };
    set({ startLocation: 'Your Location', endLocation: blueLightRoute.name, startCoords: start, endCoords: end });
    processRoute(start, end, () => setBlueLightRoute(null));
  }, [blueLightRoute]);

  const selectLocation = async (loc, type) => {
    let coords = { latitude: loc.latitude, longitude: loc.longitude };
    const name = loc.shortName || loc.name;
    if (loc.needsGeocode || loc.isPreset) { const api = await geocodeLocation(name + ', Virginia Tech, Blacksburg, VA', VT_CENTER); if (api) coords = api; }
    set(type === 'start' ? { startLocation: name, startCoords: coords } : { endLocation: name, endCoords: coords });
    set({ showLocationPicker: null, searchText: '', suggestions: [] });
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 400);
  };

  const handleSearchChange = text => {
    set({ searchText: text });
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (text.length < 3) { set({ suggestions: [] }); return; }
    set({ isLoadingSuggestions: true });
    searchTimeoutRef.current = setTimeout(async () => { set({ suggestions: await getAddressSuggestions(text), isLoadingSuggestions: false }); }, 300);
  };

  const handleFindRoute = async () => {
    const start = startCoords || await geocodeLocation(startLocation + ', Blacksburg, VA', VT_CENTER) || VT_LOCATIONS.find(l => l.name === startLocation);
    const end = endCoords || await geocodeLocation(endLocation + ', Blacksburg, VA', VT_CENTER) || VT_LOCATIONS.find(l => l.name === endLocation);
    if (!start || !end) { alert('Please select valid locations'); return; }
    if (!startCoords) set({ startCoords: start });
    if (!endCoords) set({ endCoords: end });
    processRoute(start, end);
  };

  const clearRoute = () => {
    locationSubscription.current?.remove(); locationSubscription.current = null;
    set({ routeCoords: null, routeInfo: null, startLocation: '', endLocation: '', startCoords: null, endCoords: null, geoapifySteps: [], isNavigating: false, directions: [], currentStep: 0, routeCalculated: false, liveLocation: null, distanceToNextStep: null });
  };

  const startNavigation = async () => {
    if (!routeCoords || routeCoords.length < 2) return;
    const dirs = geoapifySteps?.length > 0
      ? [{ instruction: `Start at ${startLocation}`, detail: 'Begin your safe route', coordinate: routeCoords[0] }, ...geoapifySteps.map((s, i) => ({ instruction: s.instruction, detail: s.name || `${Math.round(s.distance)}m`, distance: `${Math.round(s.distance)}m`, coordinate: routeCoords[Math.min(i + 1, routeCoords.length - 1)] })), { instruction: `Arrive at ${endLocation}`, detail: 'Destination reached safely', coordinate: routeCoords[routeCoords.length - 1] }]
      : routeCoords.slice(0, -1).map((c, i) => ({ instruction: i === 0 ? `Start at ${startLocation}` : `Continue ${routeCoords[i + 1].latitude > c.latitude ? 'north' : 'south'}`, detail: `${getDistanceBetween(c, routeCoords[i + 1])}m`, coordinate: routeCoords[i + 1] })).concat({ instruction: `Arrive at ${endLocation}`, detail: 'Destination reached safely', coordinate: routeCoords[routeCoords.length - 1] });
    set({ directions: dirs, currentStep: 0, isNavigating: true });
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') locationSubscription.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 }, l => set({ liveLocation: { latitude: l.coords.latitude, longitude: l.coords.longitude, heading: l.coords.heading } }));
  };

  const navStep = delta => {
    const next = currentStep + delta;
    if (next >= 0 && next < directions.length) { set({ currentStep: next }); if (directions[next]?.coordinate) mapRef.current?.animateToRegion({ ...directions[next].coordinate, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500); }
  };

  const exitNavigation = () => { locationSubscription.current?.remove(); set({ isNavigating: false, currentStep: 0, liveLocation: null, distanceToNextStep: null }); if (routeCoords) mapRef.current?.fitToCoordinates(routeCoords, { edgePadding: { ...EDGE_PADDING, bottom: 200, top: 150 }, animated: true }); };

  return (
    <View style={styles.mapContainer}>
      <MapView ref={mapRef} style={styles.map} initialRegion={VT_CENTER} showsUserLocation showsMyLocationButton={false}>
        {showActivityZones && ACTIVITY_ZONES.map(z => {
          const colors = getZoneColor(getDynamicIntensity(z));
          return <React.Fragment key={z.id}><Circle center={{ latitude: z.latitude, longitude: z.longitude }} radius={z.radius} fillColor={colors.fill} strokeColor={colors.stroke} strokeWidth={2} /><Marker coordinate={{ latitude: z.latitude, longitude: z.longitude }} onPress={() => set({ selectedZone: z })} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.zoneInfoPin}><Info color="#fff" size={14} /></View></Marker></React.Fragment>;
        })}
        {routeCoords?.length > 0 && <Polyline key={`r-${routeCoords.length}`} coordinates={routeCoords} strokeColor={COLORS.accent.success} strokeWidth={4} />}
        {startCoords && <Marker coordinate={startCoords} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.startMarker}><Navigation color="#2D2D2D" size={14} /></View></Marker>}
        {endCoords && <Marker coordinate={endCoords} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.endMarker}><MapPin color="#2D2D2D" size={14} /></View></Marker>}
        {BLUE_LIGHTS.map(s => <Marker key={s.id} coordinate={{ latitude: s.latitude, longitude: s.longitude }} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.blueLightMarker}><Phone color="#2D2D2D" size={10} /></View><Callout onPress={() => set({ selectedStation: s, showDirections: true })}><View style={styles.callout}><Text style={styles.calloutTitle}>Blue Light Station</Text><Text style={styles.calloutName}>{s.name}</Text></View></Callout></Marker>)}
        {walkingGroups.filter(g => g.startCoords).map(g => <Marker key={g.id} coordinate={g.startCoords} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.groupMarker}><Users color="#2D2D2D" size={12} /></View><Callout><View style={styles.callout}><Text style={styles.calloutTitle}>{g.name}</Text><Text style={styles.calloutName}>To {g.destination}</Text><Text style={styles.calloutDistance}>{Array.isArray(g.members) ? g.members.length : g.members || 1} people</Text></View></Callout></Marker>)}
      </MapView>

      {!isNavigating && <View style={styles.routePanel}>
        <View style={styles.routeInputContainer}>
          {['start', 'end'].map((t, i) => <React.Fragment key={t}>{i > 0 && <View style={styles.routeInputDivider} />}<View style={styles.routeInputWrapper}><View style={[styles.routeDot, { backgroundColor: t === 'start' ? COLORS.accent.success : COLORS.accent.danger }]} /><TouchableOpacity style={styles.routeInput} onPress={() => set({ showLocationPicker: t })}><Text style={(t === 'start' ? startLocation : endLocation) ? styles.routeInputText : styles.routeInputPlaceholder}>{(t === 'start' ? startLocation : endLocation) || (t === 'start' ? 'Starting location' : 'Destination')}</Text></TouchableOpacity></View></React.Fragment>)}
        </View>
        <TouchableOpacity style={[styles.findRouteButton, isLoadingRoute && styles.findRouteButtonDisabled]} onPress={handleFindRoute} disabled={isLoadingRoute || !startLocation || !endLocation}>{isLoadingRoute ? <Text style={styles.findRouteButtonText}>Finding safe route...</Text> : <><Search color="#2D2D2D" size={18} /><Text style={styles.findRouteButtonText}>Find Safe Route</Text></>}</TouchableOpacity>
      </View>}

      {showLocationPicker && <View style={styles.locationPickerOverlay}><View style={styles.locationPicker}>
        <View style={styles.locationPickerHeader}><Text style={styles.locationPickerTitle}>{showLocationPicker === 'start' ? 'Starting' : 'Destination'} Location</Text><TouchableOpacity onPress={() => set({ showLocationPicker: null, searchText: '', suggestions: [] })}><X color={COLORS.text.primary} size={24} /></TouchableOpacity></View>
        <View style={styles.searchInputContainer}><Search color={COLORS.text.muted} size={20} /><TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor={COLORS.text.muted} value={searchText} onChangeText={handleSearchChange} autoFocus />{isLoadingSuggestions && <Text style={styles.loadingText}>...</Text>}</View>
        <ScrollView style={styles.locationList}>
          {showLocationPicker === 'start' && <TouchableOpacity style={styles.myLocationItem} onPress={async () => { const { status } = await Location.requestForegroundPermissionsAsync(); if (status === 'granted') { const l = await Location.getCurrentPositionAsync({}); selectLocation({ name: 'My Location', shortName: 'My Location', latitude: l.coords.latitude, longitude: l.coords.longitude }, showLocationPicker); } }}><Crosshair color={COLORS.accent.info} size={22} /><Text style={styles.myLocationText}>Use My Location</Text></TouchableOpacity>}
          {suggestions.filter(s => s.isPreset).map((l, i) => <TouchableOpacity key={`p-${i}`} style={[styles.locationItem, styles.presetMatchItem]} onPress={() => selectLocation(l, showLocationPicker)}><MapPin color={COLORS.accent.primary} size={20} /><View style={styles.locationItemContent}><Text style={styles.locationItemText}>{l.shortName}</Text></View><Check color={COLORS.accent.success} size={18} /></TouchableOpacity>)}
          {suggestions.filter(s => !s.isPreset).map((l, i) => <TouchableOpacity key={`s-${i}`} style={styles.locationItem} onPress={() => selectLocation(l, showLocationPicker)}><Search color={COLORS.text.muted} size={20} /><View style={styles.locationItemContent}><Text style={styles.locationItemText}>{l.shortName}</Text><Text style={styles.locationItemSubtext} numberOfLines={1}>{l.name}</Text></View></TouchableOpacity>)}
          <Text style={styles.locationSectionTitle}>VT Campus Locations</Text>
          {VT_LOCATIONS.map((l, i) => <TouchableOpacity key={`vt-${i}`} style={styles.locationItem} onPress={() => selectLocation(l, showLocationPicker)}><MapPin color={COLORS.accent.primary} size={20} /><Text style={styles.locationItemText}>{l.name}</Text></TouchableOpacity>)}
        </ScrollView>
      </View></View>}

      {!isNavigating && routeCoords && <View style={styles.mapControls}><TouchableOpacity style={styles.controlButton} onPress={clearRoute}><X color={COLORS.text.primary} size={16} /><Text style={styles.controlButtonText}>Clear</Text></TouchableOpacity></View>}

      {!isNavigating && showLegend && <View style={styles.legend}><Text style={styles.legendTitle}>Legend</Text>{[['#B8DCEF', 'Blue Light Stations'], ['#D4B8E8', 'Walking Groups'], ['#A8E6CF', 'Safe Route'], ['#FFB5A7', 'High Risk Zone'], ['#FFE0B2', 'Medium Risk Zone']].map(([c, t]) => <View key={c} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={styles.legendText}>{t}</Text></View>)}</View>}

      {routeInfo && routeCalculated && !isNavigating && <View style={styles.routeInfoPanel}><View style={styles.routeInfoHeader}><Shield color={COLORS.accent.success} size={20} /><Text style={styles.routeInfoTitle}>Safe Route Found</Text></View><View style={styles.routeInfoStats}><View style={styles.routeInfoStat}><Text style={styles.routeInfoStatValue}>{routeInfo.distance}</Text><Text style={styles.routeInfoStatLabel}>Distance</Text></View><View style={styles.routeInfoStatDivider} /><View style={styles.routeInfoStat}><Text style={styles.routeInfoStatValue}>{routeInfo.time}</Text><Text style={styles.routeInfoStatLabel}>Time</Text></View></View><TouchableOpacity style={styles.startWalkingButton} onPress={startNavigation}><Navigation color="#2D2D2D" size={16} /><Text style={styles.startWalkingButtonText}>Start Walking</Text></TouchableOpacity></View>}

      {isNavigating && directions.length > 0 && <View style={styles.navigationPanel}>
        <View style={styles.navigationHeader}><View style={styles.navigationHeaderLeft}><Navigation color={COLORS.accent.success} size={24} /><Text style={styles.navigationTitle}>{liveLocation ? 'Live Navigation' : 'Navigating'}</Text></View><TouchableOpacity onPress={exitNavigation} style={styles.exitNavButton}><X color={COLORS.accent.danger} size={20} /><Text style={styles.exitNavButtonText}>Exit</Text></TouchableOpacity></View>
        {distanceToNextStep !== null && <View style={styles.liveDistanceBanner}><Text style={styles.liveDistanceText}>In {formatDist(distanceToNextStep)}</Text><Text style={styles.liveDistanceLabel}>to next turn</Text></View>}
        <View style={styles.navigationStep}><View style={styles.stepIndicator}><Text style={styles.stepNumber}>{currentStep + 1}</Text><Text style={styles.stepTotal}>/ {directions.length}</Text></View><View style={styles.stepContent}><Text style={styles.stepInstruction}>{directions[currentStep]?.instruction}</Text><Text style={styles.stepDetail}>{directions[currentStep]?.detail}</Text>{!distanceToNextStep && directions[currentStep]?.distance && <Text style={styles.stepDistance}>{directions[currentStep]?.distance}</Text>}</View></View>
        <View style={styles.navigationControls}><TouchableOpacity style={[styles.navControlButton, currentStep === 0 && styles.navControlButtonDisabled]} onPress={() => navStep(-1)} disabled={currentStep === 0}><ChevronRight color={currentStep === 0 ? COLORS.text.muted : COLORS.text.primary} size={24} style={{ transform: [{ rotate: '180deg' }] }} /><Text style={[styles.navControlText, currentStep === 0 && styles.navControlTextDisabled]}>Previous</Text></TouchableOpacity><View style={styles.progressDots}>{directions.map((_, i) => <View key={i} style={[styles.progressDot, i === currentStep && styles.progressDotActive, i < currentStep && styles.progressDotCompleted]} />)}</View><TouchableOpacity style={[styles.navControlButton, currentStep === directions.length - 1 && styles.navControlButtonDisabled]} onPress={() => navStep(1)} disabled={currentStep === directions.length - 1}><Text style={[styles.navControlText, currentStep === directions.length - 1 && styles.navControlTextDisabled]}>Next</Text><ChevronRight color={currentStep === directions.length - 1 ? COLORS.text.muted : COLORS.text.primary} size={24} /></TouchableOpacity></View>
      </View>}

      {showDirections && selectedStation && <View style={styles.directionsPanel}><View style={styles.directionsPanelHeader}><View><Text style={styles.directionsPanelTitle}>Directions</Text><Text style={styles.directionsPanelSubtitle}>{selectedStation.name}</Text></View><TouchableOpacity onPress={() => set({ showDirections: false })}><X color={COLORS.text.primary} size={24} /></TouchableOpacity></View><View style={styles.directionsInfo}><Navigation color={COLORS.accent.info} size={20} /><Text style={styles.directionsInfoText}>{selectedStation.distance} - ~3 min walk</Text></View><TouchableOpacity style={styles.startButton}><Text style={styles.startButtonText}>Start Walking</Text></TouchableOpacity></View>}

      {selectedZone && <Modal visible transparent animationType="fade"><TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => set({ selectedZone: null })}><View style={styles.zoneInfoModal}><View style={styles.zoneInfoHeader}><View style={[styles.zoneInfoDot, { backgroundColor: getZoneColor(getDynamicIntensity(selectedZone)).stroke }]} /><Text style={styles.zoneInfoTitle}>{selectedZone.name}</Text></View><View style={styles.zoneInfoDangerRow}><Text style={styles.zoneInfoDangerLabel}>Current Danger Level</Text><Text style={[styles.zoneInfoDangerValue, { color: getZoneColor(getDynamicIntensity(selectedZone)).stroke }]}>{getZoneDangerLevel(selectedZone)}%</Text></View><View style={styles.zoneInfoSection}><Text style={styles.zoneInfoSectionTitle}>Recent Incidents - Since Nov 2025 ({selectedZone.recentIncidents})</Text>{selectedZone.recentCrimes?.length > 0 ? selectedZone.recentCrimes.map((c, i) => <View key={i} style={styles.zoneInfoCrimeItem}><Text style={styles.zoneInfoCrimeBullet}>•</Text><Text style={styles.zoneInfoCrimeText}>{c}</Text></View>) : <Text style={styles.zoneInfoPeakText}>No recent incidents</Text>}</View><View style={styles.zoneInfoSection}><Text style={styles.zoneInfoSectionTitle}>Peak Danger Hours</Text><Text style={styles.zoneInfoPeakText}>{selectedZone.peakHours?.map(h => h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`).join(', ')}</Text></View><TouchableOpacity style={styles.zoneInfoCloseButton} onPress={() => set({ selectedZone: null })}><Text style={styles.zoneInfoCloseText}>Close</Text></TouchableOpacity></View></TouchableOpacity></Modal>}
    </View>
  );
}
