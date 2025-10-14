import { logger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '@/config/env';

// Frontend integration service - calls backend APIs only
// Backend handles all notification sending with expo-server-sdk

class NotificationIntegrationService {
  


  // Send order status notification via backend
  async sendOrderStatusNotification(
    orderId: string,
    notificationType: 'ORDER_CONFIRMED' | 'ORDER_DISPATCHED' | 'ORDER_DELIVERED' | 'ORDER_CANCELLED' | 'PAYMENT_FAILED'
  ): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return false;

      const response = await fetch(`${config.API_BASE_URL}/notifications/push/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          notificationType
        })
      });

      if (response.ok) {
        logger.info('Order notification sent via backend', { orderId, notificationType });
        return true;
      } else {
        logger.warn('Failed to send order notification', { orderId, status: response.status });
        return false;
      }
    } catch (error) {
      logger.error('Failed to send order status notification', { 
        error: error.message, 
        orderId, 
        notificationType 
      });
      return false;
    }
  }

  // Send delivery assignment notification via backend
  async sendDeliveryAssignmentNotification(
    orderId: string,
    deliveryAgentId: string,
    notificationType: 'NEW_DELIVERY_ASSIGNED' | 'DELIVERY_REMINDER' = 'NEW_DELIVERY_ASSIGNED'
  ): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return false;

      const response = await fetch(`${config.API_BASE_URL}/notifications/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientId: deliveryAgentId,
          recipientType: 'DELIVERY_AGENT',
          title: notificationType === 'NEW_DELIVERY_ASSIGNED' ? 'New Delivery Assigned!' : 'Delivery Reminder',
          body: notificationType === 'NEW_DELIVERY_ASSIGNED' 
            ? 'You have a new delivery assignment.' 
            : 'You have a pending delivery.',
          data: { type: 'delivery', orderId, notificationType }
        })
      });

      return response.ok;
    } catch (error) {
      logger.error('Failed to send delivery assignment notification', { 
        error: error.message, 
        orderId, 
        deliveryAgentId 
      });
      return false;
    }
  }

  // Send promotional notification via backend
  async sendPromotionalNotification(
    title: string,
    body: string,
    targetUserIds: string[],
    userType: 'CUSTOMER' | 'DELIVERY_AGENT' | 'ADMIN' = 'CUSTOMER',
    data?: any
  ): Promise<{ success: number; failed: number }> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return { success: 0, failed: targetUserIds.length };

      const response = await fetch(`${config.API_BASE_URL}/notifications/push/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipients: targetUserIds.map(userId => ({
            recipientId: userId,
            recipientType: userType
          })),
          title,
          body,
          data: { type: 'promotional', ...data }
        })
      });

      if (response.ok) {
        const result = await response.json();
        return { success: result.success || 0, failed: result.failed || 0 };
      } else {
        return { success: 0, failed: targetUserIds.length };
      }
    } catch (error) {
      logger.error('Failed to send promotional notification', { 
        error: error.message, 
        targetCount: targetUserIds.length 
      });
      return { success: 0, failed: targetUserIds.length };
    }
  }

  // Send payment failed notification
  async sendPaymentFailedNotification(
    orderId: string
  ): Promise<boolean> {
    return await this.sendOrderStatusNotification(orderId, 'PAYMENT_FAILED');
  }

  // Send cart abandonment reminder via backend
  async sendCartReminderNotification(
    customerId: string,
    cartItemsCount: number
  ): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return false;

      const response = await fetch(`${config.API_BASE_URL}/notifications/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientId: customerId,
          recipientType: 'CUSTOMER',
          title: "Don't forget your cart! 🛒",
          body: `You have ${cartItemsCount} items waiting for you. Complete your order now!`,
          data: { type: 'cart_reminder', itemsCount: cartItemsCount }
        })
      });

      return response.ok;
    } catch (error) {
      logger.error('Failed to send cart reminder notification', { 
        error: error.message, 
        customerId 
      });
      return false;
    }
  }

  // Send welcome notification via backend
  async sendWelcomeNotification(userId: string): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return false;

      const response = await fetch(`${config.API_BASE_URL}/notifications/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientId: userId,
          recipientType: 'CUSTOMER',
          title: "Welcome to Jhola Bazar! 🎉",
          body: "Start shopping for fresh groceries delivered to your doorstep!",
          data: { type: 'welcome' }
        })
      });

      return response.ok;
    } catch (error) {
      logger.error('Failed to send welcome notification', { 
        error: error.message, 
        userId 
      });
      return false;
    }
  }

  // Send offer/discount notification via backend
  async sendOfferNotification(
    userIds: string[],
    offerTitle: string,
    offerDescription: string,
    offerCode?: string
  ): Promise<{ success: number; failed: number }> {
    const data = offerCode ? { type: 'offer', offerCode } : { type: 'offer' };
    
    return await this.sendPromotionalNotification(
      offerTitle,
      offerDescription,
      userIds,
      'CUSTOMER',
      data
    );
  }
}

export default new NotificationIntegrationService();