import React, { useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, ImageProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ImageWithLoadingProps extends ImageProps {
  width?: number;
  height: number;
  borderRadius?: number;
}

export const ImageWithLoading: React.FC<ImageWithLoadingProps> = ({ 
  width, 
  height, 
  borderRadius = 0,
  style,
  ...props 
}) => {
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  const containerStyle = width ? { width, height, borderRadius } : { height, borderRadius, width: '100%' };
  const imageStyle = width ? { width, height, borderRadius } : { height, borderRadius, width: '100%' };

  return (
    <View style={[containerStyle, style]}>
      {loading && (
        <View style={[styles.loadingContainer, containerStyle, { backgroundColor: colors.lightGray }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      <Image
        {...props}
        style={[imageStyle, loading && styles.hidden]}
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  hidden: {
    opacity: 0,
  },
});