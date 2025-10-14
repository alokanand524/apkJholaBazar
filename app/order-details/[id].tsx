import { SkeletonLoader } from '@/components/SkeletonLoader';
import { API_ENDPOINTS } from '@/constants/api';
import { useTheme } from '@/hooks/useTheme';

import { setCurrentOrder } from '@/store/slices/ordersSlice';
import { RootState } from '@/store/store';
import { tokenManager } from '@/utils/tokenManager';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { orders, currentOrder } = useSelector((state: RootState) => state.orders);
  const [loading, setLoading] = React.useState(true);
  
  // Try to get order from Redux store first
  const order = currentOrder || orders.find(o => o.id === id);

  React.useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      // Always try to fetch from API first for latest data
      const response = await tokenManager.makeAuthenticatedRequest(API_ENDPOINTS.ORDERS.BY_ID(id as string));
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          dispatch(setCurrentOrder(result.data));
        }
      } else {
        // Fallback to Redux store if API fails
        const existingOrder = orders.find(o => o.id === id);
        if (existingOrder) {
          dispatch(setCurrentOrder(existingOrder));
        }
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      // Fallback to Redux store on error
      const existingOrder = orders.find(o => o.id === id);
      if (existingOrder) {
        dispatch(setCurrentOrder(existingOrder));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.lightGray }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <SkeletonLoader width={24} height={24} />
          <SkeletonLoader width={120} height={18} style={{ marginLeft: 16 }} />
        </View>
        <ScrollView style={styles.content}>
          <SkeletonLoader width="100%" height={120} borderRadius={12} style={{ marginBottom: 16 }} />
          <SkeletonLoader width="100%" height={200} borderRadius={12} style={{ marginBottom: 16 }} />
          <SkeletonLoader width="100%" height={80} borderRadius={12} style={{ marginBottom: 16 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Order Details</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.text }]}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase().replace('_', ' ');
    switch (normalizedStatus) {
      case 'delivered': return '#00B761';
      case 'payment confirmed': return '#00B761';
      case 'confirmed': return '#00B761';
      case 'pending': return '#FF9500';
      case 'payment pending': return '#FF9500';
      case 'cancelled': return '#FF3B30';
      case 'packed': return '#007AFF';
      case 'dispatched': return '#007AFF';
      default: return '#666';
    }
  };

  const formatStatus = (status: string) => {
    if (status === 'PAYMENT_CONFIRMED') {
      return 'Order Placed';
    }
    return status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Pending';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.lightGray }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Order Details</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.statusCard, { backgroundColor: colors.background }]}>
          <View style={styles.statusHeader}>
            <Text style={[styles.orderId, { color: colors.text }]}>Order #{order.orderNumber || order.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status || 'pending') }]}>
              <Text style={styles.statusText}>{formatStatus(order.status)}</Text>
            </View>
          </View>
          <Text style={[styles.orderDate, { color: colors.gray }]}>Ordered on {new Date(order.createdAt || order.date).toLocaleDateString()}</Text>
          {order.slotStartTime && (
            <Text style={[styles.deliveryTime, { color: colors.primary }]}>Delivery at {new Date(order.slotStartTime).toLocaleTimeString()}</Text>
          )}
          {order.estimatedDelivery && (
            <Text style={[styles.deliveryTime, { color: colors.primary }]}>Estimated delivery: {new Date(order.estimatedDelivery).toLocaleString()}</Text>
          )}
        </View>

        <View style={[styles.itemsCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Items ({order.items?.length || 0})</Text>
          {order.items?.map((item, index) => (
            <View key={item.id || index} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
              <Image 
                source={{ uri: item.product?.image || 'https://via.placeholder.com/50' }} 
                style={styles.itemImage} 
                onError={() => console.log('Image load error')}
              />
              <View style={styles.itemDetails}>
                <Text style={[styles.itemName, { color: colors.text }]}>
                  {item.product?.name || item.variant?.name || 'Product'}
                </Text>
                <Text style={[styles.itemQuantity, { color: colors.gray }]}>Qty: {item.quantity}</Text>
                {item.product?.brand?.name && (
                  <Text style={[styles.itemBrand, { color: colors.gray }]}>Brand: {item.product.brand.name}</Text>
                )}
              </View>
              <Text style={[styles.itemPrice, { color: colors.text }]}>₹{item.totalPrice || item.unitPrice || 0}</Text>
            </View>
          ))}
        </View>

        {order.status?.toLowerCase() !== 'delivered' && (
          <View style={[styles.orderStatusCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Status</Text>
            
            <View style={styles.statusFlow}>
              {['placed', 'packed', 'on the way', 'delivered'].map((status, index) => {
                const currentStatus = order.status?.toLowerCase().replace('_', ' ') || 'placed';
                const statusMap = {
                  'payment_pending': 'placed',
                  'pending': 'placed',
                  'confirmed': 'packed',
                  'allocated': 'packed',
                  'packed': 'packed',
                  'dispatched': 'on the way',
                  'delivered': 'delivered'
                };
                
                const mappedStatus = statusMap[currentStatus] || 'placed';
                let statusIndex = ['placed', 'packed', 'on the way', 'delivered'].indexOf(mappedStatus);
                if (statusIndex === -1) statusIndex = 0;
                
                const isCompleted = index <= statusIndex;
                
                // Check timeline data for more accurate status
                const timeline = order.timeline || {};
                const isTimelineCompleted = (
                  (status === 'placed' && timeline.placed) ||
                  (status === 'packed' && (timeline.packed || timeline.confirmed)) ||
                  (status === 'on the way' && timeline.dispatched) ||
                  (status === 'delivered' && timeline.delivered)
                );
                
                const finalCompleted = isCompleted || isTimelineCompleted;
                
                return (
                  <View key={status} style={styles.statusStep}>
                    <View style={styles.statusStepContent}>
                      <View style={[
                        styles.statusDot, 
                        { 
                          backgroundColor: finalCompleted ? '#00B761' : colors.border,
                          borderColor: finalCompleted ? '#00B761' : colors.border
                        }
                      ]}>
                        {finalCompleted && (
                          <Ionicons name="checkmark" size={12} color="white" />
                        )}
                      </View>
                      <Text style={[
                        styles.statusLabel, 
                        { color: finalCompleted ? colors.text : colors.gray }
                      ]}>
                        {status === 'on the way' ? 'On the Way' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>

                    </View>
                    {index < 3 && (
                      <View style={[
                        styles.statusLine, 
                        { backgroundColor: index < statusIndex ? '#00B761' : colors.border }
                      ]} />
                    )}
                  </View>
                );
              })}
            </View>
            
            <View style={styles.arrivingInfo}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <Text style={[styles.arrivingText, { color: colors.primary }]}>
                {order.delivery?.estimatedTime ? 
                  `Estimated delivery: ${new Date(order.delivery.estimatedTime).toLocaleString()}` :
                  order.metadata?.deliveryTiming?.deliveryMessage || 
                  'Delivery time will be updated soon'
                }
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.addressCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Address</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <View style={styles.addressDetails}>
              <Text style={[styles.addressText, { color: colors.text }]}>
                {order.delivery?.address?.fullAddress || 
                 order.deliveryAddress?.fullAddress || 
                 order.deliveryAddress?.addressLine1 || 
                 'Address not available'}
              </Text>
              {order.deliveryAddress?.landmark && (
                <Text style={[styles.contactText, { color: colors.gray }]}>Near {order.deliveryAddress.landmark}</Text>
              )}
              {order.deliveryAddress?.pincode && (
                <Text style={[styles.contactText, { color: colors.gray }]}>
                  {order.deliveryAddress.pincode.city}, {order.deliveryAddress.pincode.state} - {order.deliveryAddress.pincode.code}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.paymentCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Bill Details</Text>
          <View style={styles.paymentRow}>
            <Text style={[styles.paymentLabel, { color: colors.gray }]}>Subtotal</Text>
            <Text style={[styles.paymentValue, { color: colors.text }]}>₹{order.subtotal || order.pricing?.subtotal || 0}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={[styles.paymentLabel, { color: colors.gray }]}>Delivery Charge</Text>
            <Text style={[styles.paymentValue, { color: colors.text }]}>₹{order.deliveryCharge || order.pricing?.deliveryCharge || 0}</Text>
          </View>
          {(order.packagingCharge || order.pricing?.packagingCharge) > 0 && (
            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, { color: colors.gray }]}>Packaging Charge</Text>
              <Text style={[styles.paymentValue, { color: colors.text }]}>₹{order.packagingCharge || order.pricing?.packagingCharge || 0}</Text>
            </View>
          )}
          {(order.tax || order.pricing?.tax) > 0 && (
            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, { color: colors.gray }]}>Tax</Text>
              <Text style={[styles.paymentValue, { color: colors.text }]}>₹{order.tax || order.pricing?.tax || 0}</Text>
            </View>
          )}
          {(order.convenienceFee || order.pricing?.convenienceFee) > 0 && (
            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, { color: colors.gray }]}>Convenience Fee</Text>
              <Text style={[styles.paymentValue, { color: colors.text }]}>₹{order.convenienceFee || order.pricing?.convenienceFee || 0}</Text>
            </View>
          )}
          {(order.itemDiscount || order.pricing?.itemDiscount || order.totalDiscount || order.pricing?.totalDiscount) > 0 && (
            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, { color: colors.primary }]}>Discount</Text>
              <Text style={[styles.paymentValue, { color: colors.primary }]}>-₹{order.itemDiscount || order.pricing?.itemDiscount || order.totalDiscount || order.pricing?.totalDiscount || 0}</Text>
            </View>
          )}
          {(order.loyaltyPointsUsed || order.loyalty?.pointsUsed) > 0 && (
            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, { color: colors.primary }]}>Loyalty Points Used</Text>
              <Text style={[styles.paymentValue, { color: colors.primary }]}>-₹{order.loyaltyPointsUsed || order.loyalty?.pointsUsed || 0}</Text>
            </View>
          )}
          <View style={[styles.paymentRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.paymentLabel, { color: colors.text, fontWeight: 'bold' }]}>Total Amount</Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>₹{order.totalAmount || order.pricing?.totalAmount || 0}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={[styles.paymentLabel, { color: colors.gray }]}>Payment Method</Text>
            <Text style={[styles.paymentValue, { color: colors.text }]}>
              {(() => {
                const method = (order.paymentMethod || order.payment?.method)?.toUpperCase();
                if (method === 'COD' || method === 'CASH_ON_DELIVERY') return 'Cash on Delivery';
                if (method === 'RAZORPAY') return 'Online Payment';
                return (order.paymentMethod || order.payment?.method)?.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A';
              })()} 
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={[styles.paymentLabel, { color: colors.gray }]}>Payment Status</Text>
            <Text style={[styles.paymentValue, { 
              color: (order.paymentStatus || order.payment?.status) === 'PENDING' ? '#FF9500' : (order.paymentStatus || order.payment?.status) === 'COMPLETED' ? '#00B761' : colors.text 
            }]}>
              {formatStatus(order.paymentStatus || order.payment?.status || 'PENDING')}
            </Text>
          </View>
          {order.promoCode && (
            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, { color: colors.gray }]}>Promo Code</Text>
              <Text style={[styles.paymentValue, { color: colors.primary }]}>{order.promoCode}</Text>
            </View>
          )}
        </View>
        
        <View style={[styles.orderAgainContainer, { backgroundColor: colors.background }]}>
          <TouchableOpacity 
            style={[styles.orderAgainButton, { 
              backgroundColor: order.status?.toLowerCase() === 'delivered' ? '#FF9500' : '#ccc'
            }]}
            disabled={order.status?.toLowerCase() !== 'delivered'}
            onPress={async () => {
              if (order.status?.toLowerCase() !== 'delivered') return;
              
              try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                const token = await AsyncStorage.getItem('authToken');
                
                if (!token) return;
                
                const response = await fetch(`${API_ENDPOINTS.ORDERS.BASE}/${order.id}/reorder`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                  router.push('/cart');
                }
              } catch (error) {
                console.error('Error reordering:', error);
              }
            }}
          >
            <Text style={[styles.orderAgainText, {
              color: order.status?.toLowerCase() === 'delivered' ? '#fff' : '#999'
            }]}>Reorder</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
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
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  deliveryTime: {
    fontSize: 14,
    color: '#00B761',
    fontWeight: '500',
  },
  itemsCard: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  itemBrand: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressDetails: {
    marginLeft: 8,
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
  },
  orderStatusCard: {
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
  statusFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  statusStepContent: {
    alignItems: 'center',
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  statusLine: {
    position: 'absolute',
    top: 10,
    left: '60%',
    right: '-60%',
    height: 2,
  },
  arrivingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 6,
  },
  arrivingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  paymentCard: {
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
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  orderAgainContainer: {
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  orderAgainButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  orderAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});