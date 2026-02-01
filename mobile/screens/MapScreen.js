import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Modal } from 'react-native';
import MapView, { Marker, Polygon, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Navigation, X, Users, Check } from 'lucide-react-native';
import SOSButton from '../components/SOSButton';
import { COLORS } from '../theme';

const { width, height } = Dimensions.get('window');

const VT_CENTER = { latitude: 37.2284, longitude: -80.4234, latitudeDelta: 0.015, longitudeDelta: 0.015 };

const BLUE_LIGHTS = [
  { id: 1, name: 'Squires Student Center', latitude: 37.2294, longitude: -80.4135, distance: '0.3 mi' },
  { id: 2, name: 'War Memorial Hall', latitude: 37.2275, longitude: -80.4220, distance: '0.2 mi' },
  { id: 3, name: 'Newman Library', latitude: 37.2299, longitude: -80.4162, distance: '0.25 mi' },
];

const WALKING_GROUPS = [
  { id: 1, name: 'Wolfpack Group', latitude: 37.2290, longitude: -80.4180, destination: 'West AJ', members: 3 },
  { id: 2, name: 'Night Owls', latitude: 37.2270, longitude: -80.4200, destination: 'D2', members: 5 },
];

const HEATMAP_COORDS = [
  { latitude: 37.2310, longitude: -80.4280 },
  { latitude: 37.2310, longitude: -80.4180 },
  { latitude: 37.2260, longitude: -80.4180 },
  { latitude: 37.2260, longitude: -80.4280 },
];

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
];

const LegendItem = ({ color, text }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendText}>{text}</Text>
  </View>
);

export default function MapScreen() {
  const mapRef = useRef(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [joinedGroup, setJoinedGroup] = useState(false);

  const handleGetDirections = (station) => {
    setSelectedStation(station);
    setShowDirections(true);
    mapRef.current?.animateToRegion({ latitude: station.latitude, longitude: station.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 500);
  };

  const handleGroupPress = (group) => { setSelectedGroup(group); setShowGroupModal(true); };
  const handleJoinGroup = () => { setJoinedGroup(true); setTimeout(() => { setShowGroupModal(false); setJoinedGroup(false); }, 1500); };
  const closeGroupModal = () => { setShowGroupModal(false); setJoinedGroup(false); };

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} initialRegion={VT_CENTER} customMapStyle={darkMapStyle} showsUserLocation showsMyLocationButton={false}>
        {showHeatmap && <Polygon coordinates={HEATMAP_COORDS} fillColor="rgba(255, 140, 0, 0.2)" strokeColor="rgba(255, 140, 0, 0.5)" strokeWidth={2} />}

        {BLUE_LIGHTS.map((station) => (
          <Marker key={station.id} coordinate={{ latitude: station.latitude, longitude: station.longitude }} pinColor={COLORS.accent.info}>
            <Callout onPress={() => handleGetDirections(station)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>🔵 Blue Light Station</Text>
                <Text style={styles.calloutName}>{station.name}</Text>
                <Text style={styles.calloutDistance}>{station.distance} away</Text>
                <View style={styles.calloutButton}>
                  <Navigation color={COLORS.accent.info} size={14} />
                  <Text style={styles.calloutButtonText}>Get Directions</Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}

        {WALKING_GROUPS.map((group) => (
          <Marker key={group.id} coordinate={{ latitude: group.latitude, longitude: group.longitude }} pinColor={COLORS.accent.success} onPress={() => handleGroupPress(group)}>
            <Callout onPress={() => handleGroupPress(group)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>🚶 {group.name}</Text>
                <Text style={styles.calloutName}>Heading to {group.destination}</Text>
                <Text style={styles.calloutDistance}>{group.members} people</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.topControls}>
        <TouchableOpacity style={[styles.controlButton, showHeatmap && styles.controlButtonActive]} onPress={() => setShowHeatmap(!showHeatmap)}>
          <Text style={styles.controlButtonIcon}>🔥</Text>
          <Text style={styles.controlButtonText}>Heatmap</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend</Text>
        <LegendItem color={COLORS.accent.info} text="Blue Light Stations" />
        <LegendItem color={COLORS.accent.success} text="Walking Groups" />
        <LegendItem color="#FF8C00" text="High Activity Zone" />
      </View>

      {showDirections && selectedStation && (
        <View style={styles.directionsPanel}>
          <View style={styles.directionsPanelHeader}>
            <View>
              <Text style={styles.directionsPanelTitle}>Directions</Text>
              <Text style={styles.directionsPanelSubtitle}>{selectedStation.name}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowDirections(false)}><X color={COLORS.text.primary} size={24} /></TouchableOpacity>
          </View>
          <View style={styles.directionsInfo}>
            <View style={styles.directionsInfoItem}><Navigation color={COLORS.accent.info} size={20} /><Text style={styles.directionsInfoText}>{selectedStation.distance}</Text></View>
            <View style={styles.directionsInfoItem}><Text style={styles.directionsInfoLabel}>~3 min walk</Text></View>
          </View>
          <TouchableOpacity style={styles.startButton}><Text style={styles.startButtonText}>Start Walking</Text></TouchableOpacity>
        </View>
      )}

      <Modal visible={showGroupModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={closeGroupModal}><X color={COLORS.text.primary} size={24} /></TouchableOpacity>
            <Users color={COLORS.accent.success} size={48} />
            <Text style={styles.modalTitle}>{selectedGroup?.name}</Text>
            <Text style={styles.modalText}>Heading to {selectedGroup?.destination}</Text>
            <Text style={styles.modalSubtext}>{selectedGroup?.members} people in group</Text>
            {joinedGroup ? (
              <View style={styles.joinedContainer}><Check color={COLORS.accent.success} size={32} /><Text style={styles.joinedText}>You've joined!</Text></View>
            ) : (
              <TouchableOpacity style={styles.joinButton} onPress={handleJoinGroup}><Text style={styles.joinButtonText}>Join Group</Text></TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <SOSButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  map: { width, height },
  topControls: { position: 'absolute', top: 60, right: 20, flexDirection: 'row', gap: 10 },
  controlButton: { backgroundColor: COLORS.bg.cardSolid, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border },
  controlButtonActive: { backgroundColor: 'rgba(255, 140, 0, 0.3)', borderColor: '#FF8C00' },
  controlButtonIcon: { fontSize: 16 },
  controlButtonText: { color: COLORS.text.primary, fontSize: 14, fontWeight: '500' },
  legend: { position: 'absolute', bottom: 180, left: 20, backgroundColor: COLORS.bg.cardSolid, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  legendTitle: { color: COLORS.text.primary, fontWeight: '600', marginBottom: 10, fontSize: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendText: { color: COLORS.text.secondary, fontSize: 12 },
  callout: { padding: 10, minWidth: 180 },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  calloutName: { fontSize: 13, color: '#333' },
  calloutDistance: { fontSize: 12, color: '#666', marginTop: 2 },
  calloutButton: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee', gap: 4 },
  calloutButtonText: { color: COLORS.accent.info, fontSize: 13, fontWeight: '500' },
  directionsPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(30, 41, 59, 0.98)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  directionsPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  directionsPanelTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary },
  directionsPanelSubtitle: { fontSize: 14, color: COLORS.text.secondary, marginTop: 4 },
  directionsInfo: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  directionsInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  directionsInfoText: { fontSize: 16, color: COLORS.text.primary, fontWeight: '600' },
  directionsInfoLabel: { fontSize: 14, color: COLORS.text.secondary },
  startButton: { backgroundColor: COLORS.accent.info, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  startButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.bg.secondary, borderRadius: 24, padding: 32, alignItems: 'center', width: '85%' },
  modalClose: { position: 'absolute', top: 16, right: 16 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text.primary, marginTop: 16 },
  modalText: { fontSize: 16, color: COLORS.text.secondary, marginTop: 8 },
  modalSubtext: { fontSize: 14, color: COLORS.accent.success, marginTop: 4 },
  joinButton: { backgroundColor: COLORS.accent.success, paddingHorizontal: 48, paddingVertical: 14, borderRadius: 25, marginTop: 24 },
  joinButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: 'bold' },
  joinedContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 10 },
  joinedText: { color: COLORS.accent.success, fontSize: 16, fontWeight: 'bold' },
});
