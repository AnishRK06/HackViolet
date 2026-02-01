// Home Screen
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { Shield, Bell, MapPin, Users, Phone, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../theme.js';
import { BLUE_LIGHTS } from '../../constants.js';
import { getDistanceMeters, formatDistance } from '../utils/helpers.js';
import SafetyCard from '../components/SafetyCard.js';
import IncidentFeedScreen from './IncidentFeedScreen.js';
import styles from '../styles/styles.js';

export default function HomeScreen({ setActiveTab, getDirectionsToBlueLight, walkingGroups = [], incidents = [] }) {
  const [nearbyBlueLight, setNearbyBlueLight] = useState(null);
  const [showIncidentFeed, setShowIncidentFeed] = useState(false);
  const activeIncidentCount = incidents.filter(i => (Date.now() - i.createdAt) < 24 * 3600000).length;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const userCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          let closest = null, minDist = Infinity;
          BLUE_LIGHTS.forEach(bl => {
            const dist = getDistanceMeters(userCoords, { latitude: bl.latitude, longitude: bl.longitude });
            if (dist < minDist) { minDist = dist; closest = { ...bl, distanceMeters: dist, userCoords }; }
          });
          setNearbyBlueLight(closest);
        }
      } catch (e) {
        console.log('Location error:', e);
      }
    })();
  }, []);

  if (showIncidentFeed) {
    return <IncidentFeedScreen onBack={() => setShowIncidentFeed(false)} />;
  }

  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Shield color={COLORS.accent.primary} size={32} />
          <View>
            <Text style={styles.headerTitle}>Lumina</Text>
            <Text style={styles.headerSubtitle}>VT Campus Safety</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationButton} onPress={() => setShowIncidentFeed(true)}>
          <Bell color={COLORS.text.primary} size={24} />
          {activeIncidentCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{activeIncidentCount}</Text>
            </View>
          )}
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
          <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(30, 64, 175, 0.15)' }]}>
            <MapPin color="#1E40AF" size={24} />
          </View>
          <Text style={styles.quickActionText}>Find Blue{'\n'}Light</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('groups')}>
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.accent.success + '20' }]}>
            <Users color={COLORS.accent.success} size={24} />
          </View>
          <Text style={styles.quickActionText}>Join{'\n'}Group</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('sos')}>
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.accent.primary + '20' }]}>
            <Phone color={COLORS.accent.primary} size={24} />
          </View>
          <Text style={styles.quickActionText}>Emergency{'\n'}Contacts</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Nearby Safety</Text>
      <SafetyCard
        title={nearbyBlueLight?.name || 'Locating...'}
        subtitle={nearbyBlueLight ? `Blue Light Station - ${formatDistance(nearbyBlueLight.distanceMeters)} away` : 'Finding nearest blue light...'}
        icon={<MapPin color="#1E40AF" size={24} />}
        color="#1E40AF"
        onPress={() => nearbyBlueLight && getDirectionsToBlueLight(nearbyBlueLight)}
      >
        <View style={styles.cardAction}>
          <Text style={styles.cardActionText}>Get Directions</Text>
          <ChevronRight color={COLORS.text.secondary} size={20} />
        </View>
      </SafetyCard>

      <Text style={styles.sectionTitle}>Active Walking Groups</Text>
      {walkingGroups.slice(0, 2).map((group) => (
        <SafetyCard
          key={group.id}
          title={group.name}
          subtitle={`${Array.isArray(group.members) ? group.members.length : group.members || 1} people - ${group.time}`}
          icon={<Users color={COLORS.accent.success} size={24} />}
          color={COLORS.accent.success}
          onPress={() => setActiveTab('groups')}
        >
          <View style={styles.cardAction}>
            <Text style={styles.cardActionText}>Join Group</Text>
            <ChevronRight color={COLORS.text.secondary} size={20} />
          </View>
        </SafetyCard>
      ))}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}
