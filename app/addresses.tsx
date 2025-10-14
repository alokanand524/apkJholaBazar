import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { addressAPI } from '@/services/api';
import { RootState } from '@/store/store';
import { useSelector } from 'react-redux';

interface Address {
  id: string;
  type: 'home' | 'office' | 'other';
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  isDefault: boolean;
  fullAddress?: string;
  pincode?: {
    code: string;
    city: string;
    state: string;
    deliveryCharge: string;
  };
}





export default function AddressesScreen() {
  const { colors } = useTheme();
  const { isLoggedIn } = useSelector((state: RootState) => state.user);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = React.useState(false); // Start with false
  const [refreshing, setRefreshing] = React.useState(false);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
  }, [isLoggedIn]);
  
  const fetchAddresses = React.useCallback(async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        setAddresses([]);
        return;
      }
      
      const response = await fetch(`${require('@/config/env').config.API_BASE_URL}/service-area/addresses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setAddresses(result.data || []);
        } else {
          setAddresses([]);
        }
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        setAddresses([]);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setAddresses([]);
    }
  }, []);
  
  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const onRefresh = React.useCallback(async () => {
    if (!isLoggedIn) return;
    setRefreshing(true);
    try {
      await fetchAddresses();
    } finally {
      setRefreshing(false);
    }
  }, [isLoggedIn]);

  const handleDeleteAddress = React.useCallback((id: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistic update
            setAddresses(prev => prev.filter(addr => addr.id !== id));
            
            try {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              const token = await AsyncStorage.getItem('authToken');
              
              await fetch(`${require('@/config/env').config.API_BASE_URL}/profile/addresses/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
            } catch (error) {
              console.error('Error deleting address:', error);
              fetchAddresses();
            }
          }
        },
      ]
    );
  }, [fetchAddresses]);

  const handleSetDefault = React.useCallback(async (id: string) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        router.push('/login');
        return;
      }
      
      const response = await fetch(`${require('@/config/env').config.API_BASE_URL}/profile/addresses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isDefault: true })
      });
      
      if (response.ok) {
        // Update local state after successful API call
        setAddresses(prev => prev.map(addr => ({
          ...addr,
          isDefault: addr.id === id
        })));
      } else {
        console.error('Failed to set default address');
      }
    } catch (error) {
      console.error('Error setting default address:', error);
    }
  }, []);

  const getAddressIcon = React.useCallback((type: string) => {
    switch (type) {
      case 'home': return 'home';
      case 'office': return 'business';
      default: return 'location';
    }
  }, []);

  const renderAddressItem = React.useCallback(({ item }: { item: Address }) => (
    <View style={[styles.addressCard, { backgroundColor: colors.background }]}>
      <View style={styles.addressHeader}>
        <View style={styles.addressTypeContainer}>
          <Ionicons name={getAddressIcon(item.type) as any} size={20} color={colors.primary} />
          <Text style={[styles.addressType, { color: colors.text }]}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
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
          <Ionicons name="trash" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.addressText, { color: colors.text }]}>
        {item.fullAddress || `${item.addressLine1}${item.addressLine2 ? ', ' + item.addressLine2 : ''}`}
      </Text>
      {item.landmark && (
        <Text style={[styles.landmarkText, { color: colors.gray }]}>Landmark: {item.landmark}</Text>
      )}
      {item.pincode && (
        <Text style={[styles.landmarkText, { color: colors.gray }]}>
          {item.pincode.city}, {item.pincode.state} - {item.pincode.code}
        </Text>
      )}

      {!item.isDefault && (
        <TouchableOpacity 
          style={[styles.setDefaultButton, { borderColor: colors.primary }]}
          onPress={() => handleSetDefault(item.id)}
        >
          <Text style={[styles.setDefaultText, { color: colors.primary }]}>Set as Default</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [colors, handleDeleteAddress, handleSetDefault]);

  if (!isLoggedIn) {
    return null;
  }

  // Remove loading screen - show content immediately

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.lightGray }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Addresses</Text>
      </View>

      {addresses.length > 0 ? (
        <FlatList
          data={addresses}
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
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Addresses</Text>
          <Text style={[styles.emptySubtitle, { color: colors.gray }]}>Add your delivery addresses</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/map-picker')}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add New Address</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  addressesList: {
    padding: 16,
  },
  addressCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  deleteButton: {
    padding: 8,
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
  setDefaultButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 16,
  },
  setDefaultText: {
    fontSize: 12,
    fontWeight: '500',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});