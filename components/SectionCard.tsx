import { ImageWithLoading } from '@/components/ImageWithLoading';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SectionCardProps {
  title: string;
  image: string;
  category?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, image, category }) => {
  const { colors } = useTheme();
  
  const handlePress = () => {
    if (category) {
      router.push(`/category/${encodeURIComponent(title)}`);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={[styles.imageContainer, { backgroundColor: colors.lightGray }]}>
        <ImageWithLoading 
          source={{ uri: image }} 
          width={70} 
          height={70} 
          borderRadius={0}
        />
      </View>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  imageContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
  },
});