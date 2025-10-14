import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark' | 'system';

interface UIState {
  isTabBarVisible: boolean;
  themeMode: ThemeMode;
}

const initialState: UIState = {
  isTabBarVisible: true,
  themeMode: 'system',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    hideTabBar: (state) => {
      state.isTabBarVisible = false;
    },
    showTabBar: (state) => {
      state.isTabBarVisible = true;
    },
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload;
    },
  },
});

export const { hideTabBar, showTabBar, setThemeMode } = uiSlice.actions;
export default uiSlice.reducer;