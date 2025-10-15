import EnterMoreDetailsModal from '@/components/EnterMoreDetailsModal';
import { ServiceAreaModal } from '@/components/ServiceAreaModal';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Toast } from '@/components/Toast';
import MapView, { Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { setSelectedAddress } from '@/store/slices/addressSlice';
import { API_ENDPOINTS } from '@/constants/api';

interface LocationData {
  latitude: number;
  longitude: number;
  locality: string;
  district: string;
  pincode: string;
}

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyA_0odOsTGuRjXcgoq_D7_ZBNuCxblh2a0';

console.log('🔑 Google Maps API Key:', GOOGLE_MAPS_API_KEY ? 'Found' : 'Missing');

export default function MapPickerScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 25.8625,
    longitude: 85.7806,
    latitudeDelta: 0.003,
    longitudeDelta: 0.003,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showServiceAreaModal, setShowServiceAreaModal] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastLocationRef = useRef<{lat: number, lng: number} | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    // Start with default location, then silently get user location
    setIsLoadingLocation(false);
    getCurrentLocationSilently();
  }, []);

  const getCurrentLocationSilently = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 300000,
      });
      
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      
      const locationData = await reverseGeocode(location.coords.latitude, location.coords.longitude);
      if (locationData) {
        setSelectedLocation(locationData);
      }
    } catch (error) {
      console.log('Silent location fetch failed:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission is required to use this feature', 'error');
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
      });
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      };
      setRegion(newRegion);
      
      const locationData = await reverseGeocode(location.coords.latitude, location.coords.longitude);
      if (locationData) {
        setSelectedLocation(locationData);
      }
      setIsLoadingLocation(false);
    } catch (error) {
      console.log('Error getting location:', error);
      setIsLoadingLocation(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // Try Google Geocoding API first if available
      if (GOOGLE_MAPS_API_KEY) {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&result_type=street_address|subpremise|premise|neighborhood|sublocality`;
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results?.length > 0) {
          const result = data.results[0];
          const components = result.address_components;
          
          let locality = '';
          let streetName = '';
          let district = '';
          let pincode = '';
          
          // Get detailed address components
          components.forEach((component: any) => {
            if (component.types.includes('route')) {
              streetName = component.long_name;
            }
            if (component.types.includes('sublocality_level_1')) {
              locality = component.long_name;
            } else if (component.types.includes('sublocality_level_2') && !locality) {
              locality = component.long_name;
            } else if (component.types.includes('sublocality') && !locality) {
              locality = component.long_name;
            } else if (component.types.includes('neighborhood') && !locality) {
              locality = component.long_name;
            } else if (component.types.includes('premise') && !locality) {
              locality = component.long_name;
            }
            
            if (component.types.includes('locality')) {
              district = component.long_name;
            }
            if (component.types.includes('postal_code')) {
              pincode = component.long_name;
            }
          });
          
          // Build full address
          const fullAddress = [streetName, locality, district, pincode].filter(Boolean).join(', ');
          
          return {
            latitude: lat,
            longitude: lng,
            locality: fullAddress || `${locality || district || 'Area'}, ${district || 'Ranchi'}, ${pincode}`,
            district: district || 'Ranchi',
            pincode: pincode || '',
          };
        }
      }
      
      // Fallback to Expo Location
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (result.length > 0) {
        const address = result[0];
        return {
          latitude: lat,
          longitude: lng,
          locality: address.district || address.city || address.subregion || '',
          district: address.city || address.region || '',
          pincode: address.postalCode || '',
        };
      }
    } catch (error) {
      console.log('Reverse geocoding error:', error);
    }
    return null;
  };

  const searchLocations = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.log('Google Maps API key not found');
      return;
    }

    try {
      console.log('🔍 Searching for:', query);
      // Use Autocomplete API - this works in React Native
      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&components=country:in&types=geocode|establishment`;
      
      const response = await fetch(autocompleteUrl);
      const data = await response.json();
      console.log('📍 API Response:', data.status, data.predictions?.length || 0);
      
      if (data.status === 'OK' && data.predictions?.length > 0) {
        // Show results immediately, get coordinates on selection
        const results = data.predictions.slice(0, 5).map((prediction: any, index: number) => ({
          id: index,
          name: prediction.structured_formatting?.main_text || prediction.description.split(',')[0],
          address: prediction.description,
          place_id: prediction.place_id,
          latitude: null, // Will get on selection
          longitude: null,
        }));
        
        console.log('✅ Final results:', results.length);
        setSearchResults(results);
      } else {
        console.log('❌ No predictions or API error:', data.error_message);
        setSearchResults([]);
      }
    } catch (error) {
      console.log('❌ Search error:', error);
      setSearchResults([]);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(query);
    }, 50);
  };

  const checkServiceArea = async (latitude: number, longitude: number): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.SERVICE_AREA.CHECK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude, longitude }),
      });
      const data = await response.json();
      return response.ok && data.success && data.data?.available;
    } catch (error) {
      console.log('Service area check failed:', error);
      return false;
    }
  };

  const handleSearchResultSelect = async (location: any) => {
    setSearchQuery(location.name);
    setSearchResults([]);
    
    // Get coordinates and check service area
    if (location.place_id) {
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${location.place_id}&key=${GOOGLE_MAPS_API_KEY}&fields=geometry,formatted_address`;
        const response = await fetch(detailsUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.result?.geometry?.location) {
          const lat = data.result.geometry.location.lat;
          const lng = data.result.geometry.location.lng;
          
          // Check if location is serviceable
          const isServiceable = await checkServiceArea(lat, lng);
          
          if (!isServiceable) {
            setShowServiceAreaModal(true);
            return;
          }
          
          const newRegion = {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
          };
          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
          
          // Parse the search result address directly
          const addressParts = location.address.split(', ');
          const locationData = {
            latitude: lat,
            longitude: lng,
            locality: location.name,
            district: addressParts.find(part => part.includes('Ranchi') || part.includes('Bihar') || part.includes('Jharkhand')) || 'Ranchi',
            pincode: addressParts.find(part => /^\d{6}$/.test(part)) || '',
          };
          
          setSelectedLocation(locationData);
        }
      } catch (error) {
        console.log('❌ Error getting place details:', error);
      }
    }
  };



  const handleLocationSelect = async () => {
    if (selectedLocation) {
      // Check if location is serviceable before showing address modal
      const isServiceable = await checkServiceArea(selectedLocation.latitude, selectedLocation.longitude);
      
      if (!isServiceable) {
        showToast('Sorry, we don\'t deliver to this area yet', 'error');
        return;
      }
      
      setShowAddressModal(true);
    }
  };

  const handleAddressSubmit = async (details: any) => {
    if (selectedLocation) {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const existingLocations = await AsyncStorage.getItem('savedLocations');
        const locations = existingLocations ? JSON.parse(existingLocations) : [];
        
        const fullAddress = `${selectedLocation.locality}, ${selectedLocation.district}, ${selectedLocation.pincode}`;
        
        const newLocation = {
          id: Date.now().toString(),
          locality: selectedLocation.locality,
          district: selectedLocation.district,
          pincode: selectedLocation.pincode,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          fullAddress: fullAddress,
          timestamp: new Date().toISOString(),
          customerDetails: details
        };
        
        // Save to recent locations
        locations.unshift(newLocation);
        await AsyncStorage.setItem('savedLocations', JSON.stringify(locations));
        
        // Create address object for Redux and AsyncStorage
        const selectedAddressData = {
          id: newLocation.id,
          type: 'map_selected',
          addressLine1: selectedLocation.locality,
          addressLine2: fullAddress,
          isDefault: false,
          fullAddress: fullAddress,
          address: fullAddress,
          name: selectedLocation.locality,
          timestamp: new Date().toISOString(),
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude
        };
        
        // Update Redux state
        dispatch(setSelectedAddress(selectedAddressData));
        
        // Update AsyncStorage for checkout
        await AsyncStorage.setItem('selectedDeliveryAddress', JSON.stringify(selectedAddressData));
        
        router.back();
      } catch (error) {
        console.log('Error saving location:', error);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Select Location</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.mapContainer}>
        {isLoadingLocation ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <Ionicons name="location" size={50} color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Getting your location...</Text>
          </View>
        ) : (
          <>
            <MapView
              ref={mapRef}
              style={styles.map}
              region={region}
              onRegionChangeComplete={(newRegion) => {
                setRegion(newRegion);
                const locationData = reverseGeocode(newRegion.latitude, newRegion.longitude);
                if (locationData) {
                  locationData.then(data => data && setSelectedLocation(data));
                }
              }}
              showsUserLocation={true}
              showsMyLocationButton={false}
              followsUserLocation={false}
              showsCompass={false}
              rotateEnabled={false}
              pitchEnabled={false}
            />
            
            <View style={styles.centerMarker}>
              <Ionicons name="pin" size={40} color={colors.primary} />
            </View>
            
            <TouchableOpacity 
              style={[styles.currentLocationBtn, { backgroundColor: colors.background }]}
              onPress={getCurrentLocation}
            >
              <Ionicons name="locate" size={20} color={colors.primary} />
              <Text style={[styles.currentLocationText, { color: colors.text }]}>Current Location</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={[styles.searchBoxContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.lightGray }]}>
          <Ionicons name="search" size={20} color={colors.gray} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search or enter shop/building name..."
            placeholderTextColor={colors.gray}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}>
              <Ionicons name="close-circle" size={20} color={colors.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchQuery.length > 0 && searchResults.length > 0 && (
        <View style={[styles.searchResultsContainer, { backgroundColor: colors.background }]}>
          <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.resultItem, { borderBottomColor: colors.border }]}
                onPress={() => handleSearchResultSelect(item)}
              >
                <Ionicons name="location" size={16} color={colors.primary} />
                <View style={styles.resultContent}>
                  <Text style={[styles.resultName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.resultAddress, { color: colors.gray }]}>{item.address}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={[styles.locationInfo, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.locationDetails}>
          <Text style={[styles.locationTitle, { color: colors.text }]}>Deliver to</Text>
          {selectedLocation ? (
            <>
              <Text 
                style={[styles.locationText, { color: colors.text }]} 
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {selectedLocation.locality}, {selectedLocation.district}, {selectedLocation.pincode}
              </Text>
              <Text style={[{ color: colors.gray, fontSize: 12, marginTop: 4 }]}>
                📍 {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
              </Text>
            </>
          ) : (
            <Text style={[styles.locationText, { color: colors.gray }]}>Loading location...</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: selectedLocation ? colors.primary : colors.gray }]}
          onPress={handleLocationSelect}
          disabled={!selectedLocation}
        >
          <Text style={styles.confirmButtonText}>Add Address</Text>
        </TouchableOpacity>
      </View>

      <EnterMoreDetailsModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSubmit={handleAddressSubmit}
        selectedLocation={selectedLocation}
      />
      
      <ServiceAreaModal
        visible={showServiceAreaModal}
        onCancel={() => setShowServiceAreaModal(false)}
        onNotifyMe={() => {
          setShowServiceAreaModal(false);
          showToast('We\'ll notify you when we start delivering to your area', 'success');
        }}
      />
      
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  centerMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    zIndex: 1000,
  },
  currentLocationBtn: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  currentLocationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  searchBoxContainer: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    zIndex: 1000,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: 190,
    left: 16,
    right: 16,
    zIndex: 1001,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    maxHeight: 350,
  },
  searchResults: {
    borderRadius: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  resultContent: {
    marginLeft: 12,
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
  },
  resultAddress: {
    fontSize: 14,
  },
  locationInfo: {
    padding: 16,
    borderTopWidth: 1,
  },
  locationDetails: {
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    marginBottom: 2,
  },
  confirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});