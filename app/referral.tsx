import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

export default function ReferralScreen() {
  const [referralCode, setReferralCode] = useState('');
  const { colors } = useTheme();

  const handleApplyReferral = () => {
    if (referralCode.trim()) {
      Alert.alert('Success', 'Referral code applied successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } else {
      Alert.alert('Error', 'Please enter a valid referral code');
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="gift" size={80} color={colors.primary} />
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>Got a Referral Code?</Text>
        <Text style={[styles.subtitle, { color: colors.gray }]}>
          Enter your referral code to get exclusive rewards and discounts
        </Text>

        <View style={styles.card}>
          <View style={[styles.cardContent, { backgroundColor: colors.lightGray }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Enter Referral Code</Text>
            
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: colors.background, 
                  borderColor: colors.border,
                  color: colors.text 
                }
              ]}
              placeholder="Enter referral code"
              placeholderTextColor={colors.gray}
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
            />

            <TouchableOpacity 
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={handleApplyReferral}
            >
              <Text style={styles.applyButtonText}>Apply Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.benefits}>
          <Text style={[styles.benefitsTitle, { color: colors.text }]}>Benefits of Referral Code:</Text>
          
          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={[styles.benefitText, { color: colors.gray }]}>Get ₹50 off on your first order</Text>
          </View>
          
          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={[styles.benefitText, { color: colors.gray }]}>Exclusive discounts and offers</Text>
          </View>
          
          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={[styles.benefitText, { color: colors.gray }]}>Priority customer support</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.skipButton, { borderColor: colors.border }]}
          onPress={handleSkip}
        >
          <Text style={[styles.skipButtonText, { color: colors.gray }]}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  card: {
    marginBottom: 32,
  },
  cardContent: {
    padding: 24,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 2,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  benefits: {
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    padding: 24,
  },
  skipButton: {
    borderWidth: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});