import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Plus, MapPin, Clock, ChevronRight, Check, X } from 'lucide-react-native';
import SafetyCard from '../components/SafetyCard';
import { COLORS } from '../theme';

const GROUPS = [
  { id: 1, name: 'Wolfpack Group', destination: 'West AJ', members: 3, time: '5 min ago', distance: '0.2 mi' },
  { id: 2, name: 'Night Owls', destination: 'D2', members: 5, time: '2 min ago', distance: '0.4 mi' },
  { id: 3, name: 'Library Squad', destination: 'Newman Library', members: 2, time: '8 min ago', distance: '0.3 mi' },
  { id: 4, name: 'Late Night Crew', destination: 'Squires', members: 4, time: '1 min ago', distance: '0.5 mi' },
];

const GroupDetail = ({ icon, text }) => (
  <View style={styles.groupDetailItem}>{icon}<Text style={styles.groupDetailText}>{text}</Text></View>
);

export default function GroupsScreen() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joined, setJoined] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDest, setNewGroupDest] = useState('');

  const handleJoin = () => { setJoined(true); setTimeout(() => { setShowModal(false); setJoined(false); }, 1500); };
  const closeModal = () => { setShowModal(false); setJoined(false); };
  const handleCreateGroup = () => { setShowCreateModal(false); setNewGroupName(''); setNewGroupDest(''); };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Walking Groups</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
            <Plus color={COLORS.text.primary} size={20} /><Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Users color={COLORS.accent.success} size={24} />
          <View style={styles.infoCardContent}>
            <Text style={styles.infoCardTitle}>Walk Together, Stay Safe</Text>
            <Text style={styles.infoCardText}>Join a group heading your direction or create one for others to join.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Active Groups Near You</Text>
        {GROUPS.map((group) => (
          <SafetyCard key={group.id} title={group.name} subtitle={`${group.members} people • ${group.time}`} icon={<Users color={COLORS.accent.success} size={24} />} color={COLORS.accent.success} onPress={() => { setSelectedGroup(group); setShowModal(true); }}>
            <View style={styles.groupDetails}>
              <GroupDetail icon={<MapPin color={COLORS.text.secondary} size={16} />} text={`To ${group.destination}`} />
              <GroupDetail icon={<Clock color={COLORS.text.secondary} size={16} />} text={`${group.distance} away`} />
            </View>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Join Group</Text>
              <ChevronRight color={COLORS.accent.success} size={20} />
            </View>
          </SafetyCard>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={closeModal}><X color={COLORS.text.primary} size={24} /></TouchableOpacity>
            <Users color={COLORS.accent.success} size={56} />
            <Text style={styles.modalTitle}>{selectedGroup?.name}</Text>
            <View style={styles.modalInfo}>
              <GroupDetail icon={<MapPin color={COLORS.text.secondary} size={18} />} text={`Heading to ${selectedGroup?.destination}`} />
              <GroupDetail icon={<Users color={COLORS.text.secondary} size={18} />} text={`${selectedGroup?.members} people in group`} />
              <GroupDetail icon={<Clock color={COLORS.text.secondary} size={18} />} text={`${selectedGroup?.distance} from you`} />
            </View>
            {joined ? (
              <View style={styles.joinedContainer}><Check color={COLORS.accent.success} size={32} /><Text style={styles.joinedText}>You've joined the group!</Text></View>
            ) : (
              <TouchableOpacity style={styles.joinButton} onPress={handleJoin}><Text style={styles.joinButtonText}>Join Group</Text></TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowCreateModal(false)}><X color={COLORS.text.primary} size={24} /></TouchableOpacity>
            <Plus color={COLORS.accent.primary} size={56} />
            <Text style={styles.modalTitle}>Create a Group</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Group Name</Text>
              <TextInput style={styles.input} placeholder="e.g. Night Walkers" placeholderTextColor={COLORS.text.muted} value={newGroupName} onChangeText={setNewGroupName} />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Destination</Text>
              <TextInput style={styles.input} placeholder="e.g. West AJ, D2, Library" placeholderTextColor={COLORS.text.muted} value={newGroupDest} onChangeText={setNewGroupDest} />
            </View>
            <TouchableOpacity style={[styles.joinButton, { backgroundColor: COLORS.accent.primary }]} onPress={handleCreateGroup}><Text style={styles.joinButtonText}>Create Group</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text.primary },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 },
  createButtonText: { color: COLORS.text.primary, fontWeight: '600' },
  infoCard: { flexDirection: 'row', backgroundColor: 'rgba(52, 199, 89, 0.15)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(52, 199, 89, 0.3)', gap: 12 },
  infoCardContent: { flex: 1 },
  infoCardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.accent.success },
  infoCardText: { fontSize: 14, color: COLORS.text.secondary, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginBottom: 12 },
  groupDetails: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  groupDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupDetailText: { fontSize: 13, color: COLORS.text.secondary },
  cardAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  cardActionText: { fontSize: 14, color: COLORS.accent.success, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.bg.secondary, borderRadius: 24, padding: 32, alignItems: 'center', width: '90%' },
  modalClose: { position: 'absolute', top: 16, right: 16 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text.primary, marginTop: 16 },
  modalInfo: { width: '100%', marginTop: 20, gap: 12 },
  joinButton: { backgroundColor: COLORS.accent.success, paddingHorizontal: 48, paddingVertical: 16, borderRadius: 25, marginTop: 24, width: '100%', alignItems: 'center' },
  joinButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: 'bold' },
  joinedContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 10 },
  joinedText: { color: COLORS.accent.success, fontSize: 16, fontWeight: 'bold' },
  inputContainer: { width: '100%', marginTop: 16 },
  inputLabel: { fontSize: 14, color: COLORS.text.secondary, marginBottom: 8 },
  input: { backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 12, padding: 16, color: COLORS.text.primary, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
});
