import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { deliveryAPI } from '@/services/api';
import { logout } from './userSlice';

interface DeliveryState {
  deliveryTime: string;
  loading: boolean;
  error: string | null;
}

const initialState: DeliveryState = {
  deliveryTime: '',
  loading: false,
  error: null,
};

export const fetchDeliveryTime = createAsyncThunk(
  'delivery/fetchDeliveryTime',
  async ({ latitude, longitude }: { latitude: string; longitude: string }, { rejectWithValue }) => {
    try {
      const response = await deliveryAPI.getDeliveryEstimate(latitude, longitude);
      return response.deliveryTime;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch delivery time');
    }
  }
);

const deliverySlice = createSlice({
  name: 'delivery',
  initialState,
  reducers: {
    setDeliveryTime: (state, action: PayloadAction<string>) => {
      state.deliveryTime = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeliveryTime.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeliveryTime.fulfilled, (state, action) => {
        state.loading = false;
        state.deliveryTime = action.payload || '';
      })
      .addCase(fetchDeliveryTime.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(logout, (state) => {
        state.deliveryTime = '';
        state.loading = false;
        state.error = null;
      });
  },
});

export const { setDeliveryTime } = deliverySlice.actions;
export default deliverySlice.reducer;