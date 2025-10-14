// This page has been removed - using ChatWidget instead
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function ChatbotRedirect() {
  useEffect(() => {
    router.back();
  }, []);
  
  return null;
}