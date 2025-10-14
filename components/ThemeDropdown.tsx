import { useTheme } from '@/hooks/useTheme';
import { setThemeMode, ThemeMode } from '@/store/slices/uiSlice';
import { RootState } from '@/store/store';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

const themeOptions = [
  { value: 'light' as ThemeMode, label: 'Light', icon: 'sunny-outline' },
  { value: 'dark' as ThemeMode, label: 'Dark', icon: 'moon-outline' },
  { value: 'system' as ThemeMode, label: 'System', icon: 'phone-portrait-outline' },
];

export default function ThemeDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const dispatch = useDispatch();
  const themeMode = useSelector((state: RootState) => state.ui.themeMode);
  const { colors } = useTheme();

  const currentTheme = themeOptions.find(option => option.value === themeMode);

  const handleThemeSelect = (theme: ThemeMode) => {
    dispatch(setThemeMode(theme));
    setIsOpen(false);
  };

  return (
    <View>
      <TouchableOpacity 
        style={styles.dropdown} 
        onPress={() => setIsOpen(true)}
        onLayout={(event) => {
          const { x, y, width, height } = event.nativeEvent.layout;
          setDropdownLayout({ x, y, width, height });
        }}
      >
        <View style={styles.dropdownContent}>
          <Ionicons name={currentTheme?.icon as any} size={24} color={colors.gray} />
          <Text style={[styles.dropdownText, { color: colors.text }]}>{currentTheme?.label}</Text>
        </View>
        <Ionicons name="chevron-down" size={20} color="#ccc" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => setIsOpen(false)}
        >
          <View style={[
            styles.modal, 
            { 
              backgroundColor: colors.background,
              position: 'absolute',
              top: dropdownLayout.y + dropdownLayout.height + 4,
              right: 16,
            }
          ]}>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  themeMode === option.value && styles.selectedOption
                ]}
                onPress={() => handleThemeSelect(option.value)}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={24} 
                  color={themeMode === option.value ? colors.primary : colors.gray} 
                />
                <Text style={[
                  styles.optionText,
                  { color: colors.text },
                  themeMode === option.value && { color: colors.primary, fontWeight: '600' }
                ]}>
                  {option.label}
                </Text>
                {themeMode === option.value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    marginLeft: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 220,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  selectedOption: {
    backgroundColor: '#f0f9f4',
  },
  optionText: {
    fontSize: 16,
    marginLeft: 16,
    flex: 1,
  },
});