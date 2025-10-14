import { CartItemSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';
import { API_ENDPOINTS } from '@/constants/api';
import { useCartReminder } from '@/hooks/useCartReminder';
import { apiNotificationService } from '@/services/apiNotificationService';
import { useTheme } from '@/hooks/useTheme';
import { RootState } from '@/store/store';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

export default function CartScreen() {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { isLoggedIn } = useSelector((state: RootState) => state.user);
  useCartReminder(); // Initialize cart reminder service
  const [isLoading, setIsLoading] = React.useState(false);
  const [apiItems, setApiItems] = React.useState([]);
  const [cartSummary, setCartSummary] = React.useState(null);
  const [showRewardCard, setShowRewardCard] = React.useState(true);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
  }, [isLoggedIn]);

  const fetchCartData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch(API_ENDPOINTS.CART.BASE, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        const cart = result.data?.carts?.[0];
        
        if (cart) {
          const items = cart.items || [];
          setApiItems(items);
          setCartSummary(cart.summary);
          
          // Only show reward card if there are items AND thresholds exist
          if (items.length > 0 && cart.summary?.thresholds?.next) {
            setShowRewardCard(true);
          } else {
            setShowRewardCard(false);
          }
        } else {
          // Clear state if no cart data
          setApiItems([]);
          setCartSummary(null);
          setShowRewardCard(false);
        }
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCartData();
    }, [fetchCartData])
  );



  const handleUpdateQuantity = useCallback(async (itemId: string, quantity: number, item: any, isIncrement: boolean) => {
    if (quantity < 1) {
      handleRemoveItem(itemId);
      return;
    }
    
    // Validate quantity restrictions
    const variant = item.variant;
    const minQty = variant?.minOrderQty || 1;
    const maxQty = variant?.maxOrderQty || 999;
    const stockQty = variant?.stock?.availableQty || 999;
    
    if (isIncrement) {
      if (quantity > maxQty) {
        Vibration.vibrate([0, 200, 100, 200]);
        // API notification instead of Alert
        return;
      }
      
      if (quantity > stockQty) {
        Vibration.vibrate([0, 200, 100, 200]);
        // API notification instead of Alert
        return;
      }
    } else {
      if (quantity < minQty) {
        // Direct removal instead of Alert confirmation
        handleRemoveItem(itemId);
        return;
      }
    }
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      const endpoint = isIncrement ? 
        API_ENDPOINTS.CART.INCREMENT(itemId) :
        API_ENDPOINTS.CART.DECREMENT(itemId);
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Send API notification for quantity update
        await apiNotificationService.notifyCartUpdate('quantity_updated', item.product?.name || item.variant?.name);
        // Force refresh cart data
        await fetchCartData();
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  }, [fetchCartData, handleRemoveItem]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(API_ENDPOINTS.CART.ITEM_BY_ID(itemId), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Send API notification for item removal
        const itemName = apiItems.find(i => i.id === itemId)?.product?.name || 'Item';
        await apiNotificationService.notifyCartUpdate('item_removed', itemName);
        // Force refresh cart data and clear state if empty
        await fetchCartData();
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }, [fetchCartData]);

  // Show all items from API with free products first
  const sortedItems = useMemo(() => {
    return apiItems.sort((a, b) => (b.isFreeProduct ? 1 : 0) - (a.isFreeProduct ? 1 : 0));
  }, [apiItems]);

  // Use API summary data for calculations
  const priceCalculations = useMemo(() => {
    const totalMRP = apiItems.reduce((sum, item) => {
      if (item.isFreeProduct) return sum; // Don't include free products in MRP
      const basePrice = parseFloat(item.variant?.basePrice || item.unitPrice || 0);
      return sum + (basePrice * item.quantity);
    }, 0);
    const currentTotal = cartSummary?.totalAmount || 0;
    return { totalMRP, currentTotal };
  }, [apiItems, cartSummary?.totalAmount]);

  // Render functions for better code organization
  const renderPriceSection = useCallback((item: any) => {
    if (item.isFreeProduct) {
      return (
        <View style={styles.priceContainer}>
          <Text style={[styles.originalPrice, { color: '#666' }]}>₹{item.freeProductInfo?.originalPrice || item.variant?.currentPrice}</Text>
          <Text style={[styles.freePrice, { color: colors.primary }]}>FREE</Text>
        </View>
      );
    }
    return (
      <View style={styles.priceContainer}>
        <Text style={[styles.currentPrice, { color: colors.text }]}>₹{item.variant?.currentPrice}</Text>
        {item.variant?.basePrice !== item.variant?.currentPrice && (
          <Text style={[styles.originalPrice, { color: colors.gray }]}>₹{item.variant?.basePrice}</Text>
        )}
      </View>
    );
  }, [colors]);

  const renderQuantityControls = useCallback((item: any) => {
    if (item.isFreeProduct) return null;
    
    const variant = item.variant;
    const minQty = variant?.minOrderQty || 1;
    const maxQty = variant?.maxOrderQty || 999;
    const stockQty = variant?.stock?.availableQty || 999;
    const isAtMin = item.quantity <= minQty;
    const isAtMax = item.quantity >= maxQty || item.quantity >= stockQty;
    
    return (
      <View style={styles.quantitySection}>
        <View style={[styles.quantityContainer, { backgroundColor: colors.primary }]}>
          <TouchableOpacity 
            style={[styles.quantityButton, { opacity: isAtMin ? 0.5 : 1 }]}
            onPress={() => handleUpdateQuantity(item.id, item.quantity - 1, item, false)}
          >
            <Ionicons name="remove" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity 
            style={[styles.quantityButton, { opacity: isAtMax ? 0.5 : 1 }]}
            onPress={() => handleUpdateQuantity(item.id, item.quantity + 1, item, true)}
          >
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

      </View>
    );
  }, [colors, handleUpdateQuantity]);

  const renderCartItem = useCallback(({ item }: { item: any }) => (
    <View style={styles.cartItemContainer}>
      <View style={[styles.cartItemCard, { backgroundColor: item.isFreeProduct ? '#FFE4B5' : colors.background }]}>
        <View style={[styles.cartItem, { borderBottomColor: colors.border }]}>
          <Image source={{ uri: item.product?.images || 'https://via.placeholder.com/60' }} style={styles.itemImage} />
          <View style={styles.itemDetails}>
            <Text style={[styles.itemName, { color: item.isFreeProduct ? '#000' : colors.text }]}>
              {item.product?.name || item.variant?.name}
            </Text>
            <Text style={[styles.itemUnit, { color: item.isFreeProduct ? '#666' : colors.gray }]}>
              {item.variant?.weight} {item.variant?.baseUnit}
            </Text>
            {renderPriceSection(item)}
            {renderQuantityControls(item)}
          </View>
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => handleRemoveItem(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [colors, renderPriceSection, renderQuantityControls, handleRemoveItem]);

  const renderTotalSection = useCallback(() => {
    const { totalMRP, currentTotal } = priceCalculations;
    
    if (totalMRP > currentTotal) {
      return (
        <>
          <Text style={[styles.mrpText, { color: colors.gray }]}>₹{totalMRP}</Text>
          <Text style={[styles.totalText, { color: colors.text }]}>₹{currentTotal}</Text>
        </>
      );
    }
    return (
      <>
        <Text style={[styles.totalText, { color: colors.text }]}>₹{currentTotal}</Text>
        <Text style={[styles.totalSubtext, { color: colors.gray }]}>Total</Text>
      </>
    );
  }, [priceCalculations, colors]);

  if (!isLoggedIn) {
    return null;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <SkeletonLoader width={24} height={24} />
          <SkeletonLoader width={120} height={18} />
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.content}>
          {[1, 2, 3].map((item) => (
            <CartItemSkeleton key={item} />
          ))}

        </ScrollView>
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <View style={styles.totalContainer}>
            <SkeletonLoader width={80} height={18} style={{ marginBottom: 4 }} />
            <SkeletonLoader width={40} height={12} />
          </View>
          <SkeletonLoader width={150} height={40} borderRadius={8} />
        </View>
      </SafeAreaView>
    );
  }

  // Show empty cart only when no items at all
  if (apiItems.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Jhola</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.emptyCart}>
          <Ionicons name="bag-outline" size={80} color={colors.gray} />
          <Text style={[styles.emptyCartText, { color: colors.text }]}>Your jhola is empty</Text>
          <Text style={[styles.emptyCartSubtext, { color: colors.gray }]}>Add some products to get started</Text>
          <TouchableOpacity 
            style={[styles.shopNowButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/' as any)}
          >
            <Text style={styles.shopNowText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Jhola ({sortedItems.length} items)</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchCartData}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <FlatList
          data={sortedItems}
          renderItem={renderCartItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </ScrollView>

      {/* Combined Threshold Card */}
      {(cartSummary?.deliveryInfo && !cartSummary.deliveryInfo.isEligibleForFreeDelivery) || (cartSummary?.thresholds?.next && showRewardCard) ? (
        <View style={[styles.combinedThresholdCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>🎯 Unlock Benefits</Text>
            {cartSummary?.thresholds?.next && showRewardCard && (
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowRewardCard(false)}
              >
                <Ionicons name="close" size={18} color={colors.gray} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Benefits List */}
          <View style={styles.benefitsList}>
            {/* Free Delivery Benefit */}
            {cartSummary?.deliveryInfo && !cartSummary.deliveryInfo.isEligibleForFreeDelivery && (
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: '#FF6B35' }]}>
                  <Ionicons name="bicycle" size={16} color="white" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>Free Delivery</Text>
                  <Text style={[styles.benefitAmount, { color: '#FF6B35' }]}>
                    Add ₹{cartSummary.deliveryInfo.amountNeededForFreeDelivery} • Save ₹{cartSummary.deliveryInfo.deliveryCharge}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Reward Benefit */}
            {cartSummary?.thresholds?.next && showRewardCard && (
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons name="gift" size={16} color="white" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>Free Product</Text>
                  <Text style={[styles.benefitAmount, { color: colors.primary }]}>
                    Add ₹{cartSummary.thresholds.next.amountNeeded} • Get Free Product
                  </Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.lightGray }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: colors.primary,
                    width: `${Math.min((cartSummary?.subtotal || 0) / Math.max(
                      cartSummary?.deliveryInfo?.freeDeliveryThreshold || 200,
                      cartSummary?.thresholds?.next?.amount || 500
                    ) * 100, 100)}%`
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.gray }]}>
              ₹{cartSummary?.subtotal || 0} of ₹{Math.max(
                cartSummary?.deliveryInfo?.freeDeliveryThreshold || 200,
                cartSummary?.thresholds?.next?.amount || 500
              )}
            </Text>
          </View>
        </View>
      ) : null}



      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.totalContainer}>
          {renderTotalSection()}
        </View>
        <TouchableOpacity 
          style={[styles.checkoutButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/checkout')}
        >
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
        </TouchableOpacity>
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
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyCartText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyCartSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  shopNowButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  shopNowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartItemContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    paddingTop: 4,
  },
  cartItemCard: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#00B761',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemUnit: {
    fontSize: 12,
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  freePrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  quantitySection: {
    alignItems: 'flex-start',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
  },
  quantityInfo: {
    fontSize: 10,
    marginTop: 2,
  },
  quantityButton: {
    padding: 6,
  },
  quantity: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  removeButton: {
    padding: 8,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    marginTop: 8,
  },
  totalContainer: {
    flex: 1,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalSubtext: {
    fontSize: 12,
  },
  mrpText: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkoutButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  combinedThresholdCard: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  benefitsList: {
    gap: 12,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  benefitAmount: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  thresholdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  thresholdTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  thresholdDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  thresholdAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

});