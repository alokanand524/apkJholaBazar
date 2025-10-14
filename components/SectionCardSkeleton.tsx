import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { SkeletonLoader } from './SkeletonLoader';

export const SectionCardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <SkeletonLoader height={80} borderRadius={8} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="80%" height={12} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
    width: 120,
    marginRight: 12,
  },
});