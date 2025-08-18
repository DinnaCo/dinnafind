import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type AuthState, type UserProfile } from '@/models/app-state';

// Define a mock user for development
const MOCK_USER: UserProfile = {
  id: 'mock-user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  createdAt: 0,
  lastLogin: 0,
};

// Define the initial state for the auth slice
const initialState: AuthState = {
  isAuthenticated: false, // Start as not authenticated
  user: null, // No user initially
  loading: false,
  error: null,
};

// Create the auth slice with reducers for login, logout, and error handling
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Handle login request
    login(state, action: PayloadAction<{ email: string; password: string }>) {
      state.loading = true;
      state.error = null;
    },
    // Handle successful login
    loginSuccess(state, action: PayloadAction<UserProfile>) {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.loading = false;
      state.error = null;
    },
    // Handle login failure
    loginFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },

    // Handle logout request
    logout(state) {
      state.loading = true;
      state.error = null;
    },
    // Handle successful logout
    logoutSuccess(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
      state.error = null;
    },
    // Handle logout failure
    logoutFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },

    // Clear any existing error
    clearError(state) {
      state.error = null;
    },

    // Reset to mock user (for development only)
    resetToMockUser(state) {
      state.isAuthenticated = true;
      state.user = MOCK_USER;
      state.loading = false;
      state.error = null;
    },
  },
});

// Export the action creators
export const {
  login,
  loginSuccess,
  loginFailure,
  logout,
  logoutSuccess,
  logoutFailure,
  clearError,
  resetToMockUser,
} = authSlice.actions;

// Export the reducer as the default export
export default authSlice.reducer;

// Export selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

// Add a selector for display name
export const selectDisplayName = (state: { auth: AuthState }) =>
  state.auth.user?.displayName || state.auth.user?.email || 'Test User';

// Export types for use in sagas and components
export type LoginPayload = { email: string; password: string };
export type LoginSuccessPayload = UserProfile;
export type ErrorPayload = string;
