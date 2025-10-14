import { config } from '@/config/env';

export const API_ENDPOINTS = {
  BASE_URL: config.API_BASE_URL,
  
  // Auth endpoints
  AUTH: {
    LOGIN: `${config.API_BASE_URL}/auth/login`,
    SIGNUP: `${config.API_BASE_URL}/auth/signup`,
    VERIFY_OTP: `${config.API_BASE_URL}/auth/otp/verify`,
    REFRESH: `${config.API_BASE_URL}/auth/refresh`,
  },
  
  // Product endpoints
  PRODUCTS: {
    ALL: `${config.API_BASE_URL}/products`,
    FEATURED: `${config.API_BASE_URL}/products/featured`,
    BY_ID: (id: string) => `${config.API_BASE_URL}/products/${id}`,
  },
  
  // Cart endpoints
  CART: {
    BASE: `${config.API_BASE_URL}/cart`,
    ITEMS: `${config.API_BASE_URL}/cart/items`,
    ITEM_BY_ID: (id: string) => `${config.API_BASE_URL}/cart/items/${id}`,
    INCREMENT: (id: string) => `${config.API_BASE_URL}/cart/items/${id}/increment`,
    DECREMENT: (id: string) => `${config.API_BASE_URL}/cart/items/${id}/decrement`,
  },
  
  // Order endpoints
  ORDERS: {
    BASE: `${config.API_BASE_URL}/orders`,
    BY_ID: (id: string) => `${config.API_BASE_URL}/orders/${id}`,
  },
  
  // Category endpoints
  CATEGORIES: {
    ALL: `${config.API_BASE_URL}/categories`,
    BY_ID: (id: string) => `${config.API_BASE_URL}/categories/${id}`,
  },
  
  // Address endpoints
  ADDRESSES: {
    ALL: `${config.API_BASE_URL}/service-area/addresses`,
    BY_ID: (id: string) => `${config.API_BASE_URL}/profile/addresses/${id}`,
    CREATE: `${config.API_BASE_URL}/profile/addresses`,
  },
  
  // Service area endpoints
  SERVICE_AREA: {
    CHECK: `${config.API_BASE_URL}/service-area/check`,
  },
  
  // Payment endpoints
  PAYMENTS: {
    VERIFY: `${config.API_BASE_URL}/customer/payments/verify`,
  },
  
  // User endpoints
  USER: {
    PROFILE: `${config.API_BASE_URL}/profile`,
  },
  
  // Delivery endpoints
  DELIVERY: {
    ESTIMATE: `${config.API_BASE_URL}/delivery-timing/estimate`,
  },
  
  // Notification endpoints
  NOTIFICATIONS: {
    PUSH_TOKEN: `${config.API_BASE_URL}/notifications/push-token`,
  },
};