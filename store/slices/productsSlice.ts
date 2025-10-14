import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { productAPI } from '@/services/api';

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  weight: string;
  packSize: number;
  baseUnit: string;
  minOrderQty: number;
  maxOrderQty: number;
  incrementQty: number;
  images: string[];
  price: {
    id: string;
    sellingPrice: string;
    basePrice: string;
    costPrice: string;
    margin: string;
    tax: string;
  };
  stock: {
    availableQty: number;
    status: string;
  };
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  description: string;
  unit: string;
  inStock: boolean;
  rating: number;
  variants?: ProductVariant[];
}

interface ProductsState {
  products: Product[];
  selectedProduct: Product | null;
  categories: string[];
  selectedCategory: string;
  searchQuery: string;
  loading: boolean;
  productLoading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  products: [],
  selectedProduct: null,
  categories: ['All', 'Vegetables', 'Fruits', 'Dairy', 'Snacks', 'Beverages', 'Personal Care'],
  selectedCategory: 'All',
  searchQuery: '',
  loading: false,
  productLoading: false,
  error: null,
};

export const fetchProductsByCategory = createAsyncThunk(
  'products/fetchProductsByCategory',
  async (categoryId: string, { rejectWithValue }) => {
    try {
      return await productAPI.getProductsByCategory(categoryId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch products');
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (productId: string, { rejectWithValue }) => {
    try {
      return await productAPI.getProductById(productId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch product');
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload;
    },
    setSelectedCategory: (state, action: PayloadAction<string>) => {
      state.selectedCategory = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductsByCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProductsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProductById.pending, (state) => {
        state.productLoading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.productLoading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.productLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setProducts, setSelectedCategory, setSearchQuery, setLoading } = productsSlice.actions;
export default productsSlice.reducer;