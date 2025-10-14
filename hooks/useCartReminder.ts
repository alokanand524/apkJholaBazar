import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { cartReminderService } from '@/services/cartReminderService';

export const useCartReminder = () => {
  useEffect(() => {
    // Initialize notification service
    cartReminderService.init();

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        cartReminderService.onAppForeground();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  return {
    scheduleReminders: () => cartReminderService.scheduleCartReminders(),
    clearReminders: () => cartReminderService.clearReminders(),
    onCartUpdated: (action?: 'item_added' | 'item_removed' | 'quantity_updated', itemName?: string) => 
      cartReminderService.onCartUpdated(action, itemName),
    onOrderPlaced: (orderData?: any) => cartReminderService.onOrderPlaced(orderData),
    checkOnAppStart: () => cartReminderService.checkAndScheduleOnAppStart(),
  };
};