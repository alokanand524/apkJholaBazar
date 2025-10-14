import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface LoadingBoxProps {
  message?: string;
  size?: 'small' | 'large';
}

export const LoadingBox: React.FC<LoadingBoxProps> = ({ 
  message = 'Loading...', 
  size = 'large' 
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
      <Text style={[styles.message, { color: colors.gray }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
  },
});