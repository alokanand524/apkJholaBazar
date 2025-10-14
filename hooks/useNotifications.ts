import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AppState, AppStateStatus } from 'react-native';
import notificationService from '@/services/notificationService';
import { RootState } from '@/store/store';
import { logger } from '@/utils/logger';

export const useNotifications = () => {
  const appState = useRef(AppState.currentState);
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const user = useSelector((state: RootState) => state.user.user);

  useEffect(() => {
    // Initialize notifications when user is authenticated
    if (isAuthenticated && user) {
      initializeNotifications();
    }

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        if (isAuthenticated) {
          logger.info('App foregrounded, reinitializing notifications');
          initializeNotifications();
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      notificationService.cleanup();
    };
  }, [isAuthenticated, user]);

  const initializeNotifications = async () => {
    try {
      await notificationService.initialize();
      logger.info('Notifications initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize notifications', { error: error.message });
    }
  };

  const getPushToken = () => {
    return notificationService.getPushToken();
  };

  const removePushToken = async () => {
    try {
      await notificationService.removePushTokenFromBackend();
      logger.info('Push token removed on logout');
    } catch (error) {
      logger.error('Failed to remove push token', { error: error.message });
    }
  };

  return {
    initializeNotifications,
    getPushToken,
    removePushToken
  };
};