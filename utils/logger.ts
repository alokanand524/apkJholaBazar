import { config } from '@/config/env';

interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

class Logger {
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return data.replace(/[^\w\s\-_.@]/g, '');
    }
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }
    return data;
  }

  private log(level: string, message: string, data?: any) {
    if (!config.DEBUG_MODE && level === LOG_LEVELS.DEBUG) {
      return;
    }

    const timestamp = new Date().toISOString();
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    
    const logEntry = {
      timestamp,
      level,
      message: typeof message === 'string' ? message.replace(/[^\w\s\-_.@]/g, '') : 'Invalid message',
      data: sanitizedData,
    };

    console.log(JSON.stringify(logEntry));
  }

  error(message: string, data?: any) {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  info(message: string, data?: any) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  debug(message: string, data?: any) {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }
}

export const logger = new Logger();