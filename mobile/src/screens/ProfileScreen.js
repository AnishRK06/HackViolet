// Profile Screen
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { User, Phone, Bell, Shield, HelpCircle, Map, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../theme.js';
import styles from '../styles/styles.js';

export default function ProfileScreen({ showActivityZones, setShowActivityZones, showLegend, setShowLegend }) {
  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <User color={COLORS.text.primary} size={40} />
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
          <View style={styles.settingIcon}>
            <Phone color={COLORS.accent.danger} size={22} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Campus Police</Text>
            <Text style={styles.settingSubtitle}>540-231-6411</Text>
          </View>
          <ChevronRight color={COLORS.text.muted} size={20} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Map Settings</Text>
      <View style={styles.settingsCard}>
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Text style={{ fontSize: 18 }}>⚠️</Text>
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Activity Zones</Text>
            <Text style={styles.settingSubtitle}>Show danger zones on map</Text>
          </View>
          <Switch
            value={showActivityZones}
            onValueChange={setShowActivityZones}
            trackColor={{ false: COLORS.text.muted, true: COLORS.accent.primary }}
            thumbColor={COLORS.text.primary}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Map color={COLORS.accent.info} size={22} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Map Legend</Text>
            <Text style={styles.settingSubtitle}>Show legend on map</Text>
          </View>
          <Switch
            value={showLegend}
            onValueChange={setShowLegend}
            trackColor={{ false: COLORS.text.muted, true: COLORS.accent.primary }}
            thumbColor={COLORS.text.primary}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.settingsCard}>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Bell color={COLORS.accent.info} size={22} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Notifications</Text>
            <Text style={styles.settingSubtitle}>Safety alerts and updates</Text>
          </View>
          <ChevronRight color={COLORS.text.muted} size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Shield color={COLORS.accent.primary} size={22} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Safety Tips</Text>
            <Text style={styles.settingSubtitle}>Campus safety guidelines</Text>
          </View>
          <ChevronRight color={COLORS.text.muted} size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <HelpCircle color={COLORS.text.secondary} size={22} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Help & Support</Text>
            <Text style={styles.settingSubtitle}>FAQs and contact us</Text>
          </View>
          <ChevronRight color={COLORS.text.muted} size={20} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}
