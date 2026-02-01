import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal } from 'react-native';
import { AlertTriangle, Phone, X } from 'lucide-react-native';
import { COLORS } from '../theme';

export default function SOSButton() {
  const [showModal, setShowModal] = useState(false);
  const [activated, setActivated] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleLongPress = () => {
    setActivated(true);
    setShowModal(true);
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ])).start();
  };

  const cancelEmergency = () => { setActivated(false); setShowModal(false); pulseAnim.setValue(1); };

  return (
    <>
      <Animated.View style={[styles.container, { transform: [{ scale: activated ? pulseAnim : 1 }] }]}>
        <TouchableOpacity style={[styles.button, activated && styles.buttonActive]} onLongPress={handleLongPress} delayLongPress={1000} activeOpacity={0.8}>
          <AlertTriangle color={COLORS.text.primary} size={28} />
          <Text style={styles.buttonText}>SOS</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Hold for emergency</Text>
      </Animated.View>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={cancelEmergency}><X color={COLORS.text.primary} size={24} /></TouchableOpacity>
            <AlertTriangle color={COLORS.accent.danger} size={64} />
            <Text style={styles.modalTitle}>EMERGENCY ACTIVATED</Text>
            <Text style={styles.modalText}>Alerting campus security...</Text>
            <Text style={styles.modalText}>Nearest Blue Light: War Memorial Hall</Text>
            <TouchableOpacity style={styles.callButton}>
              <Phone color={COLORS.accent.danger} size={24} />
              <Text style={styles.callButtonText}>Call 911</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelEmergency}><Text style={styles.cancelButtonText}>Cancel Alert</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 100, right: 20, alignItems: 'center' },
  button: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.accent.danger, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.accent.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  buttonActive: { backgroundColor: '#CC0000' },
  buttonText: { color: COLORS.text.primary, fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  hint: { color: COLORS.text.secondary, fontSize: 10, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 24, padding: 32, alignItems: 'center', width: '85%', borderWidth: 2, borderColor: COLORS.accent.danger },
  closeButton: { position: 'absolute', top: 16, right: 16 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.accent.danger, marginTop: 16 },
  modalText: { fontSize: 16, color: COLORS.text.primary, marginTop: 8, textAlign: 'center' },
  callButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.text.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30, marginTop: 24, gap: 8 },
  callButtonText: { color: COLORS.accent.danger, fontSize: 18, fontWeight: 'bold' },
  cancelButton: { paddingHorizontal: 32, paddingVertical: 12, marginTop: 16 },
  cancelButtonText: { color: COLORS.text.secondary, fontSize: 16 },
});
