import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  BackHandler,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
// import { tawkApi, ChatMessage } from '@/utils/tawkApi';

interface ChatMessage {
  id: string;
  text: string;
  time: string;
  sender: 'user' | 'agent';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChatWidgetProps {
  visible: boolean;
  onClose: () => void;
}

const botResponses = {
  'hello': 'Hi! Welcome to Jhola Bazar! How can I help you today? 😊',
  'hi': 'Hello! What can I assist you with?',
  'order': 'You can track your orders in Profile > My Orders section. Need help with a specific order?',
  'delivery': 'We deliver fresh groceries within 10-15 minutes in most areas! 🚚',
  'payment': 'We accept UPI, Credit/Debit cards, and Cash on Delivery for your convenience.',
  'cancel': 'You can cancel orders before they are dispatched from store. Go to My Orders to cancel.',
  'help': 'I can help you with:\n• Order tracking\n• Delivery information\n• Payment issues\n• Product questions\n• Account support',
  'product': 'Browse our fresh vegetables, fruits, dairy products and more! Use search to find specific items.',
  'account': 'For account issues, go to Profile section or contact support at +919262626392.',
  'refund': 'Refunds are processed within 3-5 business days to your original payment method.',
  'contact': 'You can reach us at:\n📞 +919262626392\n📧 support@jholabazar.com',
  'timing': 'We are open 24/7 for orders! Delivery available from 6 AM to 11 PM.',
  'area': 'We deliver across major areas. Enter your pincode during checkout to check availability.',
  'fresh': 'All our products are sourced fresh daily from trusted suppliers! 🥬🍎',
  'discount': 'Check our app for daily deals and special offers! Save more on bulk orders.',
  'default': 'I understand you need help. Our support team is here for you!\n\nFor immediate assistance:\n📞 Call: +919262626392\n📧 Email: support@jholabazar.com\n\nOr ask me about orders, delivery, payments, or products! 😊'
};

export default function ChatWidget({ visible, onClose }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX > SCREEN_WIDTH * 0.3) {
        translateX.value = withSpring(SCREEN_WIDTH, {}, () => {
          runOnJS(onClose)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  useEffect(() => {
    if (visible) {
      translateX.value = 0;
    }
  }, [visible]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, onClose]);

  const getBotResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    for (const [key, response] of Object.entries(botResponses)) {
      if (key !== 'default' && message.includes(key)) {
        return response;
      }
    }
    return botResponses.default;
  };

  useEffect(() => {
    if (visible && messages.length === 0) {
      // Add welcome message
      setMessages([{
        id: '1',
        text: 'Hello! Welcome to Jhola Bazar! 🛒\n\nI\'m your virtual assistant. I can help you with:\n• Order tracking & delivery\n• Payment & refund queries\n• Product information\n• Account support\n\nHow can I assist you today?',
        time: new Date().toLocaleTimeString(),
        sender: 'agent'
      }]);
    }
  }, [visible]);

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      time: new Date().toLocaleTimeString(),
      sender: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText('');
    setLoading(true);

    // Simulate typing delay for more natural interaction
    setTimeout(() => {
      const botResponse = getBotResponse(messageText);
      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        time: new Date().toLocaleTimeString(),
        sender: 'agent'
      };
      setMessages(prev => [...prev, agentMessage]);
      setLoading(false);
    }, 800 + Math.random() * 400); // Random delay between 800-1200ms
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'user' ? styles.userMessage : styles.agentMessage
    ]}>
      <Text style={[
        styles.messageText,
        { color: item.sender === 'user' ? '#fff' : Colors.light.text }
      ]}>
        {item.text}
      </Text>
      <Text style={[
        styles.messageTime,
        { color: item.sender === 'user' ? '#fff' : Colors.light.gray }
      ]}>
        {item.time}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <GestureDetector gesture={panGesture}>
          <KeyboardAvoidingView 
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          >
          <TouchableOpacity 
            style={[styles.container, animatedStyle]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Support Chat</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {loading && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>Assistant is typing...</Text>
          </View>
        )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendButton, { opacity: inputText.trim() && !loading ? 1 : 0.5 }]}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          </TouchableOpacity>
            </KeyboardAvoidingView>
        </GestureDetector>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '70%',
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.light.primary,
  },
  agentMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.lightGray,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    alignItems: 'flex-end',
    backgroundColor: Colors.light.background,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  sendButton: {
    backgroundColor: Colors.light.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    color: Colors.light.gray,
    fontStyle: 'italic',
  },
});