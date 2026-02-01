// SOS Tab Button component with pulse animation
import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { COLORS } from '../../theme.js';
import styles from '../styles/styles.js';

export default function SOSTabButton({ onPress, onLongPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
      style={styles.sosTabButtonContainer}
    >
      <Animated.View style={[styles.sosTabButton, { transform: [{ scale: pulseAnim }] }]}>
        <AlertTriangle color={COLORS.text.primary} size={28} />
      </Animated.View>
    </TouchableOpacity>
  );
}
