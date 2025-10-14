import { BannerCarousel } from '@/components/BannerCarousel';
import { ProductCard } from '@/components/ProductCard';
import { SectionCard } from '@/components/SectionCard';
import { SectionCardSkeleton } from '@/components/SectionCardSkeleton';
import { SectionHeader } from '@/components/SectionHeader';
import { ServiceAreaModal } from '@/components/ServiceAreaModal';
import { ProductCardSkeleton, SectionHeaderSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';

import { useLocation } from '@/hooks/useLocation';
import { useTheme } from '@/hooks/useTheme';
import { behaviorTracker } from '@/services/behaviorTracker';
import { setSelectedAddress, clearSelectedAddress } from '@/store/slices/addressSlice';
import { fetchCart } from '@/store/slices/cartSlice';
import { fetchCategories } from '@/store/slices/categoriesSlice';
import { fetchDeliveryTime } from '@/store/slices/deliverySlice';
import { setProducts } from '@/store/slices/productsSlice';
import { RootState } from '@/store/store';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import { API_ENDPOINTS } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useEffect } from 'react';
import { FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { handleTabBarScroll } from './_layout';

export default function HomeScreen() {
  const dispatch = useDispatch();
  const { products, selectedCategory, loading: productsLoading } = useSelector((state: RootState) => state.products);
  const { categories, loading: categoriesLoading } = useSelector((state: RootState) => state.categories);
  const { items } = useSelector((state: RootState) => state.cart);
  const { deliveryTime } = useSelector((state: RootState) => state.delivery);
  const { selectedAddress } = useSelector((state: RootState) => state.address);
  const { isLoggedIn } = useSelector((state: RootState) => state.user);
  const { colors } = useTheme();
  const { location, loading: locationLoading, error: locationError } = useLocation();
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [userLocation, setUserLocation] = React.useState<string | null>(null);
  const [apiProducts, setApiProducts] = React.useState([]);
  const [apiLoading, setApiLoading] = React.useState(true);
  const [featuredProducts, setFeaturedProducts] = React.useState([]);
  const [featuredLoading, setFeaturedLoading] = React.useState(true);
  const [apiCartCount, setApiCartCount] = React.useState(0);
  const [loadingStep, setLoadingStep] = React.useState('loading');
  const [deliveryEstimate, setDeliveryEstimate] = React.useState<string | null>(null);
  const [isServiceable, setIsServiceable] = React.useState<boolean>(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [showServiceModal, setShowServiceModal] = React.useState(false);
  const [serviceModalDismissed, setServiceModalDismissed] = React.useState(false);

  // Load dismissed state on component mount
  React.useEffect(() => {
    const loadDismissedState = async () => {
      try {
        const dismissed = await AsyncStorage.getItem('serviceModalDismissed');
        if (dismissed === 'true') {
          setServiceModalDismissed(true);
        }
      } catch (error) {
        logger.error('Error loading dismissed state', { error: error.message });
      }
    };
    loadDismissedState();
  }, []);


  const fetchApiProducts = async () => {
    try {
      setApiLoading(true);
      
      const response = await fetch(API_ENDPOINTS.PRODUCTS.ALL);
      const result = await response.json();
      
      const rawProducts = result.data?.products || [];
      const transformedProducts = rawProducts.map(product => ({
        id: product.id,
        name: product.name,
        image: product.images?.[0] || '',
        price: product.variants?.[0]?.price?.sellingPrice || '0',
        originalPrice: product.variants?.[0]?.price?.basePrice || '0',
        category: product.category?.name || 'General',
        description: product.description || product.shortDescription || '',
        unit: `${product.variants?.[0]?.weight || '1'} ${product.variants?.[0]?.baseUnit || 'unit'}`,
        inStock: product.variants?.[0]?.stock?.availableQty > 0,
        rating: 4.5,
        deliveryTime: '10 mins',
        variants: product.variants
      }));
      
      setApiProducts(transformedProducts.slice(0, 6));
    } catch (error) {
      logger.error('Error fetching products', { error: error.message });
      setApiProducts([]);
    } finally {
      setApiLoading(false);
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      setFeaturedLoading(true);
      
      const response = await fetch(API_ENDPOINTS.PRODUCTS.FEATURED);
      const result = await response.json();
      
      const rawProducts = result.data?.products || [];
      const transformedProducts = rawProducts.map(product => ({
        id: product.id,
        name: product.name,
        image: product.images?.[0] || '',
        price: product.variants?.[0]?.price?.sellingPrice || '0',
        originalPrice: product.variants?.[0]?.price?.basePrice || '0',
        category: product.category?.name || 'General',
        description: product.description || product.shortDescription || '',
        unit: `${product.variants?.[0]?.weight || '1'} ${product.variants?.[0]?.baseUnit || 'unit'}`,
        inStock: product.variants?.[0]?.stock?.availableQty > 0,
        rating: 4.5,
        deliveryTime: '10 mins',
        variants: product.variants
      }));
      
      setFeaturedProducts(transformedProducts);
    } catch (error) {
      logger.error('Error fetching featured products', { error: error.message });
      setFeaturedProducts([]);
    } finally {
      setFeaturedLoading(false);
    }
  };

  const loadSelectedAddress = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const address = await AsyncStorage.getItem('selectedDeliveryAddress');
        if (address) {
          dispatch(setSelectedAddress(JSON.parse(address)));
        }
      }
    } catch (error) {
      logger.error('Error loading selected address', { error: error.message });
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      // Step 1: Show carousel immediately
      await behaviorTracker.init();
      dispatch(setProducts([]));
      setLoadingStep('carousel');
      
      // Step 2: Load featured products
      await fetchFeaturedProducts();
      setLoadingStep('featured');
      
      // Step 3: Load categories (in background start location)
      getCurrentLocation();
      loadSelectedAddress();
      await dispatch(fetchCategories());
      setLoadingStep('categories');
      
      // Step 4: Load popular products
      await fetchApiProducts();
      
      // Step 5: Handle user data
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        dispatch(fetchCart());
        fetchCartCount();
      }
      
      setLoadingStep('complete');
      setIsInitialLoading(false);
    };
    
    initializeApp();
  }, [dispatch]);

  useFocusEffect(
    React.useCallback(() => {
      const checkAuthAndLoadAddress = async () => {
        const token = await AsyncStorage.getItem('authToken');
        
        if (token) {
          loadSelectedAddress();
          // Force refresh both Redux cart and API cart count
          await dispatch(fetchCart());
          await fetchCartCount();
        } else {
          dispatch(clearSelectedAddress());
          setApiCartCount(0);
          setDeliveryEstimate(null);
          setIsServiceable(true);
          // Always check serviceability to get delivery time
          if (location?.latitude && location?.longitude) {
            checkAddressServiceability(location.latitude.toString(), location.longitude.toString());
          }
        }
      };
      checkAuthAndLoadAddress();
    }, [dispatch, location])
  );

  // Check serviceability for selected address
  const checkAddressServiceability = async (latitude: string, longitude: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.SERVICE_AREA.CHECK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude,
          longitude
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success && result.data?.available) {
        const deliveryMinutes = result.data?.nearbyStores?.[0]?.delivery?.estimatedDeliveryMinutes;
        const deliveryMessage = deliveryMinutes ? `Delivery in ${deliveryMinutes} minutes` : 'Delivery available';
        setDeliveryEstimate(deliveryMessage);
        setIsServiceable(true);
      } else {
        setDeliveryEstimate('Not serviceable in this area');
        setIsServiceable(false);
      }
    } catch (error) {
      logger.error('Error checking serviceability', { error: error.message });
      setDeliveryEstimate('Unable to check serviceability');
      setIsServiceable(false);
    }
  };

  // Update serviceability when selected address changes or user login status changes
  useEffect(() => {
    if (isLoggedIn && selectedAddress?.latitude && selectedAddress?.longitude) {
      checkAddressServiceability(selectedAddress.latitude, selectedAddress.longitude);
    } else if (!isLoggedIn) {
      // Clear delivery estimate when user is not logged in
      setDeliveryEstimate(null);
      setIsServiceable(true);
      // Always check serviceability for current location to get delivery time
      if (location?.latitude && location?.longitude) {
        checkAddressServiceability(location.latitude.toString(), location.longitude.toString());
      }
    }
  }, [selectedAddress, isLoggedIn, location]);

  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      dispatch(fetchDeliveryTime({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString()
      }));
    }
  }, [location, dispatch]);



  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        logger.warn('Location permission denied');
        setUserLocation('Current Location');
        return;
      }

      // Get location with timeout
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 300000, // 5 minutes
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Location timeout')), 8000)
      );
      
      const currentLocation = await Promise.race([locationPromise, timeoutPromise]);
      const { latitude, longitude } = currentLocation.coords;
      
      // Reverse geocode with timeout
      try {
        const geocodePromise = Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        
        const geocodeTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Geocoding timeout')), 5000)
        );
        
        const reverseGeocode = await Promise.race([geocodePromise, geocodeTimeout]);
        
        if (reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          const place = address.district || address.subregion || '';
          const city = address.city || '';
          const pincode = address.postalCode || '';
          
          let locationParts = [];
          if (place) locationParts.push(place);
          if (city && city !== place) locationParts.push(city);
          if (pincode) locationParts.push(pincode);
          
          const locationString = locationParts.join(', ');
          setUserLocation(locationString || 'Current Location');
        } else {
          setUserLocation('Current Location');
        }
      } catch (geocodeError) {
        logger.warn('Geocoding failed', { error: geocodeError.message });
        setUserLocation('Current Location');
      }
      
      // Check serviceability for current location only if user is not logged in or no saved address
      const token = await AsyncStorage.getItem('authToken');
      const savedAddress = await AsyncStorage.getItem('selectedDeliveryAddress');
      if (!token || !savedAddress) {
        checkAddressServiceability(latitude.toString(), longitude.toString())
          .catch(err => logger.warn('Serviceability check failed', { error: err.message }));
      }
    } catch (error) {
      logger.error('Error getting location', { error: error.message });
      setUserLocation('Current Location');
    }
  };

  const filteredProducts = selectedCategory === 'All'
    ? products.slice(0, 6)
    : products.filter(product => product.category === selectedCategory).slice(0, 6);

  const fetchCartCount = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setApiCartCount(0);
        return;
      }

      const response = await fetch(API_ENDPOINTS.CART.BASE, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const cart = result.data?.carts?.[0];
        // Check if there are actual regular items (subtotal > 0)
        const hasRegularItems = cart?.summary?.subtotal > 0 || cart?.summary?.totalItems > 0;
        const itemCount = hasRegularItems ? (cart?.summary?.itemCount || 0) : 0;
        setApiCartCount(itemCount);
      } else {
        setApiCartCount(0);
      }
    } catch (error) {
      logger.error('Error fetching cart count', { error: error.message });
      setApiCartCount(0);
    }
  };

  // Use Redux cart count for immediate updates, fallback to API count
  const reduxCartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartItemsCount = reduxCartCount > 0 ? reduxCartCount : apiCartCount;

  const handleScroll = (event: any) => {
    handleTabBarScroll(event);
  };

  const handleNotifyMe = async () => {
    setShowServiceModal(false);
    setServiceModalDismissed(true);
    try {
      await AsyncStorage.setItem('serviceModalDismissed', 'true');
    } catch (error) {
      logger.error('Error saving dismissed state', { error: error.message });
    }
    // TODO: Implement notify me functionality (e.g., save user location for future notifications)
    logger.info('User requested notification for service area');
  };

  const handleCancelModal = async () => {
    setShowServiceModal(false);
    setServiceModalDismissed(true);
    try {
      await AsyncStorage.setItem('serviceModalDismissed', 'true');
    } catch (error) {
      logger.error('Error saving dismissed state', { error: error.message });
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh all data
      await Promise.all([
        fetchApiProducts(),
        fetchFeaturedProducts(),
        dispatch(fetchCategories()),
        isLoggedIn ? Promise.all([dispatch(fetchCart()), fetchCartCount()]) : Promise.resolve(),
        loadSelectedAddress()
      ]);
    } catch (error) {
      logger.error('Error refreshing home data', { error: error.message });
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, isLoggedIn]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.locationContainer}>
          {deliveryEstimate && (
            <Text style={[styles.deliveryTimeText, { 
              color: deliveryEstimate.includes('Not serviceable') ? 'red' : colors.primary,
              fontWeight: deliveryEstimate.includes('Not serviceable') ? 'bold' : '600'
            }]}>
              {deliveryEstimate}
            </Text>
          )}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[styles.locationText, { color: colors.gray }]}>Delivery to</Text>
            {locationLoading ? (
              <SkeletonLoader width="70%" height={12} />
            ) : (
              <TouchableOpacity onPress={() => router.push('/saved-locations')}>
                <Text style={[styles.addressText, { color: colors.text, fontWeight: 'bold' }]}>
                  {isLoggedIn && selectedAddress ? 
                    ((selectedAddress.address || selectedAddress.fullAddress || selectedAddress.addressLine2 || '').length > 28 ? 
                      (selectedAddress.address || selectedAddress.fullAddress || selectedAddress.addressLine2 || '').substring(0, 28) + '...' : 
                      (selectedAddress.address || selectedAddress.fullAddress || selectedAddress.addressLine2 || '')) : 
                    ((userLocation || 'Current Location').length > 28 ? (userLocation || 'Current Location').substring(0, 28) + '...' : (userLocation || 'Current Location'))
                  }
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.cartButton, { 
            backgroundColor: colors.lightGray,
            borderColor: colors.border,
            borderWidth: 1
          }]}
          onPress={() => router.push('/cart')}
        >
          <Ionicons name="bag" size={24} color={colors.primary} />
          {cartItemsCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.lightGray }]}>
        <Ionicons name="search" size={20} color={colors.gray} />
        <TouchableOpacity
          style={styles.searchTouchable}
          onPress={() => {
            router.push({
              pathname: '/search-results',
              params: { query: '' }
            });
          }}
        >
          <Text style={[styles.searchPlaceholder, { color: colors.gray }]}>Search for products</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        onScroll={handleScroll} 
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 0 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* 1. Carousel - Shows immediately */}
        <BannerCarousel />

        {/* 2. Featured Products - Shows after carousel */}
        {loadingStep === 'loading' ? <SectionHeaderSkeleton /> : <SectionHeader title="Featured this week" sectionType="featured" />}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productScroll}>
          {loadingStep === 'loading' || loadingStep === 'carousel' || featuredLoading ? (
            [1, 2, 3].map((item) => (
              <View key={item} style={styles.featuredCard}>
                <ProductCardSkeleton />
              </View>
            ))
          ) : featuredProducts.length > 0 ? (
            featuredProducts.map((item) => (
              <View key={item.id} style={styles.featuredCard}>
                <ProductCard product={item} isServiceable={isServiceable} />
              </View>
            ))
          ) : (
            <View style={styles.noProductsContainer}>
              <Text style={[styles.noProductsText, { color: colors.gray }]}>No featured products available</Text>
            </View>
          )}
        </ScrollView>

        {/* 3. Categories - Shows after featured */}
        {loadingStep === 'loading' || loadingStep === 'carousel' || loadingStep === 'featured' ? <SectionHeaderSkeleton /> : (
          <View style={styles.categoryHeader}>
            <Text style={[styles.categoryTitle, { color: colors.text }]}>Shop by category</Text>
          </View>
        )}
        <View style={styles.categoriesContainer}>
          {loadingStep === 'loading' || loadingStep === 'carousel' || loadingStep === 'featured' || categoriesLoading ? (
            <View style={styles.categoriesGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((item) => (
                <SectionCardSkeleton key={item} />
              ))}
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                <View key={category.id} style={styles.categoryItem}>
                  <SectionCard title={category.name} image={category.image} category={category.name} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Grocery Image */}
        <View style={styles.groceryImageContainer}>
          <Image 
            source={{ uri: 'https://res.cloudinary.com/dysfwwqn4/image/upload/banner.png' }} 
            style={styles.groceryImage}
            resizeMode="contain"
          />
        </View>

        {/* 4. Popular Products - Shows last */}
        <View style={styles.productsContainer}>
          {loadingStep === 'loading' || loadingStep === 'carousel' || loadingStep === 'featured' || loadingStep === 'categories' ? <SectionHeaderSkeleton /> : <SectionHeader title="Popular Products" sectionType="popular" />}
          {loadingStep === 'loading' || loadingStep === 'carousel' || loadingStep === 'featured' || loadingStep === 'categories' || apiLoading ? (
            <View style={styles.row}>
              <ProductCardSkeleton />
              <ProductCardSkeleton />
            </View>
          ) : apiProducts.length > 0 ? (
            <FlatList
              data={apiProducts}
              renderItem={({ item }) => <ProductCard product={item} isServiceable={isServiceable} />}
              keyExtractor={(item, index) => item.id || item._id || `product-${index}`}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.row}
            />
          ) : (
            <View style={styles.noProductsContainer}>
              <Text style={[styles.noProductsText, { color: colors.gray }]}>No products available</Text>
            </View>
          )}
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <Image 
            source={require('../../assets/images/jhola-bajar-footer.png')} 
            style={styles.footerImage}
            resizeMode="contain"
          />
        </View>
      </ScrollView>
      
      <ServiceAreaModal
        visible={showServiceModal}
        onCancel={handleCancelModal}
        onNotifyMe={handleNotifyMe}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  locationContainer: {
    flex: 1,
  },
  deliveryTimeText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '400',
  },
  addressText: {
    fontSize: 14,
    fontWeight: 'bold',
    flexWrap: 'wrap',
    flex: 1,
  },
  cartButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchTouchable: {
    flex: 1,
    marginLeft: 8,
  },
  searchPlaceholder: {
    fontSize: 16,
  },
  sectionScroll: {
    paddingLeft: 16,
    marginBottom: 20,
  },
  productScroll: {
    paddingLeft: 8,
    marginBottom: 20,
  },
  featuredCard: {
    width: 300,
    height: 230,
    marginRight: -140,
  },

  productsContainer: {
    padding: 16,
    paddingTop: 0,
    marginTop: -8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  categoryHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: -8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '23%',
    marginBottom: 12,
  },
  noProductsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noProductsText: {
    fontSize: 16,
    textAlign: 'center',
  },
  footerSection: {
    marginTop: 0,
    marginBottom: -20,
  },
  footerImage: {
    width: '100%',
    height: 300,
    backgroundColor: 'darken',
  },
  groceryImageContainer: {
    paddingHorizontal: 16,
    marginTop: -8,
    marginBottom: -8,
  },
    groceryImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
});