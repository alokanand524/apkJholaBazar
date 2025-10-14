import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>About</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.logoSection}>
            <Image 
              source={require('../assets/images/jhola-bazar.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Jhola Bazar</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Us</Text>
            <Text style={styles.description}>
              At Jhola Bazar, we believe grocery shopping should be simple, fast, and reliable.
              We are a local grocery delivery service in Samastipur, Bihar, proudly operated under Shree Hari Enterprises.
              {"\n\n"}Our mission is to bring Daily essentials, and household products right to your doorstep, saving you time and effort. Whether it's Packaged foods, or home essentials, we make sure you get them at the best prices with hassle free delivery.
              {"\n\n"}We're more than just a delivery app, we're your neighborhood partner, making everyday shopping easier for families across Samastipur.
              {"\n\n"}✨ Jhola Bazar – Groceries made simple, just a tap away!
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Browse products by categories</Text>
              <Text style={styles.featureItem}>• Search and filter products</Text>
              <Text style={styles.featureItem}>• Add items to cart</Text>
              <Text style={styles.featureItem}>• User authentication</Text>
              <Text style={styles.featureItem}>• Order management</Text>
              <Text style={styles.featureItem}>• Address management</Text>
              <Text style={styles.featureItem}>• Payment methods</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why Choose Jhola Bazar?</Text>
            <View style={styles.techList}>
              <Text style={styles.techItem}>🛒 Wide range of groceries & essentials</Text>
              <Text style={styles.techItem}>🚚 Fast & reliable home delivery in Samastipur</Text>
              <Text style={styles.techItem}>💰 Affordable prices with great offers</Text>
              <Text style={styles.techItem}>🤝 Trusted service backed by Shree Hari Enterprises</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal</Text>
            <View style={styles.itemCard}>
              <TouchableOpacity 
                style={styles.linkItem}
                onPress={() => handleLinkPress('https://jholabazar.com/privacy-policy')}
              >
                <Text style={styles.linkText}>Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.itemCard}>
              <TouchableOpacity 
                style={styles.linkItem}
                onPress={() => handleLinkPress('https://jholabazar.com/t&c')}
              >
                <Text style={styles.linkText}>Terms of Service</Text>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Made with ❤️ & Care</Text>
            <Text style={styles.copyright}>© 2025 Jhola Bazar</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  version: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 4,
  },
  techList: {
    marginTop: 8,
  },
  techItem: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 4,
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  linkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  linkText: {
    fontSize: 16,
    color: '#00B761',
  },
  disclaimer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  copyright: {
    fontSize: 14,
    color: '#999',
  },
});