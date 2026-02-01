// SignUp Screen - Optimized
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, MapPin, Shield } from 'lucide-react-native';
import * as Location from 'expo-location';
import { COLORS } from '../../../theme.js';
import { TERMS_TEXT } from '../../utils/helpers.js';
import styles from '../../styles/styles.js';

export default function SignUpScreen({ onBack, onComplete }) {
  const [state, setState] = useState({ step: 1, email: '', password: '', confirmPassword: '', name: '', termsAccepted: false, privacyAccepted: false, isVerifying: false, isVerified: false });
  const set = u => setState(s => ({ ...s, ...u }));
  const { step, email, password, confirmPassword, name, termsAccepted, privacyAccepted, isVerifying, isVerified } = state;

  const handleNextStep1 = () => { if (!email || !password || !name) return Alert.alert('Error', 'Please fill in all fields'); if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match'); if (password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters'); set({ step: 2 }); };
  const handleNextStep2 = () => { if (!termsAccepted || !privacyAccepted) return Alert.alert('Error', 'Please accept the terms and privacy policy'); set({ step: 3 }); };
  const handleRequestLocation = async () => { try { await Location.requestForegroundPermissionsAsync(); } catch (e) { console.error('Location permission error:', e); } set({ step: 4 }); };
  const handleVerify = () => { set({ isVerifying: true }); setTimeout(() => set({ isVerifying: false, isVerified: true }), 2000); };

  const Checkbox = ({ checked, onPress, label }) => <TouchableOpacity style={styles.checkboxRow} onPress={onPress}><View style={[styles.checkbox, checked && styles.checkboxChecked]}>{checked && <Check color="#FFFFFF" size={16} />}</View><Text style={styles.checkboxLabel}>{label}</Text></TouchableOpacity>;

  return (
    <LinearGradient colors={COLORS.bg.gradient} style={styles.authContainer}>
      <SafeAreaView style={styles.authSafeArea}>
        <TouchableOpacity style={styles.authBackButton} onPress={step === 1 ? onBack : () => set({ step: step - 1 })}><ChevronLeft color={COLORS.text.primary} size={24} /><Text style={styles.authBackText}>{step === 1 ? 'Back' : 'Previous'}</Text></TouchableOpacity>
        <View style={styles.stepIndicator}>{[1, 2, 3, 4].map(s => <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />)}</View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.authScrollContent}>
          {step === 1 && <View style={styles.authFormContainer}>
            <Text style={styles.authTitle}>Create Account</Text><Text style={styles.authSubtitle}>Enter your details to get started</Text>
            <TextInput style={styles.authInput} placeholder="Full Name" placeholderTextColor={COLORS.text.muted} value={name} onChangeText={t => set({ name: t })} />
            <TextInput style={styles.authInput} placeholder="Email" placeholderTextColor={COLORS.text.muted} value={email} onChangeText={t => set({ email: t })} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.authInput} placeholder="Password" placeholderTextColor={COLORS.text.muted} value={password} onChangeText={t => set({ password: t })} secureTextEntry />
            <TextInput style={styles.authInput} placeholder="Confirm Password" placeholderTextColor={COLORS.text.muted} value={confirmPassword} onChangeText={t => set({ confirmPassword: t })} secureTextEntry />
            <TouchableOpacity style={styles.authButtonPrimary} onPress={handleNextStep1}><Text style={styles.authButtonPrimaryText}>Continue</Text></TouchableOpacity>
          </View>}

          {step === 2 && <View style={styles.authFormContainer}>
            <Text style={styles.authTitle}>Terms & Conditions</Text><Text style={styles.authSubtitle}>Please review and accept our terms</Text>
            <View style={styles.termsCard}><ScrollView style={styles.termsScrollView} showsVerticalScrollIndicator><Text style={styles.termsText}>{TERMS_TEXT}</Text></ScrollView></View>
            <Checkbox checked={termsAccepted} onPress={() => set({ termsAccepted: !termsAccepted })} label="I agree to the Terms & Conditions" />
            <Checkbox checked={privacyAccepted} onPress={() => set({ privacyAccepted: !privacyAccepted })} label="I agree to the Privacy Policy" />
            <View style={styles.authNavButtons}><TouchableOpacity style={styles.authNavButton} onPress={() => set({ step: 1 })}><Text style={styles.authNavButtonText}>Back</Text></TouchableOpacity><TouchableOpacity style={[styles.authNavButtonPrimary, (!termsAccepted || !privacyAccepted) && styles.authButtonDisabled]} onPress={handleNextStep2} disabled={!termsAccepted || !privacyAccepted}><Text style={styles.authNavButtonPrimaryText}>Continue</Text></TouchableOpacity></View>
          </View>}

          {step === 3 && <View style={styles.authFormContainer}>
            <View style={styles.locationPermissionContainer}><View style={styles.locationIconCircle}><MapPin color={COLORS.accent.primary} size={48} /></View><Text style={styles.authTitle}>Location Access</Text><Text style={styles.locationDescription}>Lumina needs your location to show nearby safety resources, Blue Light stations, and connect you with walking groups in your area.</Text>
            <TouchableOpacity style={styles.authButtonPrimary} onPress={handleRequestLocation}><MapPin color="#FFFFFF" size={20} style={{ marginRight: 8 }} /><Text style={styles.authButtonPrimaryText}>Allow Location Access</Text></TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={() => set({ step: 4 })}><Text style={styles.skipButtonText}>Skip for now</Text></TouchableOpacity></View>
          </View>}

          {step === 4 && <View style={styles.authFormContainer}>
            <View style={styles.verifyContainer}>
              {!isVerified ? <><View style={[styles.verifyIconCircle, isVerifying && styles.verifyIconCircleLoading]}>{isVerifying ? <ActivityIndicator size="large" color={COLORS.accent.primary} /> : <Shield color={COLORS.accent.primary} size={48} />}</View><Text style={styles.authTitle}>Verify Identity</Text><Text style={styles.verifyDescription}>For your safety and the safety of the community, we verify all users.</Text><TouchableOpacity style={[styles.authButtonPrimary, isVerifying && styles.authButtonDisabled]} onPress={handleVerify} disabled={isVerifying}><Text style={styles.authButtonPrimaryText}>{isVerifying ? 'Verifying...' : 'Verify with University Email'}</Text></TouchableOpacity></>
              : <><View style={styles.verifySuccessCircle}><Check color="#FFFFFF" size={48} /></View><Text style={styles.authTitle}>Verified!</Text><Text style={styles.verifyDescription}>Your identity has been verified. Welcome to Lumina!</Text><TouchableOpacity style={styles.authButtonPrimary} onPress={onComplete}><Text style={styles.authButtonPrimaryText}>Continue to App</Text></TouchableOpacity></>}
            </View>
          </View>}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
