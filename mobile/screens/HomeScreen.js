import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, MapPin, Users, Phone, Bell, ChevronRight } from 'lucide-react-native';
import SafetyCard from '../components/SafetyCard';
import SOSButton from '../components/SOSButton';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Shield color="#FF6B35" size={32} />
            <View>
              <Text style={styles.headerTitle}>Lumina</Text>
              <Text style={styles.headerSubtitle}>VT Campus Safety</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Campus Status: Safe</Text>
          <Text style={styles.statusTime}>Updated 2 min ago</Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Map')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#007AFF20' }]}>
              <MapPin color="#007AFF" size={24} />
            </View>
            <Text style={styles.quickActionText}>Find Blue{'\n'}Light</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Groups')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#34C75920' }]}>
              <Users color="#34C759" size={24} />
            </View>
            <Text style={styles.quickActionText}>Join{'\n'}Group</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FF6B3520' }]}>
              <Phone color="#FF6B35" size={24} />
            </View>
            <Text style={styles.quickActionText}>Emergency{'\n'}Contacts</Text>
          </TouchableOpacity>
        </View>

        {/* Nearby Safety */}
        <Text style={styles.sectionTitle}>Nearby Safety</Text>
        <SafetyCard
          title="War Memorial Hall"
          subtitle="Blue Light Station • 0.2 mi away"
          icon={<MapPin color="#007AFF" size={24} />}
          color="#007AFF"
          onPress={() => navigation.navigate('Map')}
        >
          <View style={styles.cardAction}>
            <Text style={styles.cardActionText}>Get Directions</Text>
            <ChevronRight color="#8892b0" size={20} />
          </View>
        </SafetyCard>

        {/* Active Groups */}
        <Text style={styles.sectionTitle}>Active Walking Groups</Text>
        <SafetyCard
          title="Wolfpack Group"
          subtitle="3 people • Heading to West AJ"
          icon={<Users color="#34C759" size={24} />}
          color="#34C759"
          onPress={() => navigation.navigate('Groups')}
        >
          <View style={styles.cardAction}>
            <Text style={styles.cardActionText}>View Details</Text>
            <ChevronRight color="#8892b0" size={20} />
          </View>
        </SafetyCard>

        <SafetyCard
          title="Night Owls"
          subtitle="5 people • Heading to D2"
          icon={<Users color="#34C759" size={24} />}
          color="#34C759"
          onPress={() => navigation.navigate('Groups')}
        >
          <View style={styles.cardAction}>
            <Text style={styles.cardActionText}>Join Group</Text>
            <ChevronRight color="#8892b0" size={20} />
          </View>
        </SafetyCard>

        <View style={{ height: 120 }} />
      </ScrollView>

      <SOSButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8892b0',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    marginRight: 12,
  },
  statusText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  statusTime: {
    fontSize: 12,
    color: '#8892b0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  cardAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardActionText: {
    fontSize: 14,
    color: '#8892b0',
  },
});
