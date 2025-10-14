import { setUser } from '@/store/slices/userSlice';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Image, ScrollView, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { Toast } from '@/components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { config } from '@/config/env';
import { InputValidator } from '@/utils/inputValidator';
import { logger } from '@/utils/logger';
import { API_ENDPOINTS } from '@/constants/api';
import pushTokenService from '@/services/pushTokenService';

export default function LoginScreen() {
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  // const [email, setEmail] = useState(''); // Email login disabled - will be enabled later
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });
  const dispatch = useDispatch();
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const handleSendOtp = async () => {
    const sanitizedPhone = InputValidator.sanitizeString(phoneNumber);
    if (loginMethod === 'phone' && !InputValidator.validatePhoneNumber(sanitizedPhone)) {
      showToast('Please enter a valid 10-digit phone number', 'error');
      return;
    }
    
    console.log('📱 Sending OTP to:', sanitizedPhone);
    setIsLoading(true);
    try {
      // Try login first
      let response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: sanitizedPhone,
        }),
      });
      
      let data = await response.json();
      
      // If login fails (user doesn't exist), try signup
      if (!response.ok) {
        response = await fetch(API_ENDPOINTS.AUTH.SIGNUP, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: sanitizedPhone,
          }),
        });
        
        data = await response.json();
        setIsNewUser(true);
      } else {
        setIsNewUser(false);
      }
      
      if (response.ok) {
        console.log('✅ OTP sent successfully to:', sanitizedPhone);
        setShowOtp(true);
        showToast('OTP sent to your WhatsApp', 'success');
      } else {
        console.log('❌ Failed to send OTP:', data.message);
        showToast(data.message || 'Failed to send OTP', 'error');
      }
    } catch (error) {
      console.log('❌ OTP send error:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (text: string) => {
    setOtp(text);
    // Auto-verify when 6 digits are entered
    if (text.length === 6 && !isLoading) {
      handleVerifyOtp(text);
    }
  };

  const handleVerifyOtp = async (otpValue?: string) => {
    const currentOtp = otpValue || otp;
    const sanitizedOtp = InputValidator.sanitizeString(currentOtp);
    if (!InputValidator.validateOTP(sanitizedOtp)) {
      showToast('Please enter a valid 6-digit OTP', 'error');
      return;
    }
    
    console.log('🔐 Verifying OTP:', sanitizedOtp);
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.VERIFY_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: InputValidator.sanitizeString(phoneNumber),
          otp: sanitizedOtp,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ OTP verified successfully!');
        console.log('💾 Saving auth tokens...');
        
        // Save tokens to AsyncStorage from data object
        if (data.data?.accessToken) {
          await AsyncStorage.setItem('authToken', data.data.accessToken);
        }
        if (data.data?.refreshToken) {
          await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
        }
        
        dispatch(setUser({
          name: InputValidator.sanitizeString(data.data?.customer?.firstName || 'User'),
          phone: InputValidator.sanitizeString(phoneNumber),
        }));
        
        // Store user phone for notification targeting
        await AsyncStorage.setItem('userPhone', InputValidator.sanitizeString(phoneNumber));
        
        // Register push token for authenticated user
        console.log('🚀 Login successful, registering push token...');
        pushTokenService.registerPushTokenForUser();
        
        // Check for any unsent tokens
        pushTokenService.checkAndSendStoredToken();
        
        // router.replace('/referral');
        router.replace('/(tabs)');
      } else {
        console.log('❌ OTP verification failed:', data.message);
        showToast(data.message || 'Invalid OTP', 'error');
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      // Use the same endpoint that was successful initially
      const endpoint = isNewUser ? '/auth/signup' : '/auth/login';
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: InputValidator.sanitizeString(phoneNumber),
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showToast('New OTP sent to your WhatsApp', 'success');
      } else {
        showToast(data.message || 'Failed to resend OTP', 'error');
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image 
            source={require('../assets/images/jhola-bazar.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        {/* Creative Welcome Text */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>🛒 Ready to Shop?</Text>
          <Text style={styles.creativeTitle}>Login/Sign up to continue</Text>
          <Text style={styles.subtitle}>Your fresh groceries await!</Text>
        </View>

        {!showOtp ? (
          <>
            {/* Email login method selector disabled - will be enabled later */}
            {/* <View style={styles.methodSelector}>
              <TouchableOpacity
                style={[styles.methodButton, loginMethod === 'phone' && styles.activeMethod]}
                onPress={() => setLoginMethod('phone')}
              >
                <Text style={[styles.methodText, loginMethod === 'phone' && styles.activeMethodText]}>
                  Phone
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodButton, loginMethod === 'email' && styles.activeMethod]}
                onPress={() => setLoginMethod('email')}
              >
                <Text style={[styles.methodText, loginMethod === 'email' && styles.activeMethodText]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View> */}

            {/* Only phone login available - email login disabled */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.phoneInput}>
                <View style={styles.countryCodeBox}>
                  <Text style={styles.flagEmoji}>🇮🇳</Text>
                  <Text style={styles.countryCode}>+91</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>
            {/* Email input disabled - will be enabled later
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.fullInput}
                placeholder="Enter email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            */}

            <TouchableOpacity 
              style={[styles.sendOtpButton, isLoading && styles.disabledButton]} 
              onPress={handleSendOtp}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={[styles.sendOtpText, isLoading && styles.disabledButtonText]}>{isLoading ? 'Sending...' : 'Send OTP'}</Text>
            </TouchableOpacity>


          </>
        ) : (
          <>
            <View style={styles.otpContainer}>
              <Text style={styles.otpLabel}>Enter OTP</Text>
              <Text style={styles.otpSubtext}>
                OTP sent to {phoneNumber}
              </Text>
              <TextInput
                style={styles.otpInput}
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            <TouchableOpacity 
              style={[styles.verifyButton, isLoading && styles.disabledButton]} 
              onPress={handleVerifyOtp}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={[styles.verifyText, isLoading && styles.disabledButtonText]}>{isLoading ? 'Verifying...' : 'Verify OTP'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.resendButton} 
              onPress={handleResendOtp}
              disabled={isLoading}
            >
              <Text style={[styles.resendText, isLoading && styles.disabledText]}>Resend OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowOtp(false)}>
              <Text style={styles.backText}>Back to login</Text>
            </TouchableOpacity>
          </>
        )}
        
        {/* Legal Links */}
        <View style={styles.legalSection}>
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('https://jholabazar.com/privacy-policy')}>
              <Text style={styles.legalText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}> • </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://jholabazar.com/t&c')}>
              <Text style={styles.legalText}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fffe',
  },

  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00B761',
    marginBottom: 8,
  },
  creativeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeMethod: {
    backgroundColor: '#00B761',
  },
  methodText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeMethodText: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00B761',
    marginBottom: 8,
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8f0',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  flagEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  countryCode: {
    fontSize: 16,
    color: '#00B761',
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  fullInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 16,
  },
  sendOtpButton: {
    backgroundColor: '#00B761',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#00B761',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendOtpText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },


  otpContainer: {
    marginBottom: 24,
  },
  otpLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  otpSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 4,
    color: '#333',
  },
  verifyButton: {
    backgroundColor: '#00B761',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#00B761',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifyText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backText: {
    textAlign: 'center',
    color: '#00B761',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  disabledButtonText: {
    color: '#888888',
  },
  resendButton: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    color: '#00B761',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledText: {
    color: '#ccc',
  },
  legalSection: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalText: {
    fontSize: 14,
    color: '#00B761',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 8,
  },
});