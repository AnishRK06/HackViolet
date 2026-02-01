// SignUp Screen with multi-step flow
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, MapPin, Shield } from 'lucide-react-native';
import * as Location from 'expo-location';
import { COLORS } from '../../../theme.js';
import { TERMS_TEXT } from '../../utils/helpers.js';
import styles from '../../styles/styles.js';

export default function SignUpScreen({ onBack, onComplete }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleNextStep1 = () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!termsAccepted || !privacyAccepted) {
      Alert.alert('Error', 'Please accept the terms and privacy policy');
      return;
    }
    setStep(3);
  };

  const handleRequestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        Alert.alert('Success', 'Location permission granted!');
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
    setStep(4);
  };

  const handleSkipLocation = () => {
    setStep(4);
  };

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
    }, 2000);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((s) => (
        <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.authFormContainer}>
      <Text style={styles.authTitle}>Create Account</Text>
      <Text style={styles.authSubtitle}>Enter your details to get started</Text>

      <TextInput
        style={styles.authInput}
        placeholder="Full Name"
        placeholderTextColor={COLORS.text.muted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.authInput}
        placeholder="Email"
        placeholderTextColor={COLORS.text.muted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.authInput}
        placeholder="Password"
        placeholderTextColor={COLORS.text.muted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.authInput}
        placeholder="Confirm Password"
        placeholderTextColor={COLORS.text.muted}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.authButtonPrimary} onPress={handleNextStep1}>
        <Text style={styles.authButtonPrimaryText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.authFormContainer}>
      <Text style={styles.authTitle}>Terms & Conditions</Text>
      <Text style={styles.authSubtitle}>Please review and accept our terms</Text>

      <View style={styles.termsCard}>
        <ScrollView style={styles.termsScrollView} showsVerticalScrollIndicator={true}>
          <Text style={styles.termsText}>{TERMS_TEXT}</Text>
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.checkboxRow} onPress={() => setTermsAccepted(!termsAccepted)}>
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
          {termsAccepted && <Check color="#FFFFFF" size={16} />}
        </View>
        <Text style={styles.checkboxLabel}>I agree to the Terms & Conditions</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.checkboxRow} onPress={() => setPrivacyAccepted(!privacyAccepted)}>
        <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
          {privacyAccepted && <Check color="#FFFFFF" size={16} />}
        </View>
        <Text style={styles.checkboxLabel}>I agree to the Privacy Policy</Text>
      </TouchableOpacity>

      <View style={styles.authNavButtons}>
        <TouchableOpacity style={styles.authNavButton} onPress={() => setStep(1)}>
          <Text style={styles.authNavButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.authNavButtonPrimary, (!termsAccepted || !privacyAccepted) && styles.authButtonDisabled]}
          onPress={handleNextStep2}
          disabled={!termsAccepted || !privacyAccepted}
        >
          <Text style={styles.authNavButtonPrimaryText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.authFormContainer}>
      <View style={styles.locationPermissionContainer}>
        <View style={styles.locationIconCircle}>
          <MapPin color={COLORS.accent.primary} size={48} />
        </View>
        <Text style={styles.authTitle}>Location Access</Text>
        <Text style={styles.locationDescription}>
          Lumina needs your location to show nearby safety resources, Blue Light stations, and connect you with walking groups in your area.
        </Text>

        <TouchableOpacity style={styles.authButtonPrimary} onPress={handleRequestLocation}>
          <MapPin color="#FFFFFF" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.authButtonPrimaryText}>Allow Location Access</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkipLocation}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.authFormContainer}>
      <View style={styles.verifyContainer}>
        {!isVerified ? (
          <>
            <View style={[styles.verifyIconCircle, isVerifying && styles.verifyIconCircleLoading]}>
              {isVerifying ? (
                <ActivityIndicator size="large" color={COLORS.accent.primary} />
              ) : (
                <Shield color={COLORS.accent.primary} size={48} />
              )}
            </View>
            <Text style={styles.authTitle}>Verify Identity</Text>
            <Text style={styles.verifyDescription}>
              For your safety and the safety of the community, we verify all users.
            </Text>

            <TouchableOpacity
              style={[styles.authButtonPrimary, isVerifying && styles.authButtonDisabled]}
              onPress={handleVerify}
              disabled={isVerifying}
            >
              <Text style={styles.authButtonPrimaryText}>
                {isVerifying ? 'Verifying...' : 'Verify with University Email'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.verifySuccessCircle}>
              <Check color="#FFFFFF" size={48} />
            </View>
            <Text style={styles.authTitle}>Verified!</Text>
            <Text style={styles.verifyDescription}>
              Your identity has been verified. Welcome to Lumina!
            </Text>

            <TouchableOpacity style={styles.authButtonPrimary} onPress={onComplete}>
              <Text style={styles.authButtonPrimaryText}>Continue to App</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <LinearGradient colors={COLORS.bg.gradient} style={styles.authContainer}>
      <SafeAreaView style={styles.authSafeArea}>
        <TouchableOpacity style={styles.authBackButton} onPress={step === 1 ? onBack : () => setStep(step - 1)}>
          <ChevronLeft color={COLORS.text.primary} size={24} />
          <Text style={styles.authBackText}>{step === 1 ? 'Back' : 'Previous'}</Text>
        </TouchableOpacity>

        {renderStepIndicator()}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.authScrollContent}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
