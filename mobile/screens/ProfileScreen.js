import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, MapPin, Shield, Phone, ChevronRight, Moon, Share2, HelpCircle, LogOut } from 'lucide-react-native';
import { COLORS } from '../theme';

const SettingItem = ({ icon, title, subtitle, onPress, rightElement }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress}>
    <View style={styles.settingIcon}>{icon}</View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || <ChevronRight color={COLORS.text.muted} size={20} />}
  </TouchableOpacity>
);

const StatItem = ({ number, label }) => (
  <View style={styles.statItem}>
    <Text style={styles.statNumber}>{number}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ToggleSetting = ({ icon, title, subtitle, value, onValueChange }) => (
  <SettingItem icon={icon} title={title} subtitle={subtitle} rightElement={
    <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#3e3e3e', true: COLORS.accent.success }} />
  } />
);

export default function ProfileScreen() {
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}><User color={COLORS.text.primary} size={40} /></View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Hokie User</Text>
            <Text style={styles.profileEmail}>hokie@vt.edu</Text>
          </View>
          <TouchableOpacity style={styles.editButton}><Text style={styles.editButtonText}>Edit</Text></TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <StatItem number="12" label="Safe Walks" />
          <View style={styles.statDivider} />
          <StatItem number="5" label="Groups Joined" />
          <View style={styles.statDivider} />
          <StatItem number="3" label="Groups Created" />
        </View>

        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <View style={styles.settingsCard}>
          <SettingItem icon={<Phone color={COLORS.accent.danger} size={22} />} title="Campus Police" subtitle="540-231-6411" />
          <SettingItem icon={<Phone color={COLORS.accent.primary} size={22} />} title="Personal Emergency Contact" subtitle="Add a contact" />
        </View>

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingsCard}>
          <ToggleSetting icon={<Bell color={COLORS.accent.info} size={22} />} title="Notifications" subtitle="Safety alerts and updates" value={notifications} onValueChange={setNotifications} />
          <ToggleSetting icon={<MapPin color={COLORS.accent.success} size={22} />} title="Location Sharing" subtitle="Share with walking groups" value={locationSharing} onValueChange={setLocationSharing} />
          <ToggleSetting icon={<Moon color="#8B5CF6" size={22} />} title="Dark Mode" subtitle="Always on for safety" value={darkMode} onValueChange={setDarkMode} />
        </View>

        <Text style={styles.sectionTitle}>More</Text>
        <View style={styles.settingsCard}>
          <SettingItem icon={<Shield color={COLORS.accent.primary} size={22} />} title="Safety Tips" subtitle="Campus safety guidelines" />
          <SettingItem icon={<Share2 color={COLORS.accent.info} size={22} />} title="Share Lumina" subtitle="Help keep friends safe" />
          <SettingItem icon={<HelpCircle color={COLORS.text.secondary} size={22} />} title="Help & Support" subtitle="FAQs and contact us" />
        </View>

        <TouchableOpacity style={styles.logoutButton}>
          <LogOut color={COLORS.accent.danger} size={20} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text.primary, marginTop: 10, marginBottom: 20 },
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
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.secondary, marginBottom: 12, marginTop: 8 },
  settingsCard: { backgroundColor: COLORS.bg.card, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  settingIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 16, color: COLORS.text.primary },
  settingSubtitle: { fontSize: 13, color: COLORS.text.muted, marginTop: 2 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 8, gap: 8 },
  logoutText: { color: COLORS.accent.danger, fontSize: 16, fontWeight: '500' },
});
