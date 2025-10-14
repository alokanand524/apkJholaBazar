import { config } from '@/config/env';
import { setPushToken } from '@/store/slices/userSlice';
import { store } from '@/store/store';
import { logger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

class PushTokenService {
  private retryAttempts = 0;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  async registerPushTokenForUser() {
    try {
      const { isLoggedIn } = store.getState().user;
      if (!isLoggedIn) {
        console.log('❌ User not logged in, skipping push token registration');
        return;
      }
      
      console.log('🔐 User is authenticated, registering push token...');
      console.log('📱 Device check:', Device.isDevice);
      console.log('📱 Device type:', Device.deviceType);
      console.log('📱 Platform:', Device.osName);

      if (!Device.isDevice) {
        console.log('⚠️ Not a physical device, but continuing for development...');
        // Don't return - allow development testing
      }

      console.log('🔔 Checking notification permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📋 Current permission status:', existingStatus);
      
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        console.log('🔔 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('📋 New permission status:', finalStatus);
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Push notification permission not granted:', finalStatus);
        logger.warn('Push notification permission not granted');
        return;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      console.log('🆔 Project ID:', projectId);
      
      if (!projectId) {
        console.log('❌ Project ID not found');
        throw new Error('Project ID not found');
      }
      
      console.log('🔄 Generating Expo push token...');
      const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenResult.data;
      console.log('📱 Token result:', tokenResult);
      
      console.log('🔑 EXPO PUSH TOKEN:', token);
      
      // Store in Redux
      store.dispatch(setPushToken(token));
      
      // Store locally
      await AsyncStorage.setItem('pushToken', token);
      
      // Send to backend with retry logic
      await this.sendTokenWithRetry(token);
      
    } catch (error) {
      console.log('❌ Push token registration error:', error.message);
      console.log('🔍 Full error:', error);
      logger.error('Failed to register push token', { error: error.message });
    }
  }

  private async sendTokenWithRetry(token: string) {
    const success = await this.sendTokenToBackend(token);
    
    if (!success && this.retryAttempts < this.maxRetries) {
      this.retryAttempts++;
      console.log(`🔄 Retrying push token send (${this.retryAttempts}/${this.maxRetries}) in ${this.retryDelay/1000}s...`);
      
      setTimeout(() => {
        this.sendTokenWithRetry(token);
      }, this.retryDelay);
    } else if (success) {
      this.retryAttempts = 0;
      await AsyncStorage.setItem('pushTokenSent', 'true');
      console.log('✅ Push token registered successfully');
    } else {
      console.log('❌ Failed to send push token after all retries');
    }
  }

  private async sendTokenToBackend(token: string): Promise<boolean> {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        logger.warn('No auth token found');
        return false;
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
        console.log('✅ Push token sent to backend successfully');
        return true;
      } else {
        console.log('❌ Failed to send push token. Status:', response.status);
        return false;
      }
    } catch (error) {
      console.log('❌ Error sending push token:', error.message);
      return false;
    }
  }

  async checkAndSendStoredToken() {
    try {
      const { isLoggedIn } = store.getState().user;
      if (!isLoggedIn) return;

      const storedToken = await AsyncStorage.getItem('pushToken');
      const tokenSent = await AsyncStorage.getItem('pushTokenSent');
      
      if (storedToken && tokenSent !== 'true') {
        console.log('📤 Found unsent push token, attempting to send...');
        await this.sendTokenWithRetry(storedToken);
      }
    } catch (error) {
      logger.error('Error checking stored token', { error: error.message });
    }
  }

  async removePushToken() {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      await fetch(`${config.API_BASE_URL}/notifications/push-token`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Clear local storage
      await AsyncStorage.multiRemove(['pushToken', 'pushTokenSent']);
      this.retryAttempts = 0;
      
      logger.info('Push token removed from backend');
    } catch (error) {
      logger.error('Error removing push token', { error: error.message });
    }
  }
}

export default new PushTokenService();