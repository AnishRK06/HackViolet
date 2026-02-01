// Reusable SafetyCard component
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme.js';
import styles from '../styles/styles.js';

export default function SafetyCard({ title, subtitle, icon, color = COLORS.accent.primary, onPress, children }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        {icon && <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>{icon}</View>}
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {children && <View style={styles.cardContent}>{children}</View>}
    </TouchableOpacity>
  );
}
