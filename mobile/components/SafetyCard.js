import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../theme';

export default function SafetyCard({ title, subtitle, icon, color = COLORS.accent.primary, onPress, children }) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        {icon && <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>{icon}</View>}
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {children && <View style={styles.cardContent}>{children}</View>}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitleContainer: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
  cardSubtitle: { fontSize: 14, color: COLORS.text.secondary, marginTop: 2 },
  cardContent: { marginTop: 12 },
});
