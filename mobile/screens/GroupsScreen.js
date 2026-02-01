import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Plus, MapPin, Clock, ChevronRight, Check, X } from 'lucide-react-native';
import SafetyCard from '../components/SafetyCard';

const GROUPS = [
  { id: 1, name: 'Wolfpack Group', destination: 'West AJ', members: 3, time: '5 min ago', distance: '0.2 mi' },
  { id: 2, name: 'Night Owls', destination: 'D2', members: 5, time: '2 min ago', distance: '0.4 mi' },
  { id: 3, name: 'Library Squad', destination: 'Newman Library', members: 2, time: '8 min ago', distance: '0.3 mi' },
  { id: 4, name: 'Late Night Crew', destination: 'Squires', members: 4, time: '1 min ago', distance: '0.5 mi' },
];

export default function GroupsScreen() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joined, setJoined] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDest, setNewGroupDest] = useState('');

  const handleJoin = () => {
    setJoined(true);
    setTimeout(() => {
      setShowModal(false);
      setJoined(false);
    }, 1500);
  };

  const handleCreateGroup = () => {
    // Would create group in backend
    setShowCreateModal(false);
    setNewGroupName('');
    setNewGroupDest('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Walking Groups</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus color="#fff" size={20} />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Users color="#34C759" size={24} />
          <View style={styles.infoCardContent}>
            <Text style={styles.infoCardTitle}>Walk Together, Stay Safe</Text>
            <Text style={styles.infoCardText}>
              Join a group heading your direction or create one for others to join.
            </Text>
          </View>
        </View>

        {/* Active Groups */}
        <Text style={styles.sectionTitle}>Active Groups Near You</Text>
        {GROUPS.map((group) => (
          <SafetyCard
            key={group.id}
            title={group.name}
            subtitle={`${group.members} people • ${group.time}`}
            icon={<Users color="#34C759" size={24} />}
            color="#34C759"
            onPress={() => {
              setSelectedGroup(group);
              setShowModal(true);
            }}
          >
            <View style={styles.groupDetails}>
              <View style={styles.groupDetailItem}>
                <MapPin color="#8892b0" size={16} />
                <Text style={styles.groupDetailText}>To {group.destination}</Text>
              </View>
              <View style={styles.groupDetailItem}>
                <Clock color="#8892b0" size={16} />
                <Text style={styles.groupDetailText}>{group.distance} away</Text>
              </View>
            </View>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Join Group</Text>
              <ChevronRight color="#34C759" size={20} />
            </View>
          </SafetyCard>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Join Group Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => {
                setShowModal(false);
                setJoined(false);
              }}
            >
              <X color="#fff" size={24} />
            </TouchableOpacity>

            <Users color="#34C759" size={56} />
            <Text style={styles.modalTitle}>{selectedGroup?.name}</Text>

            <View style={styles.modalInfo}>
              <View style={styles.modalInfoItem}>
                <MapPin color="#8892b0" size={18} />
                <Text style={styles.modalInfoText}>Heading to {selectedGroup?.destination}</Text>
              </View>
              <View style={styles.modalInfoItem}>
                <Users color="#8892b0" size={18} />
                <Text style={styles.modalInfoText}>{selectedGroup?.members} people in group</Text>
              </View>
              <View style={styles.modalInfoItem}>
                <Clock color="#8892b0" size={18} />
                <Text style={styles.modalInfoText}>{selectedGroup?.distance} from you</Text>
              </View>
            </View>

            {joined ? (
              <View style={styles.joinedContainer}>
                <Check color="#34C759" size={32} />
                <Text style={styles.joinedText}>You've joined the group!</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
                <Text style={styles.joinButtonText}>Join Group</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Group Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowCreateModal(false)}
            >
              <X color="#fff" size={24} />
            </TouchableOpacity>

            <Plus color="#FF6B35" size={56} />
            <Text style={styles.modalTitle}>Create a Group</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Group Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Night Walkers"
                placeholderTextColor="#64748b"
                value={newGroupName}
                onChangeText={setNewGroupName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Destination</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. West AJ, D2, Library"
                placeholderTextColor="#64748b"
                value={newGroupDest}
                onChangeText={setNewGroupDest}
              />
            </View>

            <TouchableOpacity
              style={[styles.joinButton, { backgroundColor: '#FF6B35' }]}
              onPress={handleCreateGroup}
            >
              <Text style={styles.joinButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    gap: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  infoCardText: {
    fontSize: 14,
    color: '#8892b0',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  groupDetails: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  groupDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupDetailText: {
    fontSize: 13,
    color: '#8892b0',
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
    color: '#34C759',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '90%',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  modalInfo: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  modalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalInfoText: {
    fontSize: 15,
    color: '#8892b0',
  },
  joinButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  joinedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 10,
  },
  joinedText: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    width: '100%',
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#8892b0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});
