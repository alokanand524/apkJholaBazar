import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import React, { useEffect, useState, useRef } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || Constants.expoConfig?.extra?.googleMapsApiKey;

export default function SearchDeliveryLocationScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setCurrentLocation(newLocation);
      
      const locationData = await reverseGeocode(newLocation.lat, newLocation.lng);
      if (locationData) {
        setSelectedLocation(locationData);
      }
      setIsLocationLoading(false);
    } catch (error) {
      console.log('Error getting location:', error);
      setIsLocationLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // Try Google Geocoding API first if available
      if (GOOGLE_MAPS_API_KEY) {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results?.length > 0) {
          return {
            latitude: lat,
            longitude: lng,
            address: data.results[0].formatted_address,
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
          address: `${address.district || address.city || ''}, ${address.region || ''}, ${address.postalCode || ''}`.trim(),
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
      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&components=country:in&types=geocode|establishment`;
      
      const response = await fetch(autocompleteUrl);
      const data = await response.json();
      console.log('📍 API Response:', data.status, data.predictions?.length || 0);
      
      if (data.status === 'OK' && data.predictions?.length > 0) {
        const results = data.predictions.slice(0, 5).map((prediction: any, index: number) => ({
          id: index,
          name: prediction.structured_formatting?.main_text || prediction.description.split(',')[0],
          address: prediction.description,
          place_id: prediction.place_id,
          latitude: null,
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

  const handleLocationSelect = async (location: any) => {
    setSearchQuery(location.name);
    setSearchResults([]);
    
    if (location.place_id) {
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${location.place_id}&key=${GOOGLE_MAPS_API_KEY}&fields=geometry`;
        const response = await fetch(detailsUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.result?.geometry?.location) {
          const locationData = await reverseGeocode(data.result.geometry.location.lat, data.result.geometry.location.lng);
          if (locationData) {
            setSelectedLocation(locationData);
          }
        }
      } catch (error) {
        console.log('❌ Error getting place details:', error);
      }
    }
  };

  const getMapHTML = () => {
    if (!currentLocation) return '';
    
    // Use Google Maps if API key is available, otherwise fallback to OpenStreetMap
    if (GOOGLE_MAPS_API_KEY) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100%; }
            .center-marker {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -100%);
              z-index: 1000;
              font-size: 30px;
              color: #00B761;
            }
            .current-location-btn {
              position: absolute;
              bottom: 170px;
              right: 50%;
              transform: translateX(50%);
              width: 180px;
              height: 50px;
              background: white;
              border-radius: 25px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              z-index: 1000;
              color: #00B761;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div class="center-marker">📍</div>
          <div class="current-location-btn" onclick="goToCurrentLocation()">
            📍 Current Location
          </div>
          
          <script>
            function initMap() {
              const map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: ${currentLocation.lat}, lng: ${currentLocation.lng} },
                zoom: 16,
                disableDefaultUI: true,
                zoomControl: false,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false
              });
              
              const userMarker = new google.maps.Marker({
                position: { lat: ${currentLocation.lat}, lng: ${currentLocation.lng} },
                map: map,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2
                }
              });
              
              window.goToCurrentLocation = function() {
                map.panTo({ lat: ${currentLocation.lat}, lng: ${currentLocation.lng} });
                map.setZoom(16);
              };
              
              map.addListener('center_changed', function() {
                const center = map.getCenter();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'locationChanged',
                  latitude: center.lat(),
                  longitude: center.lng()
                }));
              });
            }
          </script>
          <script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap"></script>
        </body>
        </html>
      `;
    }
    
    // Fallback to OpenStreetMap
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100%; }
          .center-marker {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -100%);
            z-index: 1000;
            font-size: 30px;
            color: #00B761;
          }
          .current-location-btn {
            position: absolute;
            bottom: 170px;
            right: 50%;
            transform: translateX(50%);
            width: 180px;
            height: 50px;
            background: white;
            border-radius: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 1000;
            color: #00B761;
          }
          .user-location {
            width: 16px;
            height: 16px;
            background: #4285F4;
            border-radius: 50%;
            box-shadow: 0 0 20px rgba(66, 133, 244, 0.9);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div class="center-marker">📍</div>
        <div class="current-location-btn" onclick="goToCurrentLocation()">
          📍 Current Location
        </div>
        
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${currentLocation.lat}, ${currentLocation.lng}], 16);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

          var currentLocationMarker = L.divIcon({
            html: '<div class="user-location"></div>',
            className: 'custom-div-icon',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });
          
          var userMarker = L.marker([${currentLocation.lat}, ${currentLocation.lng}], {
            icon: currentLocationMarker
          }).addTo(map);

          function goToCurrentLocation() {
            map.flyTo([${currentLocation.lat}, ${currentLocation.lng}], 16);
            userMarker.setLatLng([${currentLocation.lat}, ${currentLocation.lng}]);
          }

          map.on('move', function() {
            var center = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'locationChanged',
              latitude: center.lat,
              longitude: center.lng
            }));
          });
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationChanged') {
        const locationData = await reverseGeocode(data.latitude, data.longitude);
        if (locationData) {
          setSelectedLocation(locationData);
        }
      }
    } catch (error) {
      console.log('Error parsing message:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>


      <View style={styles.mapContainer}>
        {isLocationLoading || !currentLocation ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.lightGray }]}>
            <Ionicons name="location" size={50} color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Getting your current address...</Text>
          </View>
        ) : (
          <WebView
            source={{ html: getMapHTML() }}
            style={styles.map}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        )}
      </View>

      {/* Search Box at Top */}
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
        </View>
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={[styles.searchResultsContainer, { backgroundColor: colors.background }]}>
          <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.resultItem, { borderBottomColor: colors.border }]}
                onPress={() => handleLocationSelect(item)}
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

      {/* Delivery Section at Bottom */}
      <View style={[styles.bottomDeliverySection, { backgroundColor: colors.background }]}>
        <Text style={[styles.deliveryTitle, { color: colors.text }]}>Deliver to</Text>
        {selectedLocation && (
          <Text style={[styles.deliveryAddress, { color: colors.gray }]}>
            {selectedLocation.address}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.addAddressButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddressModal(true)}
        >
          <Text style={styles.addAddressText}>Add Address</Text>
        </TouchableOpacity>
      </View>

      <AddressModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        selectedLocation={selectedLocation}
      />
    </View>
  );
}

const AddressModal = ({ visible, onClose, selectedLocation }: any) => {
  const { colors } = useTheme();
  const [houseNo, setHouseNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [addressType, setAddressType] = useState('HOME');
  const [orderForFriend, setOrderForFriend] = useState(false);
  const [markAsDefault, setMarkAsDefault] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Enter More Details</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.locationBox, { backgroundColor: colors.lightGray }]}>
            <Text style={[styles.locationText, { color: colors.text }]}>
              {selectedLocation?.address || 'Select location'}
            </Text>
            <TouchableOpacity>
              <Text style={[styles.changeText, { color: colors.primary }]}>Change</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: colors.lightGray, color: colors.text }]}
            placeholder="House No. / Near by"
            placeholderTextColor={colors.gray}
            value={houseNo}
            onChangeText={setHouseNo}
          />

          <View style={styles.receiverSectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Receiver Info</Text>
            <TouchableOpacity
              style={styles.checkboxRowRight}
              onPress={() => setOrderForFriend(!orderForFriend)}
            >
              <Ionicons
                name={orderForFriend ? "checkbox" : "checkbox-outline"}
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.checkboxText, { color: colors.text }]}>Order for friend</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: colors.lightGray, color: colors.text }]}
            placeholder="Full name"
            placeholderTextColor={colors.gray}
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.lightGray, color: colors.text }]}
            placeholder="Mobile"
            placeholderTextColor={colors.gray}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.lightGray, color: colors.text }]}
            placeholder="Email"
            placeholderTextColor={colors.gray}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

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

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setMarkAsDefault(!markAsDefault)}
          >
            <Ionicons
              name={markAsDefault ? "checkbox" : "checkbox-outline"}
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.checkboxText, { color: colors.text }]}>Mark as Default</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.saveButtonText}>Save Address</Text>
          </TouchableOpacity>
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
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
  searchBoxContainer: {
    position: 'absolute',
    top: 20,
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
    top: 80,
    left: 16,
    right: 16,
    zIndex: 999,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 300,
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
  bottomDeliverySection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  deliveryTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  deliveryAddress: { fontSize: 14, marginBottom: 16 },
  addAddressButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addAddressText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalContent: { flex: 1, padding: 16 },
  locationBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationText: { flex: 1, fontSize: 14 },
  changeText: { fontSize: 14, fontWeight: '500' },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  receiverSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxText: { marginLeft: 2, fontSize: 16 },
  addressTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  typeButtonText: { fontSize: 14, fontWeight: '500' },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});