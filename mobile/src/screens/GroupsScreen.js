// Groups Screen
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
  const createSearchTimeoutRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    })();
  }, []);

  const getWalkingMinutes = (from, to) => {
    if (!from || !to) return Infinity;
    const lat1 = from.latitude * Math.PI / 180, lat2 = to.latitude * Math.PI / 180;
    const dLat = lat2 - lat1, dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return Math.ceil((6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3) / 80);
  };

  const getTimeRemaining = (group) => {
    if (!group.createdAt || !group.departureMinutes) return null;
    const remaining = Math.ceil((group.createdAt + group.departureMinutes * 60000 - Date.now()) / 60000);
    return remaining > 0 ? remaining : 0;
  };

  const filterGroupsByDistance = (groups) => !userLocation ? groups : groups.filter(g =>
    !g.startCoords || getTimeRemaining(g) === null || getWalkingMinutes(userLocation, g.startCoords) <= getTimeRemaining(g)
  );

  const isGroupJoined = (groupId) => joinedGroups.includes(groupId);

  const handleCreateSearchChange = async (text) => {
    setCreateSearchText(text);
    if (createSearchTimeoutRef.current) clearTimeout(createSearchTimeoutRef.current);
    if (text.length < 2) { setCreateSuggestions([]); return; }
    setIsLoadingCreateSuggestions(true);
    createSearchTimeoutRef.current = setTimeout(async () => {
      setCreateSuggestions(await getAddressSuggestions(text));
      setIsLoadingCreateSuggestions(false);
    }, 300);
  };

  const selectCreateLocation = async (loc) => {
    let coords = { latitude: loc.latitude, longitude: loc.longitude };
    const name = loc.shortName || loc.name;
    if (loc.needsGeocode || loc.isPreset) {
      const apiCoords = await geocodeLocation(name + ', Virginia Tech, Blacksburg, VA', VT_CENTER);
      if (apiCoords) coords = apiCoords;
    }
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

  const useMyLocationForCreate = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setNewGroupStart('My Location');
        setNewGroupStartCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setActiveCreateField(null);
        setCreateSearchText('');
        setCreateSuggestions([]);
      }
    } catch (e) {
      alert('Could not get location');
    }
  };

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
      setUserGroups(userGroups.map(g => g.id === selectedGroup.id
        ? { ...g, members: [...(g.members || []), { id: 'currentUser', name: 'You', isReady: false, isCreator: false }] }
        : g
      ));
    }
    setJoined(true);
    setTimeout(() => {
      setShowModal(false);
      setJoined(false);
      if (selectedGroup?.startCoords && getDirectionsToGroup) {
        setTimeout(() => Alert.alert(
          'Get Directions',
          `Get directions to meet ${selectedGroup.name}?`,
          [
            { text: 'No Thanks', style: 'cancel' },
            { text: 'Yes', onPress: () => getDirectionsToGroup(selectedGroup) }
          ]
        ), 300);
      }
    }, 1500);
  };

  const handleLeave = (groupId) => {
    setJoinedGroups(joinedGroups.filter(id => id !== groupId));
    setShowModal(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupStart || !newGroupDestination) {
      alert('Please fill all fields');
      return;
    }
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
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const handleCheckIn = async (groupId) => {
    try {
      const group = allGroups.find(g => g.id === groupId);
      if (group && Array.isArray(group.members)) {
        const updatedMembers = group.members.map(m => m.id === 'currentUser' ? { ...m, isReady: true } : m);
        await updateDoc(doc(db, 'walkingGroups', String(groupId)), { members: updatedMembers });
        alert("You've checked in!");
      }
    } catch (error) {
      console.error('Error checking in:', error);
    }
  };

  const allGroups = [...userGroups, ...walkingGroups];

  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { fontSize: 29 }]}>Walking Groups</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
          <Plus color={COLORS.text.primary} size={20} />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Users color={COLORS.accent.primary} size={24} />
        <View style={styles.infoCardContent}>
          <Text style={styles.infoCardTitle}>Walk Together, Stay Safe</Text>
          <Text style={styles.infoCardText}>Join a group heading your direction.</Text>
        </View>
      </View>

      {joinedGroups.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Your Groups</Text>
          {allGroups.filter(g => isGroupJoined(g.id)).map(group => {
            const timeRemaining = getTimeRemaining(group);
            const memberCount = Array.isArray(group.members) ? group.members.length : group.members || 1;
            const readyCount = Array.isArray(group.members) ? group.members.filter(m => m.isReady).length : 0;
            return (
              <SafetyCard
                key={`j-${group.id}`}
                title={group.name}
                subtitle={`${memberCount} members - ${readyCount}/${memberCount} ready`}
                icon={<Users color={COLORS.accent.info} size={24} />}
                color={COLORS.accent.info}
                onPress={() => { setSelectedGroup(group); setShowModal(true); }}
              >
                {timeRemaining !== null && (
                  <View style={styles.countdownBanner}>
                    <Clock color={COLORS.accent.primary} size={14} />
                    <Text style={styles.countdownText}>
                      {timeRemaining > 0 ? `Departing in ${timeRemaining} min` : 'Departing now!'}
                    </Text>
                  </View>
                )}
                <View style={styles.groupDetails}>
                  {group.startLocation && (
                    <View style={styles.groupDetailItem}>
                      <Navigation color={COLORS.accent.success} size={16} />
                      <Text style={styles.groupDetailText} numberOfLines={1}>From {group.startLocation}</Text>
                    </View>
                  )}
                  <View style={styles.groupDetailItem}>
                    <MapPin color={COLORS.accent.danger} size={16} />
                    <Text style={styles.groupDetailText} numberOfLines={1}>To {group.destination}</Text>
                  </View>
                </View>
                <View style={styles.cardAction}>
                  <View style={styles.joinedBadge}>
                    <Check color={COLORS.accent.success} size={16} />
                    <Text style={styles.joinedBadgeText}>Joined</Text>
                  </View>
                </View>
              </SafetyCard>
            );
          })}
        </>
      )}

      <Text style={styles.sectionTitle}>Active Groups Near You</Text>
      {filterGroupsByDistance(allGroups.filter(g => !isGroupJoined(g.id))).map(group => {
        const timeRemaining = getTimeRemaining(group);
        const memberCount = Array.isArray(group.members) ? group.members.length : group.members || 1;
        const walkTime = userLocation && group.startCoords ? getWalkingMinutes(userLocation, group.startCoords) : null;
        return (
          <SafetyCard
            key={group.id}
            title={group.name}
            subtitle={`${memberCount} members${walkTime ? ` - ${walkTime} min walk` : ''}`}
            icon={<Users color={COLORS.accent.success} size={24} />}
            color={COLORS.accent.success}
            onPress={() => { setSelectedGroup(group); setJoined(false); setShowModal(true); }}
          >
            {timeRemaining !== null && (
              <View style={styles.countdownBanner}>
                <Clock color={COLORS.accent.primary} size={14} />
                <Text style={styles.countdownText}>
                  {timeRemaining > 0 ? `Departing in ${timeRemaining} min` : 'Departing now!'}
                </Text>
              </View>
            )}
            <View style={styles.groupDetails}>
              {group.startLocation && (
                <View style={styles.groupDetailItem}>
                  <Navigation color={COLORS.accent.success} size={16} />
                  <Text style={styles.groupDetailText} numberOfLines={1}>From {group.startLocation}</Text>
                </View>
              )}
              <View style={styles.groupDetailItem}>
                <MapPin color={COLORS.accent.danger} size={16} />
                <Text style={styles.groupDetailText} numberOfLines={1}>To {group.destination}</Text>
              </View>
            </View>
            <View style={styles.cardAction}>
              <Text style={[styles.cardActionText, { color: COLORS.accent.success }]}>Join Group</Text>
              <ChevronRight color={COLORS.accent.success} size={20} />
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

      {/* Group Detail Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => { setShowModal(false); setJoined(false); }}>
              <X color={COLORS.text.primary} size={24} />
            </TouchableOpacity>
            <Users color={isGroupJoined(selectedGroup?.id) ? COLORS.accent.info : COLORS.accent.success} size={56} />
            <Text style={styles.modalTitle}>{selectedGroup?.name}</Text>
            <Text style={styles.modalText}>
              {selectedGroup?.startLocation ? `${selectedGroup.startLocation} → ` : ''}{selectedGroup?.destination}
            </Text>

            {selectedGroup && (
              <View style={styles.modalCountdown}>
                <Clock color={COLORS.accent.primary} size={16} />
                <Text style={styles.modalCountdownText}>
                  {getTimeRemaining(selectedGroup) > 0 ? `Departing in ${getTimeRemaining(selectedGroup)} min` : 'Departing now!'}
                </Text>
              </View>
            )}

            {isGroupJoined(selectedGroup?.id) ? (
              <ScrollView style={styles.memberListContainer} nestedScrollEnabled>
                <Text style={styles.memberListTitle}>Members</Text>
                {Array.isArray(selectedGroup?.members) ? selectedGroup.members.map((m, i) => (
                  <View key={`${i}-${m.id}`} style={styles.memberItem}>
                    <View style={styles.memberInfo}>
                      <User color={COLORS.text.muted} size={20} />
                      <Text style={styles.memberName}>{m.name}{m.isCreator && ' (Creator)'}</Text>
                    </View>
                    <View style={[styles.memberStatus, m.isReady ? styles.memberStatusReady : styles.memberStatusWaiting]}>
                      {m.isReady ? <Check color={COLORS.accent.success} size={16} /> : <Clock color={COLORS.accent.warning} size={16} />}
                      <Text style={[styles.memberStatusText, m.isReady ? styles.memberStatusTextReady : styles.memberStatusTextWaiting]}>
                        {m.isReady ? 'Ready' : 'Waiting'}
                      </Text>
                    </View>
                  </View>
                )) : <Text style={styles.memberSubtext}>{selectedGroup?.members || 1} member(s)</Text>}

                <TouchableOpacity style={styles.imHereButton} onPress={() => handleCheckIn(selectedGroup?.id)}>
                  <Check color={COLORS.text.primary} size={20} />
                  <Text style={styles.imHereButtonText}>I'm Here!</Text>
                </TouchableOpacity>

                {selectedGroup?.startCoords && selectedGroup?.destCoords && (
                  <TouchableOpacity style={styles.viewRouteButton} onPress={() => { setShowModal(false); viewGroupRoute(selectedGroup); }}>
                    <Navigation color={COLORS.accent.info} size={20} />
                    <Text style={styles.viewRouteButtonText}>View Route on Map</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.joinButton, { backgroundColor: 'rgba(255, 59, 48, 0.15)', marginTop: 12 }]}
                  onPress={() => handleLeave(selectedGroup?.id)}
                >
                  <Text style={[styles.joinButtonText, { color: COLORS.accent.danger }]}>Leave Group</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : joined ? (
              <View style={styles.joinedContainer}>
                <Check color={COLORS.accent.success} size={32} />
                <Text style={styles.joinedText}>You've joined!</Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalSubtext}>
                  {Array.isArray(selectedGroup?.members) ? selectedGroup.members.length : selectedGroup?.members || 1} people in group
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
              <X color={COLORS.text.primary} size={24} />
            </TouchableOpacity>

            {!activeCreateField ? (
              <>
                <Plus color={COLORS.accent.primary} size={56} />
                <Text style={styles.modalTitle}>Create Walking Group</Text>
                <Text style={styles.modalSubtext}>Start a group and others can join</Text>

                <View style={styles.createFormContainer}>
                  <Text style={styles.createFormLabel}>Group Name</Text>
                  <TextInput
                    style={styles.createFormInput}
                    placeholder="e.g., Late Night Crew"
                    placeholderTextColor={COLORS.text.muted}
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                  />

                  <Text style={styles.createFormLabel}>Starting Location</Text>
                  <TouchableOpacity
                    style={[styles.createFormInput, styles.createFormInputRow]}
                    onPress={() => setActiveCreateField('start')}
                  >
                    <View style={[styles.routeDot, { backgroundColor: COLORS.accent.success }]} />
                    <Text style={newGroupStart ? styles.createFormInputText : styles.createFormPlaceholder}>
                      {newGroupStart || 'Where are you starting?'}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.createFormLabel}>Destination</Text>
                  <TouchableOpacity
                    style={[styles.createFormInput, styles.createFormInputRow]}
                    onPress={() => setActiveCreateField('destination')}
                  >
                    <View style={[styles.routeDot, { backgroundColor: COLORS.accent.danger }]} />
                    <Text style={newGroupDestination ? styles.createFormInputText : styles.createFormPlaceholder}>
                      {newGroupDestination || 'Where are you heading?'}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.createFormLabel}>Departure Time</Text>
                  <View style={styles.departureTimeContainer}>
                    {[5, 10, 15, 20].map(mins => (
                      <TouchableOpacity
                        key={mins}
                        style={[styles.departureTimeOption, newGroupDepartureMinutes === mins && styles.departureTimeOptionActive]}
                        onPress={() => setNewGroupDepartureMinutes(mins)}
                      >
                        <Text style={[styles.departureTimeText, newGroupDepartureMinutes === mins && styles.departureTimeTextActive]}>
                          {mins} min
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.departureTimeHint}>Only nearby users will see your group</Text>
                </View>

                <TouchableOpacity style={[styles.joinButton, { backgroundColor: COLORS.accent.primary }]} onPress={handleCreateGroup}>
                  <Text style={styles.joinButtonText}>Create Group</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.createLocationHeader}>
                  <TouchableOpacity onPress={() => { setActiveCreateField(null); setCreateSearchText(''); setCreateSuggestions([]); }}>
                    <ChevronRight color={COLORS.text.primary} size={24} style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                  <Text style={styles.createLocationTitle}>
                    {activeCreateField === 'start' ? 'Starting Location' : 'Destination'}
                  </Text>
                  <View style={{ width: 24 }} />
                </View>

                <View style={styles.searchInputContainer}>
                  <Search color={COLORS.text.muted} size={20} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search..."
                    placeholderTextColor={COLORS.text.muted}
                    value={createSearchText}
                    onChangeText={handleCreateSearchChange}
                    autoFocus
                  />
                  {isLoadingCreateSuggestions && <Text style={styles.loadingText}>...</Text>}
                </View>

                <ScrollView style={styles.createLocationList} nestedScrollEnabled>
                  {activeCreateField === 'start' && (
                    <TouchableOpacity style={styles.myLocationItem} onPress={useMyLocationForCreate}>
                      <Crosshair color={COLORS.accent.info} size={22} />
                      <Text style={styles.myLocationText}>Use My Location</Text>
                    </TouchableOpacity>
                  )}

                  {createSuggestions.filter(s => s.isPreset).map((loc, i) => (
                    <TouchableOpacity
                      key={`p-${i}`}
                      style={[styles.destinationPickerItem, styles.presetMatchItem]}
                      onPress={() => selectCreateLocation(loc)}
                    >
                      <MapPin color={COLORS.accent.primary} size={18} />
                      <Text style={styles.destinationPickerText}>{loc.name}</Text>
                      <Check color={COLORS.accent.success} size={16} />
                    </TouchableOpacity>
                  ))}

                  {createSuggestions.filter(s => !s.isPreset).map((loc, i) => (
                    <TouchableOpacity
                      key={`o-${i}`}
                      style={styles.destinationPickerItem}
                      onPress={() => selectCreateLocation(loc)}
                    >
                      <Search color={COLORS.text.muted} size={18} />
                      <Text style={styles.destinationPickerText}>{loc.shortName || loc.name}</Text>
                    </TouchableOpacity>
                  ))}

                  <Text style={styles.locationSectionTitle}>VT Campus Locations</Text>
                  {VT_LOCATIONS.map((loc, i) => (
                    <TouchableOpacity
                      key={`vt-${i}`}
                      style={styles.destinationPickerItem}
                      onPress={() => selectCreateLocation({ name: loc.name, shortName: loc.name, latitude: loc.latitude, longitude: loc.longitude, isPreset: true })}
                    >
                      <MapPin color={COLORS.accent.primary} size={18} />
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
