import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '@/config/env';
import { InputValidator } from './inputValidator';
import { logger } from './logger';

class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<string | null> | null = null;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  private async performRefresh(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) return null;

      const url = `${config.API_BASE_URL}/auth/refresh`;
      const payload = { refreshToken };
      
      logger.info('API Request - Token Refresh', {
        url,
        method: 'POST',
        payload
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      logger.info('API Response - Token Refresh', {
        status: response.status,
        statusText: response.statusText,
        response: data
      });

      if (response.ok) {
        if (data.data?.accessToken) {
          await AsyncStorage.setItem('authToken', data.data.accessToken);
          return data.data.accessToken;
        }
      }
      return null;
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      return null;
    }
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const sanitizedUrl = InputValidator.sanitizeUrl(url);
    if (!sanitizedUrl) {
      throw new Error('Invalid URL provided');
    }
    let token = await AsyncStorage.getItem('authToken');
    
    const makeRequest = async (authToken: string) => {
      logger.info('API Request - Authenticated', {
        url: sanitizedUrl,
        method: options.method || 'GET',
        payload: options.body ? JSON.parse(options.body as string) : null
      });
      
      const response = await fetch(sanitizedUrl, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const responseData = await response.clone().json().catch(() => null);
      
      logger.info('API Response - Authenticated', {
        url: sanitizedUrl,
        status: response.status,
        statusText: response.statusText,
        response: responseData
      });
      
      return response;
    };

    if (!token) {
      token = await this.refreshToken();
      if (!token) throw new Error('No valid token available');
    }

    let response = await makeRequest(token);

    if (response.status === 401) {
      logger.info('Token expired, refreshing...');
      token = await this.refreshToken();
      if (token) {
        response = await makeRequest(token);
      }
    }

    return response;
  }
}

export const tokenManager = TokenManager.getInstance();