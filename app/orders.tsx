import { useTheme } from '@/hooks/useTheme';
import { API_ENDPOINTS } from '@/constants/api';
import { RootState } from '@/store/store';
import { setOrders, setLoading } from '@/store/slices/ordersSlice';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  slotStartTime?: string;
  deliveredAt?: string;
  productImages: string[];
  totalItems: number;
  totalProducts: number;
  firstProductName: string;
  isRecentDelivery: boolean;
}





export default function OrdersScreen() {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { isLoggedIn } = useSelector((state: RootState) => state.user);
  const { orders, loading } = useSelector((state: RootState) => state.orders);
  const [refreshing, setRefreshing] = React.useState(false);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
  }, [isLoggedIn]);
  
  const fetchOrders = React.useCallback(async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        setOrders([]);
        return;
      }
      
      const response = await fetch(API_ENDPOINTS.ORDERS.BASE, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        dispatch(setOrders(result.data?.orders || []));
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        dispatch(setOrders([]));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      dispatch(setOrders([]));
    }
  }, []);
  
  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = React.useCallback(async () => {
    if (!isLoggedIn) return;
    setRefreshing(true);
    try {
      await fetchOrders();
    } finally {
      setRefreshing(false);
    }
  }, [isLoggedIn]);

  const handleReorder = React.useCallback(async (order: Order) => {
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
  }, []);
  


  const renderProductImages = React.useCallback((order: Order) => {
    if (!order.productImages || !Array.isArray(order.productImages)) return null;
    
    const maxImages = 3;
    const displayImages = order.productImages.slice(0, maxImages);
    const remainingCount = order.productImages.length - maxImages;

    return (
      <View style={styles.productImagesContainer}>
        {displayImages.map((imageUrl, index) => (
          <View key={index} style={styles.productImageBox}>
            <Image 
              source={{ uri: imageUrl || 'https://via.placeholder.com/40' }} 
              style={styles.productImage}
              resizeMode="cover"
            />
          </View>
        ))}
        {remainingCount > 0 && (
          <View style={[styles.productImageBox, styles.moreItemsBox, { backgroundColor: colors.gray + '20' }]}>
            <Text style={[styles.moreItemsText, { color: colors.text }]}>+{remainingCount}</Text>
          </View>
        )}
      </View>
    );
  }, [colors]);

  const renderOrderItem = React.useCallback(({ item }: { item: Order }) => {
    const isDelivered = item.status?.toLowerCase() === 'delivered';
    const getStatusColor = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'delivered': return '#00B761';
        case 'payment_confirmed': return '#00B761';
        case 'payment_pending': return '#FF9500';
        default: return colors.primary;
      }
    };
    
    const formatStatus = (status: string) => {
      if (status === 'PAYMENT_CONFIRMED') {
        return 'Order Placed';
      }
      return status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Pending';
    };

    return (
      <TouchableOpacity 
        style={[styles.orderCard, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => router.push(`/order-details/${item.id}` as any)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderIdRow}>
            <Text style={[styles.orderId, { color: colors.text }]}>Order #{item.orderNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
            </View>
          </View>
        </View>

        {renderProductImages(item)}

        <View style={styles.orderInfo}>
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateRow}>
              <Text style={[styles.orderDate, { color: colors.gray }]}>
                {new Date(item.createdAt).toLocaleDateString('en-US', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </Text>
              <TouchableOpacity 
                style={[styles.reorderContainer, {
                  opacity: item.status?.toLowerCase() === 'delivered' ? 1 : 0.5
                }]}
                disabled={item.status?.toLowerCase() !== 'delivered'}
                onPress={() => {
                  if (item.status?.toLowerCase() === 'delivered') {
                    handleReorder(item);
                  }
                }}
              >
                <Ionicons name="refresh-outline" size={14} color={item.status?.toLowerCase() === 'delivered' ? "#FF6B35" : "#ccc"} />
                <Text style={[styles.reorderText, {
                  color: item.status?.toLowerCase() === 'delivered' ? '#FF6B35' : '#ccc'
                }]}>Reorder</Text>
              </TouchableOpacity>
            </View>
            
            {isDelivered && item.deliveredAt ? (
              <View style={styles.deliveredContainer}>
                <Ionicons name="checkmark-circle" size={14} color="#00B761" />
                <Text style={[styles.deliveredTime, { color: '#00B761' }]}>
                  Delivered on {new Date(item.deliveredAt).toLocaleDateString('en-US', { 
                    day: 'numeric', 
                    month: 'short' 
                  })}
                </Text>
              </View>
            ) : (
              <View style={styles.arrivingContainer}>
                <Ionicons name="time-outline" size={14} color={getStatusColor(item.status)} />
                <Text style={[styles.arrivingTime, { color: getStatusColor(item.status) }]}>
                  {item.slotStartTime ? 
                    `Arriving by ${new Date(item.slotStartTime).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit', 
                      hour12: true 
                    })}` : 
                    'Arriving soon'
                  }
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, renderProductImages]);

  if (!isLoggedIn) {
    return null;
  }

  // No loading screen - show content immediately

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bag-outline" size={80} color={colors.gray} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Orders Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.gray }]}>Your order history will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
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
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  ordersList: {
    padding: 16,
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#00B761',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    marginBottom: 8,
  },
  orderIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 13,
    fontWeight: '500',
  },

  productImagesContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 8,
  },
  productImageBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: 4,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  moreItemsBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreItemsText: {
    fontSize: 10,
    fontWeight: '600',
  },


  deliveredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveredTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  orderInfo: {
    marginTop: 8,
  },
  dateTimeContainer: {
    flexDirection: 'column',
    gap: 6,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reorderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  reorderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  arrivingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrivingTime: {
    fontSize: 13,
    fontWeight: '500',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});