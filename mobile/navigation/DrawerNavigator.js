import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { Home, Phone, Shield, Settings, HelpCircle, AlertTriangle, X } from 'lucide-react-native';
import TabNavigator from './TabNavigator';
import { COLORS } from '../theme';

const Drawer = createDrawerNavigator();

const DrawerItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
    {icon}
    <Text style={styles.drawerItemText}>{label}</Text>
  </TouchableOpacity>
);

const Section = ({ label, children }) => (
  <View style={styles.drawerSection}>
    {label && <Text style={styles.sectionLabel}>{label}</Text>}
    {children}
  </View>
);

function CustomDrawerContent({ navigation }) {
  const navTo = (screen) => { navigation.navigate('MainTabs', { screen }); navigation.closeDrawer(); };

  return (
    <DrawerContentScrollView style={styles.drawerContent}>
      <View style={styles.drawerHeader}>
        <View style={styles.logoContainer}>
          <Shield color={COLORS.accent.primary} size={32} />
          <Text style={styles.logoText}>Lumina</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.closeDrawer()}><X color={COLORS.text.secondary} size={24} /></TouchableOpacity>
      </View>

      <Section label="Navigation">
        <DrawerItem icon={<Home color={COLORS.text.primary} size={22} />} label="Home" onPress={() => navTo('Home')} />
      </Section>
      <Section label="Emergency">
        <DrawerItem icon={<Phone color={COLORS.accent.danger} size={22} />} label="Emergency Contacts" onPress={() => {}} />
        <DrawerItem icon={<AlertTriangle color={COLORS.accent.primary} size={22} />} label="Report Incident" onPress={() => {}} />
      </Section>
      <Section label="Resources">
        <DrawerItem icon={<Shield color={COLORS.accent.info} size={22} />} label="Safety Tips" onPress={() => {}} />
        <DrawerItem icon={<HelpCircle color={COLORS.text.secondary} size={22} />} label="Help & Support" onPress={() => {}} />
      </Section>
      <Section>
        <DrawerItem icon={<Settings color={COLORS.text.secondary} size={22} />} label="Settings" onPress={() => navTo('Profile')} />
      </Section>

      <View style={styles.drawerFooter}>
        <Text style={styles.footerText}>Lumina v1.0</Text>
        <Text style={styles.footerSubtext}>VT Campus Safety</Text>
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator drawerContent={(props) => <CustomDrawerContent {...props} />} screenOptions={{ headerShown: false, drawerStyle: styles.drawer, drawerType: 'front', overlayColor: COLORS.overlay }}>
      <Drawer.Screen name="MainTabs" component={TabNavigator} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawer: { backgroundColor: COLORS.bg.primary, width: 280 },
  drawerContent: { flex: 1 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoText: { fontSize: 24, fontWeight: 'bold', color: COLORS.accent.primary },
  drawerSection: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  sectionLabel: { fontSize: 12, color: COLORS.text.muted, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  drawerItemText: { fontSize: 16, color: COLORS.text.primary },
  drawerFooter: { padding: 20, marginTop: 'auto' },
  footerText: { fontSize: 14, color: COLORS.text.muted },
  footerSubtext: { fontSize: 12, color: COLORS.text.dark, marginTop: 2 },
});
