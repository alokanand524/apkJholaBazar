import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { logout } from './userSlice';

interface Address {
  id: string;
  type: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  isDefault: boolean;
  fullAddress?: string;
  latitude?: string;
  longitude?: string;
}

interface AddressState {
  selectedAddress: Address | null;
}

const initialState: AddressState = {
  selectedAddress: null,
};

const addressSlice = createSlice({
  name: 'address',
  initialState,
  reducers: {
    setSelectedAddress: (state, action: PayloadAction<Address>) => {
      state.selectedAddress = action.payload;
    },
    clearSelectedAddress: (state) => {
      state.selectedAddress = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, (state) => {
      state.selectedAddress = null;
    });
  },
});

export const { setSelectedAddress, clearSelectedAddress } = addressSlice.actions;
export default addressSlice.reducer;