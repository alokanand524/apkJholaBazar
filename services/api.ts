import { config } from '@/config/env';
import { InputValidator } from '@/utils/inputValidator';
import { logger } from '@/utils/logger';

const API_BASE_URL = config.API_BASE_URL;

export interface Category {
  id: string;
  name: string;
  image: string;
  description?: string;
}

export interface CategoryWithChildren {
  id: string;
  name: string;
  image: string;
  children: Category[];
  products: any[];
}

export const categoryAPI = {
  getAllCategories: async (): Promise<Category[]> => {
    const url = `${API_BASE_URL}/categories`;
    logger.info('API Request - Get All Categories', { url, method: 'GET' });
    
    const response = await fetch(url);
    const data = await response.json();
    
    logger.info('API Response - Get All Categories', {
      status: response.status,
      statusText: response.statusText,
      response: data
    });
    
    if (!response.ok) throw new Error('Failed to fetch categories');
    return data.data.categories || [];
  },

  getCategoryById: async (id: string): Promise<CategoryWithChildren> => {
    const sanitizedId = InputValidator.sanitizeString(id);
    if (!sanitizedId) throw new Error('Invalid category ID');
    
    const url = `${API_BASE_URL}/categories/${sanitizedId}`;
    logger.info('API Request - Get Category By ID', { url, method: 'GET', categoryId: sanitizedId });
    
    const response = await fetch(url);
    const data = await response.json();
    
    logger.info('API Response - Get Category By ID', {
      status: response.status,
      statusText: response.statusText,
      response: data
    });
    
    if (!response.ok) throw new Error('Failed to fetch category');
    return {
      id: data.data.id,
      name: data.data.name,
      image: data.data.image,
      children: data.data.children || [],
      products: data.data.products || []
    };
  }
};

export const authAPI = {
  refreshToken: async (refreshToken: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    if (!response.ok) throw new Error('Token refresh failed');
    const data = await response.json();
    
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (data.data?.accessToken) {
      await AsyncStorage.setItem('authToken', data.data.accessToken);
    }
    if (data.data?.refreshToken) {
      await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
    }
    
    return data;
  }
};

export const profileAPI = {
  getProfile: async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No auth token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
  
  updateProfile: async (data: { firstName?: string; lastName?: string; gender?: string; dateOfBirth?: string; email?: string }) => {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },
};

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  description?: string;
  unit?: string;
  inStock?: boolean;
  rating?: number;
  deliveryTime?: string;
  variants?: any[];
}

const transformProduct = (apiProduct: any): Product => {
  const variant = apiProduct.variants?.[0];
  const price = variant?.price;
  
  return {
    id: apiProduct.id,
    name: apiProduct.name,
    price: price ? parseFloat(price.sellingPrice) : 0,
    originalPrice: price ? parseFloat(price.basePrice) : undefined,
    image: apiProduct.images?.[0] || '',
    images: apiProduct.images || [],
    category: apiProduct.category?.name || '',
    description: apiProduct.description || '',
    unit: variant ? `${variant.weight} ${variant.baseUnit}` : '',
    inStock: variant?.stock?.availableQty > 0,
    rating: 4.5,
    variants: apiProduct.variants
  };
};

export const productAPI = {
  getAllProducts: async (): Promise<Product[]> => {
    const url = `${API_BASE_URL}/products`;
    logger.info('API Request - Get All Products', { url, method: 'GET' });
    
    const response = await fetch(url);
    const data = await response.json();
    
    logger.info('API Response - Get All Products', {
      status: response.status,
      statusText: response.statusText,
      response: data
    });
    
    if (!response.ok) throw new Error('Failed to fetch products');
    return (data.data.products || []).map(transformProduct);
  },

  getProductsByCategory: async (categoryId: string): Promise<Product[]> => {
    const sanitizedCategoryId = categoryId ? InputValidator.sanitizeString(categoryId) : '';
    const url = sanitizedCategoryId ? `${API_BASE_URL}/products?categoryId=${sanitizedCategoryId}` : `${API_BASE_URL}/products`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch products');
    const data = await response.json();
    return (data.data.products || []).map(transformProduct);
  },

  getProductById: async (productId: string): Promise<Product> => {
    const sanitizedProductId = InputValidator.sanitizeString(productId);
    if (!sanitizedProductId) throw new Error('Invalid product ID');
    
    const response = await fetch(`${API_BASE_URL}/products/${sanitizedProductId}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    const data = await response.json();
    return transformProduct(data.data.product);
  },
};

export const cartAPI = {
  getCart: async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    let token = await AsyncStorage.getItem('authToken');
    if (!token) {
      throw new Error('No auth token found');
    }
    
    const makeRequest = async (authToken: string) => {
      const url = `${API_BASE_URL}/cart`;
      logger.info('API Request - Get Cart', { url, method: 'GET' });
      
      return fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    };
    
    let response = await makeRequest(token);
    let data = await response.json();
    
    logger.info('API Response - Get Cart', {
      status: response.status,
      statusText: response.statusText,
      response: data
    });
    
    // If token expired, refresh and retry
    if (response.status === 401) {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        const refreshUrl = `${API_BASE_URL}/auth/refresh`;
        const refreshPayload = { refreshToken };
        
        logger.info('API Request - Refresh Token', {
          url: refreshUrl,
          method: 'POST',
          payload: refreshPayload
        });
        
        const refreshResponse = await fetch(refreshUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(refreshPayload)
        });
        
        const refreshData = await refreshResponse.json();
        
        logger.info('API Response - Refresh Token', {
          status: refreshResponse.status,
          statusText: refreshResponse.statusText,
          response: refreshData
        });
        
        if (refreshResponse.ok) {
          if (refreshData.data?.accessToken) {
            await AsyncStorage.setItem('authToken', refreshData.data.accessToken);
            token = refreshData.data.accessToken;
            response = await makeRequest(token);
            data = await response.json();
            
            logger.info('API Response - Get Cart (After Refresh)', {
              status: response.status,
              statusText: response.statusText,
              response: data
            });
          }
        }
      }
    }
    
    if (!response.ok) throw new Error('Failed to fetch cart');
    return data;
  },
};

export const addressAPI = {
  getAddresses: async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    let token = await AsyncStorage.getItem('authToken');
    if (!token) {
      throw new Error('No auth token found');
    }
    
    const makeRequest = async (authToken: string) => {
      const url = `${API_BASE_URL}/service-area/addresses`;
      logger.info('API Request - Get Addresses', { url, method: 'GET' });
      
      return fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    };
    
    let response = await makeRequest(token);
    let data = await response.json();
    
    logger.info('API Response - Get Addresses', {
      status: response.status,
      statusText: response.statusText,
      response: data
    });
    
    // If token expired, refresh and retry
    if (response.status === 401) {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.data?.accessToken) {
            await AsyncStorage.setItem('authToken', refreshData.data.accessToken);
            token = refreshData.data.accessToken;
            response = await makeRequest(token);
            data = await response.json();
            
            logger.info('API Response - Get Addresses (After Refresh)', {
              status: response.status,
              statusText: response.statusText,
              response: data
            });
          }
        }
      }
    }
    
    if (!response.ok) throw new Error('Failed to fetch addresses');
    return data;
  },
  
  createAddress: async (data: { addressLine1: string; addressLine2?: string; landmark?: string; pincodeId: string; type: 'home' | 'office' | 'other' }) => {
    const response = await fetch(`${API_BASE_URL}/profile/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create address');
    return response.json();
  },
  
  updateAddress: async (id: string, data: { addressLine1?: string; addressLine2?: string; landmark?: string; pincodeId?: string; type?: 'home' | 'office' | 'other' }) => {
    const response = await fetch(`${API_BASE_URL}/profile/addresses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update address');
    return response.json();
  },
  
  deleteAddress: async (id: string) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    let token = await AsyncStorage.getItem('authToken');
    if (!token) {
      throw new Error('No auth token found');
    }
    
    const makeRequest = async (authToken: string) => {
      return fetch(`${API_BASE_URL}/profile/addresses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    };
    
    let response = await makeRequest(token);
    
    // If token expired, refresh and retry
    if (response.status === 401) {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.data?.accessToken) {
            await AsyncStorage.setItem('authToken', refreshData.data.accessToken);
            token = refreshData.data.accessToken;
            response = await makeRequest(token);
          }
        }
      }
    }
    
    if (!response.ok) throw new Error('Failed to delete address');
    return response.json();
  },
  
  getPincodes: async () => {
    const response = await fetch(`${API_BASE_URL}/profile/pincodes`);
    if (!response.ok) throw new Error('Failed to fetch pincodes');
    return response.json();
  },
};

export const deliveryAPI = {
  getDeliveryEstimate: async (latitude: string, longitude: string) => {
    const response = await fetch(`${API_BASE_URL}/delivery-timing/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: "0d29835f-3840-4d72-a26d-ed96ca744a34",
        latitude,
        longitude
      }),
    });
    
    const data = await response.json();
    const deliveryMinutes = data.data?.delivery?.estimatedDeliveryMinutes;
    
    return { deliveryTime: deliveryMinutes ? `${deliveryMinutes} mins` : '' };
  },
};

// Keep backward compatibility
export const getStoreDeliveryTime = deliveryAPI.getDeliveryEstimate;