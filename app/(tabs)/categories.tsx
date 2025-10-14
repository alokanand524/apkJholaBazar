import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useLocalSearchParams } from 'expo-router';
import { RootState } from '@/store/store';
import { setSelectedCategory, fetchProductsByCategory } from '@/store/slices/productsSlice';
import { fetchCategories } from '@/store/slices/categoriesSlice';
import { CategoryCard } from '@/components/CategoryCard';
import { CategoryCardSkeleton } from '@/components/SkeletonLoader';
import { handleTabBarScroll } from './_layout';
import { useTheme } from '@/hooks/useTheme';

export default function CategoriesScreen() {
  const dispatch = useDispatch();
  const { filter } = useLocalSearchParams();
  const { selectedCategory } = useSelector((state: RootState) => state.products);
  const { categories, loading } = useSelector((state: RootState) => state.categories);
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchProductsByCategory(''));
    if (filter && typeof filter === 'string') {
      dispatch(setSelectedCategory(filter));
    }
  }, [dispatch, filter]);

  const handleCategoryPress = (categoryName: string) => {
    dispatch(setSelectedCategory(categoryName));
    if (categoryName === 'All') {
      dispatch(fetchProductsByCategory(''));
    } else {
      const category = categories.find(cat => cat.name === categoryName);
      const categoryId = category?.id || '';
      dispatch(fetchProductsByCategory(categoryId));
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchCategories());
      await dispatch(fetchProductsByCategory(''));
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Categories</Text>
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Grocery & Kitchen</Text>
            <View style={styles.categoriesGrid}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <CategoryCardSkeleton key={item} />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Categories</Text>
      </View>

      <ScrollView 
        style={styles.content}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.section}>
          <FlatList
            data={categories}
            renderItem={({ item }) => (
              <CategoryCard
                category={item.name}
                image={item.image}
                isSelected={selectedCategory === item.name}
                onPress={handleCategoryPress}
                itemCount={0}
              />
            )}
            keyExtractor={(item) => item.id}
            numColumns={3}
            scrollEnabled={false}
            columnWrapperStyle={styles.categoryRow}
            contentContainerStyle={styles.categoriesGrid}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoriesGrid: {
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  categoryRow: {
    justifyContent: 'space-around',
    marginBottom: 8,
  },
});