import notificationIntegrationService from '@/services/notificationIntegrationService';
import { logger } from '@/utils/logger';

// Helper functions for easy integration throughout the app

export class NotificationHelpers {
  
  // Order-related notifications
  static async notifyOrderConfirmed(orderId: string, customerId?: string) {
    try {
      await notificationIntegrationService.sendOrderStatusNotification(
        orderId, 
        'ORDER_CONFIRMED', 
        customerId
      );
    } catch (error) {
      logger.error('Failed to send order confirmed notification', { orderId, error: error.message });
    }
  }

  static async notifyOrderDispatched(orderId: string, customerId?: string) {
    try {
      await notificationIntegrationService.sendOrderStatusNotification(
        orderId, 
        'ORDER_DISPATCHED', 
        customerId
      );
    } catch (error) {
      logger.error('Failed to send order dispatched notification', { orderId, error: error.message });
    }
  }

  static async notifyOrderDelivered(orderId: string, customerId?: string) {
    try {
      await notificationIntegrationService.sendOrderStatusNotification(
        orderId, 
        'ORDER_DELIVERED', 
        customerId
      );
    } catch (error) {
      logger.error('Failed to send order delivered notification', { orderId, error: error.message });
    }
  }

  static async notifyOrderCancelled(orderId: string, customerId?: string) {
    try {
      await notificationIntegrationService.sendOrderStatusNotification(
        orderId, 
        'ORDER_CANCELLED', 
        customerId
      );
    } catch (error) {
      logger.error('Failed to send order cancelled notification', { orderId, error: error.message });
    }
  }

  static async notifyPaymentFailed(orderId: string, customerId?: string) {
    try {
      await notificationIntegrationService.sendPaymentFailedNotification(
        orderId, 
        customerId
      );
    } catch (error) {
      logger.error('Failed to send payment failed notification', { orderId, error: error.message });
    }
  }

  // Delivery-related notifications
  static async notifyDeliveryAssigned(orderId: string, deliveryAgentId: string) {
    try {
      await notificationIntegrationService.sendDeliveryAssignmentNotification(
        orderId, 
        deliveryAgentId, 
        'NEW_DELIVERY_ASSIGNED'
      );
    } catch (error) {
      logger.error('Failed to send delivery assigned notification', { orderId, deliveryAgentId, error: error.message });
    }
  }

  static async notifyDeliveryReminder(orderId: string, deliveryAgentId: string) {
    try {
      await notificationIntegrationService.sendDeliveryAssignmentNotification(
        orderId, 
        deliveryAgentId, 
        'DELIVERY_REMINDER'
      );
    } catch (error) {
      logger.error('Failed to send delivery reminder notification', { orderId, deliveryAgentId, error: error.message });
    }
  }

  // User engagement notifications
  static async notifyWelcomeUser(userId: string) {
    try {
      await notificationIntegrationService.sendWelcomeNotification(userId);
    } catch (error) {
      logger.error('Failed to send welcome notification', { userId, error: error.message });
    }
  }

  static async notifyCartReminder(customerId: string, cartItemsCount: number) {
    try {
      await notificationIntegrationService.sendCartReminderNotification(
        customerId, 
        cartItemsCount
      );
    } catch (error) {
      logger.error('Failed to send cart reminder notification', { customerId, error: error.message });
    }
  }

  // Promotional notifications
  static async notifySpecialOffer(
    userIds: string[], 
    offerTitle: string, 
    offerDescription: string, 
    offerCode?: string
  ) {
    try {
      await notificationIntegrationService.sendOfferNotification(
        userIds, 
        offerTitle, 
        offerDescription, 
        offerCode
      );
    } catch (error) {
      logger.error('Failed to send offer notification', { userCount: userIds.length, error: error.message });
    }
  }

  static async notifyBulkPromotion(
    userIds: string[], 
    title: string, 
    message: string, 
    data?: any
  ) {
    try {
      await notificationIntegrationService.sendPromotionalNotification(
        title, 
        message, 
        userIds, 
        'CUSTOMER', 
        data
      );
    } catch (error) {
      logger.error('Failed to send bulk promotion notification', { userCount: userIds.length, error: error.message });
    }
  }

  // Utility functions
  static async scheduleCartReminder(customerId: string, delayMinutes: number = 30) {
    // Schedule a cart reminder after specified delay
    setTimeout(async () => {
      try {
        // Get current cart items count (implement based on your cart logic)
        const cartItemsCount = await this.getCartItemsCount(customerId);
        if (cartItemsCount > 0) {
          await this.notifyCartReminder(customerId, cartItemsCount);
        }
      } catch (error) {
        logger.error('Failed to send scheduled cart reminder', { customerId, error: error.message });
      }
    }, delayMinutes * 60 * 1000);
  }

  private static async getCartItemsCount(customerId: string): Promise<number> {
    // Implement this based on your cart storage logic
    // This is a placeholder - replace with actual cart count logic
    try {
      // Example: fetch from AsyncStorage, Redux store, or API
      return 0; // Placeholder
    } catch (error) {
      logger.error('Failed to get cart items count', { customerId, error: error.message });
      return 0;
    }
  }
}

export default NotificationHelpers;