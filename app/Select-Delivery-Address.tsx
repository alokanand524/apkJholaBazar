import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export default function SelectDeliveryAddressScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [currentLocation, setCurrentLocation] = useState({ lat: 28.6139, lng: 77.2090 });
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

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
          address: `${address.district || address.city || ''}, ${address.region || ''}, ${address.postalCode || ''}`.trim(),
        };
      }
    } catch (error) {
      console.log('Reverse geocoding error:', error);
    }
    return null;
  };

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`,
        { headers: { 'User-Agent': 'JholaBazar/1.0' } }
      );
      const data = await response.json();
      setSearchResults(data.map((item: any, index: number) => ({
        id: index,
        name: item.display_name.split(',')[0],
        address: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      })));
    } catch (error) {
      console.log('Search error:', error);
      setSearchResults([]);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchLocations(query);
  };

  const handleLocationSelect = (location: any) => {
    setSelectedLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
    });
    setSearchQuery(location.name);
    setSearchResults([]);
  };

  const mapHTML = `
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" fill="#666"/>
        </svg> &nbsp; <p>Current Location</p>
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
        <WebView
          source={{ html: mapHTML }}
          style={styles.map}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
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

      {/* Search Results - Separate Container */}
      {searchResults.length > 0 && (
        <View style={[styles.searchResultsContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.searchResults, { backgroundColor: colors.background }]}>
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
          </View>
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
    marginTop: 20,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, },
  searchResults: {
    borderRadius: 10,
    maxHeight: 600,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  resultContent: { marginLeft: 12, flex: 1 },
  resultName: { fontSize: 16, fontWeight: '500' },
  resultAddress: { fontSize: 14 },
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