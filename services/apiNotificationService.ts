import { logger } from '@/utils/logger';

class ApiNotificationService {
  // All notification methods disabled
  async notifyCartUpdate(action: 'item_added' | 'item_removed' | 'quantity_updated', itemName?: string): Promise<void> {
    // Notification removed
  }

  async notifyOrderPlaced(orderId: string, totalAmount: number): Promise<void> {
    // Notification removed
  }

  async notifyPaymentSuccess(orderId: string, amount: number): Promise<void> {
    // Notification removed
  }

  async notifyPaymentFailed(orderId: string, reason?: string): Promise<void> {
    // Notification removed
  }

  async notifyOrderStatus(orderId: string, status: string, message: string): Promise<void> {
    // Notification removed
  }
}

export const apiNotificationService = new ApiNotificationService();