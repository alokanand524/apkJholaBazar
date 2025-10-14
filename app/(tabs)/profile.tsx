import ThemeDropdown from '@/components/ThemeDropdown';

import { useTheme } from '@/hooks/useTheme';
import { logout } from '@/store/slices/userSlice';
import pushTokenService from '@/services/pushTokenService';
import { RootState } from '@/store/store';
import { persistor } from '@/store/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { handleTabBarScroll } from './_layout';

const menuItems = [
  { id: '1', title: 'My Orders', icon: 'bag-outline', screen: 'orders' },
  { id: '2', title: 'Addresses', icon: 'location-outline', screen: 'addresses' },
  { id: '4', title: 'Help & Support', icon: 'help-circle-outline', screen: 'support' },
  { id: '5', title: 'About', icon: 'information-circle-outline', screen: 'about' },
];

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const { name, phone, isLoggedIn } = useSelector((state: RootState) => state.user);
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = React.useState(false);

  // No API call needed - profile loads instantly with existing data
  React.useEffect(() => {
    // Profile page loads instantly - no API calls needed
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            await pushTokenService.removePushToken();
            dispatch(logout());
            await persistor.purge();
          }
        },
      ]
    );
  };

  const handleLogin = () => {
    router.push('/login');
  };

  // No loading screen needed - profile loads instantly

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
      </View>

      <ScrollView 
        style={styles.content}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      >
        {isLoggedIn ? (
          <View style={[styles.userInfo, { backgroundColor: colors.lightGray }]}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#00B761" />
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: colors.text }]}>{name || 'User'}</Text>
              <Text style={[styles.userPhone, { color: colors.gray }]}>{phone || '+91 XXXXXXXXXX'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => router.push('/edit-profile')}
            >
              <Ionicons name="pencil" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.loginPrompt, { backgroundColor: colors.lightGray }]} onPress={handleLogin}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#666" />
            </View>
            <View style={styles.loginText}>
              <Text style={[styles.loginTitle, { color: colors.text }]}>Login to your account</Text>
              <Text style={[styles.loginSubtitle, { color: colors.gray }]}>Access your orders and preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}



        <View style={styles.menuSection}>
          <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="color-palette-outline" size={24} color={colors.gray} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Theme</Text>
            </View>
            <ThemeDropdown />
          </View>
          
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/${item.screen}` as any)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon as any} size={24} color={colors.gray} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {isLoggedIn && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        )}

        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Jhola Bazar  v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
  },
  editButton: {
    padding: 8,
  },
  loginText: {
    flex: 1,
  },
  loginTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  loginSubtitle: {
    fontSize: 14,
  },
  menuSection: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 12,
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    padding: 16,
  },
  appVersion: {
    fontSize: 12,
    color: '#999',
  },
});