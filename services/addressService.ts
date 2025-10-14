const BASE_URL = 'https://api.jholabazar.com/api/v1';

export interface Address {
  id: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  pincodeId: string;
  type: 'home' | 'office' | 'other';
  isDefault?: boolean;
}

export interface Pincode {
  id: string;
  pincode: string;
  area: string;
}

export const addressService = {
  // Get all user addresses
  getAddresses: async (): Promise<Address[]> => {
    const response = await fetch(`${BASE_URL}/service-area/addresses`);
    const data = await response.json();
    return data.success ? data.data : [];
  },

  // Create new address
  createAddress: async (addressData: Omit<Address, 'id'>): Promise<Address> => {
    const response = await fetch(`${BASE_URL}/service-area/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(addressData),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to create address');
    return data.data;
  },

  // Update address
  updateAddress: async (id: string, addressData: Partial<Address>): Promise<Address> => {
    const response = await fetch(`${BASE_URL}/service-area/addresses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(addressData),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to update address');
    return data.data;
  },

  // Delete address
  deleteAddress: async (id: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/service-area/addresses/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to delete address');
  },

  // Get serviceable pincodes
  getPincodes: async (): Promise<Pincode[]> => {
    const response = await fetch(`${BASE_URL}/service-area/pincodes`);
    const data = await response.json();
    return data.success ? data.data : [];
  },
};