import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import {
  Home,
  Phone,
  Shield,
  Settings,
  HelpCircle,
  AlertTriangle,
  X,
} from 'lucide-react-native';

import TabNavigator from './TabNavigator';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const { navigation } = props;

  const DrawerItem = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
      {icon}
      <Text style={styles.drawerItemText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <DrawerContentScrollView {...props} style={styles.drawerContent}>
      <View style={styles.drawerHeader}>
        <View style={styles.logoContainer}>
          <Shield color="#FF6B35" size={32} />
          <Text style={styles.logoText}>Lumina</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.closeDrawer()}>
          <X color="#8892b0" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.drawerSection}>
        <Text style={styles.sectionLabel}>Navigation</Text>
        <DrawerItem
          icon={<Home color="#fff" size={22} />}
          label="Home"
          onPress={() => {
            navigation.navigate('MainTabs', { screen: 'Home' });
            navigation.closeDrawer();
          }}
        />
      </View>

      <View style={styles.drawerSection}>
        <Text style={styles.sectionLabel}>Emergency</Text>
        <DrawerItem
          icon={<Phone color="#FF3B30" size={22} />}
          label="Emergency Contacts"
          onPress={() => {}}
        />
        <DrawerItem
          icon={<AlertTriangle color="#FF6B35" size={22} />}
          label="Report Incident"
          onPress={() => {}}
        />
      </View>

      <View style={styles.drawerSection}>
        <Text style={styles.sectionLabel}>Resources</Text>
        <DrawerItem
          icon={<Shield color="#007AFF" size={22} />}
          label="Safety Tips"
          onPress={() => {}}
        />
        <DrawerItem
          icon={<HelpCircle color="#8892b0" size={22} />}
          label="Help & Support"
          onPress={() => {}}
        />
      </View>

      <View style={styles.drawerSection}>
        <DrawerItem
          icon={<Settings color="#8892b0" size={22} />}
          label="Settings"
          onPress={() => {
            navigation.navigate('MainTabs', { screen: 'Profile' });
            navigation.closeDrawer();
          }}
        />
      </View>

      <View style={styles.drawerFooter}>
        <Text style={styles.footerText}>Lumina v1.0</Text>
        <Text style={styles.footerSubtext}>VT Campus Safety</Text>
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: styles.drawer,
        drawerType: 'front',
        overlayColor: 'rgba(0, 0, 0, 0.7)',
      }}
    >
      <Drawer.Screen name="MainTabs" component={TabNavigator} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawer: {
    backgroundColor: '#0f172a',
    width: 280,
  },
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  drawerSection: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  drawerItemText: {
    fontSize: 16,
    color: '#fff',
  },
  drawerFooter: {
    padding: 20,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
});
