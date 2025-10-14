import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch } from 'react-redux';
import { setSelectedAddress, clearSelectedAddress } from '@/store/slices/addressSlice';
import { tokenManager } from '@/utils/tokenManager';
import { API_ENDPOINTS } from '@/constants/api';

interface SavedAddress {
  id: string;
  type: 'home' | 'office' | 'other';
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  isDefault: boolean;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: {
    name: string;
    mobile: string;
  };
  pincode?: {
    code: string;
    city: string;
    state: string;
  };
}

export default function SavedLocationsScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    loadSavedAddresses();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSavedAddresses();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadSavedAddresses = async () => {
    try {
      const response = await tokenManager.makeAuthenticatedRequest(API_ENDPOINTS.ADDRESSES.ALL);
      if (response.ok) {
        const result = await response.json();
        setSavedAddresses(result.data || []);
      }
    } catch (error) {
      console.log('Error loading saved addresses:', error);
    }
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'home': return 'home';
      case 'office': return 'business';
      default: return 'location';
    }
  };

  const handleAddressSelect = async (address: SavedAddress) => {
    const selectedAddressData = {
      id: address.id,
      address: address.fullAddress || `${address.addressLine1}${address.addressLine2 ? ', ' + address.addressLine2 : ''}`,
      type: address.type,
      isDefault: address.isDefault,
      latitude: address.latitude,
      longitude: address.longitude
    };
    
    // Update Redux store
    dispatch(setSelectedAddress(selectedAddressData));
    
    // Update AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('selectedDeliveryAddress', JSON.stringify(selectedAddressData));
    
    router.back();
  };

  const handleMarkAsDefault = async (addressId: string) => {
    try {
      const response = await tokenManager.makeAuthenticatedRequest(
        API_ENDPOINTS.ADDRESSES.BY_ID(addressId),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isDefault: true })
        }
      );
      
      if (response.ok) {
        loadSavedAddresses();
      }
    } catch (error) {
      console.log('Error marking address as default:', error);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const response = await tokenManager.makeAuthenticatedRequest(
        API_ENDPOINTS.ADDRESSES.BY_ID(addressId),
        {
          method: 'DELETE',
        }
      );
      
      if (response.ok) {
        // Check if deleted address is currently selected
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const selectedAddressData = await AsyncStorage.getItem('selectedDeliveryAddress');
        
        if (selectedAddressData) {
          const selectedAddress = JSON.parse(selectedAddressData);
          if (selectedAddress.id === addressId) {
            // Clear selected address from Redux and AsyncStorage
            dispatch(clearSelectedAddress());
            await AsyncStorage.removeItem('selectedDeliveryAddress');
          }
        }
        
        loadSavedAddresses();
      }
    } catch (error) {
      console.log('Error deleting address:', error);
    }
  };

  const renderAddressItem = ({ item }: { item: SavedAddress }) => (
    <View style={[styles.addressCard, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => handleAddressSelect(item)}>
        <View style={styles.addressHeader}>
          <View style={styles.addressTypeContainer}>
            <Ionicons name={getAddressIcon(item.type) as any} size={20} color={colors.primary} />
            <Text style={[styles.addressType, { color: colors.text }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
            {item.isDefault && (
              <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteAddress(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error || '#FF4444'} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.addressText, { color: colors.text }]}>
          {item.fullAddress || `${item.addressLine1}${item.addressLine2 ? ', ' + item.addressLine2 : ''}`}
        </Text>
        {item.landmark && (
          <Text style={[styles.landmarkText, { color: colors.gray }]}>Landmark: {item.landmark}</Text>
        )}
      </TouchableOpacity>
      
      {!item.isDefault && (
        <TouchableOpacity 
          style={[styles.defaultButton, { borderColor: colors.primary }]}
          onPress={() => handleMarkAsDefault(item.id)}
        >
          <Text style={[styles.defaultButtonText, { color: colors.primary }]}>Mark as Default</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.lightGray }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Select Location</Text>
      </View>

      <TouchableOpacity 
        style={[styles.mapButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/map-picker')}
      >
        <Ionicons name="map" size={24} color="#fff" />
        <Text style={styles.mapButtonText}>Select Location on Map</Text>
      </TouchableOpacity>

      {savedAddresses.length > 0 ? (
        <FlatList
          data={savedAddresses}
          renderItem={renderAddressItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.addressesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={80} color={colors.gray} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Saved Addresses</Text>
          <Text style={[styles.emptySubtitle, { color: colors.gray }]}>
            Use the map to add your locations
          </Text>
        </View>
      )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },

  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addressesList: {
    padding: 16,
  },
  addressCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#00B761',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressType: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  defaultText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  landmarkText: {
    fontSize: 12,
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  defaultButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  defaultButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
});