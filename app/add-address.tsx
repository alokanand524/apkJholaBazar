import { useTheme } from '@/hooks/useTheme';
import { addressService, Pincode } from '@/services/addressService';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



export default function AddAddressScreen() {
  const { colors } = useTheme();
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [selectedType, setSelectedType] = useState<'home' | 'office' | 'other'>('home');
  const [pincodes, setPincodes] = useState<Pincode[]>([]);
  const [selectedPincode, setSelectedPincode] = useState('');
  const [manualPincode, setManualPincode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [detectedPincode, setDetectedPincode] = useState('');

  useEffect(() => {
    fetchPincodes();
    getCurrentLocationData();
  }, []);

  useEffect(() => {
    if (detectedPincode) {
      setManualPincode(detectedPincode);
    }
  }, [detectedPincode]);

  const fetchPincodes = async () => {
    try {
      const pincodeList = await addressService.getPincodes();
      setPincodes(pincodeList);
    } catch (error) {
      console.error('Failed to fetch pincodes:', error);
    }
  };

  const getCurrentLocationData = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
      
      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const pincode = address.postalCode && address.postalCode.length === 6 ? address.postalCode : '';
        const cityName = address.city || address.subregion || '';
        const stateName = address.region || '';
        
        setDetectedPincode(pincode);
        setCity(cityName);
        setState(stateName);
      }
    } catch (error) {
      console.log('Error getting location data:', error);
    }
  };

  const handleSave = async () => {
    if (!addressLine1.trim()) {
      Alert.alert('Error', 'Please fill in address line 1');
      return;
    }

    // Use manual pincode, selected pincode, or detected pincode
    let pincodeId = selectedPincode;
    let pincodeToUse = manualPincode || detectedPincode;
    
    if (manualPincode) {
      const matchingPincode = pincodes.find(p => p.pincode === manualPincode);
      pincodeId = matchingPincode?.id || '';
    } else if (!pincodeId && detectedPincode) {
      const matchingPincode = pincodes.find(p => p.pincode === detectedPincode);
      pincodeId = matchingPincode?.id || '';
    }

    if (!pincodeToUse || pincodeToUse.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }

    setIsLoading(true);
    try {
      await addressService.createAddress({
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        landmark: landmark.trim() || undefined,
        pincodeId,
        type: selectedType,
      });
      
      Alert.alert('Success', 'Address added successfully!');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to add address');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Address</Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          <Text style={[styles.saveText, { color: colors.primary }]}>
            {isLoading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.section, { backgroundColor: colors.lightGray }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Address Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Address Line 1 *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={addressLine1}
              onChangeText={setAddressLine1}
              placeholder="House/Flat/Office No, Building Name"
              placeholderTextColor={colors.gray}
              multiline
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Address Line 2</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={addressLine2}
              onChangeText={setAddressLine2}
              placeholder="Street, Area, Colony (Optional)"
              placeholderTextColor={colors.gray}
              multiline
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Landmark</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="Nearby landmark (Optional)"
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>City</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={city}
              onChangeText={setCity}
              placeholder="Enter city name"
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>State</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={state}
              onChangeText={setState}
              placeholder="Enter state name"
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Pincode *</Text>
            {/* {detectedPincode && (
              <Text style={[styles.detectedText, { color: colors.primary }]}>Detected: {detectedPincode}</Text>
            )} */}
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={manualPincode}
              onChangeText={setManualPincode}
              placeholder={detectedPincode || "Enter 6-digit pincode"}
              placeholderTextColor={colors.gray}
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Address Type *</Text>
            <View style={styles.typeContainer}>
              {[
                { key: 'home', label: 'Home', icon: 'home' },
                { key: 'office', label: 'Office', icon: 'business' },
                { key: 'other', label: 'Other', icon: 'location' }
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeOption,
                    { borderColor: colors.border },
                    selectedType === type.key && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setSelectedType(type.key as any)}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={20} 
                    color={selectedType === type.key ? '#fff' : colors.gray} 
                  />
                  <Text style={[
                    styles.typeText,
                    { color: colors.text },
                    selectedType === type.key && { color: '#fff' }
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 44,
  },
  pincodeContainer: {
    gap: 8,
  },
  pincodeOption: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pincodeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  detectedText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
});