/**
 * Global application state
 */
export interface AppState {
  auth: AuthState;
  ui: UIState;
}

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

/**
 * UI state
 */
export interface UIState {
  theme: 'light' | 'dark';
  networkStatus: 'online' | 'offline';
  hasCompletedOnboarding: boolean;
}

/**
 * User profile information
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  createdAt: number;
  lastLogin: number;
  preferences?: UserPreferences;
}

/**
 * User preferences
 */
export interface UserPreferences {
  darkMode?: boolean;
  defaultRadius?: number;
  defaultCategories?: string[];
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}
