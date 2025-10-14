import { ImageWithLoading } from '@/components/ImageWithLoading';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { API_ENDPOINTS } from '@/constants/api';
import { useTheme } from '@/hooks/useTheme';
import { behaviorTracker } from '@/services/behaviorTracker';
import { addToCart, updateQuantity, fetchCart } from '@/store/slices/cartSlice';
import { fetchProductById } from '@/store/slices/productsSlice';
import { RootState } from '@/store/store';
import { tokenManager } from '@/utils/tokenManager';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Dimensions, Modal, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const [selectedVariant, setSelectedVariant] = React.useState(0);
  const [showElements, setShowElements] = React.useState({
    image: false,
    name: false,
    price: false,
    description: false,
    variants: false,
    features: false
  });
  const [refreshing, setRefreshing] = React.useState(false);
  const [showImageGallery, setShowImageGallery] = React.useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const [showDescription, setShowDescription] = React.useState(true);

  
  const { selectedProduct, productLoading } = useSelector((state: RootState) => state.products);
  const { isLoggedIn } = useSelector((state: RootState) => state.user);
  const cartItem = useSelector((state: RootState) => {
    if (!selectedProduct) return null;
    const currentVariant = selectedProduct.variants?.[selectedVariant];
    
    // First try to find by variantId if variant exists
    if (currentVariant?.id) {
      const variantMatch = state.cart.items.find(item => item.variantId === currentVariant.id);
      if (variantMatch) return variantMatch;
    }
    
    // Fallback: find by product id (for products added from home page without variant info)
    const productMatch = state.cart.items.find(item => item.id === selectedProduct.id && !item.variantId);
    if (productMatch) {
      return productMatch;
    }
    
    return null;
  });
  const totalCartCount = useSelector((state: RootState) => 
    state.cart.items.reduce((total, item) => total + item.quantity, 0)
  );

  React.useEffect(() => {
    if (id && typeof id === 'string') {
      dispatch(fetchProductById(id));
    }
  }, [dispatch, id]);

  React.useEffect(() => {
    if (selectedProduct) {
      behaviorTracker.trackProductView(selectedProduct.id, selectedProduct.category);
      
      // Reset selected variant when product changes
      setSelectedVariant(0);
      
      // Progressive loading animation
      const delays = [0, 150, 300, 450, 600, 750];
      const elements = ['image', 'name', 'price', 'description', 'variants', 'features'];
      
      elements.forEach((element, index) => {
        setTimeout(() => {
          setShowElements(prev => ({ ...prev, [element]: true }));
        }, delays[index]);
      });
    }
  }, [selectedProduct]);

  const onRefresh = React.useCallback(async () => {
    if (id && typeof id === 'string') {
      setRefreshing(true);
      try {
        await dispatch(fetchProductById(id));
      } finally {
        setRefreshing(false);
      }
    }
  }, [dispatch, id]);

  const openImageGallery = (index = 0) => {
    setSelectedImageIndex(index);
    setShowImageGallery(true);
  };

  const closeImageGallery = () => {
    setShowImageGallery(false);
  };

  if (productLoading || !selectedProduct) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Product Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.content}>
          <SkeletonLoader width="100%" height={220} />
          <View style={styles.productInfo}>
            <SkeletonLoader width={80} height={24} style={{ marginBottom: 12 }} />
            <SkeletonLoader width="70%" height={28} style={{ marginBottom: 4 }} />
            <SkeletonLoader width="40%" height={16} style={{ marginBottom: 12 }} />
            <SkeletonLoader width={120} height={16} style={{ marginBottom: 16 }} />
            <SkeletonLoader width={150} height={32} style={{ marginBottom: 20 }} />
            <SkeletonLoader width="100%" height={80} style={{ marginBottom: 20 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const addToCartAPI = async (variantId: string, quantity: number) => {
    try {
      // Get selected address
      const selectedAddressData = await AsyncStorage.getItem('selectedDeliveryAddress');
      let addressId = null;
      
      if (selectedAddressData) {
        const selectedAddress = JSON.parse(selectedAddressData);
        addressId = selectedAddress.id;
      }
      
      const payload = {
        variantId,
        quantity: quantity.toString(),
        ...(addressId && { addressId })
      };

      const response = await tokenManager.makeAuthenticatedRequest(`${API_ENDPOINTS.BASE_URL}/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Add to cart API response:', data);
        return data.data?.cartItem?.id || data.data?.id || true;
      }
      return false;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
    }
  };

  const checkServiceability = async () => {
    try {
      const selectedAddressData = await AsyncStorage.getItem('selectedDeliveryAddress');
      
      if (selectedAddressData) {
        const selectedAddress = JSON.parse(selectedAddressData);
        if (selectedAddress.latitude && selectedAddress.longitude) {
          const response = await fetch(API_ENDPOINTS.SERVICE_AREA.CHECK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: selectedAddress.latitude,
              longitude: selectedAddress.longitude
            })
          });
          
          const result = await response.json();
          return result.success && result.data?.available;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const handleAddToCart = async () => {
    // Check if area is serviceable
    const isServiceable = await checkServiceability();
    if (!isServiceable) {
      Alert.alert('Not Serviceable', 'Sorry, we don\'t deliver to your area');
      return;
    }
    
    // Check if user is logged in
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    
    const currentVariant = selectedProduct.variants?.[selectedVariant];
    const price = currentVariant?.price?.sellingPrice || selectedProduct.price;
    const minQty = currentVariant?.minOrderQty || 1;
    
    if (currentVariant?.stock?.availableQty === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Out of Stock', 'This variant is currently out of stock');
      return;
    }
    
    const variantId = currentVariant?.id;
    const apiVariantId = variantId || selectedProduct.id;
    const token = await AsyncStorage.getItem('authToken');
    let cartItemId = null;
    
    if (token) {
      cartItemId = await addToCartAPI(apiVariantId, minQty);
      if (!cartItemId) {
        Alert.alert('Error', 'Failed to add item to cart');
        return;
      }
      // Refresh cart to get updated cartItemId
      await dispatch(fetchCart());
    }
    
    // Always update local state for better UX
    const cartData = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: parseFloat(price),
      image: selectedProduct.image,
      category: selectedProduct.category,
      quantity: minQty,
      ...(cartItemId && typeof cartItemId === 'string' && { cartItemId })
    };
    
    if (variantId) {
      cartData.variantId = variantId;
    }
    
    dispatch(addToCart(cartData));
  };

  const handleIncrement = async () => {
    const isServiceable = await checkServiceability();
    if (!isServiceable) {
      Alert.alert('Not Serviceable', 'Sorry, we don\'t deliver to your area');
      return;
    }
    
    const variant = selectedProduct.variants?.[selectedVariant];
    const maxQty = variant?.maxOrderQty || 999;
    
    if (cartItem!.quantity >= maxQty) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Max Order Limit', `You can order maximum ${maxQty} units of this product`);
      return;
    }
    
    const variantId = variant?.id;
    const updateData = { id: selectedProduct.id, quantity: cartItem!.quantity + 1 };
    if (variantId) updateData.variantId = variantId;
    dispatch(updateQuantity(updateData));
    
    // Always try API call if user is logged in
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      const cartItemId = cartItem?.cartItemId;
      if (cartItemId) {
        try {
          await tokenManager.makeAuthenticatedRequest(API_ENDPOINTS.CART.INCREMENT(cartItemId), {
            method: 'PATCH'
          });
          // Refresh cart to sync with server
          await dispatch(fetchCart());
        } catch (error) {
          console.error('Error incrementing quantity:', error);
          const revertData = { id: selectedProduct.id, quantity: cartItem!.quantity };
          if (variantId) revertData.variantId = variantId;
          dispatch(updateQuantity(revertData));
        }
      } else {
        console.warn('No cartItemId found for increment operation');
      }
    }
  };

  const handleDecrement = async () => {
    const isServiceable = await checkServiceability();
    if (!isServiceable) {
      Alert.alert('Not Serviceable', 'Sorry, we don\'t deliver to your area');
      return;
    }
    
    const variant = selectedProduct.variants?.[selectedVariant];
    const minQty = variant?.minOrderQty || 1;
    
    if (cartItem!.quantity <= minQty) {
      Alert.alert(
        'Remove Item',
        'Do you want to remove this item from cart?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: async () => {
              const variantId = variant?.id;
              const updateData = { id: selectedProduct.id, quantity: 0 };
              if (variantId) updateData.variantId = variantId;
              dispatch(updateQuantity(updateData));
              
              // Also remove from API
              const token = await AsyncStorage.getItem('authToken');
              if (token) {
                const cartItemId = cartItem?.cartItemId;
                if (cartItemId) {
                  try {
                    await tokenManager.makeAuthenticatedRequest(API_ENDPOINTS.CART.ITEM_BY_ID(cartItemId), {
                      method: 'DELETE'
                    });
                    // Refresh cart to sync with server
                    await dispatch(fetchCart());
                  } catch (error) {
                    console.error('Error removing item:', error);
                  }
                } else {
                  console.warn('No cartItemId found for delete operation');
                }
              }
            }
          }
        ]
      );
      return;
    }
    
    const variantId = variant?.id;
    const updateData = { id: selectedProduct.id, quantity: cartItem!.quantity - 1 };
    if (variantId) updateData.variantId = variantId;
    dispatch(updateQuantity(updateData));
    
    // Always try API call if user is logged in
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      const cartItemId = cartItem?.cartItemId;
      if (cartItemId) {
        try {
          await tokenManager.makeAuthenticatedRequest(API_ENDPOINTS.CART.DECREMENT(cartItemId), {
            method: 'PATCH'
          });
          // Refresh cart to sync with server
          await dispatch(fetchCart());
        } catch (error) {
          console.error('Error decrementing quantity:', error);
          const revertData = { id: selectedProduct.id, quantity: cartItem!.quantity };
          if (variantId) revertData.variantId = variantId;
          dispatch(updateQuantity(revertData));
        }
      } else {
        console.warn('No cartItemId found for decrement operation');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Product Details</Text>
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => router.push('/cart')}
        >
          <Ionicons name="bag" size={24} color={colors.primary} />
          {totalCartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalCartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Fixed Image Section */}
      <View style={styles.imageContainer}>
        {showElements.image ? (
          selectedProduct.images && selectedProduct.images.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {selectedProduct.images.map((image, index) => (
                <TouchableOpacity key={index} onPress={() => openImageGallery(index)}>
                  <ImageWithLoading 
                    source={{ uri: image }} 
                    height={220} 
                    style={styles.productImage} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity onPress={() => openImageGallery(0)}>
              <ImageWithLoading 
                source={{ uri: selectedProduct.image || selectedProduct.images?.[0] }} 
                height={220} 
                style={styles.productImage} 
              />
            </TouchableOpacity>
          )
        ) : (
          <SkeletonLoader width="100%" height={220} />
        )}
      </View>

      {/* Scrollable Content Section */}
      <ScrollView 
        style={styles.scrollableContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        
        <View style={styles.productInfo}>
          {showElements.name ? (
            <>
              <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.categoryText}>{selectedProduct.category?.name || selectedProduct.category}</Text>
              </View>
              
              {selectedProduct.brand && (
                <Text style={[styles.brandText, { color: colors.gray }]}>{selectedProduct.brand.name}</Text>
              )}
              
              <Text style={[styles.productName, { color: colors.text }]}>{selectedProduct.name}</Text>
              <Text style={[styles.productUnit, { color: colors.gray }]}>{selectedProduct.shortDescription}</Text>
            </>
          ) : (
            <>
              <SkeletonLoader width={80} height={24} style={{ marginBottom: 12 }} />
              <SkeletonLoader width="70%" height={28} style={{ marginBottom: 4 }} />
              <SkeletonLoader width="40%" height={16} style={{ marginBottom: 16 }} />
            </>
          )}
          
          {showElements.price ? (
            <View style={styles.priceContainer}>
            {selectedProduct.variants && selectedProduct.variants[selectedVariant] ? (
              <>
                <Text style={[styles.price, { color: colors.text }]}>₹{selectedProduct.variants[selectedVariant].price?.sellingPrice}</Text>
                {selectedProduct.variants[selectedVariant].price?.basePrice && (
                  <Text style={styles.originalPrice}>₹{selectedProduct.variants[selectedVariant].price?.basePrice}</Text>
                )}
                {selectedProduct.variants[selectedVariant].price?.basePrice && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {Math.round(((selectedProduct.variants[selectedVariant].price?.basePrice - selectedProduct.variants[selectedVariant].price?.sellingPrice) / selectedProduct.variants[selectedVariant].price?.basePrice) * 100)}% OFF
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={[styles.price, { color: colors.text }]}>₹{selectedProduct.price}</Text>
                {selectedProduct.originalPrice && (
                  <Text style={styles.originalPrice}>₹{selectedProduct.originalPrice}</Text>
                )}
              </>
            )}
            </View>
          ) : (
            <SkeletonLoader width={150} height={32} style={{ marginBottom: 20 }} />
          )}
          
          {/* Variant Selection */}
          {showElements.variants && selectedProduct.variants && selectedProduct.variants.length > 0 && (
            <View style={styles.weightContainer}>
              <Text style={[styles.weightTitle, { color: colors.text }]}>Available Variants</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weightScroll}>
                {selectedProduct.variants.map((variant, index) => (
                  <TouchableOpacity 
                    key={variant.id} 
                    style={[
                      styles.variantCard, 
                      { 
                        borderColor: selectedVariant === index ? colors.primary : colors.border,
                        opacity: variant.stock?.availableQty === 0 ? 0.5 : 1
                      },
                      selectedVariant === index && { backgroundColor: colors.lightGray }
                    ]}
                    onPress={() => setSelectedVariant(index)}
                  >
                    {variant.images && variant.images[0] && (
                      <ImageWithLoading 
                        source={{ uri: variant.images[0] }} 
                        height={60} 
                        style={styles.variantImage}
                      />
                    )}
                    <Text style={[styles.weightText, { color: colors.text }]}>
                      {variant.weight} {variant.baseUnit}
                    </Text>
                    <Text style={[styles.weightPrice, { color: colors.primary }]}>
                      ₹{variant.price?.sellingPrice}
                    </Text>
                    {variant.price?.basePrice && variant.price.basePrice !== variant.price.sellingPrice && (
                      <Text style={[styles.variantOriginalPrice, { color: colors.gray }]}>
                        ₹{variant.price.basePrice}
                      </Text>
                    )}
                    <Text style={[styles.stockText, { color: variant.stock?.availableQty === 0 ? 'red' : 'green' }]}>
                      {variant.stock?.availableQty === 0 ? 'Out of Stock' : 'In Stock'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {showElements.description ? (
            <View style={styles.descriptionContainer}>
              <TouchableOpacity 
                style={styles.descriptionToggle}
                onPress={() => setShowDescription(!showDescription)}
              >
                <Text style={[styles.descriptionTitle, { color: colors.text }]}>Product Details</Text>
                <Ionicons 
                  name={showDescription ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.text} 
                />
              </TouchableOpacity>
              {showDescription && (
                <Text style={[styles.description, { color: colors.gray }]}>{selectedProduct.description}</Text>
              )}
            </View>
          ) : (
            <SkeletonLoader width="100%" height={80} style={{ marginBottom: 20 }} />
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.priceInfo}>
          <View style={styles.footerPriceContainer}>
            <Text style={[styles.footerPrice, { color: colors.text }]}>
              ₹{selectedProduct.variants?.[selectedVariant]?.price?.sellingPrice || selectedProduct.price}
            </Text>
            {(selectedProduct.variants?.[selectedVariant]?.price?.basePrice || selectedProduct.originalPrice) && (
              <Text style={[styles.footerOriginalPrice, { color: colors.gray }]}>
                ₹{selectedProduct.variants?.[selectedVariant]?.price?.basePrice || selectedProduct.originalPrice}
              </Text>
            )}
          </View>
          <Text style={[styles.footerUnit, { color: colors.gray }]}>
            {selectedProduct.variants?.[selectedVariant] ? 
              `${selectedProduct.variants[selectedVariant].weight} ${selectedProduct.variants[selectedVariant].baseUnit}` : 
              selectedProduct.unit
            }
          </Text>
        </View>
        
        <View style={styles.buttonContainer}>
          {cartItem ? (
            <>
              <View style={[styles.quantityContainer, { backgroundColor: colors.primary }]}>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={handleDecrement}
                >
                  <Ionicons name="remove" size={20} color="#ffffffff" />
                </TouchableOpacity>
                <Text style={styles.quantity}>{cartItem.quantity}</Text>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={handleIncrement}
                >
                  <Ionicons name="add" size={20} color="#ffffffff" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.goToJholaButton}
                onPress={() => router.push('/cart')}
              >
                <Text style={styles.goToJholaText}>Go to Jhola</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[
                styles.addToCartButton, 
                { backgroundColor: selectedProduct.variants?.[selectedVariant]?.stock?.availableQty === 0 ? colors.gray : colors.primary }
              ]} 
              onPress={handleAddToCart}
              disabled={selectedProduct.variants?.[selectedVariant]?.stock?.availableQty === 0}
            >
              <Text style={styles.addToCartText}>
                {selectedProduct.variants?.[selectedVariant]?.stock?.availableQty === 0 ? 'Out of Stock' : 'Add to Jhola'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>


      {/* Image Gallery Modal */}
      <Modal
        visible={showImageGallery}
        transparent={false}
        animationType="fade"
        onRequestClose={closeImageGallery}
        statusBarTranslucent={true}
      >
        <StatusBar backgroundColor={colors.background} barStyle={colors.background === '#fff' ? 'dark-content' : 'light-content'} />
        <View style={[styles.galleryContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.galleryHeader, { backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={closeImageGallery} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
              setSelectedImageIndex(index);
            }}
            contentOffset={{ x: selectedImageIndex * Dimensions.get('window').width, y: 0 }}
            style={styles.mainImageContainer}
          >
            {(selectedProduct.images || [selectedProduct.image]).map((image, index) => (
              <View key={index} style={styles.imageSlide}>
                <ImageWithLoading
                  source={{ uri: image }}
                  height={Dimensions.get('window').height * 0.6}
                  style={styles.mainGalleryImage}
                />
              </View>
            ))}
          </ScrollView>

          {selectedProduct.images && selectedProduct.images.length > 1 && (
            <View style={styles.thumbnailContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailScroll}
              >
                {selectedProduct.images.map((image, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedImageIndex(index)}
                    style={[
                      styles.thumbnailCard,
                      { borderColor: selectedImageIndex === index ? colors.primary : colors.border }
                    ]}
                  >
                    <ImageWithLoading
                      source={{ uri: image }}
                      height={60}
                      style={styles.thumbnailImage}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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
  content: {
    flex: 1,
  },
  scrollableContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  productImage: {
    width: 300,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productUnit: {
    fontSize: 16,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rating: {
    fontSize: 14,
    marginLeft: 4,
  },
  deliveryTime: {
    fontSize: 14,
    marginLeft: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 12,
  },
  discountBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 12,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  weightContainer: {
    marginBottom: 20,
  },
  weightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  weightScroll: {
    paddingVertical: 4,
  },
  weightCard: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  weightText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  weightPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  priceInfo: {
    flex: 1,
  },
  footerPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  footerOriginalPrice: {
    fontSize: 16,
    textDecorationLine: 'line-through',
  },
  footerUnit: {
    fontSize: 14,
  },
  addToCartButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  quantityButton: {
    padding: 8,
  },
  quantity: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
  },
  cartButton: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
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
  outOfStock: {
    fontSize: 10,
    marginTop: 2,
  },
  imageContainer: {
    height: 220,
    backgroundColor: '#f5f5f5',
  },
  imageScroll: {
    height: 220,
  },


  brandText: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  variantCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#00B761',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  variantImage: {
    width: 60,
    borderRadius: 8,
    marginBottom: 8,
  },
  variantOriginalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  stockText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  galleryContainer: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 0,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  mainImageContainer: {
    flex: 1,
  },
  imageSlide: {
    width: Dimensions.get('window').width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  mainGalleryImage: {
    width: '100%',
    resizeMode: 'contain',
  },
  thumbnailContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  thumbnailScroll: {
    paddingHorizontal: 8,
  },
  thumbnailCard: {
    marginHorizontal: 4,
    borderWidth: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: 60,
    borderRadius: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goToJholaButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goToJholaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});