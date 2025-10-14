import { ProductCard } from '@/components/ProductCard';
import { useTheme } from '@/hooks/useTheme';
import { RootState } from '@/store/store';
import { API_ENDPOINTS } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

export default function SearchResultsScreen() {
  const { colors } = useTheme();
  const { query } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState(query as string || '');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isServiceable, setIsServiceable] = useState(true);
  const cartCount = useSelector((state: RootState) => state.cart.items.reduce((sum, item) => sum + item.quantity, 0));

  const searchProducts = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/products/search?q=${encodeURIComponent(searchTerm)}`);
      const result = await response.json();
      
      if (result.success && result.data?.results) {
        const transformedProducts = result.data.results.map((product: any) => ({
          id: product.id,
          name: product.name,
          image: product.image,
          price: product.variants?.[0]?.price?.sellingPrice || '0',
          originalPrice: product.variants?.[0]?.price?.basePrice || '0',
          category: 'Search Result',
          description: product.variants?.[0]?.description || '',
          unit: `${product.variants?.[0]?.weight || '1'} ${product.variants?.[0]?.baseUnit || 'unit'}`,
          inStock: product.variants?.[0]?.inventory?.inStock || false,
          rating: 4.5,
          deliveryTime: '10 mins',
          variants: product.variants
        }));
        setSearchResults(transformedProducts);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery) {
      searchProducts(searchQuery);
    }
    checkServiceability();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchProducts(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const checkServiceability = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const selectedAddressData = await AsyncStorage.getItem('selectedDeliveryAddress');
      
      if (selectedAddressData) {
        const selectedAddress = JSON.parse(selectedAddressData);
        if (selectedAddress.latitude && selectedAddress.longitude) {
          const response = await fetch(API_ENDPOINTS.SERVICE_AREA.CHECK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: selectedAddress.latitude,
              longitude: selectedAddress.longitude
            })
          });
          
          const result = await response.json();
          setIsServiceable(result.success && result.data?.available);
          return;
        }
      }
      setIsServiceable(false);
    } catch (error) {
      setIsServiceable(false);
    }
  };

  const handleSearch = () => {
    searchProducts(searchQuery);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Search Products</Text>
          <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartButton}>
            <Ionicons name="bag" size={24} color={colors.primary} />
            {cartCount > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: 'red' }]}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      <View style={[styles.searchContainer, { backgroundColor: colors.lightGray }]}>
        <Ionicons name="search" size={20} color={colors.gray} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search for products (e.g., Atta)"
          placeholderTextColor={colors.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.loadingText, { color: colors.gray }]}>Searching...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          <>
            <Text style={[styles.resultsCount, { color: colors.text }]}>
              {searchResults.length} results found for "{searchQuery}"
            </Text>
            <FlatList
              data={searchResults}
              renderItem={({ item }) => <ProductCard product={item} isServiceable={isServiceable} />}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : searchQuery ? (
          <View style={styles.centerContainer}>
            <Ionicons name="search" size={48} color={colors.gray} />
            <Text style={[styles.noResultsText, { color: colors.gray }]}>No products found for "{searchQuery}"</Text>
            <Text style={[styles.noResultsSubtext, { color: colors.gray }]}>Try searching with different keywords</Text>
          </View>
        ) : (
          <View style={styles.centerContainer}>
            <Ionicons name="search" size={48} color={colors.gray} />
            <Text style={[styles.emptyText, { color: colors.gray }]}>Search for your favorite products</Text>
            <Text style={[styles.emptySubtext, { color: colors.gray }]}>Try searching for "Atta", "Rice", "Oil", etc.</Text>
          </View>
        )}
      </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
    flex: 1,
  },
  cartButton: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },


  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  searchButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});