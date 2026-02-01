import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { COLORS } from '../theme';

export default function BaseModal({
  visible,
  onClose,
  title,
  children,
  width = '85%',
  showCloseButton = true,
  scrollable = false,
}) {
  const ContentWrapper = scrollable ? ScrollView : View;
  const contentProps = scrollable ? { showsVerticalScrollIndicator: false } : {};

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { width }]}>
          {showCloseButton && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
          )}
          {title && <Text style={styles.title}>{title}</Text>}
          <ContentWrapper {...contentProps}>{children}</ContentWrapper>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: COLORS.bg.cardSolid,
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
});
