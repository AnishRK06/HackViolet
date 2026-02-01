// Tab Button component for navigation
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { COLORS } from '../../theme.js';
import styles from '../styles/styles.js';

export default function TabButton({ name, icon, label, activeTab, onPress }) {
  const isActive = activeTab === name;

  return (
    <TouchableOpacity style={styles.tabButton} onPress={() => onPress(name)}>
      {React.cloneElement(icon, { color: isActive ? COLORS.accent.primary : COLORS.text.muted })}
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
