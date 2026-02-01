// Main App Entry Point
import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, Vibration, Linking, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { registerRootComponent } from 'expo';
import { useFonts, CormorantGaramond_400Regular } from '@expo-google-fonts/cormorant-garamond';
import { Home, Map, Users, User } from 'lucide-react-native';
import { COLORS } from './theme.js';
import { db } from './src/config/firebase.js';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// Import screens
import {
  HomeScreen,
  MapScreen,
  GroupsScreen,
  ProfileScreen,
  SOSScreen,
  WelcomeScreen,
  LoginScreen,
  SignUpScreen
} from './src/screens/index.js';

// Import components
import { SOSTabButton, TabButton } from './src/components/index.js';

// Import styles
import styles from './src/styles/styles.js';

function App() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
  });

  // Navigation state
  const [activeTab, setActiveTab] = useState('home');

  // Groups state
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [walkingGroups, setWalkingGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // Incidents state
  const [incidents, setIncidents] = useState([]);

  // Route state for inter-screen communication
  const [viewingGroupRoute, setViewingGroupRoute] = useState(null);
  const [meetingGroupRoute, setMeetingGroupRoute] = useState(null);
  const [blueLightRoute, setBlueLightRoute] = useState(null);

  // Map settings state
  const [showActivityZones, setShowActivityZones] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState('welcome'); // 'welcome', 'login', 'signup'

  // Firebase listener for walking groups
  useEffect(() => {
    const q = query(collection(db, 'walkingGroups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis?.() || doc.data().createdAt || Date.now()
      }));
      setWalkingGroups(groupData);
      setGroupsLoading(false);
    }, (error) => {
      console.error('Error fetching walking groups:', error);
      setGroupsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firebase listener for incidents (for badge count)
  useEffect(() => {
    const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incidentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis?.() || doc.data().createdAt || Date.now()
      }));
      setIncidents(incidentData);
    }, (error) => {
      console.error('Error fetching incidents for badge:', error);
    });
    return () => unsubscribe();
  }, []);

  // Navigation helper functions
  const viewGroupRoute = (group) => {
    setViewingGroupRoute(group);
    setActiveTab('map');
  };

  const getDirectionsToGroup = (group) => {
    setMeetingGroupRoute(group);
    setActiveTab('map');
  };

  const getDirectionsToBlueLight = (blueLight) => {
    setBlueLightRoute(blueLight);
    setActiveTab('map');
  };

  // Show loading screen while fonts load
  if (!fontsLoaded) {
    return (
      <LinearGradient colors={COLORS.bg.gradient} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.accent.primary} />
      </LinearGradient>
    );
  }

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
    if (authScreen === 'welcome') {
      return <WelcomeScreen onLogin={() => setAuthScreen('login')} onSignUp={() => setAuthScreen('signup')} />;
    }
    if (authScreen === 'login') {
      return <LoginScreen onBack={() => setAuthScreen('welcome')} onLogin={() => setIsAuthenticated(true)} />;
    }
    if (authScreen === 'signup') {
      return <SignUpScreen onBack={() => setAuthScreen('welcome')} onComplete={() => setIsAuthenticated(true)} />;
    }
  }

  // Render active screen
  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            setActiveTab={setActiveTab}
            getDirectionsToBlueLight={getDirectionsToBlueLight}
            walkingGroups={walkingGroups}
            incidents={incidents}
          />
        );
      case 'map':
        return (
          <MapScreen
            viewingGroupRoute={viewingGroupRoute}
            setViewingGroupRoute={setViewingGroupRoute}
            meetingGroupRoute={meetingGroupRoute}
            setMeetingGroupRoute={setMeetingGroupRoute}
            showActivityZones={showActivityZones}
            showLegend={showLegend}
            blueLightRoute={blueLightRoute}
            setBlueLightRoute={setBlueLightRoute}
            walkingGroups={walkingGroups}
          />
        );
      case 'groups':
        return (
          <GroupsScreen
            joinedGroups={joinedGroups}
            setJoinedGroups={setJoinedGroups}
            userGroups={userGroups}
            setUserGroups={setUserGroups}
            walkingGroups={walkingGroups}
            groupsLoading={groupsLoading}
            viewGroupRoute={viewGroupRoute}
            getDirectionsToGroup={getDirectionsToGroup}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            showActivityZones={showActivityZones}
            setShowActivityZones={setShowActivityZones}
            showLegend={showLegend}
            setShowLegend={setShowLegend}
          />
        );
      case 'sos':
        return <SOSScreen />;
      default:
        return (
          <HomeScreen
            setActiveTab={setActiveTab}
            getDirectionsToBlueLight={getDirectionsToBlueLight}
          />
        );
    }
  };

  // SOS long press handler
  const handleSOSLongPress = () => {
    Vibration.vibrate([0, 200, 100, 200, 100, 200]);
    Alert.alert(
      'EMERGENCY ACTIVATED',
      'Alerting campus security...\nNearest Blue Light: War Memorial Hall',
      [
        { text: 'Call 911', onPress: () => Linking.openURL('tel:911') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <LinearGradient colors={COLORS.bg.gradient} style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <StatusBar style="dark" />
        <View style={styles.screenWrapper}>
          {renderScreen()}
        </View>
        <View style={styles.tabBar}>
          <TabButton
            name="home"
            icon={<Home size={24} />}
            label="Home"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
          <TabButton
            name="map"
            icon={<Map size={24} />}
            label="Map"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
          <SOSTabButton
            onPress={() => setActiveTab('sos')}
            onLongPress={handleSOSLongPress}
          />
          <TabButton
            name="groups"
            icon={<Users size={24} />}
            label="Groups"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
          <TabButton
            name="profile"
            icon={<User size={24} />}
            label="Profile"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

registerRootComponent(App);
