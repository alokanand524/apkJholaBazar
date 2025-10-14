import { ImageWithLoading } from '@/components/ImageWithLoading';
import { API_ENDPOINTS } from '@/constants/api';
import { useCartReminder } from '@/hooks/useCartReminder';
import { useTheme } from '@/hooks/useTheme';
import { addToCart, updateQuantity } from '@/store/slices/cartSlice';
import { Product } from '@/store/slices/productsSlice';
import { RootState } from '@/store/store';
import { showQuantityAlert, showRemoveItemAlert, validateQuantityDecrease, validateQuantityIncrease } from '@/utils/cartValidation';
import { tokenManager } from '@/utils/tokenManager';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

interface ProductCardProps {
  product: Product;
  isServiceable?: boolean;
}

const sizeOptions = ['100g', '200g', '500g', '1kg', '2kg'];

export const ProductCard: React.FC<ProductCardProps> = ({ product, isServiceable = true }) => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { onCartUpdated } = useCartReminder();
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const { isLoggedIn } = useSelector((state: RootState) => state.user);
  const cartItem = useSelector((state: RootState) => 
    state.cart.items.find(item => item.id === product.id)
  );

  // Check if product has multiple size options
  const hasMultipleSizes = product.category === 'Vegetables' || product.category === 'Fruits';

  // Handle Android back button for modals
  useEffect(() => {
    const backAction = () => {
      if (showVariantModal) {
        setShowVariantModal(false);
        return true;
      }
      if (showSizeModal) {
        setShowSizeModal(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showVariantModal, showSizeModal]);



  const checkUserAddress = async () => {
    try {
      // First check if there's a selected address in AsyncStorage
      const selectedAddress = await AsyncStorage.getItem('selectedDeliveryAddress');
      if (selectedAddress) {
        return true;
      }
      
      const response = await tokenManager.makeAuthenticatedRequest(API_ENDPOINTS.ADDRESSES.ALL);
      
      if (response.ok) {
        const data = await response.json();
        return data.success && data.data && data.data.length > 0;
      }
      return false;
    } catch (error) {
      console.error('Error checking addresses:', error);
      return false;
    }
  };

  const addToCartAPI = async (variantId: string, quantity: number) => {
    try {
      // Check if user has delivery address
      const hasAddress = await checkUserAddress();
      if (!hasAddress) {
        router.push('/add-address');
        return null;
      }
      
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
        return data.data.id;
      }
      return null;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return null;
    }
  };

  const handleAddToCart = async (selectedSize?: string, selectedVariantId?: string) => {
    // If product has variants and no variant selected, show variant modal first
    if (product.variants && product.variants.length > 1 && !cartItem && !selectedVariantId) {
      setShowVariantModal(true);
      return;
    }
    
    if (hasMultipleSizes && !cartItem && !selectedSize) {
      setShowSizeModal(true);
      return;
    }
    
    // Check if user is logged in first
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    
    // After login, check if area is serviceable
    if (!isServiceable) {
      alert('Sorry, we don\'t deliver to your area');
      return;
    }
    
    // Get variantId from product (assuming it's in variants array)
    const variantId = selectedVariantId || product.variants?.[0]?.id || product.id;
    const quantity = 1; // Always add 1 for new items
    
    // Check token directly instead of Redux state
    const token = await AsyncStorage.getItem('authToken');
    let apiSuccess = false;
    
    if (token) {
      apiSuccess = await addToCartAPI(variantId, quantity);
    }
    
    // Only update local state if API call succeeded or no token
    if (apiSuccess || !token) {
      const selectedVariant = product.variants?.find(v => v.id === variantId) || product.variants?.[0];
      dispatch(addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        cartItemId: apiSuccess || undefined,
        minOrderQty: selectedVariant?.minOrderQty,
        maxOrderQty: selectedVariant?.maxOrderQty,
        incrementQty: selectedVariant?.incrementQty,
      }));
      // Schedule cart reminders after adding item
      onCartUpdated();
    }
    
    if (selectedSize) {
      setShowSizeModal(false);
    }
    if (selectedVariantId) {
      setShowVariantModal(false);
    }
  };

  const handleIncrement = async () => {
    if (!isServiceable) {
      alert('Sorry, we don\'t deliver to your area');
      return;
    }
    
    const variant = product.variants?.[0];
    if (!variant) return;
    
    const validation = validateQuantityIncrease(cartItem!.quantity, variant);
    
    if (!validation.isValid) {
      showQuantityAlert('Cannot Add More', validation.message!, undefined, false, true);
      return;
    }
    
    // Update Redux state immediately for instant UI feedback
    dispatch(updateQuantity({ id: product.id, quantity: cartItem!.quantity + 1 }));
    
    const cartItemId = cartItem?.cartItemId;
    
    if (cartItemId) {
      try {
        await tokenManager.makeAuthenticatedRequest(API_ENDPOINTS.CART.INCREMENT(cartItemId), {
          method: 'PATCH'
        });
      } catch (error) {
        console.error('Error incrementing quantity:', error);
        // Revert on error
        dispatch(updateQuantity({ id: product.id, quantity: cartItem!.quantity }));
      }
    }
  };

  const handleDecrement = async () => {
    if (!isServiceable) {
      alert('Sorry, we don\'t deliver to your area');
      return;
    }
    
    const variant = product.variants?.[0];
    if (!variant) return;
    
    const validation = validateQuantityDecrease(cartItem!.quantity, variant);
    
    if (!validation.isValid) {
      // Capture values before showing dialog to prevent reference issues
      const currentCartItemId = cartItem?.cartItemId;
      const currentQuantity = cartItem?.quantity;
      
      showRemoveItemAlert(async () => {
        console.log('Removing item with cartItemId:', currentCartItemId);
        
        // Update Redux state immediately
        dispatch(updateQuantity({ id: product.id, quantity: 0 }));
        
        // Call DELETE API to remove from backend
        if (currentCartItemId) {
          try {
            const response = await tokenManager.makeAuthenticatedRequest(API_ENDPOINTS.CART.ITEM_BY_ID(currentCartItemId), {
              method: 'DELETE'
            });
            console.log('Delete API response:', response.ok);
          } catch (error) {
            console.error('Error removing item:', error);
            // Revert on error
            dispatch(updateQuantity({ id: product.id, quantity: currentQuantity || 1 }));
          }
        } else {
          console.log('No cartItemId found, item only removed from local state');
        }
      });
      return;
    }
    
    const newQuantity = cartItem!.quantity - 1;
    const cartItemId = cartItem?.cartItemId;
    
    // Update Redux state immediately for instant UI feedback
    dispatch(updateQuantity({ id: product.id, quantity: newQuantity }));
    
    if (cartItemId) {
      try {
        // Use DECREMENT API for normal quantity decrease
        await tokenManager.makeAuthenticatedRequest(API_ENDPOINTS.CART.DECREMENT(cartItemId), {
          method: 'PATCH'
        });
      } catch (error) {
        console.error('Error decrementing quantity:', error);
        // Revert on error
        dispatch(updateQuantity({ id: product.id, quantity: cartItem!.quantity }));
      }
    }
  };

  const handleSizeSelect = (size: string) => {
    handleAddToCart(size);
  };

  const getWeightRange = () => {
    if (product.category === 'Vegetables' || product.category === 'Fruits') {
      return '(0.95 - 1.05) kg';
    }
    return product.unit;
  };

  const getDiscountPercentage = () => {
    if (product.originalPrice) {
      return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    }
    return 0;
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => router.push(`/product/${product.id}`)}
      >
        <View style={styles.imageContainer}>
          <ImageWithLoading 
            source={{ uri: product.image }} 
            height={120} 
            style={styles.image}
          />
          
          {/* Discount Badge on Image */}
          {getDiscountPercentage() > 0 && (
            <View style={styles.discountBadgeOnImage}>
              <Text style={styles.discountText}>{getDiscountPercentage()}% OFF</Text>
            </View>
          )}
          
          {/* Overlay Add Button */}
          <View style={styles.addButtonOverlay}>
            {cartItem ? (
              <View style={[styles.quantityContainer, { backgroundColor: colors.primary }]}>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDecrement();
                  }}
                >
                  <Ionicons name="remove" size={16} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.quantity}>{cartItem.quantity}</Text>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleIncrement();
                  }}
                >
                  <Ionicons name="add" size={16} color="#ffffffff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.addButton, { 
                  backgroundColor: 'white', 
                  borderColor: colors.primary, 
                  borderWidth: 2,
                  flexDirection: product.variants && product.variants.length > 1 ? 'row' : 'column',
                  paddingHorizontal: product.variants && product.variants.length > 1 ? 8 : 0,
                  width: product.variants && product.variants.length > 1 ? 'auto' : 32,
                  minWidth: product.variants && product.variants.length > 1 ? 60 : 32
                }]} 
                onPress={(e) => {
                  e.stopPropagation();
                  handleAddToCart();
                }}
              >
                <Ionicons name="add" size={product.variants && product.variants.length > 1 ? 14 : 18} color={colors.primary} />
                {product.variants && product.variants.length > 1 && (
                  <Text style={[styles.variantText, { color: colors.primary }]}>
                    {product.variants.length} options
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {/* Weight Range */}
          <Text style={[styles.weightRange, { color: colors.gray }]}>{getWeightRange()}</Text>
          
          {/* Product Name */}
          {product.name && (
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
              {product.name.length > 10 ? `${product.name.substring(0, 10)}...` : product.name}
            </Text>
          )}
          

          

          
          {/* Price Section */}
          <View style={styles.priceContainer}>
            <Text style={[styles.price, { color: colors.text }]}>₹{product.price}</Text>
            {product.originalPrice && (
              <Text style={[styles.originalPrice, { color: colors.gray }]}>₹{product.originalPrice}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Size Selection Modal */}
      <Modal visible={showSizeModal} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSizeModal(false)}
        >
          <TouchableOpacity 
            style={[styles.modalContent, { backgroundColor: colors.background }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Size</Text>
            <Text style={[styles.modalSubtitle, { color: colors.gray }]}>{product.name}</Text>
            
            {sizeOptions.map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.sizeOption, { borderBottomColor: colors.border }]}
                onPress={() => handleSizeSelect(size)}
              >
                <Text style={[styles.sizeText, { color: colors.text }]}>{size}</Text>
                <Text style={[styles.sizePrice, { color: colors.text }]}>₹{product.price}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              style={[styles.modalClose, { backgroundColor: colors.border }]}
              onPress={() => setShowSizeModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Variant Selection Modal */}
      <Modal visible={showVariantModal} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVariantModal(false)}
        >
          <TouchableOpacity 
            style={[styles.modalContent, { backgroundColor: colors.background }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Variant</Text>
              <TouchableOpacity onPress={() => setShowVariantModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.gray }]}>{product.name}</Text>
            
            {product.variants?.map((variant) => {
              const variantCartItem = cartItem; // For now, using same cart item logic
              const maxQty = variant.maxOrderQty || 999;
              const minQty = variant.minOrderQty || 1;
              const stockQty = variant.stock?.availableQty;
              const isOutOfStock = variant.stock?.status === 'OUT_OF_STOCK' || (stockQty !== undefined && stockQty === 0);
              
              return (
                <View
                  key={variant.id}
                  style={[styles.variantOption, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.variantInfo}>
                    <Text style={[styles.variantName, { color: colors.text }]}>
                      {variant.weight} {variant.baseUnit}
                    </Text>
                    <Text style={[styles.variantPrice, { color: colors.text }]}>₹{variant.price?.sellingPrice}</Text>
                    {variant.price?.basePrice && variant.price.basePrice !== variant.price.sellingPrice && (
                      <Text style={[styles.variantOrigPrice, { color: colors.gray }]}>₹{variant.price.basePrice}</Text>
                    )}
                    {isOutOfStock && (
                      <Text style={[styles.outOfStockText, { color: '#FF3B30' }]}>Out of Stock</Text>
                    )}
                  </View>
                  <View style={styles.variantActions}>
                    {variantCartItem ? (
                      <View style={[styles.quantityContainer, { backgroundColor: colors.primary }]}>
                        <TouchableOpacity 
                          style={styles.quantityButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDecrement();
                          }}
                        >
                          <Ionicons name="remove" size={15} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.quantity}>{variantCartItem.quantity}</Text>
                        <TouchableOpacity 
                          style={styles.quantityButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleIncrement();
                          }}
                        >
                          <Ionicons name="add" size={15} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.addButton, { 
                          backgroundColor: isOutOfStock ? colors.border : 'white', 
                          borderColor: isOutOfStock ? colors.gray : colors.primary, 
                          borderWidth: 2,
                          opacity: isOutOfStock ? 0.5 : 1
                        }]} 
                        disabled={isOutOfStock}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (!isOutOfStock) {
                            handleAddToCart(undefined, variant.id);
                          }
                        }}
                      >
                        <Ionicons name="add" size={18} color={isOutOfStock ? colors.gray : colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 16,
    width: '48%',
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: '1%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    resizeMode: 'cover',
    paddingTop: 8,
  },
  addButtonOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  quantityButton: {
    padding: 8,
  },
  quantity: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: 6,
  },
  content: {
    padding: 12,
  },
  weightRange: {
    fontSize: 10,
    marginBottom: 4,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 16,
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  discountBadgeOnImage: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  sizeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sizeText: {
    fontSize: 16,
  },
  sizePrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalClose: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  variantText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  variantOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  variantActions: {
    alignItems: 'center',
  },
  variantInfo: {
    flex: 1,
  },
  variantName: {
    fontSize: 16,
    fontWeight: '500',
  },
  variantDesc: {
    fontSize: 14,
    marginTop: 2,
  },

  variantPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  variantOrigPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  outOfStockText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  stockInfo: {
    fontSize: 10,
    marginTop: 2,
  },
});