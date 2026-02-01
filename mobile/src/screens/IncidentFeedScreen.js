// Incident Feed Screen
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { ChevronLeft, MapPin, Check, Plus, X } from 'lucide-react-native';
import { db } from '../config/firebase.js';
import { collection, onSnapshot, addDoc, updateDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { COLORS } from '../../theme.js';
import { INCIDENT_TYPES } from '../../constants.js';
import { formatTimeAgo } from '../utils/helpers.js';
import styles from '../styles/styles.js';

export default function IncidentFeedScreen({ onBack }) {
  const [filter, setFilter] = useState('all');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStep, setReportStep] = useState(1);
  const [reportType, setReportType] = useState(null);
  const [reportLocation, setReportLocation] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // Firebase real-time listener for incidents
  useEffect(() => {
    const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incidentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis?.() || doc.data().createdAt || Date.now()
      }));
      setIncidents(incidentData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching incidents:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredIncidents = incidents.filter(inc => {
    if (filter === 'active') return (Date.now() - inc.createdAt) < 24 * 3600000;
    if (filter === 'verified') return inc.verifications >= 10;
    return true;
  }).sort((a, b) => b.createdAt - a.createdAt);

  const handleVerify = async (id) => {
    try {
      const incidentRef = doc(db, 'incidents', String(id));
      const incident = incidents.find(inc => inc.id === id || inc.id === String(id));
      if (incident) {
        await updateDoc(incidentRef, { verifications: (incident.verifications || 0) + 1 });
      }
    } catch (error) {
      console.error('Error verifying incident:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const resetReport = () => {
    setShowReportModal(false);
    setReportStep(1);
    setReportType(null);
    setReportLocation('');
    setReportDescription('');
  };

  const submitReport = async () => {
    if (reportType && reportLocation && reportDescription) {
      try {
        await addDoc(collection(db, 'incidents'), {
          type: reportType,
          title: INCIDENT_TYPES[reportType].label,
          location: reportLocation,
          description: reportDescription,
          isVTPD: false,
          verifications: 1,
          createdAt: Timestamp.now()
        });
        resetReport();
      } catch (error) {
        console.error('Error submitting report:', error);
        Alert.alert('Error', 'Failed to submit report');
      }
    }
  };

  return (
    <View style={styles.incidentFeedContainer}>
      <View style={styles.feedHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={COLORS.text.primary} size={28} />
        </TouchableOpacity>
        <Text style={styles.feedTitle}>Campus Incidents</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.filterContainer}>
        {[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'verified', label: 'Verified' }].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.incidentList} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={COLORS.accent.primary} />
            <Text style={[styles.emptyStateText, { marginTop: 12 }]}>Loading incidents...</Text>
          </View>
        ) : filteredIncidents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No incidents match this filter</Text>
          </View>
        ) : filteredIncidents.map(incident => {
          const type = INCIDENT_TYPES[incident.type];
          const isExpanded = expandedId === incident.id;
          return (
            <TouchableOpacity
              key={incident.id}
              style={[styles.incidentCard, { borderLeftColor: type.color }]}
              onPress={() => setExpandedId(isExpanded ? null : incident.id)}
              activeOpacity={0.8}
            >
              <View style={styles.incidentHeader}>
                <Text style={styles.incidentTypeIcon}>{type.icon}</Text>
                <Text style={styles.incidentTitle} numberOfLines={1}>{incident.title}</Text>
                <View style={[styles.incidentBadge, incident.isVTPD ? styles.incidentBadgeVTPD : styles.incidentBadgeCommunity]}>
                  <Text style={styles.incidentBadgeText}>{incident.isVTPD ? 'VTPD' : 'Community'}</Text>
                </View>
              </View>
              <View style={styles.incidentMeta}>
                <MapPin color={COLORS.text.muted} size={14} />
                <Text style={styles.incidentLocation}>{incident.location}</Text>
                <Text style={styles.incidentTime}>{formatTimeAgo(incident.createdAt)}</Text>
              </View>
              <Text style={styles.incidentDescription} numberOfLines={isExpanded ? undefined : 2}>
                {incident.description}
              </Text>
              <View style={styles.incidentFooter}>
                <View style={[styles.verifyCount, { backgroundColor: incident.verifications >= 10 ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)' }]}>
                  <Check color={incident.verifications >= 10 ? COLORS.accent.success : COLORS.text.muted} size={14} />
                  <Text style={[styles.verifyCountText, incident.verifications >= 10 && { color: COLORS.accent.success }]}>
                    {incident.verifications}
                  </Text>
                </View>
                <TouchableOpacity style={styles.verifyButton} onPress={() => handleVerify(incident.id)}>
                  <Text style={styles.verifyButtonText}>Verify</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowReportModal(true)}>
        <Plus color={COLORS.text.primary} size={28} />
      </TouchableOpacity>

      <Modal visible={showReportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%', maxHeight: '80%' }]}>
            <TouchableOpacity style={styles.modalClose} onPress={resetReport}>
              <X color={COLORS.text.primary} size={24} />
            </TouchableOpacity>

            {reportStep === 1 && (
              <>
                <Text style={styles.reportModalTitle}>Report Incident</Text>
                <Text style={styles.reportModalSubtitle}>Select incident type</Text>
                <View style={styles.typeGrid}>
                  {Object.values(INCIDENT_TYPES).map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.typeButton, reportType === t.id && { borderColor: t.color, borderWidth: 2 }]}
                      onPress={() => { setReportType(t.id); setReportStep(2); }}
                    >
                      <Text style={styles.typeButtonIcon}>{t.icon}</Text>
                      <Text style={styles.typeButtonLabel}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {reportStep === 2 && (
              <>
                <Text style={styles.reportModalTitle}>Location</Text>
                <Text style={styles.reportModalSubtitle}>Where is this happening?</Text>
                <TextInput
                  style={styles.reportInput}
                  placeholder="e.g., Newman Library 2nd Floor"
                  placeholderTextColor={COLORS.text.muted}
                  value={reportLocation}
                  onChangeText={setReportLocation}
                />
                <View style={styles.reportNavButtons}>
                  <TouchableOpacity style={styles.reportNavButton} onPress={() => setReportStep(1)}>
                    <Text style={styles.reportNavButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reportNavButton, styles.reportNavButtonPrimary]}
                    onPress={() => reportLocation && setReportStep(3)}
                  >
                    <Text style={styles.reportNavButtonTextPrimary}>Next</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {reportStep === 3 && (
              <>
                <Text style={styles.reportModalTitle}>Description</Text>
                <Text style={styles.reportModalSubtitle}>Describe what you observed</Text>
                <TextInput
                  style={[styles.reportInput, { height: 120, textAlignVertical: 'top' }]}
                  placeholder="Provide details about the incident..."
                  placeholderTextColor={COLORS.text.muted}
                  value={reportDescription}
                  onChangeText={setReportDescription}
                  multiline
                />
                <View style={styles.reportNavButtons}>
                  <TouchableOpacity style={styles.reportNavButton} onPress={() => setReportStep(2)}>
                    <Text style={styles.reportNavButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reportNavButton, styles.reportNavButtonPrimary]}
                    onPress={submitReport}
                  >
                    <Text style={styles.reportNavButtonTextPrimary}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
