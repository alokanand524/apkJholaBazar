import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { setSelectedCategory } from '@/store/slices/productsSlice';
import { useTheme } from '@/hooks/useTheme';
import { SkeletonLoader } from './SkeletonLoader';

export const CategoryList: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedCategory } = useSelector((state: RootState) => state.products);
  const { categories, loading } = useSelector((state: RootState) => state.categories);
  const { colors } = useTheme();

  const allCategories = [{ id: 'all', name: 'All', image: '' }, ...(Array.isArray(categories) ? categories : [])];

  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <SkeletonLoader 
              key={item}
              width={80} 
              height={36} 
              borderRadius={20} 
              style={styles.skeletonButton}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!Array.isArray(categories)) {
    return null;
  }

  const handleCategoryPress = (category: string) => {
    dispatch(setSelectedCategory(category));
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {allCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              { backgroundColor: colors.lightGray },
              selectedCategory === category.name && { backgroundColor: colors.primary }
            ]}
            onPress={() => handleCategoryPress(category.name)}
          >
            <Text style={[
              styles.categoryText,
              { color: colors.gray },
              selectedCategory === category.name && { color: colors.white || '#fff' }
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  skeletonButton: {
    marginRight: 12,
  },
});