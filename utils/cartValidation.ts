import { Alert, Vibration } from 'react-native';
import { ProductVariant } from '@/store/slices/productsSlice';

export interface QuantityValidationResult {
  isValid: boolean;
  message?: string;
  maxAllowed?: number;
}

export const validateQuantityIncrease = (
  currentQuantity: number,
  variant: ProductVariant
): QuantityValidationResult => {
  const maxQty = variant.maxOrderQty || 999;
  const stockQty = variant.stock?.availableQty || 999;
  
  // Check max order quantity first
  if (currentQuantity >= maxQty) {
    return {
      isValid: false,
      message: `Maximum ${maxQty} items allowed for this product.`,
      maxAllowed: maxQty
    };
  }

  // Check stock availability
  if (currentQuantity >= stockQty) {
    return {
      isValid: false,
      message: `Only ${stockQty} items available in stock.`,
      maxAllowed: stockQty
    };
  }

  // Check if explicitly out of stock
  if (variant.stock?.status === 'OUT_OF_STOCK' || (variant.stock?.availableQty !== undefined && variant.stock.availableQty === 0)) {
    return {
      isValid: false,
      message: 'This item is currently out of stock.'
    };
  }

  return { isValid: true };
};

export const validateQuantityDecrease = (
  currentQuantity: number,
  variant: ProductVariant
): QuantityValidationResult => {
  const minQty = variant.minOrderQty || 1;

  if (currentQuantity <= minQty) {
    return {
      isValid: false,
      message: `Minimum ${minQty} items required. Remove item from cart?`
    };
  }

  return { isValid: true };
};

export const showQuantityAlert = (
  title: string,
  message: string,
  onConfirm?: () => void,
  showCancel: boolean = false,
  vibrate: boolean = false
) => {
  if (vibrate) {
    Vibration.vibrate([0, 200, 100, 200]);
  }
  
  const buttons = showCancel 
    ? [
        { text: 'Cancel', style: 'cancel' as const },
        { text: 'OK', onPress: onConfirm }
      ]
    : [{ text: 'OK', onPress: onConfirm }];

  Alert.alert(title, message, buttons);
};

export const showRemoveItemAlert = (onConfirm: () => void) => {
  Alert.alert(
    'Remove Item',
    'Do you want to remove this item from cart?',
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive',
        onPress: onConfirm
      }
    ]
  );
};