import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type UIState } from '@/models/app-state';

const initialState: UIState = {
  theme: 'light',
  networkStatus: 'online',
  hasCompletedOnboarding: false,
  masterNotificationsEnabled: true,
  distanceMiles: 1.25,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme actions
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    toggleTheme: state => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },

    // Network status actions
    setNetworkStatus: (state, action: PayloadAction<'online' | 'offline'>) => {
      state.networkStatus = action.payload;
    },

    // Onboarding actions
    completeOnboarding: state => {
      state.hasCompletedOnboarding = true;
    },
    resetOnboarding: state => {
      state.hasCompletedOnboarding = false;
    },

    // User preferences actions
    setMasterNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.masterNotificationsEnabled = action.payload;
    },
    setDistanceMiles: (state, action: PayloadAction<number>) => {
      state.distanceMiles = action.payload;
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  setNetworkStatus,
  completeOnboarding,
  resetOnboarding,
  setMasterNotificationsEnabled,
  setDistanceMiles,
} = uiSlice.actions;

// Selectors
export const selectMasterNotificationsEnabled = (state: { ui: UIState }) => state.ui.masterNotificationsEnabled;
export const selectDistanceMiles = (state: { ui: UIState }) => state.ui.distanceMiles;

export default uiSlice.reducer;
