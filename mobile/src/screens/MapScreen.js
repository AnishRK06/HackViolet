// Map Screen
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

export default function MapScreen({ viewingGroupRoute, setViewingGroupRoute, meetingGroupRoute, setMeetingGroupRoute, showActivityZones, showLegend, blueLightRoute, setBlueLightRoute, walkingGroups = [] }) {
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
      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
        (location) => setLiveLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude, heading: location.coords.heading })
      );
      return true;
    } catch (error) { return false; }
  };

  const stopLocationTracking = () => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    setLiveLocation(null);
    setDistanceToNextStep(null);
  };

  useEffect(() => {
    if (!isNavigating || !liveLocation || !directions.length) return;
    const currentDir = directions[currentStep];
    if (currentDir?.coordinate) {
      const distToCurrent = getDistanceBetween(liveLocation, currentDir.coordinate);
      setDistanceToNextStep(distToCurrent);
      if (distToCurrent < 15 && currentStep < directions.length - 1) setCurrentStep(prev => prev + 1);
    }
    mapRef.current?.animateCamera({ center: liveLocation, pitch: 60, heading: liveLocation.heading || 0, zoom: 18 }, { duration: 500 });
  }, [liveLocation, isNavigating, currentStep, directions]);

  useEffect(() => {
    if (viewingGroupRoute?.startCoords && viewingGroupRoute?.destCoords) {
      (async () => {
        const start = viewingGroupRoute.startCoords;
        const end = viewingGroupRoute.destCoords;
        setIsLoadingRoute(true);
        setStartLocation(viewingGroupRoute.startLocation || 'Group Start');
        setEndLocation(viewingGroupRoute.destination);
        setStartCoords(start);
        setEndCoords(end);
        try {
          const routeData = await getSafeRoute(start, end);
          if (routeData?.coordinates?.length > 0) {
            const fullRoute = [start, ...routeData.coordinates, end];
            setRouteCoords(fullRoute);
            setGeoapifySteps(routeData.steps || []);
            setRouteInfo({
              distance: routeData.distance > 1000 ? `${(routeData.distance / 1000).toFixed(1)} km` : `${Math.round(routeData.distance)} m`,
              time: `${Math.ceil(routeData.duration / 60)} min`
            });
            setRouteCalculated(true);
            setTimeout(() => { mapRef.current?.fitToCoordinates(fullRoute, { edgePadding: { top: 100, right: 50, bottom: 200, left: 50 }, animated: true }); }, 100);
          } else {
            const localRoute = calculateLocalSafeRoute(start, end);
            setRouteCoords(localRoute);
            setGeoapifySteps([]);
            const distance = getDistanceMeters(start, end);
            setRouteInfo({ distance: distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`, time: `${Math.ceil(distance / 80)} min` });
            setRouteCalculated(true);
            setTimeout(() => { mapRef.current?.fitToCoordinates(localRoute, { edgePadding: { top: 100, right: 50, bottom: 200, left: 50 }, animated: true }); }, 100);
          }
        } catch (error) {
          console.error('Error fetching group route:', error);
          const fallbackRoute = [start, end];
          setRouteCoords(fallbackRoute);
          setRouteCalculated(true);
          setTimeout(() => { mapRef.current?.fitToCoordinates(fallbackRoute, { edgePadding: { top: 100, right: 50, bottom: 200, left: 50 }, animated: true }); }, 100);
        }
        setIsLoadingRoute(false);
        setViewingGroupRoute(null);
      })();
    }
  }, [viewingGroupRoute]);

  useEffect(() => {
    if (!meetingGroupRoute?.startCoords) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { alert('Location permission needed'); setMeetingGroupRoute(null); return; }
        const location = await Location.getCurrentPositionAsync({});
        const start = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        const end = meetingGroupRoute.startCoords;
        setIsLoadingRoute(true);
        setStartLocation('Your Location');
        setEndLocation(meetingGroupRoute.startLocation || 'Meeting Point');
        setStartCoords(start);
        setEndCoords(end);
        const routeData = await getSafeRoute(start, end);
        if (routeData?.coordinates?.length > 0) {
          const fullRoute = [start, ...routeData.coordinates, end];
          setRouteCoords(fullRoute);
          setGeoapifySteps(routeData.steps || []);
          setRouteInfo({
            distance: routeData.distance > 1000 ? `${(routeData.distance / 1000).toFixed(1)} km` : `${Math.round(routeData.distance)} m`,
            time: `${Math.ceil(routeData.duration / 60)} min`
          });
          setRouteCalculated(true);
          setTimeout(() => { mapRef.current?.fitToCoordinates(fullRoute, { edgePadding: { top: 100, right: 50, bottom: 150, left: 50 }, animated: true }); }, 100);
        } else {
          const localRoute = calculateLocalSafeRoute(start, end);
          setRouteCoords(localRoute);
          setGeoapifySteps([]);
          const distance = getDistanceMeters(start, end);
          setRouteInfo({ distance: distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`, time: `${Math.ceil(distance / 80)} min` });
          setRouteCalculated(true);
          setTimeout(() => { mapRef.current?.fitToCoordinates(localRoute, { edgePadding: { top: 100, right: 50, bottom: 150, left: 50 }, animated: true }); }, 100);
        }
      } catch (error) {
        console.error('Error:', error);
      }
      setIsLoadingRoute(false);
      setMeetingGroupRoute(null);
    })();
  }, [meetingGroupRoute]);

  useEffect(() => {
    if (!blueLightRoute) return;
    (async () => {
      const start = blueLightRoute.userCoords;
      const end = { latitude: blueLightRoute.latitude, longitude: blueLightRoute.longitude };
      setIsLoadingRoute(true);
      setStartLocation('Your Location');
      setEndLocation(blueLightRoute.name);
      setStartCoords(start);
      setEndCoords(end);
      try {
        const routeData = await getSafeRoute(start, end);
        if (routeData?.coordinates?.length > 0) {
          const fullRoute = [start, ...routeData.coordinates, end];
          setRouteCoords(fullRoute);
          setGeoapifySteps(routeData.steps || []);
          setRouteInfo({
            distance: routeData.distance > 1000 ? `${(routeData.distance / 1000).toFixed(1)} km` : `${Math.round(routeData.distance)} m`,
            time: `${Math.ceil(routeData.duration / 60)} min`
          });
          setRouteCalculated(true);
          setTimeout(() => { mapRef.current?.fitToCoordinates(fullRoute, { edgePadding: { top: 100, right: 50, bottom: 150, left: 50 }, animated: true }); }, 100);
        } else {
          const localRoute = calculateLocalSafeRoute(start, end);
          setRouteCoords(localRoute);
          setGeoapifySteps([]);
          const distance = getDistanceMeters(start, end);
          setRouteInfo({ distance: distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`, time: `${Math.ceil(distance / 80)} min` });
          setRouteCalculated(true);
          setTimeout(() => { mapRef.current?.fitToCoordinates(localRoute, { edgePadding: { top: 100, right: 50, bottom: 150, left: 50 }, animated: true }); }, 100);
        }
      } catch (error) {
        console.error('Blue light route error:', error);
        const fallbackRoute = [start, end];
        setRouteCoords(fallbackRoute);
        setRouteCalculated(true);
        setTimeout(() => { mapRef.current?.fitToCoordinates(fallbackRoute, { edgePadding: { top: 100, right: 50, bottom: 150, left: 50 }, animated: true }); }, 100);
      }
      setIsLoadingRoute(false);
      setBlueLightRoute(null);
    })();
  }, [blueLightRoute]);

  const handleGetDirections = (station) => {
    setSelectedStation(station);
    setShowDirections(true);
    mapRef.current?.animateToRegion({ latitude: station.latitude, longitude: station.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 500);
  };

  const selectLocation = async (location, type) => {
    let coords = { latitude: location.latitude, longitude: location.longitude };
    const name = location.shortName || location.name;
    if (location.needsGeocode || location.isPreset) {
      const apiCoords = await geocodeLocation(name + ', Virginia Tech, Blacksburg, VA', VT_CENTER);
      if (apiCoords) coords = apiCoords;
    }
    if (type === 'start') { setStartLocation(name); setStartCoords(coords); }
    else { setEndLocation(name); setEndCoords(coords); }
    setShowLocationPicker(null);
    setSearchText('');
    setSuggestions([]);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 400);
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (text.length < 3) { setSuggestions([]); return; }
    setIsLoadingSuggestions(true);
    searchTimeoutRef.current = setTimeout(async () => {
      setSuggestions(await getAddressSuggestions(text));
      setIsLoadingSuggestions(false);
    }, 300);
  };

  const getLocationCoords = async (locationName) => {
    const apiCoords = await geocodeLocation(locationName + ', Blacksburg, VA', VT_CENTER);
    if (apiCoords) return apiCoords;
    const exactMatch = VT_LOCATIONS.find(l => l.name === locationName);
    if (exactMatch) return { latitude: exactMatch.latitude, longitude: exactMatch.longitude };
    const fuzzyMatch = findMatchingVTLocation(locationName);
    return fuzzyMatch ? { latitude: fuzzyMatch.latitude, longitude: fuzzyMatch.longitude } : null;
  };

  const handleFindRoute = async () => {
    const start = startCoords || await getLocationCoords(startLocation);
    const end = endCoords || await getLocationCoords(endLocation);
    if (!start || !end) { alert('Please select valid locations'); return; }

    if (!startCoords) setStartCoords(start);
    if (!endCoords) setEndCoords(end);

    setIsLoadingRoute(true);

    try {
      const routeData = await getSafeRoute(start, end);
      let routePoints;
      let routeDistance;
      let routeDuration;

      if (routeData?.coordinates?.length > 0) {
        routePoints = [{ ...start }, ...routeData.coordinates.map(c => ({ ...c })), { ...end }];
        routeDistance = routeData.distance;
        routeDuration = routeData.duration;
        setGeoapifySteps(routeData.steps || []);
      } else {
        console.log('APIs failed, using local safe route calculation');
        const localRoute = calculateLocalSafeRoute(start, end);
        routePoints = localRoute.map(c => ({ ...c }));
        routeDistance = getDistanceMeters(start, end);
        routeDuration = routeDistance / 1.33;
        setGeoapifySteps([]);
      }

      setRouteCoords(routePoints);
      setRouteInfo({
        distance: routeDistance > 1000 ? `${(routeDistance / 1000).toFixed(1)} km` : `${Math.round(routeDistance)} m`,
        time: `${Math.ceil(routeDuration / 60)} min`
      });
      setRouteCalculated(true);
      setIsLoadingRoute(false);

      setTimeout(() => {
        if (routePoints?.length > 0) {
          mapRef.current?.fitToCoordinates(routePoints, { edgePadding: { top: 150, right: 50, bottom: 180, left: 50 }, animated: true });
        }
      }, 150);

    } catch (error) {
      console.error('Route calculation error:', error);
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
    setRouteCalculated(false);
  };

  const generateDirections = (coords, start, end) => {
    if (!coords || coords.length < 2) return [];
    const getDirection = (from, to) => Math.abs(to.latitude - from.latitude) > Math.abs(to.longitude - from.longitude)
      ? (to.latitude > from.latitude ? 'north' : 'south')
      : (to.longitude > from.longitude ? 'east' : 'west');
    const getDistance = (from, to) => {
      const lat1 = from.latitude * Math.PI / 180, lat2 = to.latitude * Math.PI / 180;
      const dLat = lat2 - lat1, dLon = (to.longitude - from.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };
    const steps = [{ instruction: `Start at ${start}`, detail: 'Begin your safe route', distance: '', icon: 'start' }];
    for (let i = 0; i < coords.length - 1; i++) {
      const distance = getDistance(coords[i], coords[i + 1]);
      steps.push({ instruction: `Head ${getDirection(coords[i], coords[i + 1])}`, detail: `Continue for ${distance}m`, distance: `${distance}m`, icon: getDirection(coords[i], coords[i + 1]), coordinate: coords[i + 1] });
    }
    steps.push({ instruction: `Arrive at ${end}`, detail: 'You have reached your destination safely', distance: '', icon: 'destination' });
    return steps;
  };

  const startNavigation = async () => {
    if (!routeCoords || routeCoords.length < 2) return;
    let dirs = geoapifySteps?.length > 0
      ? [
          { instruction: `Start at ${startLocation}`, detail: 'Begin your safe route', distance: '', icon: 'start', coordinate: routeCoords[0] },
          ...geoapifySteps.map((step, i) => ({
            instruction: step.instruction,
            detail: step.name || `Continue for ${Math.round(step.distance)}m`,
            distance: `${Math.round(step.distance)}m`,
            icon: 'navigate',
            coordinate: routeCoords[Math.min(i + 1, routeCoords.length - 1)]
          })),
          { instruction: `Arrive at ${endLocation}`, detail: 'Destination reached safely', distance: '', icon: 'destination', coordinate: routeCoords[routeCoords.length - 1] }
        ]
      : generateDirections(routeCoords, startLocation, endLocation);
    setDirections(dirs);
    setCurrentStep(0);
    setIsNavigating(true);
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

  const nextStep = () => {
    if (currentStep < directions.length - 1) {
      setCurrentStep(currentStep + 1);
      if (directions[currentStep + 1]?.coordinate) {
        mapRef.current?.animateToRegion({ ...directions[currentStep + 1].coordinate, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      if (directions[currentStep - 1]?.coordinate) {
        mapRef.current?.animateToRegion({ ...directions[currentStep - 1].coordinate, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
      }
    }
  };

  const exitNavigation = () => {
    stopLocationTracking();
    setIsNavigating(false);
    setCurrentStep(0);
    if (routeCoords) {
      mapRef.current?.fitToCoordinates(routeCoords, { edgePadding: { top: 150, right: 50, bottom: 200, left: 50 }, animated: true });
    }
  };

  return (
    <View style={styles.mapContainer}>
      <MapView ref={mapRef} style={styles.map} provider={undefined} initialRegion={VT_CENTER} showsUserLocation showsMyLocationButton={false}>
        {showActivityZones && ACTIVITY_ZONES.map((zone) => {
          const dynamicIntensity = getDynamicIntensity(zone);
          const colors = getZoneColor(dynamicIntensity);
          return (
            <React.Fragment key={zone.id}>
              <Circle center={{ latitude: zone.latitude, longitude: zone.longitude }} radius={zone.radius} fillColor={colors.fill} strokeColor={colors.stroke} strokeWidth={2} />
              <Marker coordinate={{ latitude: zone.latitude, longitude: zone.longitude }} onPress={() => setSelectedZone(zone)} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.zoneInfoPin}><Info color="#fff" size={14} /></View>
              </Marker>
            </React.Fragment>
          );
        })}

        {routeCoords?.length > 0 && <Polyline key={`route-${routeCoords.length}-${routeCoords[0]?.latitude}`} coordinates={[...routeCoords]} strokeColor={COLORS.accent.success} strokeWidth={4} />}
        {startCoords && <Marker key={`start-${startCoords.latitude}-${startCoords.longitude}`} coordinate={startCoords} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.startMarker}><Navigation color="#2D2D2D" size={14} /></View></Marker>}
        {endCoords && <Marker key={`end-${endCoords.latitude}-${endCoords.longitude}`} coordinate={endCoords} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.endMarker}><MapPin color="#2D2D2D" size={14} /></View></Marker>}

        {BLUE_LIGHTS.map((station) => (
          <Marker key={station.id} coordinate={{ latitude: station.latitude, longitude: station.longitude }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.blueLightMarker}><Phone color="#2D2D2D" size={10} /></View>
            <Callout onPress={() => handleGetDirections(station)}>
              <View style={styles.callout}><Text style={styles.calloutTitle}>Blue Light Station</Text><Text style={styles.calloutName}>{station.name}</Text></View>
            </Callout>
          </Marker>
        ))}

        {walkingGroups.filter(g => g.startCoords).map((group) => (
          <Marker key={group.id} coordinate={{ latitude: group.startCoords.latitude, longitude: group.startCoords.longitude }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.groupMarker}><Users color="#2D2D2D" size={12} /></View>
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{group.name}</Text>
                <Text style={styles.calloutName}>To {group.destination}</Text>
                <Text style={styles.calloutDistance}>{Array.isArray(group.members) ? group.members.length : group.members || 1} people</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {!isNavigating && (
        <View style={styles.routePanel}>
          <View style={styles.routeInputContainer}>
            <View style={styles.routeInputWrapper}>
              <View style={[styles.routeDot, { backgroundColor: COLORS.accent.success }]} />
              <TouchableOpacity style={styles.routeInput} onPress={() => setShowLocationPicker('start')}>
                <Text style={startLocation ? styles.routeInputText : styles.routeInputPlaceholder}>{startLocation || 'Starting location'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.routeInputDivider} />
            <View style={styles.routeInputWrapper}>
              <View style={[styles.routeDot, { backgroundColor: COLORS.accent.danger }]} />
              <TouchableOpacity style={styles.routeInput} onPress={() => setShowLocationPicker('end')}>
                <Text style={endLocation ? styles.routeInputText : styles.routeInputPlaceholder}>{endLocation || 'Destination'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={[styles.findRouteButton, isLoadingRoute && styles.findRouteButtonDisabled]} onPress={handleFindRoute} disabled={isLoadingRoute || !startLocation || !endLocation}>
            {isLoadingRoute
              ? <Text style={styles.findRouteButtonText}>Finding safe route...</Text>
              : <><Search color="#2D2D2D" size={18} /><Text style={styles.findRouteButtonText}>Find Safe Route</Text></>
            }
          </TouchableOpacity>
        </View>
      )}

      {showLocationPicker && (
        <View style={styles.locationPickerOverlay}>
          <View style={styles.locationPicker}>
            <View style={styles.locationPickerHeader}>
              <Text style={styles.locationPickerTitle}>{showLocationPicker === 'start' ? 'Starting' : 'Destination'} Location</Text>
              <TouchableOpacity onPress={() => { setShowLocationPicker(null); setSearchText(''); setSuggestions([]); }}>
                <X color={COLORS.text.primary} size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchInputContainer}>
              <Search color={COLORS.text.muted} size={20} />
              <TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor={COLORS.text.muted} value={searchText} onChangeText={handleSearchChange} autoFocus />
              {isLoadingSuggestions && <Text style={styles.loadingText}>...</Text>}
            </View>
            <ScrollView style={styles.locationList}>
              {showLocationPicker === 'start' && (
                <TouchableOpacity style={styles.myLocationItem} onPress={async () => {
                  try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                      const location = await Location.getCurrentPositionAsync({});
                      selectLocation({ name: 'My Location', shortName: 'My Location', latitude: location.coords.latitude, longitude: location.coords.longitude }, showLocationPicker);
                    }
                  } catch (e) { alert('Could not get location'); }
                }}>
                  <Crosshair color={COLORS.accent.info} size={22} /><Text style={styles.myLocationText}>Use My Location</Text>
                </TouchableOpacity>
              )}
              {suggestions.filter(s => s.isPreset).map((loc, i) => (
                <TouchableOpacity key={`p-${i}`} style={[styles.locationItem, styles.presetMatchItem]} onPress={() => selectLocation(loc, showLocationPicker)}>
                  <MapPin color={COLORS.accent.primary} size={20} />
                  <View style={styles.locationItemContent}><Text style={styles.locationItemText}>{loc.shortName}</Text></View>
                  <Check color={COLORS.accent.success} size={18} />
                </TouchableOpacity>
              ))}
              {suggestions.filter(s => !s.isPreset).map((loc, i) => (
                <TouchableOpacity key={`s-${i}`} style={styles.locationItem} onPress={() => selectLocation(loc, showLocationPicker)}>
                  <Search color={COLORS.text.muted} size={20} />
                  <View style={styles.locationItemContent}>
                    <Text style={styles.locationItemText}>{loc.shortName}</Text>
                    <Text style={styles.locationItemSubtext} numberOfLines={1}>{loc.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <Text style={styles.locationSectionTitle}>VT Campus Locations</Text>
              {VT_LOCATIONS.map((loc, i) => (
                <TouchableOpacity key={`vt-${i}`} style={styles.locationItem} onPress={() => selectLocation(loc, showLocationPicker)}>
                  <MapPin color={COLORS.accent.primary} size={20} /><Text style={styles.locationItemText}>{loc.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {!isNavigating && routeCoords && (
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.controlButton} onPress={clearRoute}>
            <X color={COLORS.text.primary} size={16} /><Text style={styles.controlButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isNavigating && showLegend && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#B8DCEF' }]} /><Text style={styles.legendText}>Blue Light Stations</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#D4B8E8' }]} /><Text style={styles.legendText}>Walking Groups</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#A8E6CF' }]} /><Text style={styles.legendText}>Safe Route</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FFB5A7' }]} /><Text style={styles.legendText}>High Risk Zone</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FFE0B2' }]} /><Text style={styles.legendText}>Medium Risk Zone</Text></View>
        </View>
      )}

      {routeInfo && routeCalculated && !isNavigating && (
        <View style={styles.routeInfoPanel}>
          <View style={styles.routeInfoHeader}><Shield color={COLORS.accent.success} size={20} /><Text style={styles.routeInfoTitle}>Safe Route Found</Text></View>
          <View style={styles.routeInfoStats}>
            <View style={styles.routeInfoStat}><Text style={styles.routeInfoStatValue}>{routeInfo.distance}</Text><Text style={styles.routeInfoStatLabel}>Distance</Text></View>
            <View style={styles.routeInfoStatDivider} />
            <View style={styles.routeInfoStat}><Text style={styles.routeInfoStatValue}>{routeInfo.time}</Text><Text style={styles.routeInfoStatLabel}>Time</Text></View>
          </View>
          <TouchableOpacity style={styles.startWalkingButton} onPress={startNavigation}>
            <Navigation color="#2D2D2D" size={16} /><Text style={styles.startWalkingButtonText}>Start Walking</Text>
          </TouchableOpacity>
        </View>
      )}

      {isNavigating && directions.length > 0 && (
        <View style={styles.navigationPanel}>
          <View style={styles.navigationHeader}>
            <View style={styles.navigationHeaderLeft}><Navigation color={COLORS.accent.success} size={24} /><Text style={styles.navigationTitle}>{liveLocation ? 'Live Navigation' : 'Navigating'}</Text></View>
            <TouchableOpacity onPress={exitNavigation} style={styles.exitNavButton}><X color={COLORS.accent.danger} size={20} /><Text style={styles.exitNavButtonText}>Exit</Text></TouchableOpacity>
          </View>
          {distanceToNextStep !== null && (
            <View style={styles.liveDistanceBanner}>
              <Text style={styles.liveDistanceText}>In {distanceToNextStep < 1000 ? `${distanceToNextStep}m` : `${(distanceToNextStep / 1000).toFixed(1)}km`}</Text>
              <Text style={styles.liveDistanceLabel}>to next turn</Text>
            </View>
          )}
          <View style={styles.navigationStep}>
            <View style={styles.stepIndicator}><Text style={styles.stepNumber}>{currentStep + 1}</Text><Text style={styles.stepTotal}>/ {directions.length}</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepInstruction}>{directions[currentStep]?.instruction}</Text>
              <Text style={styles.stepDetail}>{directions[currentStep]?.detail}</Text>
              {!distanceToNextStep && directions[currentStep]?.distance && <Text style={styles.stepDistance}>{directions[currentStep]?.distance}</Text>}
            </View>
          </View>
          <View style={styles.navigationControls}>
            <TouchableOpacity style={[styles.navControlButton, currentStep === 0 && styles.navControlButtonDisabled]} onPress={prevStep} disabled={currentStep === 0}>
              <ChevronRight color={currentStep === 0 ? COLORS.text.muted : COLORS.text.primary} size={24} style={{ transform: [{ rotate: '180deg' }] }} />
              <Text style={[styles.navControlText, currentStep === 0 && styles.navControlTextDisabled]}>Previous</Text>
            </TouchableOpacity>
            <View style={styles.progressDots}>
              {directions.map((_, i) => <View key={i} style={[styles.progressDot, i === currentStep && styles.progressDotActive, i < currentStep && styles.progressDotCompleted]} />)}
            </View>
            <TouchableOpacity style={[styles.navControlButton, currentStep === directions.length - 1 && styles.navControlButtonDisabled]} onPress={nextStep} disabled={currentStep === directions.length - 1}>
              <Text style={[styles.navControlText, currentStep === directions.length - 1 && styles.navControlTextDisabled]}>Next</Text>
              <ChevronRight color={currentStep === directions.length - 1 ? COLORS.text.muted : COLORS.text.primary} size={24} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showDirections && selectedStation && (
        <View style={styles.directionsPanel}>
          <View style={styles.directionsPanelHeader}>
            <View><Text style={styles.directionsPanelTitle}>Directions</Text><Text style={styles.directionsPanelSubtitle}>{selectedStation.name}</Text></View>
            <TouchableOpacity onPress={() => setShowDirections(false)}><X color={COLORS.text.primary} size={24} /></TouchableOpacity>
          </View>
          <View style={styles.directionsInfo}><Navigation color={COLORS.accent.info} size={20} /><Text style={styles.directionsInfoText}>{selectedStation.distance} - ~3 min walk</Text></View>
          <TouchableOpacity style={styles.startButton}><Text style={styles.startButtonText}>Start Walking</Text></TouchableOpacity>
        </View>
      )}

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
                {selectedZone.recentCrimes?.length > 0
                  ? selectedZone.recentCrimes.map((crime, i) => <View key={i} style={styles.zoneInfoCrimeItem}><Text style={styles.zoneInfoCrimeBullet}>•</Text><Text style={styles.zoneInfoCrimeText}>{crime}</Text></View>)
                  : <Text style={styles.zoneInfoPeakText}>No recent incidents</Text>
                }
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
