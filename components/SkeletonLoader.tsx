import { useTheme } from '@/hooks/useTheme';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.lightGray, colors.border],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

export const ProductCardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.productCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {/* Image skeleton */}
      <SkeletonLoader height={120} borderRadius={0} style={{ marginBottom: 0 }} />
      
      {/* Content area */}
      <View style={{ padding: 12 }}>
        {/* Weight range */}
        <SkeletonLoader width="60%" height={10} style={{ marginBottom: 4 }} />
        
        {/* Product name */}
        <SkeletonLoader width="90%" height={12} style={{ marginBottom: 6 }} />
        
        {/* Price */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SkeletonLoader width={50} height={14} style={{ marginRight: 8 }} />
          <SkeletonLoader width={40} height={11} />
        </View>
      </View>
    </View>
  );
};

export const CategoryCardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.categoryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <SkeletonLoader height={80} borderRadius={8} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="80%" height={12} />
    </View>
  );
};

export const BannerSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.bannerContainer, { backgroundColor: colors.background }]}>
      <SkeletonLoader width="100%" height={180} borderRadius={12} />
    </View>
  );
};

export const SectionHeaderSkeleton: React.FC = () => {
  return (
    <View style={styles.sectionHeaderContainer}>
      <SkeletonLoader width="40%" height={20} style={{ marginBottom: 4 }} />
      <SkeletonLoader width="25%" height={14} />
    </View>
  );
};

export const CartItemSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.cartItemContainer, { borderBottomColor: colors.border }]}>
      <SkeletonLoader width={60} height={60} borderRadius={8} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <SkeletonLoader width="80%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonLoader width="40%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonLoader width={80} height={32} borderRadius={6} />
      </View>
      <SkeletonLoader width={24} height={24} />
    </View>
  );
};

export const ProfileMenuSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.menuItemContainer, { borderBottomColor: colors.border }]}>
      <SkeletonLoader width={24} height={24} style={{ marginRight: 16 }} />
      <SkeletonLoader width="40%" height={16} />
      <View style={{ flex: 1 }} />
      <SkeletonLoader width={20} height={20} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  productCard: {
    borderRadius: 12,
    marginBottom: 16,
    width: '48%',
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: '1%',
    padding: 12,
  },
  categoryCard: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
    width: 120,
    marginRight: 12,
  },
  bannerContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  sectionHeaderContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cartItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
});