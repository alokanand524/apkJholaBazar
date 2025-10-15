import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Gesture as GestureType } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
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

  const backGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (event.translationX > 50 && event.absoluteX < 50) {
        runOnJS(onClose)();
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
      <View style={styles.modalOverlay}>
          <GestureDetector gesture={Gesture.Simultaneous(panGesture, backGesture)}>
            <SafeAreaView 
              style={[styles.container, animatedStyle]}
            >
            <KeyboardAvoidingView 
              style={styles.content}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={0}
            >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Support Chat</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.messagesContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        </View>

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
            </KeyboardAvoidingView>
            </SafeAreaView>
          </GestureDetector>
      </View>
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
    height: '100%',
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  placeholder: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    maxWidth: '85%',
    marginVertical: 3,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
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