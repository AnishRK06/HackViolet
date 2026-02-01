// Login Screen
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS } from '../../../theme.js';
import styles from '../../styles/styles.js';

export default function LoginScreen({ onBack, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    onLogin();
  };

  return (
    <LinearGradient colors={COLORS.bg.gradient} style={styles.authContainer}>
      <SafeAreaView style={styles.authSafeArea}>
        <TouchableOpacity style={styles.authBackButton} onPress={onBack}>
          <ChevronLeft color={COLORS.text.primary} size={24} />
          <Text style={styles.authBackText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.authFormContainer}>
          <Text style={styles.authTitle}>Welcome back</Text>
          <Text style={styles.authSubtitle}>Sign in to your account</Text>

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

          <TouchableOpacity style={styles.authButtonPrimary} onPress={handleLogin}>
            <Text style={styles.authButtonPrimaryText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
