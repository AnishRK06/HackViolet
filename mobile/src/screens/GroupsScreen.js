// Groups Screen - Optimized
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Users, Plus, X, MapPin, Navigation, Clock, ChevronRight, Check, User, Search, Crosshair } from 'lucide-react-native';
import { db } from '../config/firebase.js';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { COLORS } from '../../theme.js';
import { VT_CENTER, VT_LOCATIONS } from '../../constants.js';
import { getAddressSuggestions, geocodeLocation } from '../utils/locationUtils.js';
import SafetyCard from '../components/SafetyCard.js';
import styles from '../styles/styles.js';

export default function GroupsScreen({ joinedGroups, setJoinedGroups, userGroups, setUserGroups, walkingGroups, groupsLoading, viewGroupRoute, getDirectionsToGroup }) {
  const [state, setState] = useState({ selectedGroup: null, showModal: false, joined: false, userLocation: null, showCreateModal: false, newGroupName: '', newGroupStart: '', newGroupStartCoords: null, newGroupDestination: '', newGroupDestCoords: null, newGroupDepartureMinutes: 10, activeCreateField: null, createSearchText: '', createSuggestions: [], isLoadingCreateSuggestions: false });
  const set = u => setState(s => ({ ...s, ...u }));
  const { selectedGroup, showModal, joined, userLocation, showCreateModal, newGroupName, newGroupStart, newGroupStartCoords, newGroupDestination, newGroupDestCoords, newGroupDepartureMinutes, activeCreateField, createSearchText, createSuggestions, isLoadingCreateSuggestions } = state;
  const searchTimeout = useRef(null);
  const allGroups = [...userGroups, ...walkingGroups];

  useEffect(() => { (async () => { const { status } = await Location.requestForegroundPermissionsAsync(); if (status === 'granted') { const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); set({ userLocation: { latitude: loc.coords.latitude, longitude: loc.coords.longitude } }); } })(); }, []);

  const getWalkingMinutes = (from, to) => { if (!from || !to) return Infinity; const lat1 = from.latitude * Math.PI / 180, lat2 = to.latitude * Math.PI / 180, dLat = lat2 - lat1, dLon = (to.longitude - from.longitude) * Math.PI / 180, a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2; return Math.ceil((6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3) / 80); };
  const getTimeRemaining = g => (!g || !g.createdAt || !g.departureMinutes) ? null : Math.max(0, Math.ceil((g.createdAt + g.departureMinutes * 60000 - Date.now()) / 60000));
  const filterGroupsByDistance = groups => !userLocation ? groups : groups.filter(g => !g.startCoords || getTimeRemaining(g) === null || getWalkingMinutes(userLocation, g.startCoords) <= getTimeRemaining(g));
  const isGroupJoined = id => joinedGroups.includes(id);
  const getMemberCount = g => g ? (Array.isArray(g.members) ? g.members.length : g.members || 1) : 0;
  const getReadyCount = g => g && Array.isArray(g.members) ? g.members.filter(m => m.isReady).length : 0;

  const handleCreateSearchChange = async text => { set({ createSearchText: text }); if (searchTimeout.current) clearTimeout(searchTimeout.current); if (text.length < 2) { set({ createSuggestions: [] }); return; } set({ isLoadingCreateSuggestions: true }); searchTimeout.current = setTimeout(async () => { set({ createSuggestions: await getAddressSuggestions(text), isLoadingCreateSuggestions: false }); }, 300); };

  const selectCreateLocation = async loc => {
    let coords = { latitude: loc.latitude, longitude: loc.longitude };
    const name = loc.shortName || loc.name;
    if (loc.needsGeocode || loc.isPreset) { const apiCoords = await geocodeLocation(name + ', Virginia Tech, Blacksburg, VA', VT_CENTER); if (apiCoords) coords = apiCoords; }
    set(activeCreateField === 'start' ? { newGroupStart: name, newGroupStartCoords: coords } : { newGroupDestination: name, newGroupDestCoords: coords });
    set({ activeCreateField: null, createSearchText: '', createSuggestions: [] });
  };

  const useMyLocationForCreate = async () => { try { const { status } = await Location.requestForegroundPermissionsAsync(); if (status === 'granted') { const loc = await Location.getCurrentPositionAsync({}); set({ newGroupStart: 'My Location', newGroupStartCoords: { latitude: loc.coords.latitude, longitude: loc.coords.longitude }, activeCreateField: null, createSearchText: '', createSuggestions: [] }); } } catch { alert('Could not get location'); } };

  const resetCreateModal = () => set({ showCreateModal: false, newGroupName: '', newGroupStart: '', newGroupStartCoords: null, newGroupDestination: '', newGroupDestCoords: null, newGroupDepartureMinutes: 10, activeCreateField: null, createSearchText: '', createSuggestions: [] });

  const handleJoin = () => {
    if (selectedGroup && !isGroupJoined(selectedGroup.id)) { setJoinedGroups([...joinedGroups, selectedGroup.id]); setUserGroups(userGroups.map(g => g.id === selectedGroup.id ? { ...g, members: [...(g.members || []), { id: 'currentUser', name: 'You', isReady: false, isCreator: false }] } : g)); }
    set({ joined: true });
    setTimeout(() => { set({ showModal: false, joined: false }); if (selectedGroup?.startCoords && getDirectionsToGroup) setTimeout(() => Alert.alert('Get Directions', `Get directions to meet ${selectedGroup.name}?`, [{ text: 'No Thanks', style: 'cancel' }, { text: 'Yes', onPress: () => getDirectionsToGroup(selectedGroup) }]), 300); }, 1500);
  };

  const handleLeave = id => { setJoinedGroups(joinedGroups.filter(i => i !== id)); set({ showModal: false }); };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupStart || !newGroupDestination) { alert('Please fill all fields'); return; }
    try { const docRef = await addDoc(collection(db, 'walkingGroups'), { name: newGroupName.trim(), startLocation: newGroupStart, startCoords: newGroupStartCoords, destination: newGroupDestination, destCoords: newGroupDestCoords, departureMinutes: newGroupDepartureMinutes, createdAt: Timestamp.now(), members: [{ id: 'currentUser', name: 'You', isReady: true, isCreator: true }], isUserCreated: true }); setJoinedGroups([...joinedGroups, docRef.id]); resetCreateModal(); } catch (e) { console.error('Error creating group:', e); Alert.alert('Error', 'Failed to create group'); }
  };

  const handleCheckIn = async id => { try { const group = allGroups.find(g => g.id === id); if (group && Array.isArray(group.members)) { await updateDoc(doc(db, 'walkingGroups', String(id)), { members: group.members.map(m => m.id === 'currentUser' ? { ...m, isReady: true } : m) }); alert("You've checked in!"); } } catch (e) { console.error('Error checking in:', e); } };

  const GroupCard = ({ group, isJoined }) => { const timeRemaining = getTimeRemaining(group), walkTime = userLocation && group.startCoords ? getWalkingMinutes(userLocation, group.startCoords) : null;
    return (<SafetyCard key={isJoined ? `j-${group.id}` : group.id} title={group.name} subtitle={isJoined ? `${getMemberCount(group)} members - ${getReadyCount(group)}/${getMemberCount(group)} ready` : `${getMemberCount(group)} members${walkTime ? ` - ${walkTime} min walk` : ''}`} icon={<Users color={isJoined ? COLORS.accent.info : COLORS.accent.success} size={24} />} color={isJoined ? COLORS.accent.info : COLORS.accent.success} onPress={() => set({ selectedGroup: group, joined: false, showModal: true })}>
      {timeRemaining !== null && <View style={styles.countdownBanner}><Clock color={COLORS.accent.primary} size={14} /><Text style={styles.countdownText}>{timeRemaining > 0 ? `Departing in ${timeRemaining} min` : 'Departing now!'}</Text></View>}
      <View style={styles.groupDetails}>{group.startLocation && <View style={styles.groupDetailItem}><Navigation color={COLORS.accent.success} size={16} /><Text style={styles.groupDetailText} numberOfLines={1}>From {group.startLocation}</Text></View>}<View style={styles.groupDetailItem}><MapPin color={COLORS.accent.danger} size={16} /><Text style={styles.groupDetailText} numberOfLines={1}>To {group.destination}</Text></View></View>
      <View style={styles.cardAction}>{isJoined ? <View style={styles.joinedBadge}><Check color={COLORS.accent.success} size={16} /><Text style={styles.joinedBadgeText}>Joined</Text></View> : <><Text style={[styles.cardActionText, { color: COLORS.accent.success }]}>Join Group</Text><ChevronRight color={COLORS.accent.success} size={20} /></>}</View>
    </SafetyCard>);
  };

  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Text style={[styles.screenTitle, { fontSize: 29 }]}>Walking Groups</Text><TouchableOpacity style={styles.createButton} onPress={() => set({ showCreateModal: true })}><Plus color={COLORS.text.primary} size={20} /><Text style={styles.createButtonText}>Create</Text></TouchableOpacity></View>
      <View style={styles.infoCard}><Users color={COLORS.accent.primary} size={24} /><View style={styles.infoCardContent}><Text style={styles.infoCardTitle}>Walk Together, Stay Safe</Text><Text style={styles.infoCardText}>Join a group heading your direction.</Text></View></View>

      {joinedGroups.length > 0 && <><Text style={styles.sectionTitle}>Your Groups</Text>{allGroups.filter(g => isGroupJoined(g.id)).map(g => <GroupCard key={`j-${g.id}`} group={g} isJoined />)}</>}
      <Text style={styles.sectionTitle}>Active Groups Near You</Text>
      {filterGroupsByDistance(allGroups.filter(g => !isGroupJoined(g.id))).map(g => <GroupCard key={g.id} group={g} />)}
      {allGroups.filter(g => !isGroupJoined(g.id)).length === 0 && <View style={styles.emptyState}><Text style={styles.emptyStateText}>You've joined all available groups!</Text></View>}
      <View style={{ height: 120 }} />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { maxHeight: '80%' }]}>
          <TouchableOpacity style={styles.modalClose} onPress={() => set({ showModal: false, joined: false })}><X color={COLORS.text.primary} size={24} /></TouchableOpacity>
          <Users color={isGroupJoined(selectedGroup?.id) ? COLORS.accent.info : COLORS.accent.success} size={56} />
          <Text style={styles.modalTitle}>{selectedGroup?.name}</Text>
          <Text style={styles.modalText}>{selectedGroup?.startLocation ? `${selectedGroup.startLocation} → ` : ''}{selectedGroup?.destination}</Text>
          {selectedGroup && <View style={styles.modalCountdown}><Clock color={COLORS.accent.primary} size={16} /><Text style={styles.modalCountdownText}>{getTimeRemaining(selectedGroup) > 0 ? `Departing in ${getTimeRemaining(selectedGroup)} min` : 'Departing now!'}</Text></View>}

          {isGroupJoined(selectedGroup?.id) ? (
            <ScrollView style={styles.memberListContainer} nestedScrollEnabled>
              <Text style={styles.memberListTitle}>Members</Text>
              {Array.isArray(selectedGroup?.members) ? selectedGroup.members.map((m, i) => <View key={`${i}-${m.id}`} style={styles.memberItem}><View style={styles.memberInfo}><User color={COLORS.text.muted} size={20} /><Text style={styles.memberName}>{m.name}{m.isCreator && ' (Creator)'}</Text></View><View style={[styles.memberStatus, m.isReady ? styles.memberStatusReady : styles.memberStatusWaiting]}>{m.isReady ? <Check color={COLORS.accent.success} size={16} /> : <Clock color={COLORS.accent.warning} size={16} />}<Text style={[styles.memberStatusText, m.isReady ? styles.memberStatusTextReady : styles.memberStatusTextWaiting]}>{m.isReady ? 'Ready' : 'Waiting'}</Text></View></View>) : <Text style={styles.memberSubtext}>{selectedGroup?.members || 1} member(s)</Text>}
              <TouchableOpacity style={styles.imHereButton} onPress={() => handleCheckIn(selectedGroup?.id)}><Check color={COLORS.text.primary} size={20} /><Text style={styles.imHereButtonText}>I'm Here!</Text></TouchableOpacity>
              {selectedGroup?.startCoords && selectedGroup?.destCoords && <TouchableOpacity style={styles.viewRouteButton} onPress={() => { set({ showModal: false }); viewGroupRoute(selectedGroup); }}><Navigation color={COLORS.accent.info} size={20} /><Text style={styles.viewRouteButtonText}>View Route on Map</Text></TouchableOpacity>}
              <TouchableOpacity style={[styles.joinButton, { backgroundColor: 'rgba(255, 59, 48, 0.15)', marginTop: 12 }]} onPress={() => handleLeave(selectedGroup?.id)}><Text style={[styles.joinButtonText, { color: COLORS.accent.danger }]}>Leave Group</Text></TouchableOpacity>
            </ScrollView>
          ) : joined ? (<View style={styles.joinedContainer}><Check color={COLORS.accent.success} size={32} /><Text style={styles.joinedText}>You've joined!</Text></View>) : (<><Text style={styles.modalSubtext}>{getMemberCount(selectedGroup)} people in group</Text><TouchableOpacity style={styles.joinButton} onPress={handleJoin}><Text style={styles.joinButtonText}>Join Group</Text></TouchableOpacity></>)}
        </View></View>
      </Modal>

      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { maxHeight: '85%' }]}>
          <TouchableOpacity style={styles.modalClose} onPress={resetCreateModal}><X color={COLORS.text.primary} size={24} /></TouchableOpacity>
          {!activeCreateField ? (<>
            <Plus color={COLORS.accent.primary} size={56} /><Text style={styles.modalTitle}>Create Walking Group</Text><Text style={styles.modalSubtext}>Start a group and others can join</Text>
            <View style={styles.createFormContainer}>
              <Text style={styles.createFormLabel}>Group Name</Text><TextInput style={styles.createFormInput} placeholder="e.g., Late Night Crew" placeholderTextColor={COLORS.text.muted} value={newGroupName} onChangeText={t => set({ newGroupName: t })} />
              <Text style={styles.createFormLabel}>Starting Location</Text><TouchableOpacity style={[styles.createFormInput, styles.createFormInputRow]} onPress={() => set({ activeCreateField: 'start' })}><View style={[styles.routeDot, { backgroundColor: COLORS.accent.success }]} /><Text style={newGroupStart ? styles.createFormInputText : styles.createFormPlaceholder}>{newGroupStart || 'Where are you starting?'}</Text></TouchableOpacity>
              <Text style={styles.createFormLabel}>Destination</Text><TouchableOpacity style={[styles.createFormInput, styles.createFormInputRow]} onPress={() => set({ activeCreateField: 'destination' })}><View style={[styles.routeDot, { backgroundColor: COLORS.accent.danger }]} /><Text style={newGroupDestination ? styles.createFormInputText : styles.createFormPlaceholder}>{newGroupDestination || 'Where are you heading?'}</Text></TouchableOpacity>
              <Text style={styles.createFormLabel}>Departure Time</Text><View style={styles.departureTimeContainer}>{[5, 10, 15, 20].map(m => <TouchableOpacity key={m} style={[styles.departureTimeOption, newGroupDepartureMinutes === m && styles.departureTimeOptionActive]} onPress={() => set({ newGroupDepartureMinutes: m })}><Text style={[styles.departureTimeText, newGroupDepartureMinutes === m && styles.departureTimeTextActive]}>{m} min</Text></TouchableOpacity>)}</View><Text style={styles.departureTimeHint}>Only nearby users will see your group</Text>
            </View>
            <TouchableOpacity style={[styles.joinButton, { backgroundColor: COLORS.accent.primary }]} onPress={handleCreateGroup}><Text style={styles.joinButtonText}>Create Group</Text></TouchableOpacity>
          </>) : (<>
            <View style={styles.createLocationHeader}><TouchableOpacity onPress={() => set({ activeCreateField: null, createSearchText: '', createSuggestions: [] })}><ChevronRight color={COLORS.text.primary} size={24} style={{ transform: [{ rotate: '180deg' }] }} /></TouchableOpacity><Text style={styles.createLocationTitle}>{activeCreateField === 'start' ? 'Starting Location' : 'Destination'}</Text><View style={{ width: 24 }} /></View>
            <View style={styles.searchInputContainer}><Search color={COLORS.text.muted} size={20} /><TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor={COLORS.text.muted} value={createSearchText} onChangeText={handleCreateSearchChange} autoFocus />{isLoadingCreateSuggestions && <Text style={styles.loadingText}>...</Text>}</View>
            <ScrollView style={styles.createLocationList} nestedScrollEnabled>
              {activeCreateField === 'start' && <TouchableOpacity style={styles.myLocationItem} onPress={useMyLocationForCreate}><Crosshair color={COLORS.accent.info} size={22} /><Text style={styles.myLocationText}>Use My Location</Text></TouchableOpacity>}
              {createSuggestions.filter(s => s.isPreset).map((loc, i) => <TouchableOpacity key={`p-${i}`} style={[styles.destinationPickerItem, styles.presetMatchItem]} onPress={() => selectCreateLocation(loc)}><MapPin color={COLORS.accent.primary} size={18} /><Text style={styles.destinationPickerText}>{loc.name}</Text><Check color={COLORS.accent.success} size={16} /></TouchableOpacity>)}
              {createSuggestions.filter(s => !s.isPreset).map((loc, i) => <TouchableOpacity key={`o-${i}`} style={styles.destinationPickerItem} onPress={() => selectCreateLocation(loc)}><Search color={COLORS.text.muted} size={18} /><Text style={styles.destinationPickerText}>{loc.shortName || loc.name}</Text></TouchableOpacity>)}
              <Text style={styles.locationSectionTitle}>VT Campus Locations</Text>
              {VT_LOCATIONS.map((loc, i) => <TouchableOpacity key={`vt-${i}`} style={styles.destinationPickerItem} onPress={() => selectCreateLocation({ name: loc.name, shortName: loc.name, latitude: loc.latitude, longitude: loc.longitude, isPreset: true })}><MapPin color={COLORS.accent.primary} size={18} /><Text style={styles.destinationPickerText}>{loc.name}</Text></TouchableOpacity>)}
            </ScrollView>
          </>)}
        </View></View>
      </Modal>
    </ScrollView>
  );
}
