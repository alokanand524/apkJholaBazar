import React from 'react';
import { View, Text, Modal, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface PaymentStatusModalProps {
  visible: boolean;
  status: 'processing' | 'success' | 'failed';
  message: string;
  onClose?: () => void;
  onRetry?: () => void;
}

export default function PaymentStatusModal({ visible, status, message, onClose, onRetry }: PaymentStatusModalProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <ActivityIndicator size="large" color={Colors.light.primary} />;
      case 'success':
        return <Ionicons name="checkmark-circle" size={60} color="#00B761" />;
      case 'failed':
        return <Ionicons name="close-circle" size={60} color="#FF3B30" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return '#00B761';
      case 'failed':
        return '#FF3B30';
      default:
        return Colors.light.text;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            {getStatusIcon()}
          </View>
          <Text style={[styles.message, { color: getStatusColor() }]}>
            {message}
          </Text>
          
          {status === 'failed' && onRetry && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: Colors.light.primary }]}
                onPress={onRetry}
              >
                <Text style={styles.retryButtonText}>Retry Payment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 200,
  },
  iconContainer: {
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});