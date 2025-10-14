import { useTheme } from '@/hooks/useTheme';
import { setSelectedAddress } from '@/store/slices/addressSlice';
import { RootState } from '@/store/store';
import { tokenManager } from '@/utils/tokenManager';
import { API_ENDPOINTS } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

interface EnterMoreDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (details: any) => void;
  selectedLocation?: any;
  onServiceNotAvailable?: () => void;
}

export default function EnterMoreDetailsModal({ visible, onClose, onSubmit, selectedLocation, onServiceNotAvailable }: EnterMoreDetailsModalProps) {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { name, phone } = useSelector((state: RootState) => state.user);
  
  const [orderForFriend, setOrderForFriend] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [addressType, setAddressType] = useState('HOME');
  const [markAsDefault, setMarkAsDefault] = useState(false);

  const loadUserData = async () => {
    try {
      const response = await tokenManager.makeAuthenticatedRequest(API_ENDPOINTS.USER.PROFILE, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success && data.data) {
        const profile = data.data;
        setCustomerName(`${profile.firstName} ${profile.lastName}`);
        setCustomerEmail(profile.email);
        setCustomerMobile(profile.phone);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  useEffect(() => {
    if (visible && !orderForFriend) {
      loadUserData();
    }
  }, [visible]);

  const handleOrderForFriendToggle = () => {
    const newValue = !orderForFriend;
    setOrderForFriend(newValue);
    
    if (newValue) {
      // Clear fields for friend
      setCustomerName('');
      setCustomerEmail('');
      setCustomerMobile('');
    } else {
      // Load user data
      loadUserData();
    }
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    if (!customerMobile.trim()) {
      Alert.alert('Error', 'Please enter mobile number');
      return;
    }

    try {
      const payload = {
        type: addressType.toLowerCase(),
        address: selectedLocation ? 
          `${selectedLocation.locality}, ${selectedLocation.district}, ${selectedLocation.pincode}` : 
          'Current Location',
        latitude: selectedLocation?.latitude?.toString() || '0',
        longitude: selectedLocation?.longitude?.toString() || '0',
        contactPersonName: customerName.trim(),
        contactMobile: customerMobile.trim(),
        isDefault: markAsDefault
      };

      const response = await tokenManager.makeAuthenticatedRequest(`${API_ENDPOINTS.BASE_URL}/service-area/save-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert('Success', 'Address saved successfully');
        
        // If marked as default or it's the first address, set it as selected
        if (markAsDefault || result.data) {
          const newAddress = {
            id: result.data?.id || Date.now().toString(),
            address: selectedLocation ? 
              `${selectedLocation.locality}, ${selectedLocation.district}, ${selectedLocation.pincode}` : 
              'New Address',
            type: addressType.toLowerCase(),
            isDefault: markAsDefault,
            latitude: selectedLocation?.latitude?.toString(),
            longitude: selectedLocation?.longitude?.toString()
          };
          
          // Update Redux store
          dispatch(setSelectedAddress(newAddress));
          
          // Update AsyncStorage
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem('selectedDeliveryAddress', JSON.stringify(newAddress));
        }
        
        onSubmit({
          name: customerName.trim(),
          email: customerEmail.trim(),
          mobile: customerMobile.trim(),
          orderForFriend,
          addressType,
          markAsDefault
        });
        onClose();
      } else {
        // Show user-friendly message for any API error
        Alert.alert('Service Not Available', 'Sorry, we don\'t deliver to this area yet. We\'ll notify you when service becomes available.');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Service Not Available', 'Sorry, we don\'t deliver to this area yet. We\'ll notify you when service becomes available.');
    }
  };


  
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Enter More Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Detected Location */}
            <View style={[styles.locationContainer, { backgroundColor: colors.lightGray }]}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <View style={styles.locationDetails}>
                <Text style={[styles.locationTitle, { color: colors.text }]}>Detected Location</Text>
                <Text style={[styles.locationText, { color: colors.gray }]}>
                  {selectedLocation ? 
                    `${selectedLocation.locality}, ${selectedLocation.district}, ${selectedLocation.pincode}` : 
                    'Loading location...'
                  }
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={handleOrderForFriendToggle}
            >
              <View style={[
                styles.checkbox, 
                { borderColor: colors.primary },
                orderForFriend && { backgroundColor: colors.primary }
              ]}>
                {orderForFriend && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Text style={[styles.checkboxText, { color: colors.text }]}>
                Order for Friend
              </Text>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.lightGray,
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Enter customer name"
                placeholderTextColor={colors.gray}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.lightGray,
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                placeholder="Enter email address"
                placeholderTextColor={colors.gray}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Mobile *</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.lightGray,
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                value={customerMobile}
                onChangeText={setCustomerMobile}
                placeholder="Enter mobile number"
                placeholderTextColor={colors.gray}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            {/* Save Address As */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Save Address as</Text>
              <View style={styles.addressTypeRow}>
                {['HOME', 'WORK', 'OTHER'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      { borderColor: colors.border },
                      addressType === type && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setAddressType(type)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      { color: colors.text },
                      addressType === type && { color: '#fff' }
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Mark as Default */}
            <TouchableOpacity 
              style={styles.lastCheckboxContainer}
              onPress={() => setMarkAsDefault(!markAsDefault)}
            >
              <View style={[
                styles.checkbox, 
                { borderColor: colors.primary },
                markAsDefault && { backgroundColor: colors.primary }
              ]}>
                {markAsDefault && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Text style={[styles.checkboxText, { color: colors.text }]}>
                Mark as Default
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>Save Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  locationDetails: {
    marginLeft: 12,
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  addressTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  lastCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  checkboxText: {
    fontSize: 16,
    fontWeight: '500',
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
  },
  footer: {
    paddingTop: 15,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',

  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});