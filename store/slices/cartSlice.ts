import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { cartAPI } from '@/services/api';
import { logout } from './userSlice';
import { apiNotificationService } from '@/services/apiNotificationService';

export interface CartItem {
  id: string;
  variantId?: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  category: string;
  cartItemId?: string;
  minOrderQty?: number;
  maxOrderQty?: number;
  incrementQty?: number;
}

interface CartState {
  items: CartItem[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await cartAPI.getCart();
      const cart = response.data?.carts?.[0];
      const items = cart?.items || [];
      
      // Only include regular items (non-free products) and check if cart has regular items
      const hasRegularItems = cart?.summary?.subtotal > 0 || cart?.summary?.totalItems > 0;
      
      if (!hasRegularItems) {
        return []; // Return empty array if only free products exist
      }
      
      // Transform API items to match local cart structure, excluding free products
      const transformedItems = items
        .filter((item: any) => !item.isFreeProduct && item.quantity > 0)
        .map((item: any) => ({
          id: item.product?.id || item.id,
          name: item.product?.name || '',
          price: parseFloat(item.unitPrice || '0'),
          image: item.product?.images?.[0] || '',
          quantity: item.quantity || 1,
          category: item.product?.category?.name || '',
          cartItemId: item.id // Store the cart item ID for API operations
        }));
      
      return transformedItems;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch cart');
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<Omit<CartItem, 'quantity'>>) => {
      const itemKey = action.payload.variantId || action.payload.id;
      const existingItem = state.items.find(item => (item.variantId || item.id) === itemKey);
      if (existingItem) {
        const maxQty = existingItem.maxOrderQty || 999;
        if (existingItem.quantity < maxQty) {
          existingItem.quantity += 1;
          // Send API notification for quantity update
          apiNotificationService.notifyCartUpdate('quantity_updated', action.payload.name);
        }
      } else {
        const minQty = action.payload.minOrderQty || 1;
        state.items.push({ ...action.payload, quantity: minQty });
        // Send API notification for item added
        apiNotificationService.notifyCartUpdate('item_added', action.payload.name);
      }
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      const removedItem = state.items.find(item => (item.variantId || item.id) === action.payload);
      if (removedItem) {
        // Send API notification for item removal
        apiNotificationService.notifyCartUpdate('item_removed', removedItem.name);
      }
      state.items = state.items.filter(item => (item.variantId || item.id) !== action.payload);
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; variantId?: string; quantity: number }>) => {
      const itemKey = action.payload.variantId || action.payload.id;
      const item = state.items.find(item => (item.variantId || item.id) === itemKey);
      if (item) {
        const minQty = item.minOrderQty || 1;
        const maxQty = item.maxOrderQty || 999;
        
        if (action.payload.quantity < minQty) {
          // Send API notification for item removal
          apiNotificationService.notifyCartUpdate('item_removed', item.name);
          state.items = state.items.filter(i => (i.variantId || i.id) !== itemKey);
        } else if (action.payload.quantity <= maxQty) {
          item.quantity = action.payload.quantity;
          // Send API notification for quantity update
          apiNotificationService.notifyCartUpdate('quantity_updated', item.name);
        }
      }
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
    },
    setCartItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(logout, (state) => {
        state.items = [];
        state.total = 0;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart, setCartItems } = cartSlice.actions;
export default cartSlice.reducer;