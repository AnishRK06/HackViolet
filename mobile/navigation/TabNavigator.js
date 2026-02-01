import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Map, Users, User } from 'lucide-react-native';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { COLORS } from '../theme';

const Tab = createBottomTabNavigator();
const screens = [
  { name: 'Home', component: HomeScreen, Icon: Home },
  { name: 'Map', component: MapScreen, Icon: Map },
  { name: 'Groups', component: GroupsScreen, Icon: Users },
  { name: 'Profile', component: ProfileScreen, Icon: User },
];

export default function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarActiveTintColor: COLORS.accent.primary, tabBarInactiveTintColor: COLORS.text.muted, tabBarLabelStyle: styles.tabBarLabel }}>
      {screens.map(({ name, component, Icon }) => (
        <Tab.Screen key={name} name={name} component={component} options={{ tabBarIcon: ({ color, size }) => <Icon color={color} size={size} /> }} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: COLORS.bg.secondary, borderTopColor: COLORS.border, borderTopWidth: 1, height: 85, paddingTop: 10, paddingBottom: 25 },
  tabBarLabel: { fontSize: 11, fontWeight: '500' },
});
