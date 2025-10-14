export class InputValidator {
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    return input.replace(/[<>\"'&]/g, '').trim();
  }

  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateOTP(otp: string): boolean {
    const otpRegex = /^\d{6}$/;
    return otpRegex.test(otp);
  }

  static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid protocol');
      }
      return urlObj.toString();
    } catch {
      return '';
    }
  }

  static validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  static sanitizeFilePath(path: string): string {
    return path.replace(/[^a-zA-Z0-9._/-]/g, '').replace(/\.\./g, '');
  }
}