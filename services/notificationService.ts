import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

// Register background handler for FCM
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📱 FCM Background Message:', remoteMessage);
});

// Configure notification behavior for receiving API notifications only
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📱 Notification received:', notification.request.content);
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

class NotificationService {
  private pushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  async initialize() {
    await this.registerForPushNotifications();
    this.setupNotificationListeners();
  }

  async registerForPushNotifications() {
    if (!Device.isDevice) {
      logger.warn('Must use physical device for Push Notifications');
      return;
    }

    // Add delay for APK builds to ensure proper initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      logger.warn('Failed to get push token for push notification');
      return;
    }

    try {
      // Enhanced project ID detection for APK builds
      const projectId = 
        Constants?.expoConfig?.extra?.eas?.projectId ?? 
        Constants?.easConfig?.projectId ??
        Constants?.manifest?.extra?.eas?.projectId ??
        'c77f147a-c2bd-4d7e-b3bc-91f3eaa0ae24'; // Fallback to your project ID
      
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      
      console.log('🔑 Using Project ID:', projectId);
      
      // For APK builds, try to get FCM token first, fallback to Expo token
      let tokenData;
      try {
        // Check if running in standalone app (APK)
        if (Constants.executionEnvironment === 'standalone') {
          const fcmToken = await messaging().getToken();
          tokenData = { data: fcmToken, type: 'fcm' };
          console.log('🔥 Using FCM token for APK build:', fcmToken.substring(0, 50) + '...');
        } else {
          tokenData = await Notifications.getExpoPushTokenAsync({ 
            projectId,
            applicationId: 'com.jholabazar.app'
          });
          console.log('📱 Using Expo token for development');
        }
      } catch (fcmError) {
        console.log('⚠️ FCM failed, falling back to Expo token:', fcmError instanceof Error ? fcmError.message : String(fcmError));
        tokenData = await Notifications.getExpoPushTokenAsync({ 
          projectId,
          applicationId: 'com.jholabazar.app'
        });
      }
      
      const token = tokenData.data;
      this.pushToken = token;
      
      // Log the token for debugging
      console.log('🔑 EXPO PUSH TOKEN:', token);
      console.log('🔑 Token Type:', tokenData.type);
      logger.info('Push token obtained', { token, type: tokenData.type });
      
      // Only save token to backend if user is authenticated
      const authToken = await AsyncStorage.getItem('authToken');
      if (authToken) {
        await this.savePushTokenToBackend(token);
        logger.info('Push token saved to backend for authenticated user');
      } else {
        logger.info('Push token obtained but not sent - user not authenticated');
      }
    } catch (error) {
      logger.error('Error getting push token', { error: error instanceof Error ? error.message : String(error) });
    }

    if (Platform.OS === 'android') {
      // Create multiple notification channels for different types
      await Promise.all([
        Notifications.setNotificationChannelAsync('default', {
          name: 'Default Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00B761',
          sound: 'default',
          enableVibrate: true,
        }),
        Notifications.setNotificationChannelAsync('cart_reminder', {
          name: 'Cart Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00B761',
          sound: 'default',
        }),
        Notifications.setNotificationChannelAsync('order_updates', {
          name: 'Order Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#00B761',
          sound: 'default',
        })
      ]);
      
      console.log('🔔 Android notification channels created');
    }
  }

  // All notifications now handled by backend API

  // Save push token to backend
  async savePushTokenToBackend(token: string) {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        logger.warn('No auth token found, cannot save push token');
        return;
      }

      // Check if push token already sent for this session
      const tokenSent = await AsyncStorage.getItem('pushTokenSent');
      if (tokenSent === 'true') {
        console.log('🔄 Push token already sent for this session, skipping...');
        return;
      }

      const response = await fetch(`${config.API_BASE_URL}/notifications/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ expoPushToken: token })
      });

      if (response.ok) {
        console.log('✅ Push token saved to backend:', token.substring(0, 50) + '...');
        logger.info('Push token saved to backend successfully');
        // Mark token as sent
        await AsyncStorage.setItem('pushTokenSent', 'true');
      } else {
        console.log('❌ Failed to save push token to backend. Status:', response.status);
        logger.warn('Failed to save push token to backend', { status: response.status });
      }
    } catch (error) {
      logger.error('Error saving push token to backend', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Remove push token from backend (on logout)
  async removePushTokenFromBackend() {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      await fetch(`${config.API_BASE_URL}/notifications/push-token`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Clear the sent flag so token can be sent again on next login
      await AsyncStorage.removeItem('pushTokenSent');
      logger.info('Push token removed from backend and flag cleared');
    } catch (error) {
      logger.error('Error removing push token from backend', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Get current push token
  getPushToken(): string | null {
    return this.pushToken;
  }

  // Handle notification responses
  setupNotificationListeners() {
    // Clean up existing listeners
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }

    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Push notification received:', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data
      });
      logger.info('Notification received', { 
        title: notification.request.content.title,
        type: notification.request.content.data?.type 
      });
    });

    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('👆 Notification tapped:', data);
      logger.info('Notification tapped', { type: data?.type });
      
      // Handle different notification types
      this.handleNotificationResponse(data);
    });
  }

  // Handle notification tap responses
  private handleNotificationResponse(data: any) {
    console.log('🔔 Handling notification tap:', data);
    
    try {
      switch (data?.type) {
        case 'cart_reminder':
          router.push('/cart');
          console.log('📱 Navigating to cart from notification');
          break;
        case 'order_update':
        case 'order_confirmation':
        case 'order_status':
        case 'order_placed':
          if (data.orderId) {
            console.log('📱 Navigating to order details:', data.orderId);
            router.push(`/order-details/${data.orderId}`);
          }
          break;
        case 'delivery_assignment':
        case 'delivery_reminder':
          if (data.orderId) {
            console.log('📱 Navigating to delivery details:', data.orderId);
            router.push(`/order-details/${data.orderId}`);
          }
          break;
        case 'promotional':
        case 'offer':
          router.push('/(tabs)');
          console.log('📱 Navigating to home from promotional notification');
          break;
        case 'welcome':
          router.push('/(tabs)');
          console.log('📱 Navigating to home from welcome notification');
          break;
        default:
          console.log('❓ Unknown notification type:', data?.type);
      }
    } catch (error) {
      console.log('❌ Navigation error:', error);
      logger.error('Navigation error from notification', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Clean up listeners
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    // No local timers to clear
  }
}

export default new NotificationService();