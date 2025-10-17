import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export const testNotificationSetup = async () => {
  console.log('🧪 Testing Notification Setup...');
  
  // 1. Check if device supports notifications
  console.log('📱 Device Info:', {
    isDevice: Device.isDevice,
    deviceType: Device.deviceType,
    platform: Device.osName
  });
  
  // 2. Check permissions
  const { status } = await Notifications.getPermissionsAsync();
  console.log('🔐 Permission Status:', status);
  
  // 3. Check project ID
  const projectId = 
    Constants?.expoConfig?.extra?.eas?.projectId ?? 
    Constants?.easConfig?.projectId ??
    Constants?.manifest?.extra?.eas?.projectId ??
    'c77f147a-c2bd-4d7e-b3bc-91f3eaa0ae24';
  
  console.log('🆔 Project ID:', projectId);
  
  // 4. Try to get push token
  try {
    if (Device.isDevice && status === 'granted') {
      const tokenData = await Notifications.getExpoPushTokenAsync({ 
        projectId,
        applicationId: 'com.jholabazar.app'
      });
      console.log('✅ Push Token Success:', tokenData.data.substring(0, 50) + '...');
      return { success: true, token: tokenData.data };
    } else {
      console.log('❌ Cannot get token - Device:', Device.isDevice, 'Permission:', status);
      return { success: false, reason: 'Device or permission issue' };
    }
  } catch (error) {
    console.log('❌ Token Error:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendTestNotification = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification 📱",
        body: 'Notifications are working in your APK build!',
        data: { type: 'test' },
      },
      trigger: { seconds: 2 },
    });
    console.log('✅ Test notification scheduled');
    return true;
  } catch (error) {
    console.log('❌ Test notification failed:', error.message);
    return false;
  }
};