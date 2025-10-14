import { ImageWithLoading } from '@/components/ImageWithLoading';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CategoryCardProps {
  category: string;
  image?: string;
  isSelected: boolean;
  onPress: (category: string) => void;
  itemCount: number;
}

const categoryIcons: { [key: string]: string } = {
  'Vegetables': 'leaf',
  'Fruits': 'nutrition',
  'Dairy': 'water',
  'Snacks': 'fast-food',
  'Beverages': 'wine',
  'Personal Care': 'heart',
};

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  image,
  isSelected,
  onPress,
  itemCount,
}) => {
  const { colors } = useTheme();
  
  const handlePress = () => {
    onPress(category);
    router.push(`/category/${encodeURIComponent(category)}`);
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.card, 
        { backgroundColor: colors.background, borderColor: colors.border },
        isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
      ]}
      onPress={handlePress}
    >
      <View style={[
        styles.iconContainer, 
        { backgroundColor: colors.lightGray },
        isSelected && styles.selectedIconContainer
      ]}>
        {image ? (
          <ImageWithLoading 
            source={{ uri: image }} 
            width={50} 
            height={50} 
            borderRadius={0}
          />
        ) : (
          <Ionicons
            name={categoryIcons[category] as any || 'grid'}
            size={28}
            color={isSelected ? '#fff' : colors.primary}
          />
        )}
      </View>
      <Text style={[
        styles.categoryName, 
        { color: colors.text },
        isSelected && { color: '#fff' }
      ]}>
        {category}
      </Text>
      {/* <Text style={[
        styles.itemCount, 
        { color: colors.gray },
        isSelected && { color: '#fff' }
      ]}>
        {itemCount} items
      </Text> */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    height: 120,
    width: '31%',
    marginBottom: 12,
    justifyContent: 'space-between',
    shadowColor: '#00B761',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 10,
    textAlign: 'center',
  },
});