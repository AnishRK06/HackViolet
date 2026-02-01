import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, MapPin, Users, Phone, Bell, ChevronRight } from 'lucide-react-native';
import SafetyCard from '../components/SafetyCard';
import SOSButton from '../components/SOSButton';
import { COLORS } from '../theme';

const QuickAction = ({ icon, text, bgColor, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress}>
    <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>{icon}</View>
    <Text style={styles.quickActionText}>{text}</Text>
  </TouchableOpacity>
);

const GroupCard = ({ title, subtitle, onPress, actionText }) => (
  <SafetyCard title={title} subtitle={subtitle} icon={<Users color={COLORS.accent.success} size={24} />} color={COLORS.accent.success} onPress={onPress}>
    <View style={styles.cardAction}>
      <Text style={styles.cardActionText}>{actionText}</Text>
      <ChevronRight color={COLORS.text.secondary} size={20} />
    </View>
  </SafetyCard>
);

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Shield color={COLORS.accent.primary} size={32} />
            <View>
              <Text style={styles.headerTitle}>Lumina</Text>
              <Text style={styles.headerSubtitle}>VT Campus Safety</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell color={COLORS.text.primary} size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Campus Status: Safe</Text>
          <Text style={styles.statusTime}>Updated 2 min ago</Text>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickAction icon={<MapPin color={COLORS.accent.info} size={24} />} text={`Find Blue\nLight`} bgColor={COLORS.accent.info + '20'} onPress={() => navigation.navigate('Map')} />
          <QuickAction icon={<Users color={COLORS.accent.success} size={24} />} text={`Join\nGroup`} bgColor={COLORS.accent.success + '20'} onPress={() => navigation.navigate('Groups')} />
          <QuickAction icon={<Phone color={COLORS.accent.primary} size={24} />} text={`Emergency\nContacts`} bgColor={COLORS.accent.primary + '20'} />
        </View>

        <Text style={styles.sectionTitle}>Nearby Safety</Text>
        <SafetyCard title="War Memorial Hall" subtitle="Blue Light Station • 0.2 mi away" icon={<MapPin color={COLORS.accent.info} size={24} />} color={COLORS.accent.info} onPress={() => navigation.navigate('Map')}>
          <View style={styles.cardAction}>
            <Text style={styles.cardActionText}>Get Directions</Text>
            <ChevronRight color={COLORS.text.secondary} size={20} />
          </View>
        </SafetyCard>

        <Text style={styles.sectionTitle}>Active Walking Groups</Text>
        <GroupCard title="Wolfpack Group" subtitle="3 people • Heading to West AJ" onPress={() => navigation.navigate('Groups')} actionText="View Details" />
        <GroupCard title="Night Owls" subtitle="5 people • Heading to D2" onPress={() => navigation.navigate('Groups')} actionText="Join Group" />

        <View style={{ height: 120 }} />
      </ScrollView>
      <SOSButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.accent.primary },
  headerSubtitle: { fontSize: 14, color: COLORS.text.secondary },
  notificationButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bg.card, justifyContent: 'center', alignItems: 'center' },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52, 199, 89, 0.15)', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(52, 199, 89, 0.3)' },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent.success, marginRight: 12 },
  statusText: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.accent.success },
  statusTime: { fontSize: 12, color: COLORS.text.secondary },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginBottom: 12, marginTop: 8 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  quickAction: { flex: 1, alignItems: 'center', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 16, marginHorizontal: 4, borderWidth: 1, borderColor: COLORS.border },
  quickActionIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 12, color: COLORS.text.primary, textAlign: 'center', fontWeight: '500' },
  cardAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  cardActionText: { fontSize: 14, color: COLORS.text.secondary },
});
