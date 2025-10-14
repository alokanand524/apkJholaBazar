import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
  variant?: {
    product?: {
      name?: string;
      images?: string[];
    };
    name?: string;
  };
  totalPrice?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  createdAt: string;
  status: string;
  total: number;
  totalAmount: string;
  subtotal: string;
  deliveryCharge: string;
  tax: string;
  items: OrderItem[];
  deliveryAddress: {
    addressLine1: string;
    metadata?: {
      contactPerson?: {
        name: string;
        mobile: string;
      };
    };
  };
  arrivingTime?: string;
  estimatedDeliveryTime?: string;
  slotStartTime?: string;
  paymentMethod?: string;
}

interface OrdersState {
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrdersState = {
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setOrders: (state, action: PayloadAction<Order[]>) => {
      state.orders = action.payload;
      state.error = null;
    },
    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload;
      state.error = null;
    },
    addOrder: (state, action: PayloadAction<Order>) => {
      state.orders.unshift(action.payload);
    },
    updateOrderStatus: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const order = state.orders.find(o => o.id === action.payload.id);
      if (order) {
        order.status = action.payload.status;
      }
      if (state.currentOrder?.id === action.payload.id) {
        state.currentOrder.status = action.payload.status;
      }
    },
    clearOrders: (state) => {
      state.orders = [];
      state.currentOrder = null;
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  setOrders,
  setCurrentOrder,
  addOrder,
  updateOrderStatus,
  clearOrders,
} = ordersSlice.actions;

export default ordersSlice.reducer;