import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '@/constants/api';
import { apiNotificationService } from './apiNotificationService';

class CartReminderService {
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastCartUpdateTime: number = 0;

  async init() {
    // No local notification setup needed - using API only
    return true;
  }

  async scheduleCartReminders() {
    // Cart reminders now handled by backend API
    console.log('Cart reminders delegated to backend API');
  }



  private async checkCartItems(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return false;

      const response = await fetch(API_ENDPOINTS.CART.BASE, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        const cart = result.data?.carts?.[0];
        return cart?.items?.length > 0;
      }
      return false;
    } catch (error) {
      console.error('Error checking cart items:', error);
      return false;
    }
  }

  async clearReminders() {
    // No local notifications to clear - handled by backend
    console.log('Cart reminders cleared (backend handled)');
  }

  async clearAllNotifications() {
    // No local notifications to clear - handled by backend
    console.log('All notifications cleared (backend handled)');
  }

  async onCartUpdated(action?: 'item_added' | 'item_removed' | 'quantity_updated', itemName?: string) {
    // Send API notification for cart update
    if (action && itemName) {
      await apiNotificationService.notifyCartUpdate(action, itemName);
    }
  }



  async checkAndScheduleOnAppStart() {
    // Backend handles cart reminders on app start
    console.log('App start cart check delegated to backend');
  }

  async onOrderPlaced(orderData?: any) {
    // Send API notification for order placed
    if (orderData?.orderId && orderData?.totalAmount) {
      await apiNotificationService.notifyOrderPlaced(orderData.orderId, orderData.totalAmount);
    }
  }



  async onAppForeground() {
    // Backend handles foreground cart checks
    console.log('App foreground cart check delegated to backend');
  }
}

export const cartReminderService = new CartReminderService();