import { RootState } from '@/store/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

const { width, height } = Dimensions.get('window');

const images = [
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
];

export default function LoadingScreen() {
  const dispatch = useDispatch();
  const { isLoggedIn } = useSelector((state: RootState) => state.user);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const slideAnim = useRef(new Animated.Value(width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const taglineFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const preloadHomeData = async () => {
      try {
        // Preload home screen APIs in background
        const API_ENDPOINTS = require('@/constants/api').API_ENDPOINTS;
        
        const promises = [
          fetch(API_ENDPOINTS.PRODUCTS.ALL).catch(() => null),
          fetch(API_ENDPOINTS.PRODUCTS.FEATURED).catch(() => null),
          fetch(API_ENDPOINTS.CATEGORIES.ALL).catch(() => null),
        ];
        
        await Promise.allSettled(promises);
      } catch (error) {
        console.log('Preload failed:', error);
      }
    };

    const handleAppStart = async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const accessToken = await AsyncStorage.getItem('authToken');
        
        // Start preloading APIs in background
        preloadHomeData();
        
        // Show logo for 4 seconds (increased from 2 seconds)
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        if (accessToken) {
          // User has token, go to home (no push token registration on app start)
          router.replace('/(tabs)');
        } else {
          // No token, show login screen
          setIsCheckingAuth(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsCheckingAuth(false);
      }
    };
    
    handleAppStart();

    // Start fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Delayed tagline animation (appears after 1.5 seconds)
    setTimeout(() => {
      Animated.timing(taglineFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 1500);

    // Image sliding animation
    const animateImages = () => {
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(slideAnim, {
          toValue: -width,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
        slideAnim.setValue(width);
        animateImages();
      });
    };

    if (!isCheckingAuth) {
      animateImages();
    }
  }, [isCheckingAuth, dispatch]);

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  if (isCheckingAuth) {
    return (
      <SafeAreaView style={[styles.authCheckContainer]}>
        <Image source={require('../assets/images/splash-screen.png')} style={styles.logoImage} />
        <View style={styles.brandNameContainer}>
          <Text style={[styles.brandNameGreen]}>Jhola</Text>
          <Text style={[styles.brandNameOrange]}> Bazar</Text>
        </View>
        <Animated.Text style={[styles.tagline, { opacity: taglineFadeAnim }]}>
          Khushiyon Ka Jhola Aab Aapke Ghar
        </Animated.Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.imageContainer}>
        <Animated.View
          style={[
            styles.imageWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <Image source={{ uri: images[currentImageIndex] }} style={styles.image} />
        </Animated.View>
      </View>

      <View style={styles.loginSection}>
        <View style={styles.loginContent}>
          <View style={styles.logoContainer}>
            <Image source={require('../assets/images/splash-screen.png')} style={styles.logoImageSmall} />
            <View style={styles.brandNameContainer}>
              <Text style={styles.brandNameGreen}>Jhola</Text>
              <Text style={styles.brandNameOrange}> Bazar</Text>
            </View>
          </View>
          
          <Text style={styles.welcomeText}>Welcome to Jhola Bazar</Text>
          <Text style={styles.subtitle}>Khushiyon Ka Jhola Aab Aapke Ghar</Text>
          
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Ionicons name="phone-portrait" size={20} color="#fff" />
            <Text style={styles.loginButtonText}>Login with Phone</Text>
          </TouchableOpacity>
          
          {/* <TouchableOpacity style={styles.exploreButton} onPress={handleSkip}>
            <Text style={styles.exploreButtonText}>Explore without login</Text>
          </TouchableOpacity> */}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffffff', // Wheat color background
  },
  authCheckContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffffff', // Wheat color background
  },
  brandNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  brandNameGreen: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00B761', // Green for "Jhola"
  },
  brandNameOrange: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35', // Orange for "Bazar"
  },
  logoImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  logoImageSmall: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginRight: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 20,
  },
  skipText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  imageContainer: {
    flex: 0.65,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageWrapper: {
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loginSection: {
    flex: 0.35,
    backgroundColor: '#F5DEB3', // Wheat color background
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: -25,
  },
  loginContent: {
    flex: 1,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B761',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exploreButton: {
    paddingVertical: 12,
  },
  exploreButtonText: {
    color: '#00B761',
    fontSize: 16,
    fontWeight: '500',
  },
});