import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { categoryAPI, Category } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'categories_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface CategoriesState {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  categories: [],
  loading: false,
  error: null,
};

export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      // Check cache first
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }

      // Fetch from API
      const response = await categoryAPI.getAllCategories();
      const categories = Array.isArray(response) ? response : [];
      
      // Cache the result
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        data: categories,
        timestamp: Date.now()
      }));
      
      return categories;
    } catch (error) {
      // Try to return cached data even if API fails
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data } = JSON.parse(cached);
        return data;
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch categories');
    }
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch categories';
      });
  },
});

export default categoriesSlice.reducer;