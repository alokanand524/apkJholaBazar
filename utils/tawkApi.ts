import { config } from '@/config/env';
import { InputValidator } from './inputValidator';
import { logger } from './logger';

const BASE_URL = 'https://api.tawk.to/v3';

export interface ChatMessage {
  id: string;
  text: string;
  time: string;
  sender: 'user' | 'agent';
}

export const tawkApi = {
  async sendMessage(message: string, visitorId?: string): Promise<any> {
    try {
      const sanitizedMessage = InputValidator.sanitizeString(message);
      const sanitizedVisitorId = visitorId ? InputValidator.sanitizeString(visitorId) : 'mobile-app-user';
      
      if (!config.TAWK_TO_PROPERTY_ID || !sanitizedMessage) {
        throw new Error('Invalid configuration or message');
      }

      const response = await fetch(`${BASE_URL}/chats`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.TAWK_TO_WIDGET_ID}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: config.TAWK_TO_PROPERTY_ID,
          visitorId: sanitizedVisitorId,
          message: sanitizedMessage,
          type: 'chat'
        }),
      });
      return await response.json();
    } catch (error) {
      logger.error('Error sending message', { error: error.message });
      throw error;
    }
  },

  async getMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      const sanitizedChatId = InputValidator.sanitizeString(chatId);
      
      if (!sanitizedChatId) {
        throw new Error('Invalid chat ID');
      }

      const response = await fetch(`${BASE_URL}/chats/${sanitizedChatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${config.TAWK_TO_WIDGET_ID}`,
        },
      });
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      logger.error('Error fetching messages', { error: error.message });
      return [];
    }
  }
};