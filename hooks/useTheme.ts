import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { Colors } from '@/constants/Colors';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const themeMode = useSelector((state: RootState) => state.ui.themeMode);
  
  const activeTheme = themeMode === 'system' ? systemColorScheme || 'light' : themeMode;
  const colors = Colors[activeTheme];
  
  return {
    theme: activeTheme,
    colors,
    themeMode,
  };
}