import EnterMoreDetailsModal from '@/components/EnterMoreDetailsModal';
import PaymentStatusModal from '@/components/PaymentStatusModal';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { API_ENDPOINTS } from '@/constants/api';
import { useTheme } from '@/hooks/useTheme';
import { useCartReminder } from '@/hooks/useCartReminder';
import { setSelectedAddress } from '@/store/slices/addressSlice';
import { clearCart, fetchCart } from '@/store/slices/cartSlice';
import { addOrder } from '@/store/slices/ordersSlice';
import { RootState } from '@/store/store';
import { logger } from '@/utils/logger';
import { tokenManager } from '@/utils/tokenManager';
import { apiNotificationService } from '@/services/apiNotificationService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useDispatch, useSelector } from 'react-redux';

const paymentMethods = [
  { id: 'cod', name: 'Cash on Delivery', icon: 'cash' },
  { id: 'upi', name: 'Pay Online', icon: 'phone-portrait' },
];

export default function CheckoutScreen() {
  const dispatch = useDispatch();
  const { items, total } = useSelector((state: RootState) => state.cart);
  const { selectedAddress } = useSelector((state: RootState) => state.address);
  const { colors } = useTheme();
  const { onOrderPlaced } = useCartReminder();
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadDeliveryAddress();
    loadSavedAddresses();
    loadRecentLocations();
    // Refresh cart from server to get latest data
    dispatch(fetchCart());
    fetchCartSummary();
    setIsLoading(false);
  }, [dispatch]);
  
  // Refresh cart when page comes into focus
  React.useEffect(() => {
    const unsubscribe = router.addListener?.('focus', () => {
      dispatch(fetchCart());
      fetchCartSummary();
    });
    return unsubscribe || (() => {});
  }, [dispatch]);
  
  const fetchCartSummary = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      
      logger.info('API Request - Fetch Cart Summary', {
        url: API_ENDPOINTS.CART.BASE,
        method: 'GET'
      });
      
      const response = await fetch(API_ENDPOINTS.CART.BASE, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      
      logger.info('API Response - Fetch Cart Summary', {
        status: response.status,
        statusText: response.statusText,
        response: result
      });

      if (response.ok) {
        const cart = result.data?.carts?.[0];
        if (cart) {
          setCartSummary(cart.summary);
          setCartItems(cart.items || []);
        }
      }
    } catch (error) {
      logger.error('Error fetching cart summary', { error: error.message });
    }
  };
  
  // Update local state when Redux state changes
  React.useEffect(() => {
    if (selectedAddress) {
      setSelectedDeliveryAddress(selectedAddress);
    }
  }, [selectedAddress]);
  
  const loadDeliveryAddress = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const address = await AsyncStorage.getItem('selectedDeliveryAddress');
      if (address) {
        const parsedAddress = JSON.parse(address);
        setSelectedDeliveryAddress(parsedAddress);
        // Also update Redux state if not already set
        if (!selectedAddress) {
          dispatch(setSelectedAddress(parsedAddress));
        }
      }
    } catch (error) {
      logger.error('Error loading delivery address', { error: error.message });
    }
  };
  
  const loadSavedAddresses = async () => {
    try {
      const { addressAPI } = require('@/services/api');
      const response = await addressAPI.getAddresses();
      if (response.success && response.data) {
        const transformedAddresses = response.data.map((addr: any) => ({
          id: addr.id,
          type: addr.type,
          addressLine1: addr.addressLine1,
          addressLine2: addr.addressLine2,
          landmark: addr.landmark,
          isDefault: addr.isDefault,
          fullAddress: addr.fullAddress,
          pincode: addr.pincode
        }));
        setSavedAddresses(transformedAddresses);
      }
    } catch (error) {
      logger.error('Error loading saved addresses', { error: error.message });
      setSavedAddresses([]);
    }
  };
  
  const loadRecentLocations = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const locations = await AsyncStorage.getItem('savedLocations');
      if (locations) {
        setRecentLocations(JSON.parse(locations));
      }
    } catch (error) {
      logger.error('Error loading recent locations', { error: error.message });
    }
  };
  
  const [selectedPayment, setSelectedPayment] = useState('cod');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [isReferralApplied, setIsReferralApplied] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [recentLocations, setRecentLocations] = useState<any[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<{
    visible: boolean;
    status: 'processing' | 'success' | 'failed';
    message: string;
  }>({ visible: false, status: 'processing', message: '' });
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [cartSummary, setCartSummary] = useState<any>(null);
  const [showConfirmOrder, setShowConfirmOrder] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showPaymentHint, setShowPaymentHint] = useState(true);

  // const deliveryFee = 25;
  const deliveryFee = 0; // Delivery fee disabled
  const finalTotal = cartSummary?.totalAmount || total + deliveryFee - referralDiscount;

  const handleApplyReferral = () => {
    if (referralCode.trim().length >= 6) {
      const discount = Math.min(50, total * 0.1); // ₹50 or 10% of total, whichever is less
      setReferralDiscount(discount);
      setIsReferralApplied(true);
      // API notification instead of Alert
    } else {
      // API notification instead of Alert
    }
  };

  const handleRemoveReferral = () => {
    setReferralCode('');
    setReferralDiscount(0);
    setIsReferralApplied(false);
  };

  const createRazorpayOrder = async (amount: number) => {
    // For testing without backend, we'll skip order creation
    return {
      id: null, // No order ID for direct payment
      amount: amount * 100,
      currency: 'INR',
      status: 'created'
    };
  };

  const placeOrder = async () => {
    if (!selectedDeliveryAddress) {
      // API notification instead of Alert
      return;
    }

    setIsPlacingOrder(true);
    
    try {
      const paymentMethod = selectedPayment === 'cod' ? 'CASH_ON_DELIVERY' : 'ONLINE_PAYMENT';
      
      const orderPayload = {
        storeId: "0d29835f-3840-4d72-a26d-ed96ca744a34",
        deliveryAddressId: selectedDeliveryAddress.id,
        paymentMethod: paymentMethod
      };

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        // API notification instead of Alert
        return;
      }

      logger.info('API Request - Place Order', {
        url: API_ENDPOINTS.ORDERS.BASE,
        method: 'POST',
        payload: orderPayload
      });
      
      const response = await fetch(API_ENDPOINTS.ORDERS.BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      const result = await response.json();
      
      logger.info('API Response - Place Order', {
        status: response.status,
        statusText: response.statusText,
        response: result
      });

      if (result.success && result.statusCode === 201) {
        // Save order to Redux store
        const orderData = {
          id: result.data.order.id,
          orderNumber: result.data.order.orderNumber || result.data.order.id,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          status: 'placed',
          total: finalTotal,
          totalAmount: finalTotal.toString(),
          subtotal: (cartSummary?.subtotal || total).toString(),
          deliveryCharge: (cartSummary?.deliveryCharge || 0).toString(),
          tax: '0',
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
            totalPrice: (item.price * item.quantity).toString()
          })),
          deliveryAddress: {
            addressLine1: selectedDeliveryAddress?.address || selectedAddress?.fullAddress || 'Address not available'
          },
          paymentMethod: paymentMethod
        };
        dispatch(addOrder(orderData));
        
        if (paymentMethod === 'CASH_ON_DELIVERY') {
          // COD order placed successfully
          // Send API notification for order placed
          await apiNotificationService.notifyOrderPlaced(result.data?.order?.id, finalTotal);
          dispatch(clearCart());
          onOrderPlaced({ 
            orderId: result.data?.order?.id, 
            totalAmount: finalTotal 
          });
          setPaymentStatus({ visible: true, status: 'success', message: 'Order placed successfully!' });
          setTimeout(() => {
            setPaymentStatus({ visible: false, status: 'processing', message: '' });
            router.push('/(tabs)/' as any);
          }, 2000);
        } else {
          // Online payment - store order ID and complete response data
          setCurrentOrderId(result.data.order.id);
          setOrderResponseData(result.data); // Store complete order response
          handleRazorpayPayment(result.data);
        }
      } else {
        throw new Error(result.message || 'Failed to place order');
      }
    } catch (error) {
      logger.error('Order placement error', { error: error.message });
      // API notification instead of Alert
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleRazorpayPayment = async (orderData: any) => {
    try {
      setPaymentStatus({ visible: true, status: 'processing', message: 'Initializing payment...' });
      
      const paymentInfo = orderData.payment;
      const gatewayData = paymentInfo.gatewayData;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
            }
            .loading {
              margin: 20px 0;
            }
            .error {
              color: #ff0000;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h3>Jhola Bazar Payment</h3>
            <p>Amount: ₹${finalTotal}</p>
            <div id="loading" class="loading">Loading payment gateway...</div>
            <div id="error" class="error" style="display:none;"></div>
          </div>
          
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          <script>
            function showError(message) {
              document.getElementById('loading').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.getElementById('error').innerText = message;
            }
            
            try {
              var options = {
                key: '${gatewayData.keyId}',
                amount: ${finalTotal * 100},
                currency: 'INR',
                order_id: '${gatewayData.gatewayOrderId}',
                name: 'Jhola Bazar',
                description: 'Grocery Order Payment',
                theme: { color: '#00B761' },
                prefill: {
                  name: 'Customer',
                  email: 'customer@jholabazar.com',
                  contact: '9999999999'
                },
                handler: function(response) {
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'success',
                    data: response
                  }));
                },
                modal: {
                  ondismiss: function() {
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'dismiss'
                    }));
                  }
                }
              };
              
              // Order ID already set above from API response
              
              if (typeof Razorpay !== 'undefined') {
                var rzp = new Razorpay(options);
                rzp.on('payment.failed', function(response) {
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'failed',
                    error: response.error
                  }));
                });
                
                setTimeout(function() {
                  rzp.open();
                }, 1000);
              } else {
                showError('Payment gateway failed to load');
              }
            } catch (e) {
              showError('Error: ' + e.message);
            }
          </script>
        </body>
        </html>
      `;
      
      setPaymentHtml(html);
      setPaymentStatus({ visible: false, status: 'processing', message: '' });
      setShowPaymentWebView(true);
    } catch (error) {
      logger.error('Razorpay setup error', { error: error.message });
      setPaymentStatus({ visible: true, status: 'failed', message: 'Failed to initialize payment' });
      setTimeout(() => {
        setPaymentStatus({ visible: false, status: 'processing', message: '' });
        setIsPlacingOrder(false);
      }, 2000);
    }
  };

  const verifyPayment = async (paymentData: any) => {
    try {
      logger.info('=== STARTING PAYMENT VERIFICATION ===');
      logger.info('Payment verification inputs', {
        paymentData: paymentData,
        currentOrderId: currentOrderId,
        orderResponseData: orderResponseData
      });
      
      // Call backend API to verify payment
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('authToken');
      
      const requestPayload = {
        orderId: currentOrderId,
        paymentData: paymentData,
        gateway: 'razorpay'
      };
      
      logger.info('=== PAYMENT VERIFY API REQUEST ===');
      logger.info('API Request - Payment Verify', {
        url: API_ENDPOINTS.PAYMENTS.VERIFY,
        method: 'POST',
        payload: requestPayload,
        hasToken: !!token
      });
      
      const verifyResponse = await fetch(API_ENDPOINTS.PAYMENTS.VERIFY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestPayload)
      });
      
      const verifyResult = await verifyResponse.json();
      
      logger.info('=== PAYMENT VERIFY API RESPONSE ===');
      logger.info('API Response - Payment Verify', {
        status: verifyResponse.status,
        statusText: verifyResponse.statusText,
        response: verifyResult,
        isSuccess: verifyResponse.ok
      });
      
      if (verifyResponse.ok && verifyResult.success) {
        // Payment verified successfully
        logger.info('Payment verification successful');
        
        // Update order status to paid
        if (currentOrderId) {
          const orderData = {
            id: currentOrderId,
            orderNumber: currentOrderId,
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: 'payment confirmed',
            total: finalTotal,
            totalAmount: finalTotal.toString(),
            subtotal: (cartSummary?.subtotal || total).toString(),
            deliveryCharge: (cartSummary?.deliveryCharge || 0).toString(),
            tax: '0',
            items: items.map(item => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              image: item.image,
              totalPrice: (item.price * item.quantity).toString()
            })),
            deliveryAddress: {
              addressLine1: selectedDeliveryAddress?.address || selectedAddress?.fullAddress || 'Address not available'
            },
            paymentMethod: 'RAZORPAY'
          };
          dispatch(addOrder(orderData));
        }
        
        // Send API notification for payment success
        await apiNotificationService.notifyPaymentSuccess(currentOrderId, finalTotal);
        dispatch(clearCart());
        onOrderPlaced({ 
          orderId: currentOrderId, 
          totalAmount: finalTotal 
        });
        setPaymentStatus({ visible: true, status: 'success', message: 'Payment verified! Order placed.' });
        setTimeout(() => {
          setPaymentStatus({ visible: false, status: 'processing', message: '' });
          router.push('/(tabs)/' as any);
        }, 2000);
      } else {
        // Payment verification failed
        logger.error('Payment verification failed', { error: verifyResult.message });
        await apiNotificationService.notifyPaymentFailed(currentOrderId, 'Payment verification failed');
        setPaymentStatus({ visible: true, status: 'failed', message: 'Payment verification failed' });
        setTimeout(() => {
          setPaymentStatus({ visible: false, status: 'processing', message: '' });
          setIsPlacingOrder(false);
        }, 2000);
      }
    } catch (error) {
      logger.error('Error verifying payment', { error: error.message });
      await apiNotificationService.notifyPaymentFailed(currentOrderId, 'Payment verification error');
      setPaymentStatus({ visible: true, status: 'failed', message: 'Payment verification error' });
      setTimeout(() => {
        setPaymentStatus({ visible: false, status: 'processing', message: '' });
        setIsPlacingOrder(false);
      }, 2000);
    }
  };



  const handleWebViewMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      setShowPaymentWebView(false);
      
      // Always call verification API regardless of payment outcome
      setPaymentStatus({ visible: true, status: 'processing', message: 'Verifying payment...' });
      
      if (message.type === 'success') {
        await verifyPayment(message.data);
      } else {
        // For failed or cancelled payments, still call verification API
        await apiNotificationService.notifyPaymentFailed(currentOrderId, 'Payment cancelled or failed');
        await verifyPayment(null);
      }
    } catch (error) {
      logger.error('Error parsing WebView message', { error: error.message });
      await apiNotificationService.notifyPaymentFailed(currentOrderId, 'Payment processing error');
      setPaymentStatus({ visible: true, status: 'failed', message: 'Payment error occurred' });
    }
  };

  const [currentOrderData, setCurrentOrderData] = useState<any>(null);
  const [orderResponseData, setOrderResponseData] = useState<any>(null);

  const getCurrentOrderData = () => {
    return currentOrderData;
  };

  const completeOrder = async (orderData: any, paymentMethod: string, paymentId?: string) => {
    try {
      const payload = {
        storeId: orderData.storeId,
        deliveryAddressId: orderData.deliveryAddressId,
        items: orderData.items,
        ...(paymentMethod === 'UPI' ? {
          paymentMethod: 'RAZORPAY',
          paymentGateway: 'razorpay',
          paymentId: paymentId
        } : {
          paymentMethod: 'CASH_ON_DELIVERY'
        })
      };

      logger.info('Order payload prepared for completion', { payload });

      logger.info('API Request - Complete Order', {
        url: API_ENDPOINTS.ORDERS.BASE,
        method: 'POST',
        payload: payload
      });

      const response = await tokenManager.makeAuthenticatedRequest(API_ENDPOINTS.ORDERS.BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      logger.info('API Response - Complete Order', {
        status: response.status,
        statusText: response.statusText,
        response: result
      });
      
      if (response.ok) {
        // Save order to Redux store
        const orderData = {
          id: result.data?.order?.id || Date.now().toString(),
          orderNumber: result.data?.order?.orderNumber || Date.now().toString(),
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          status: paymentMethod === 'COD' ? 'placed' : 'payment confirmed',
          total: finalTotal,
          totalAmount: finalTotal.toString(),
          subtotal: (cartSummary?.subtotal || total).toString(),
          deliveryCharge: (cartSummary?.deliveryCharge || 0).toString(),
          tax: '0',
          items: orderItems.map((item, index) => ({
            id: items[index]?.id || item.variantId,
            name: items[index]?.name || 'Product',
            quantity: item.quantity,
            price: items[index]?.price || 0,
            image: items[index]?.image || '',
            totalPrice: ((items[index]?.price || 0) * item.quantity).toString()
          })),
          deliveryAddress: {
            addressLine1: selectedAddress?.fullAddress || selectedAddress?.address || 'Address not available'
          },
          paymentMethod: paymentMethod === 'COD' ? 'CASH_ON_DELIVERY' : 'RAZORPAY'
        };
        dispatch(addOrder(orderData));
        
        // Send API notification for order placed
        await apiNotificationService.notifyOrderPlaced(result.data?.order?.id || Date.now().toString(), finalTotal);
        dispatch(clearCart());
        onOrderPlaced();
        setPaymentStatus({ visible: true, status: 'success', message: 'Order placed successfully!' });
        setTimeout(() => {
          setPaymentStatus({ visible: false, status: 'processing', message: '' });
          router.push('/(tabs)/' as any);
        }, 2000);
      } else {
        logger.error('Order creation failed', { message: result.message });
        await apiNotificationService.notifyOrderStatus('unknown', 'failed', result.message || 'Failed to place order');
        setPaymentStatus({ visible: true, status: 'failed', message: result.message || 'Failed to place order' });
        setTimeout(() => {
          setPaymentStatus({ visible: false, status: 'processing', message: '' });
          setIsPlacingOrder(false);
        }, 2000);
      }
    } catch (error) {
      logger.error('Error placing order', { error: error.message });
      // API notification instead of Alert
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress || !selectedAddress.id) {
      // API notification instead of Alert
      return;
    }

    setIsPlacingOrder(true);
    
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        // API notification instead of Alert
        setIsPlacingOrder(false);
        return;
      }

      // Get cart items for the order
      logger.info('Fetching cart items for order placement');
      const cartResponse = await tokenManager.makeAuthenticatedRequest(API_ENDPOINTS.CART.BASE);
      const cartData = await cartResponse.json();
      
      logger.info('Cart data retrieved for order', { cartData });
      const cartItems = cartData.data?.carts?.[0]?.items || [];
      
      const orderItems = cartItems.map(item => {
        const variantId = (item.variant?.id || item.variantId)?.toString().trim();
        return {
          variantId: variantId,
          quantity: parseInt(item.quantity)
        };
      });
      
      const orderData = {
        storeId: '0d29835f-3840-4d72-a26d-ed96ca744a34',
        deliveryAddressId: selectedAddress.id,
        items: orderItems
      };
      
      // Store order data for WebView callback
      setCurrentOrderData({
        storeId: "0d29835f-3840-4d72-a26d-ed96ca744a34",
        deliveryAddressId: selectedDeliveryAddress.id,
        paymentMethod: paymentMethod
      });
      
      if (selectedPayment === 'upi') {
        await handleRazorpayPayment(orderData);
      } else {
        await completeOrder(orderData, 'COD');
      }
    } catch (error) {
      logger.error('Error placing order', { error: error.message });
      // API notification instead of Alert
      setIsPlacingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <SkeletonLoader width={24} height={24} />
          <SkeletonLoader width={80} height={18} />
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.content}>
          <View style={[styles.section, { borderBottomColor: colors.lightGray }]}>
            <SkeletonLoader width={120} height={16} style={{ marginBottom: 12 }} />
            <SkeletonLoader width="100%" height={60} borderRadius={8} />
          </View>
          {[1, 2, 3].map((item) => (
            <View key={item} style={[styles.section, { borderBottomColor: colors.lightGray }]}>
              <SkeletonLoader width="60%" height={16} style={{ marginBottom: 12 }} />
              <SkeletonLoader width="100%" height={40} />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Customer Details - Commented out as requested */}
        {/* <View style={[styles.section, { borderBottomColor: colors.lightGray }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer Details</Text>
          <TouchableOpacity 
            style={[styles.addressCard, { backgroundColor: colors.lightGray }]}
            onPress={() => setShowDetailsModal(true)}
          >
            <Ionicons name="person" size={20} color={colors.primary} />
            <View style={styles.addressInfo}>
              <Text style={[styles.addressType, { color: colors.text }]}>Customer Info</Text>
              <Text style={[styles.addressText, { color: colors.gray }]}>
                {customerDetails ? 
                  `${customerDetails.name}${customerDetails.mobile ? ' • ' + customerDetails.mobile : ''}` : 
                  'Enter customer details'
                }
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowDetailsModal(true)}>
              <Text style={[styles.changeText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View> */}

        {/* Delivery Address */}
        <View style={styles.billDetailsContainer}>
          <View style={[styles.billDetailsBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Address</Text>
            <View style={[styles.addressCard, { backgroundColor: colors.lightGray }]}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <View style={styles.addressInfo}>
                <Text style={[styles.addressType, { color: colors.text }]}>Delivery to</Text>
                <Text style={[styles.addressText, { color: colors.gray }]}>
                  {selectedAddress ? 
                    ((selectedAddress.address || selectedAddress.fullAddress || selectedAddress.addressLine2 || '').length > 40 ? 
                      (selectedAddress.address || selectedAddress.fullAddress || selectedAddress.addressLine2 || '').substring(0, 40) + '...' : 
                      (selectedAddress.address || selectedAddress.fullAddress || selectedAddress.addressLine2 || '')) : 
                    'Select delivery address'
                  }
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/saved-locations')}>
                <Text style={[styles.changeText, { color: colors.primary }]}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.billDetailsContainer}>
          <View style={[styles.billDetailsBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
            {/* Show items from API cart if available, otherwise from Redux */}
            {(cartItems.length > 0 ? cartItems : items).map((item, index) => {
              const isApiItem = cartItems.length > 0;
              const itemName = isApiItem ? (item.product?.name || item.variant?.name) : item.name;
              const itemQuantity = item.quantity;
              const itemPrice = isApiItem ? 
                (item.isFreeProduct ? 0 : parseFloat(item.unitPrice || 0) * item.quantity) : 
                (item.price * item.quantity);
              
              return (
                <View key={isApiItem ? item.id : `${item.id}-${index}`} style={[styles.orderItem, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{itemName}</Text>
                  <Text style={[styles.itemQuantity, { color: colors.gray }]}>x{itemQuantity}</Text>
                  {isApiItem && item.isFreeProduct ? (
                    <Text style={[styles.freeItemPrice, { color: colors.primary }]}>FREE</Text>
                  ) : (
                    <Text style={[styles.itemPrice, { color: colors.text }]}>₹{Math.round(itemPrice)}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Payment Method */}
       {/*  <View style={[styles.section, { borderBottomColor: colors.lightGray }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                { borderBottomColor: colors.border },
                selectedPayment === method.id && { backgroundColor: colors.lightGray }
              ]}
              onPress={() => setSelectedPayment(method.id)}
            >
              <Ionicons name={method.icon as any} size={24} color={colors.gray} />
              <Text style={[styles.paymentText, { color: colors.text }]}>{method.name}</Text>
              <View style={[styles.radioButton, { borderColor: colors.primary }]}>
                {selectedPayment === method.id && (
                  <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View> */}

        {/* Referral Code */}
        {/* <View style={[styles.section, { borderBottomColor: colors.lightGray }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Have a Coupon Code?</Text>
          {!isReferralApplied ? (
            <View style={styles.referralContainer}>
              <TextInput
                style={[
                  styles.referralInput,
                  { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                placeholder="Comming Soon....."
                placeholderTextColor={colors.gray}
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity 
                style={[styles.applyButton, { backgroundColor: colors.gray, opacity: 0.5 }]}
                disabled={true}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.appliedReferral, { backgroundColor: colors.lightGray }]}>
              <View style={styles.appliedInfo}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.appliedText, { color: colors.text }]}>Code Applied: {referralCode}</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveReferral}>
                <Ionicons name="close" size={20} color={colors.gray} />
              </TouchableOpacity>
            </View>
          )}
        </View> */}

      </ScrollView>
      
      {/* Bill Details - Fixed at bottom */}
      <View style={styles.billDetailsContainer}>
        <View style={[styles.billDetailsBox, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bill Details</Text>
        <View style={styles.billRow}>
          <Text style={[styles.billLabel, { color: colors.gray }]}>Items Total ({cartSummary?.totalItems || cartItems.length || items.length} items)</Text>
          <Text style={[styles.billValue, { color: colors.text }]}>₹{Math.round(cartSummary?.subtotal || total)}</Text>
        </View>
        <View style={styles.billRow}>
          <Text style={[styles.billLabel, { color: colors.gray }]}>Delivery Charge</Text>
          <Text style={[styles.billValue, { color: (cartSummary?.deliveryCharge || 0) === 0 ? 'green' : colors.text }]}>
            {(cartSummary?.deliveryCharge || 0) === 0 ? 'FREE' : `₹${cartSummary?.deliveryCharge || 0}`}
          </Text>
        </View>
        {(() => {
          const totalMRP = cartItems.reduce((sum, item) => {
            const basePrice = parseFloat(item.variant?.basePrice || item.unitPrice || 0);
            return sum + (basePrice * item.quantity);
          }, 0);
          
          const currentTotal = cartSummary?.subtotal || 0;
          const totalSavings = totalMRP - currentTotal;
          
          return totalSavings > 0 ? (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.primary }]}>Total Savings</Text>
              <Text style={[styles.billValue, { color: colors.primary }]}>-₹{Math.round(totalSavings)}</Text>
            </View>
          ) : null;
        })()}
        {referralDiscount > 0 && (
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.primary }]}>Referral Discount</Text>
            <Text style={[styles.billValue, { color: colors.primary }]}>-₹{referralDiscount}</Text>
          </View>
        )}

        <View style={[styles.billRow, styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>Grand Total</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>₹{finalTotal}</Text>
        </View>
      </View>
      </View>

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={[styles.paymentSelector, { backgroundColor: colors.lightGray }]}
          onPress={() => {
            setShowPaymentModal(true);
            setShowPaymentHint(false);
          }}
        >
          <View style={styles.paymentInfo}>
            <Ionicons 
              name={paymentMethods.find(p => p.id === selectedPayment)?.icon as any} 
              size={20} 
              color={colors.text} 
            />
            <Text style={[styles.paymentLabel, { color: colors.text }]}>
              {paymentMethods.find(p => p.id === selectedPayment)?.name}
            </Text>
          </View>
          <View style={styles.paymentRight}>
            {showPaymentHint && (
              <View style={[styles.hintDot, { backgroundColor: colors.primary }]} />
            )}
            <Ionicons name="chevron-down" size={16} color={colors.gray} />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.placeOrderButton, 
            { backgroundColor: colors.primary },
            isPlacingOrder && styles.disabledButton
          ]}
          onPress={() => setShowConfirmOrder(true)}
          disabled={isPlacingOrder}
        >
          <Text style={styles.placeOrderText}>₹{finalTotal}</Text>
          <Text style={styles.placeOrderSubtext}>Place Order</Text>
        </TouchableOpacity>
      </View>

      {/* Address Modal */}
      <Modal visible={showAddressModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Delivery Address</Text>
            
            {savedAddresses.length > 0 && (
              <View>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Saved Addresses</Text>
                {savedAddresses.map((address) => (
                  <TouchableOpacity
                    key={address.id}
                    style={styles.modalOption}
                    onPress={() => {
                      const selectedAddr = {
                        id: address.id,
                        name: address.type.charAt(0).toUpperCase() + address.type.slice(1),
                        address: `${address.landmark ? address.landmark + ', ' : ''}${address.pincode ? address.pincode.city + ', ' + address.pincode.code : ''}`,
                        timestamp: new Date().toISOString()
                      };
                      setSelectedDeliveryAddress(selectedAddr);
                      setShowAddressModal(false);
                    }}
                  >
                    <View style={styles.modalOptionLeft}>
                      <Ionicons name={address.type === 'home' ? 'home' : address.type === 'office' ? 'business' : 'location'} size={24} color={colors.primary} />
                      <View>
                        <Text style={[styles.modalOptionText, { color: colors.text }]}>{address.type.charAt(0).toUpperCase() + address.type.slice(1)}</Text>
                        <Text style={[styles.modalOptionSubtext, { color: colors.gray }]}>
                          {address.landmark ? address.landmark + ', ' : ''}{address.pincode ? address.pincode.city + ', ' + address.pincode.code : ''}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {recentLocations.length > 0 && (
              <View>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Recent Locations</Text>
                {recentLocations.slice(0, 3).map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    style={styles.modalOption}
                    onPress={() => {
                      const selectedAddr = {
                        id: location.id,
                        name: location.locality,
                        address: location.fullAddress,
                        timestamp: new Date().toISOString()
                      };
                      setSelectedDeliveryAddress(selectedAddr);
                      setShowAddressModal(false);
                    }}
                  >
                    <View style={styles.modalOptionLeft}>
                      <Ionicons name="location" size={24} color={colors.primary} />
                      <View>
                        <Text style={[styles.modalOptionText, { color: colors.text }]}>{location.locality}</Text>
                        <Text style={[styles.modalOptionSubtext, { color: colors.gray }]}>{location.fullAddress}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.addNewAddress, { backgroundColor: colors.lightGray }]}
              onPress={() => {
                setShowAddressModal(false);
                router.push('/select-address');
              }}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={[styles.addNewAddressText, { color: colors.primary }]}>Add New Address</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalClose, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddressModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Payment Method</Text>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedPayment(method.id);
                  setShowPaymentModal(false);
                }}
              >
                <View style={styles.modalOptionLeft}>
                  <Ionicons name={method.icon as any} size={24} color={colors.text} />
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{method.name}</Text>
                </View>
                {selectedPayment === method.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.modalClose, { backgroundColor: colors.primary }]}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Enter More Details Modal */}
      <EnterMoreDetailsModal
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onSubmit={(details) => setCustomerDetails(details)}
      />

      {/* Payment Status Modal */}
      <PaymentStatusModal
        visible={paymentStatus.visible}
        status={paymentStatus.status}
        message={paymentStatus.message}
        onRetry={undefined}
        onClose={() => {
          setPaymentStatus({ visible: false, status: 'processing', message: '' });
          setIsPlacingOrder(false);
        }}
      />

      {/* Order Confirmation Modal */}
      <Modal visible={showConfirmOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Order</Text>
            <Text style={[styles.confirmText, { color: colors.gray }]}>Are you sure you want to place this order?</Text>
            <Text style={[styles.confirmAmount, { color: colors.text }]}>Total Amount: ₹{finalTotal}</Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: '#FF6B35' }]}
                onPress={() => setShowConfirmOrder(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.proceedButton, { backgroundColor: '#00B761' }]}
                onPress={() => {
                  setShowConfirmOrder(false);
                  placeOrder();
                }}
                disabled={isPlacingOrder}
              >
                <Text style={styles.proceedButtonText}>
                  {isPlacingOrder ? 'Placing...' : 'Proceed'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Razorpay WebView */}
      <Modal visible={showPaymentWebView} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <WebView
            source={{ html: paymentHtml }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            mixedContentMode="compatibility"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              logger.error('WebView error', { error: nativeEvent.description });
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              logger.error('WebView HTTP error', { statusCode: nativeEvent.statusCode });
            }}
          />
        </SafeAreaView>
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
  section: {
    padding: 16,
    borderBottomWidth: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  addressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addressType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
  },
  itemQuantity: {
    fontSize: 14,
    marginRight: 16,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  paymentText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  referralContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referralInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 12,
  },
  applyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appliedReferral: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  appliedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  billLabel: {
    fontSize: 14,
  },
  billValue: {
    fontSize: 14,
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },

  paymentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  paymentRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  placeOrderButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120,
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  placeOrderSubtext: {
    color: '#fff',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  modalOptionSubtext: {
    fontSize: 14,
    marginLeft: 12,
    marginTop: 2,
  },
  modalClose: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#666',
  },
  addNewAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  addNewAddressText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  billDetailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  billDetailsBox: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#00B761',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  confirmText: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  proceedButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  freeItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});