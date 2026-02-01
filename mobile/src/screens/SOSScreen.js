// SOS Emergency Screen
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Vibration, Linking, Alert } from 'react-native';
import { AlertTriangle, Phone, Shield, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../theme.js';
import styles from '../styles/styles.js';

export default function SOSScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const triggerEmergency = () => {
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

  const callNumber = (number) => Linking.openURL(`tel:${number}`);

  return (
    <View style={styles.sosScreenContainer}>
      <Text style={styles.sosScreenTitle}>Emergency</Text>
      <Text style={styles.sosScreenSubtitle}>Tap the button to trigger emergency alert</Text>

      <TouchableOpacity onPress={triggerEmergency} activeOpacity={0.8}>
        <Animated.View style={[styles.sosMainButton, { transform: [{ scale: pulseAnim }], opacity: glowAnim }]}>
          <AlertTriangle color={COLORS.text.primary} size={64} />
          <Text style={styles.sosMainButtonText}>SOS</Text>
        </Animated.View>
      </TouchableOpacity>

      <Text style={styles.emergencyContactsTitle}>Emergency Contacts</Text>

      <TouchableOpacity style={styles.emergencyContactItem} onPress={() => callNumber('911')}>
        <View style={[styles.emergencyContactIcon, { backgroundColor: 'rgba(255, 59, 48, 0.2)' }]}>
          <Phone color={COLORS.accent.danger} size={24} />
        </View>
        <View style={styles.emergencyContactInfo}>
          <Text style={styles.emergencyContactName}>911</Text>
          <Text style={styles.emergencyContactDesc}>Emergency Services</Text>
        </View>
        <ChevronRight color={COLORS.text.muted} size={20} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.emergencyContactItem} onPress={() => callNumber('5402316411')}>
        <View style={[styles.emergencyContactIcon, { backgroundColor: 'rgba(30, 64, 175, 0.2)' }]}>
          <Phone color="#1E40AF" size={24} />
        </View>
        <View style={styles.emergencyContactInfo}>
          <Text style={styles.emergencyContactName}>VT Police</Text>
          <Text style={styles.emergencyContactDesc}>540-231-6411</Text>
        </View>
        <ChevronRight color={COLORS.text.muted} size={20} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.emergencyContactItem} onPress={() => callNumber('5402315000')}>
        <View style={[styles.emergencyContactIcon, { backgroundColor: 'rgba(255, 149, 0, 0.2)' }]}>
          <Shield color={COLORS.accent.warning} size={24} />
        </View>
        <View style={styles.emergencyContactInfo}>
          <Text style={styles.emergencyContactName}>Campus Security</Text>
          <Text style={styles.emergencyContactDesc}>540-231-5000</Text>
        </View>
        <ChevronRight color={COLORS.text.muted} size={20} />
      </TouchableOpacity>
    </View>
  );
}
