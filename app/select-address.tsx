import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch } from 'react-redux';
import { setSelectedAddress } from '@/store/slices/addressSlice';

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
}

interface SavedLocation {
  id: string;
  locality: string;
  district: string;
  pincode: string;
  fullAddress: string;
  timestamp: string;
}

export default function SelectAddressScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  
  React.useEffect(() => {
    loadSavedLocations();
    loadSavedAddresses();
    getCurrentUserLocation();
    
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []);
  
  const getCurrentUserLocation = async () => {
    try {
      const Location = require('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude
        });
      }
    } catch (error) {
      console.log('Error getting user location:', error);
    }
  };
  
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };
  
  useFocusEffect(
    React.useCallback(() => {
      loadSavedLocations();
      loadSavedAddresses();
    }, [])
  );
  
  const loadSavedAddresses = async () => {
    try {
      const { addressAPI } = require('@/services/api');
      const response = await addressAPI.getAddresses();
      if (response.success && response.data) {
        const transformedAddresses = response.data.map((addr: any) => ({
          id: addr.id,
          type: addr.type,
          addressLine1: addr.addressLine1,
          addressLine2: addr.addressLine2,
          landmark: addr.landmark,
          isDefault: addr.isDefault,
          fullAddress: addr.fullAddress,
          pincode: addr.pincode
        }));
        setSavedAddresses(transformedAddresses);
      }
    } catch (error) {
      console.log('Error loading saved addresses:', error);
      setSavedAddresses([]);
    }
  };
  
  const loadSavedLocations = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const locations = await AsyncStorage.getItem('savedLocations');
      if (locations) {
        setSavedLocations(JSON.parse(locations));
      }
    } catch (error) {
      console.log('Error loading locations:', error);
    }
  };
  
  const deleteSavedLocation = async (id: string) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const updatedLocations = savedLocations.filter(loc => loc.id !== id);
      setSavedLocations(updatedLocations);
      await AsyncStorage.setItem('savedLocations', JSON.stringify(updatedLocations));
    } catch (error) {
      console.log('Error deleting location:', error);
    }
  };

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use Nominatim (same as Leaflet) with proper headers and parameters
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(query)}&` +
        `countrycodes=in&` +
        `limit=8&` +
        `addressdetails=1&` +
        `extratags=1&` +
        `namedetails=1`,
        {
          headers: {
            'User-Agent': 'JholaBazar/1.0 (React Native App)',
            'Accept': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        let searchResults = data.map((item: any, index: number) => {
          // Extract meaningful location name
          let locationName = '';
          
          if (item.namedetails && item.namedetails.name) {
            locationName = item.namedetails.name;
          } else if (item.address) {
            locationName = item.address.neighbourhood || 
                          item.address.suburb || 
                          item.address.village || 
                          item.address.town || 
                          item.address.city || 
                          item.address.state_district || 
                          item.display_name.split(',')[0];
          } else {
            locationName = item.display_name.split(',')[0];
          }
          
          // Create formatted address
          let formattedAddress = '';
          if (item.address) {
            const parts = [];
            if (item.address.house_number && item.address.road) {
              parts.push(`${item.address.house_number} ${item.address.road}`);
            } else if (item.address.road) {
              parts.push(item.address.road);
            }
            if (item.address.neighbourhood) parts.push(item.address.neighbourhood);
            if (item.address.suburb) parts.push(item.address.suburb);
            if (item.address.city || item.address.town || item.address.village) {
              parts.push(item.address.city || item.address.town || item.address.village);
            }
            if (item.address.state) parts.push(item.address.state);
            if (item.address.postcode) parts.push(item.address.postcode);
            
            formattedAddress = parts.join(', ') || item.display_name;
          } else {
            formattedAddress = item.display_name;
          }
          
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          let distance = 0;
          
          // Calculate distance from user location if available
          if (userLocation) {
            distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
          }
          
          return {
            id: `search-${index}`,
            name: locationName.trim(),
            address: formattedAddress,
            latitude: lat,
            longitude: lng,
            distance: distance
          };
        });
        
        // Sort by distance if user location is available
        if (userLocation) {
          searchResults.sort((a, b) => a.distance - b.distance);
        }
        
        setSuggestions(searchResults);
      } else {
        setSuggestions([]);
      }
      
    } catch (error) {
      console.log('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowAllResults(false); // Reset to show only top 3 results
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (query.length >= 3) {
      const timeoutId = setTimeout(() => {
        searchLocations(query);
      }, 500);
      setSearchTimeout(timeoutId);
    } else {
      setSuggestions([]);
      setIsSearching(false);
    }
  };

  const handleLocationSelect = async (location: LocationSuggestion) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const selectedAddress = {
        id: location.id || 'temp-' + Date.now(),
        type: 'selected',
        addressLine1: location.name,
        addressLine2: location.address,
        isDefault: false,
        fullAddress: location.address,
        address: location.address,
        name: location.name,
        timestamp: new Date().toISOString()
      };
      
      // Save to AsyncStorage for backward compatibility
      await AsyncStorage.setItem('selectedDeliveryAddress', JSON.stringify(selectedAddress));
      
      // Update Redux state
      dispatch(setSelectedAddress(selectedAddress));
    } catch (error) {
      console.log('Error saving selected address:', error);
    }
    router.back();
  };

  const handleCurrentLocation = () => {
    router.push('/map-picker');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>SELECT DELIVERY ADDRESS</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.searchContainer, { backgroundColor: colors.lightGray }]}>
          <Ionicons name="search" size={20} color={colors.gray} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search for area, street name..."
            placeholderTextColor={colors.gray}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus={false}
            editable={true}
            selectTextOnFocus={true}
          />
        </View>

        <TouchableOpacity 
          style={[styles.currentLocationButton, { backgroundColor: colors.lightGray }]}
          onPress={handleCurrentLocation}
        >
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={[styles.currentLocationText, { color: colors.text }]}>Your Current Location</Text>
        </TouchableOpacity>

        {isSearching && searchQuery.length > 2 && (
          <View style={styles.searchingContainer}>
            <Text style={[styles.searchingText, { color: colors.gray }]}>Searching...</Text>
          </View>
        )}

        {suggestions.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Search Results</Text>
            <FlatList
              data={showAllResults ? suggestions : suggestions.slice(0, 3)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleLocationSelect(item)}
                >
                  <Ionicons name="search" size={16} color={colors.primary} />
                  <View style={styles.suggestionContent}>
                    <Text style={[styles.suggestionName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.suggestionAddress, { color: colors.gray }]}>{item.address}</Text>
                  </View>
                </TouchableOpacity>
              )}
              scrollEnabled={showAllResults}
            />
            {suggestions.length > 3 && (
              <TouchableOpacity
                style={[styles.viewMoreButton, { backgroundColor: colors.lightGray }]}
                onPress={() => setShowAllResults(!showAllResults)}
              >
                <Text style={[styles.viewMoreText, { color: colors.primary }]}>
                  {showAllResults ? `Show Less (${suggestions.length - 3} hidden)` : `View More (${suggestions.length - 3} more)`}
                </Text>
                <Ionicons 
                  name={showAllResults ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {savedAddresses.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Saved Addresses</Text>
              <TouchableOpacity onPress={() => router.push('/add-address')}>
                <Text style={[styles.addAddressText, { color: colors.primary }]}>+ Add Address</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={savedAddresses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.suggestionItem, { borderBottomColor: colors.border, backgroundColor: colors.lightGray, borderRadius: 10, marginBottom: 8 }]}
                  onPress={() => {
                    const addressText = `${item.landmark ? item.landmark + ', ' : ''}${item.pincode ? item.pincode.city + ', ' + item.pincode.code : ''}`;
                    const selectedAddr = {
                      id: item.id,
                      type: item.type,
                      addressLine1: item.type.charAt(0).toUpperCase() + item.type.slice(1),
                      addressLine2: addressText,
                      isDefault: item.isDefault,
                      fullAddress: addressText,
                      address: addressText,
                      name: item.type.charAt(0).toUpperCase() + item.type.slice(1),
                      timestamp: new Date().toISOString()
                    };
                    
                    try {
                      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                      AsyncStorage.setItem('selectedDeliveryAddress', JSON.stringify(selectedAddr));
                      dispatch(setSelectedAddress(selectedAddr));
                    } catch (error) {
                      console.log('Error saving selected address:', error);
                    }
                    
                    router.back();
                  }}
                >
                  <Ionicons name={item.type === 'home' ? 'home' : item.type === 'office' ? 'business' : 'location'} size={16} color={colors.primary} />
                  <View style={styles.suggestionContent}>
                    <Text style={[styles.suggestionName, { color: colors.text }]}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
                    <Text style={[styles.suggestionAddress, { color: colors.gray }]}>
                      {item.landmark ? item.landmark + ', ' : ''}{item.pincode ? item.pincode.city + ', ' + item.pincode.code : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {savedLocations.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Locations</Text>
            <FlatList
              data={savedLocations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.savedLocationItem, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.locationContent}
                    onPress={() => {
                      const selectedAddr = {
                        id: item.id,
                        type: 'recent',
                        addressLine1: item.locality,
                        addressLine2: item.fullAddress,
                        isDefault: false,
                        fullAddress: item.fullAddress,
                        address: item.fullAddress,
                        name: item.locality,
                        timestamp: new Date().toISOString()
                      };
                      
                      try {
                        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                        AsyncStorage.setItem('selectedDeliveryAddress', JSON.stringify(selectedAddr));
                        dispatch(setSelectedAddress(selectedAddr));
                      } catch (error) {
                        console.log('Error saving selected address:', error);
                      }
                      
                      router.back();
                    }}
                  >
                    <Ionicons name="location" size={16} color={colors.primary} />
                    <View style={styles.suggestionContent}>
                      <Text style={[styles.suggestionName, { color: colors.text }]}>{item.locality}</Text>
                      <Text style={[styles.suggestionAddress, { color: colors.gray }]}>{item.fullAddress}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteSavedLocation(item.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.gray} />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}
      </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  currentLocationText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  suggestionContent: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  suggestionAddress: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  savedLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  searchingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  searchingText: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  addAddressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
});