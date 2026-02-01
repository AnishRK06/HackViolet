// Welcome Screen
import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield } from 'lucide-react-native';
import { COLORS } from '../../../theme.js';
import styles from '../../styles/styles.js';

export default function WelcomeScreen({ onLogin, onSignUp }) {
  return (
    <LinearGradient colors={COLORS.bg.gradient} style={styles.authContainer}>
      <SafeAreaView style={styles.authSafeArea}>
        <View style={styles.welcomeLogoContainer}>
          <View style={styles.welcomeIconCircle}>
            <Shield color={COLORS.accent.primary} size={60} />
          </View>
          <Text style={styles.welcomeTitle}>lumina.</Text>
          <Text style={styles.welcomeSubtitle}>Campus safety, together</Text>
        </View>
        <View style={styles.welcomeButtons}>
          <TouchableOpacity style={styles.authButtonPrimary} onPress={onSignUp}>
            <Text style={styles.authButtonPrimaryText}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.authButtonSecondary} onPress={onLogin}>
            <Text style={styles.authButtonSecondaryText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
