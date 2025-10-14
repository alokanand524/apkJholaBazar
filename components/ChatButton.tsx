import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import ChatWidget from './ChatWidget';

export default function ChatButton() {
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      <TouchableOpacity 
        style={styles.chatButton}
        onPress={() => setShowChat(true)}
      >
        <Ionicons name="chatbubble" size={24} color="#fff" />
      </TouchableOpacity>
      
      <ChatWidget 
        visible={showChat}
        onClose={() => setShowChat(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  chatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});