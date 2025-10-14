import EnterMoreDetailsModal from '@/components/EnterMoreDetailsModal';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import Constants from 'expo-constants';

interface LocationData {
  latitude: number;
  longitude: number;
  locality: string;
  district: string;
  pincode: string;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function MapPickerScreen() {
  const { colors } = useTheme();
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to use this feature');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      
      const locationData = await reverseGeocode(location.coords.latitude, location.coords.longitude);
      if (locationData) {
        setSelectedLocation(locationData);
      }
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
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

  const searchPlaces = async (query: string) => {
    if (query.length < 2) {
      setPredictions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&components=country:in&types=geocode`
      );
      const data = await response.json();
      if (data.predictions) {
        setPredictions(data.predictions.slice(0, 5));
      }
    } catch (error) {
      console.log('Search error:', error);
      setPredictions([]);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(query);
    }, 300);
  };

  const handlePredictionSelect = async (prediction: PlacePrediction) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${GOOGLE_MAPS_API_KEY}&fields=geometry`
      );
      const data = await response.json();
      
      if (data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        const newRegion = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        
        const locationData = await reverseGeocode(lat, lng);
        if (locationData) {
          setSelectedLocation(locationData);
        }
      }
    } catch (error) {
      console.log('Place details error:', error);
    }
    
    setSearchQuery(prediction.structured_formatting.main_text);
    setPredictions([]);
  };

  const handleRegionChange = async (newRegion: Region) => {
    setRegion(newRegion);
    const locationData = await reverseGeocode(newRegion.latitude, newRegion.longitude);
    if (locationData) {
      setSelectedLocation(locationData);
    }
  };

  const handleCurrentLocationPress = () => {
    getCurrentLocation();
  };

  const handleLocationSelect = () => {
    if (selectedLocation) {
      setShowAddressModal(true);
    }
  };

  const handleAddressSubmit = async (details: any) => {
    if (selectedLocation) {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const existingLocations = await AsyncStorage.getItem('savedLocations');
        const locations = existingLocations ? JSON.parse(existingLocations) : [];
        
        const newLocation = {
          id: Date.now().toString(),
          locality: selectedLocation.locality,
          district: selectedLocation.district,
          pincode: selectedLocation.pincode,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          fullAddress: `${selectedLocation.locality}, ${selectedLocation.district}, ${selectedLocation.pincode}`,
          timestamp: new Date().toISOString(),
          customerDetails: details
        };
        
        locations.unshift(newLocation);
        await AsyncStorage.setItem('savedLocations', JSON.stringify(locations));
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
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onRegionChangeComplete={handleRegionChange}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          <Marker coordinate={region} />
        </MapView>
        
        <View style={styles.centerMarker}>
          <Ionicons name="location" size={30} color={colors.primary} />
        </View>
        
        <TouchableOpacity 
          style={[styles.currentLocationBtn, { backgroundColor: colors.background }]}
          onPress={handleCurrentLocationPress}
        >
          <Ionicons name="locate" size={20} color={colors.primary} />
          <Text style={[styles.currentLocationText, { color: colors.text }]}>Current Location</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBoxContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.lightGray }]}>
          <Ionicons name="search" size={20} color={colors.gray} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search for area, street name..."
            placeholderTextColor={colors.gray}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setPredictions([]);
            }}>
              <Ionicons name="close-circle" size={20} color={colors.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {predictions.length > 0 && (
        <View style={[styles.searchResultsContainer, { backgroundColor: colors.background }]}>
          <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
            {predictions.map((prediction) => (
              <TouchableOpacity
                key={prediction.place_id}
                style={[styles.resultItem, { borderBottomColor: colors.border }]}
                onPress={() => handlePredictionSelect(prediction)}
              >
                <Ionicons name="location" size={16} color={colors.primary} />
                <View style={styles.resultContent}>
                  <Text style={[styles.resultName, { color: colors.text }]}>
                    {prediction.structured_formatting.main_text}
                  </Text>
                  <Text style={[styles.resultAddress, { color: colors.gray }]}>
                    {prediction.structured_formatting.secondary_text}
                  </Text>
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
            <Text style={[styles.locationText, { color: colors.text }]}>
              {selectedLocation.locality && `${selectedLocation.locality}, `}
              {selectedLocation.district && `${selectedLocation.district}, `}
              {selectedLocation.pincode && selectedLocation.pincode}
            </Text>
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
    marginLeft: -15,
    marginTop: -30,
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
    zIndex: 999,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
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
});