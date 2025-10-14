import { config } from '@/config/env';

export const RAZORPAY_CONFIG = {
  key: config.RAZORPAY_KEY_ID,
  currency: 'INR',
  name: 'Jhola Bazar',
  description: 'Grocery Order Payment',
  image: '',
  theme: {
    color: '#00B761'
  }
};

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayError {
  code: string;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata: {
    order_id: string;
    payment_id: string;
  };
}