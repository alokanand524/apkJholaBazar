import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import notificationService from '@/services/notificationService';
import { logger } from '@/utils/logger';

export const TestNotificationButton = () => {
  const [pushToken, setPushToken] = useState<string | null>(null);

  const getPushToken = async () => {
    try {
      await notificationService.initialize();
      const token = notificationService.getPushToken();
      setPushToken(token);
      
      if (token) {
        Alert.alert(
          'Push Token Retrieved!',
          `Token: ${token.substring(0, 50)}...`,
          [
            { text: 'Copy to Clipboard', onPress: () => {
              // Copy to clipboard logic here
              logger.info('Push Token:', token);
            }},
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to get push token. Make sure you\'re on a physical device.');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      logger.error('Failed to get push token', { error: error.message });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={getPushToken}>
        <Text style={styles.buttonText}>Get Push Token</Text>
      </TouchableOpacity>
      
      {pushToken && (
        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Your Push Token:</Text>
          <Text style={styles.tokenText} numberOfLines={3}>
            {pushToken}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#00B761',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tokenContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    width: '100%',
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tokenText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
  },
});

export default TestNotificationButton;