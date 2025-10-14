import { ProductCard } from '@/components/ProductCard';
import { useTheme } from '@/hooks/useTheme';
import { ProductCardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';
import { RootState } from '@/store/store';
import { API_ENDPOINTS } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ImageWithLoading } from '@/components/ImageWithLoading';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

// Removed unused categoryData object

export default function CategoryScreen() {
  const { name } = useLocalSearchParams();
  const categoryName = Array.isArray(name) ? name[0] : name || '';
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [sortBy, setSortBy] = useState('Popular');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [subCategories, setSubCategories] = useState(['All']);
  const { products } = useSelector((state: RootState) => state.products);
  const { categories } = useSelector((state: RootState) => state.categories);
  const { colors } = useTheme();

  const [subCategoriesData, setSubCategoriesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryData, setCategoryData] = useState(null);

  // Fetch subcategories and then products when category changes
  useEffect(() => {
    const fetchCategoryDataAndProducts = async () => {
      if (!categoryName || categories.length === 0) return;
      
      setIsLoading(true);
      setSelectedSubCategory('All');
      setCategoryProducts([]);
      
      try {
        const category = categories.find(cat => cat.name === categoryName);
        if (category) {
          // Fetch category details with subcategories using /categories/:id
          const categoryResponse = await fetch(`${API_ENDPOINTS.BASE_URL}/categories/${category.id}`);
          if (categoryResponse.ok) {
            const categoryData = await categoryResponse.json();
            const subcategories = categoryData.data?.children || [];
            
            // Add "All" option and subcategories
            const subCatData = [
              { id: category.id, name: 'All', image: category.image || '' },
              ...subcategories.map(sub => ({ id: sub.id, name: sub.name, image: sub.image || '' }))
            ];
            setSubCategoriesData(subCatData);
            setCategoryData(categoryData.data);
          } else {
            setSubCategoriesData([{ id: category.id, name: 'All', image: category.image || '' }]);
          }
          setIsLoading(false);
          
          // Load products from the main category using /products/category/:categoryId/products
          setIsLoadingProducts(true);
          try {
            const url = `${API_ENDPOINTS.BASE_URL}/products/category/${category.id}/products`;
            console.log('Fetching products from:', url);
            const response = await fetch(url);
            console.log('Products response status:', response.status);
            
            if (response.ok) {
              const productsData = await response.json();
              console.log('Products data:', productsData);
              const rawProducts = productsData.data?.products || productsData.data || productsData || [];
              
              // Transform API data to match ProductCard format
              const transformedProducts = rawProducts.map(product => ({
                id: product.id,
                name: product.name,
                price: product.variants?.[0]?.price?.sellingPrice || '0',
                originalPrice: product.variants?.[0]?.price?.basePrice || null,
                image: product.images?.[0] || '',
                category: product.category?.name || 'General',
                description: product.description || product.shortDescription || '',
                unit: `${product.variants?.[0]?.weight || '1'} ${product.variants?.[0]?.baseUnit || 'unit'}`,
                inStock: product.variants?.[0]?.stock?.availableQty > 0,
                rating: 4.5,
                deliveryTime: '10 mins',
                variants: product.variants
              }));
              
              console.log('Processed products:', transformedProducts.length);
              setCategoryProducts(transformedProducts);
            } else {
              console.log('Products API failed:', response.status, response.statusText);
              setCategoryProducts([]);
            }
          } catch (productError) {
            console.error('Error loading products:', productError);
            setCategoryProducts([]);
          }
          setIsLoadingProducts(false);
        } else {
          setSubCategoriesData([]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setSubCategoriesData([]);
        setCategoryProducts([]);
        setIsLoading(false);
        setIsLoadingProducts(false);
      }
    };

    fetchCategoryDataAndProducts();
  }, [categoryName, categories]);

  const handleSubCategoryChange = async (subCategoryName: string, subCategoryId: string) => {
    setSelectedSubCategory(subCategoryName);
    
    if (subCategoryName === 'All') {
      // Load all products from main category
      const category = categories.find(cat => cat.name === categoryName);
      if (category) {
        setIsLoadingProducts(true);
        try {
          const url = `${API_ENDPOINTS.BASE_URL}/products/category/${category.id}/products`;
          console.log('Fetching all category products from:', url);
          const response = await fetch(url);
          console.log('All category products response status:', response.status);
          
          if (response.ok) {
            const productsData = await response.json();
            console.log('All category products data:', productsData);
            const rawProducts = productsData.data?.products || productsData.data || productsData || [];
            
            // Transform API data to match ProductCard format
            const transformedProducts = rawProducts.map(product => ({
              id: product.id,
              name: product.name,
              price: product.variants?.[0]?.price?.sellingPrice || '0',
              originalPrice: product.variants?.[0]?.price?.basePrice || null,
              image: product.images?.[0] || '',
              category: product.category?.name || 'General',
              description: product.description || product.shortDescription || '',
              unit: `${product.variants?.[0]?.weight || '1'} ${product.variants?.[0]?.baseUnit || 'unit'}`,
              inStock: product.variants?.[0]?.stock?.availableQty > 0,
              rating: 4.5,
              deliveryTime: '10 mins',
              variants: product.variants
            }));
            
            console.log('Processed all category products:', transformedProducts.length);
            setCategoryProducts(transformedProducts);
          }
        } catch (error) {
          console.error('Error loading category products:', error);
        }
        setIsLoadingProducts(false);
      }
    } else {
      // Load products from specific subcategory using /products/category/:subCategoryId/products
      setIsLoadingProducts(true);
      try {
        const url = `${API_ENDPOINTS.BASE_URL}/products/category/${subCategoryId}/products`;
        console.log('Fetching subcategory products from:', url);
        const response = await fetch(url);
        console.log('Subcategory products response status:', response.status);
        
        if (response.ok) {
          const productsData = await response.json();
          console.log('Subcategory products data:', productsData);
          const rawProducts = productsData.data?.products || productsData.data || productsData || [];
          
          // Transform API data to match ProductCard format
          const transformedProducts = rawProducts.map(product => ({
            id: product.id,
            name: product.name,
            price: product.variants?.[0]?.price?.sellingPrice || '0',
            originalPrice: product.variants?.[0]?.price?.basePrice || null,
            image: product.images?.[0] || '',
            category: product.category?.name || 'General',
            description: product.description || product.shortDescription || '',
            unit: `${product.variants?.[0]?.weight || '1'} ${product.variants?.[0]?.baseUnit || 'unit'}`,
            inStock: product.variants?.[0]?.stock?.availableQty > 0,
            rating: 4.5,
            deliveryTime: '10 mins',
            variants: product.variants
          }));
          
          console.log('Processed subcategory products:', transformedProducts.length);
          setCategoryProducts(transformedProducts);
        } else {
          console.log('Subcategory products API failed:', response.status, response.statusText);
          setCategoryProducts([]);
        }
      } catch (error) {
        console.error('Error loading subcategory products:', error);
        setCategoryProducts([]);
      }
      setIsLoadingProducts(false);
    }
  };

  const filteredProducts = categoryProducts.filter(product => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return product.name?.toLowerCase().includes(query) ||
           product.category?.toLowerCase().includes(query) ||
           (product.description && product.description.toLowerCase().includes(query));
  });

  const { items } = useSelector((state: RootState) => state.cart);
  const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{categoryName}</Text>
        <TouchableOpacity onPress={() => router.push('/cart')}>
          <Ionicons name="bag" size={24} color={colors.primary} />
          {cartItemsCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.searchSection, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.lightGray }]}>
          <Ionicons name="search" size={20} color={colors.gray} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search products..."
            placeholderTextColor={colors.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Sort Modal */}
      <Modal visible={showSort} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sort by</Text>
            {['Popular', 'Price: Low to High', 'Price: High to Low', 'Newest', 'Rating'].map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={() => { setSortBy(option); setShowSort(false); }}
              >
                <Text style={[styles.modalOptionText, { color: colors.text }]}>{option}</Text>
                {sortBy === option && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: colors.primary }]}
              onPress={() => setShowSort(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Brand Modal */}
      <Modal visible={showBrand} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Brand</Text>
            {['All', 'Fresh & Pure', 'Organic Valley', 'Farm Fresh', 'Premium Choice'].map((brand) => (
              <TouchableOpacity
                key={brand}
                style={styles.modalOption}
                onPress={() => { setSelectedBrand(brand); setShowBrand(false); }}
              >
                <Text style={[styles.modalOptionText, { color: colors.text }]}>{brand}</Text>
                {selectedBrand === brand && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: colors.primary }]}
              onPress={() => setShowBrand(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filters Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
            <Text style={[styles.filterCategory, { color: colors.text }]}>Price Range</Text>
            {['Under ₹50', '₹50 - ₹100', '₹100 - ₹200', 'Above ₹200'].map((price) => (
              <TouchableOpacity key={price} style={styles.modalOption}>
                <Text style={[styles.modalOptionText, { color: colors.text }]}>{price}</Text>
              </TouchableOpacity>
            ))}
            <Text style={[styles.filterCategory, { color: colors.text }]}>Discount</Text>
            {['10% and above', '20% and above', '30% and above', '50% and above'].map((discount) => (
              <TouchableOpacity key={discount} style={styles.modalOption}>
                <Text style={[styles.modalOptionText, { color: colors.text }]}>{discount}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: colors.primary }]}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.modalCloseText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.content}>
        <View style={[styles.sidebar, { backgroundColor: colors.lightGray, borderRightColor: colors.border }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading ? (
              [1, 2, 3, 4, 5, 6].map((item) => (
                <View key={item} style={[styles.sidebarItem, { borderBottomColor: colors.border }]}>
                  <SkeletonLoader width={50} height={50} borderRadius={10} style={{ marginBottom: 3 }} />
                  <SkeletonLoader width={60} height={10} />
                </View>
              ))
            ) : (
              subCategoriesData.map((subCat) => (
                <TouchableOpacity
                  key={subCat.id || subCat.name}
                  style={[
                    styles.sidebarItem,
                    { borderBottomColor: colors.border },
                    selectedSubCategory === subCat.name && { backgroundColor: colors.background, borderRightColor: colors.primary }
                  ]}
                  onPress={() => handleSubCategoryChange(subCat.name, subCat.id)}
                >
                  <ImageWithLoading
                    source={{ uri: subCat.image || '' }}
                    width={50}
                    height={50}
                    borderRadius={10}
                  />
                  <Text style={[
                    styles.sidebarText,
                    { color: colors.gray },
                    selectedSubCategory === subCat.name && { color: colors.primary, fontWeight: '600' }
                  ]}>
                    {subCat.name || 'Unknown'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        <View style={styles.productsArea}>
          <Text style={[styles.productsTitle, { color: colors.text }]}>{selectedSubCategory}</Text>
          {isLoadingProducts && categoryProducts.length === 0 ? (
            <View style={styles.skeletonGrid}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <ProductCardSkeleton key={item} />
              ))}
            </View>
          ) : categoryProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.gray }]}>Select a subcategory to view products</Text>
            </View>
          ) : filteredProducts.length > 0 ? (
            <>
              <FlatList
                data={filteredProducts}
                renderItem={({ item }) => <ProductCard product={item} />}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.row}
                showsVerticalScrollIndicator={false}
              />
              {isLoadingProducts && (
                <View style={{ padding: 10, alignItems: 'center' }}>
                  <Text style={[{ color: colors.gray }]}>Loading more products...</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.gray }]}>No products available</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 183, 97, 0.1)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalClose: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 100,
    borderRightWidth: 1,
  },
  sidebarItem: {
    paddingHorizontal: 1,
    paddingVertical: 5,
    borderBottomWidth: 1,
    alignItems: 'center',
    borderRightWidth: 3,
    borderRightColor: 'transparent',
  },
  sidebarImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginBottom: 3,
  },
  sidebarText: {
    fontSize: 10,
    textAlign: 'center',
  },
  productsArea: {
    flex: 1,
    padding: 20,
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});