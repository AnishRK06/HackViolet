// Incident Feed Screen - Optimized
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
  const [state, setState] = useState({ filter: 'all', incidents: [], loading: true, expandedId: null, showReportModal: false, reportStep: 1, reportType: null, reportLocation: '', reportDescription: '' });
  const set = u => setState(s => ({ ...s, ...u }));
  const { filter, incidents, loading, expandedId, showReportModal, reportStep, reportType, reportLocation, reportDescription } = state;

  useEffect(() => { const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc')); return onSnapshot(q, snap => set({ incidents: snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toMillis?.() || d.data().createdAt || Date.now() })), loading: false }), e => { console.error('Error fetching incidents:', e); set({ loading: false }); }); }, []);

  const filtered = incidents.filter(i => filter === 'active' ? (Date.now() - i.createdAt) < 86400000 : filter === 'verified' ? i.verifications >= 10 : true).sort((a, b) => b.createdAt - a.createdAt);
  const handleVerify = async id => { try { const inc = incidents.find(i => i.id === id || i.id === String(id)); if (inc) await updateDoc(doc(db, 'incidents', String(id)), { verifications: (inc.verifications || 0) + 1 }); } catch (e) { console.error('Error verifying:', e); } };
  const resetReport = () => set({ showReportModal: false, reportStep: 1, reportType: null, reportLocation: '', reportDescription: '' });
  const submitReport = async () => { if (reportType && reportLocation && reportDescription) { try { await addDoc(collection(db, 'incidents'), { type: reportType, title: INCIDENT_TYPES[reportType].label, location: reportLocation, description: reportDescription, isVTPD: false, verifications: 1, createdAt: Timestamp.now() }); resetReport(); } catch (e) { console.error('Error submitting:', e); Alert.alert('Error', 'Failed to submit report'); } } };

  return (
    <View style={styles.incidentFeedContainer}>
      <View style={styles.feedHeader}><TouchableOpacity onPress={onBack} style={styles.backButton}><ChevronLeft color={COLORS.text.primary} size={28} /></TouchableOpacity><Text style={styles.feedTitle}>Campus Incidents</Text><View style={{ width: 28 }} /></View>
      <View style={styles.filterContainer}>{[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'verified', label: 'Verified' }].map(f => <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => set({ filter: f.key })}><Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text></TouchableOpacity>)}</View>

      <ScrollView style={styles.incidentList} showsVerticalScrollIndicator={false}>
        {loading ? <View style={styles.emptyState}><ActivityIndicator size="large" color={COLORS.accent.primary} /><Text style={[styles.emptyStateText, { marginTop: 12 }]}>Loading incidents...</Text></View>
        : filtered.length === 0 ? <View style={styles.emptyState}><Text style={styles.emptyStateText}>No incidents match this filter</Text></View>
        : filtered.map(inc => { const type = INCIDENT_TYPES[inc.type], isExpanded = expandedId === inc.id; return (
          <TouchableOpacity key={inc.id} style={[styles.incidentCard, { borderLeftColor: type.color }]} onPress={() => set({ expandedId: isExpanded ? null : inc.id })} activeOpacity={0.8}>
            <View style={styles.incidentHeader}><Text style={styles.incidentTypeIcon}>{type.icon}</Text><Text style={styles.incidentTitle} numberOfLines={1}>{inc.title}</Text><View style={[styles.incidentBadge, inc.isVTPD ? styles.incidentBadgeVTPD : styles.incidentBadgeCommunity]}><Text style={styles.incidentBadgeText}>{inc.isVTPD ? 'VTPD' : 'Community'}</Text></View></View>
            <View style={styles.incidentMeta}><MapPin color={COLORS.text.muted} size={14} /><Text style={styles.incidentLocation}>{inc.location}</Text><Text style={styles.incidentTime}>{formatTimeAgo(inc.createdAt)}</Text></View>
            <Text style={styles.incidentDescription} numberOfLines={isExpanded ? undefined : 2}>{inc.description}</Text>
            <View style={styles.incidentFooter}><View style={[styles.verifyCount, { backgroundColor: inc.verifications >= 10 ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)' }]}><Check color={inc.verifications >= 10 ? COLORS.accent.success : COLORS.text.muted} size={14} /><Text style={[styles.verifyCountText, inc.verifications >= 10 && { color: COLORS.accent.success }]}>{inc.verifications}</Text></View><TouchableOpacity style={styles.verifyButton} onPress={() => handleVerify(inc.id)}><Text style={styles.verifyButtonText}>Verify</Text></TouchableOpacity></View>
          </TouchableOpacity>); })}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => set({ showReportModal: true })}><Plus color={COLORS.text.primary} size={28} /></TouchableOpacity>

      <Modal visible={showReportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { width: '90%', maxHeight: '80%' }]}>
          <TouchableOpacity style={styles.modalClose} onPress={resetReport}><X color={COLORS.text.primary} size={24} /></TouchableOpacity>
          {reportStep === 1 && <><Text style={styles.reportModalTitle}>Report Incident</Text><Text style={styles.reportModalSubtitle}>Select incident type</Text><View style={styles.typeGrid}>{Object.values(INCIDENT_TYPES).map(t => <TouchableOpacity key={t.id} style={[styles.typeButton, reportType === t.id && { borderColor: t.color, borderWidth: 2 }]} onPress={() => { set({ reportType: t.id, reportStep: 2 }); }}><Text style={styles.typeButtonIcon}>{t.icon}</Text><Text style={styles.typeButtonLabel}>{t.label}</Text></TouchableOpacity>)}</View></>}
          {reportStep === 2 && <><Text style={styles.reportModalTitle}>Location</Text><Text style={styles.reportModalSubtitle}>Where is this happening?</Text><TextInput style={styles.reportInput} placeholder="e.g., Newman Library 2nd Floor" placeholderTextColor={COLORS.text.muted} value={reportLocation} onChangeText={t => set({ reportLocation: t })} /><View style={styles.reportNavButtons}><TouchableOpacity style={styles.reportNavButton} onPress={() => set({ reportStep: 1 })}><Text style={styles.reportNavButtonText}>Back</Text></TouchableOpacity><TouchableOpacity style={[styles.reportNavButton, styles.reportNavButtonPrimary]} onPress={() => reportLocation && set({ reportStep: 3 })}><Text style={styles.reportNavButtonTextPrimary}>Next</Text></TouchableOpacity></View></>}
          {reportStep === 3 && <><Text style={styles.reportModalTitle}>Description</Text><Text style={styles.reportModalSubtitle}>Describe what you observed</Text><TextInput style={[styles.reportInput, { height: 120, textAlignVertical: 'top' }]} placeholder="Provide details about the incident..." placeholderTextColor={COLORS.text.muted} value={reportDescription} onChangeText={t => set({ reportDescription: t })} multiline /><View style={styles.reportNavButtons}><TouchableOpacity style={styles.reportNavButton} onPress={() => set({ reportStep: 2 })}><Text style={styles.reportNavButtonText}>Back</Text></TouchableOpacity><TouchableOpacity style={[styles.reportNavButton, styles.reportNavButtonPrimary]} onPress={submitReport}><Text style={styles.reportNavButtonTextPrimary}>Submit</Text></TouchableOpacity></View></>}
        </View></View>
      </Modal>
    </View>
  );
}
