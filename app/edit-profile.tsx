import { setUser } from '@/store/slices/userSlice';
import { RootState } from '@/store/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { profileAPI } from '@/services/api';
import { API_ENDPOINTS } from '@/constants/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function EditProfileScreen() {
  const dispatch = useDispatch();
  const { name, phone } = useSelector((state: RootState) => state.user);
  const { colors } = useTheme();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  // const [referralCode, setReferralCode] = useState(`JB${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  const [loading, setLoading] = useState(true);
  // const referralLink = `https://jhola-bazar.app/ref/${referralCode}`;

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('authToken');
      
      console.log('Token:', token ? 'Found' : 'Not found');
      
      if (!token) {
        console.error('No auth token found');
        setLoading(false);
        return;
      }
      
      const response = await fetch(API_ENDPOINTS.USER.PROFILE, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok && data.success && data.data) {
        const profile = data.data;
        setFirstName(profile.firstName || '');
        setLastName(profile.lastName || '');
        setEmail(profile.email || '');
        setGender(profile.gender || '');
        if (profile.dateOfBirth) {
          const dateOnly = profile.dateOfBirth.split('T')[0];
          setDateOfBirth(dateOnly);
          const date = new Date(dateOnly);
          setSelectedYear(date.getFullYear());
          setSelectedMonth(date.getMonth() + 1);
          setSelectedDay(date.getDate());
        }
      } else {
        console.error('API Error:', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const profileData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        gender,
        dateOfBirth,
      };
      
      await profileAPI.updateProfile(profileData);
      dispatch(setUser({ name: `${firstName} ${lastName}`.trim(), phone }));
      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  // const handleCopyLink = () => {
  //   Clipboard.setString(referralLink);
  //   Alert.alert('Copied!', 'Referral link copied to clipboard');
  // };

  // const handleShare = async (platform: string) => {
  //   const message = `Hey! Join Jhola-Bazar and get ₹50 off on your first order. Use my referral code: ${referralCode}\n\nDownload now: ${referralLink}`;
    
  //   try {
  //     switch (platform) {
  //       case 'whatsapp':
  //         await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
  //         break;
  //       case 'telegram':
  //         await Linking.openURL(`tg://msg?text=${encodeURIComponent(message)}`);
  //         break;
  //       case 'sms':
  //         await Linking.openURL(`sms:?body=${encodeURIComponent(message)}`);
  //         break;
  //       case 'email':
  //         await Linking.openURL(`mailto:?subject=Join Jhola-Bazar&body=${encodeURIComponent(message)}`);
  //         break;
  //       default:
  //         await Share.share({ message });
  //     }
  //   } catch (error) {
  //     await Share.share({ message });
  //   }
  // };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.gray }]}>Loading profile...</Text>
          </View>
        ) : (
          <>
        <View style={[styles.section, { backgroundColor: colors.lightGray }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>First Name</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text
                }
              ]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Last Name</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text
                }
              ]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text
                }
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              placeholderTextColor={colors.gray}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Gender</Text>
            <View style={styles.genderContainer}>
              {['Male', 'Female', 'Other'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.genderOption,
                    { borderColor: colors.border },
                    gender === option && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setGender(option)}
                >
                  <Text style={[
                    styles.genderText,
                    { color: colors.text },
                    gender === option && { color: '#fff' }
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Date of Birth</Text>
            <TouchableOpacity
              style={[
                styles.input,
                { 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  justifyContent: 'center'
                }
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[{ color: dateOfBirth ? colors.text : colors.gray }]}>
                {dateOfBirth || 'Select Date of Birth'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Phone Number</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: colors.lightGray,
                  borderColor: colors.border,
                  color: colors.gray
                }
              ]}
              value={phone}
              editable={false}
              placeholder="Phone number"
            />
          </View>
        </View>

        {/* <View style={[styles.section, { backgroundColor: colors.lightGray }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Referral Code</Text>
          
          <View style={[styles.referralCard, { backgroundColor: colors.background, borderColor: colors.primary }]}>
            <View style={styles.referralHeader}>
              <Ionicons name="gift" size={24} color={colors.primary} />
              <Text style={[styles.referralTitle, { color: colors.text }]}>Invite Friends & Earn</Text>
            </View>
            
            <Text style={[styles.referralCode, { color: colors.primary }]}>{referralCode}</Text>
            
            <TouchableOpacity 
              style={[styles.copyButton, { backgroundColor: colors.primary }]}
              onPress={handleCopyLink}
            >
              <Ionicons name="copy" size={16} color="#fff" />
              <Text style={styles.copyText}>Copy Link</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.shareTitle, { color: colors.text }]}>Share via</Text>
          
          <View style={styles.shareButtons}>
            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: '#25D366' }]}
              onPress={() => handleShare('whatsapp')}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#fff" />
              <Text style={styles.shareButtonText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: '#0088cc' }]}
              onPress={() => handleShare('telegram')}
            >
              <Ionicons name="paper-plane" size={24} color="#fff" />
              <Text style={styles.shareButtonText}>Telegram</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: '#007AFF' }]}
              onPress={() => handleShare('sms')}
            >
              <Ionicons name="chatbubble" size={24} color="#fff" />
              <Text style={styles.shareButtonText}>SMS</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: '#EA4335' }]}
              onPress={() => handleShare('email')}
            >
              <Ionicons name="mail" size={24} color="#fff" />
              <Text style={styles.shareButtonText}>Email</Text>
            </TouchableOpacity>
          </View>
        </View> */}
          </>
        )}
      </ScrollView>

      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.datePickerModal, { backgroundColor: colors.background }]}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={[styles.datePickerButton, { color: colors.gray }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.datePickerTitle, { color: colors.text }]}>Select Date of Birth</Text>
              <TouchableOpacity onPress={() => {
                const formattedDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
                setDateOfBirth(formattedDate);
                setShowDatePicker(false);
              }}>
                <Text style={[styles.datePickerButton, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickersContainer}>
              <View style={styles.pickerWrapper}>
                <Text style={[styles.pickerLabel, { color: colors.text }]}>Year</Text>
                <ScrollView style={styles.scrollPicker} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerItem,
                        { backgroundColor: selectedYear === year ? colors.primary : 'transparent' }
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        { color: selectedYear === year ? '#fff' : colors.text }
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.pickerWrapper}>
                <Text style={[styles.pickerLabel, { color: colors.text }]}>Month</Text>
                <ScrollView style={styles.scrollPicker} showsVerticalScrollIndicator={false}>
                  {monthNames.map((monthName, index) => {
                    const monthNumber = index + 1;
                    return (
                      <TouchableOpacity
                        key={monthNumber}
                        style={[
                          styles.pickerItem,
                          { backgroundColor: selectedMonth === monthNumber ? colors.primary : 'transparent' }
                        ]}
                        onPress={() => setSelectedMonth(monthNumber)}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          { color: selectedMonth === monthNumber ? '#fff' : colors.text }
                        ]}>
                          {monthName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              <View style={styles.pickerWrapper}>
                <Text style={[styles.pickerLabel, { color: colors.text }]}>Day</Text>
                <ScrollView style={styles.scrollPicker} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerItem,
                        { backgroundColor: selectedDay === day ? colors.primary : 'transparent' }
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        { color: selectedDay === day ? '#fff' : colors.text }
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  },
  referralCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 16,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  shareTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  shareButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    width: '48%',
    marginBottom: 8,
    justifyContent: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '500',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pickerWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    textAlign: 'center',
  },
  scrollPicker: {
    height: 150,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 4,
    marginVertical: 1,
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});