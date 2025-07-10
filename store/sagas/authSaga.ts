import { takeLatest, put, call } from 'redux-saga/effects';

import { type UserProfile } from '@/models/app-state';
import { isProduction } from '@/utils/runtime';
import {
  login,
  loginSuccess,
  loginFailure,
  logout,
  logoutSuccess,
  logoutFailure,
  resetToMockUser,
  getDisplayName,
} from '@/store/slices/authSlice';

// Default mock user for development
const MOCK_USER: UserProfile = {
  id: 'mock-user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  createdAt: 0,
  lastLogin: 0,
  getDisplayName: () => MOCK_USER.displayName ?? MOCK_USER.email,
};

// Example login service (replace with your actual auth service, e.g., Firebase)
const loginService = async (email: string, password: string) => {
  // For development, always return the mock user
  if (!isProduction()) {
    console.log('Development mode: Using mock user for login');
    return MOCK_USER;
  }

  // Simulate an API call (replace with actual Firebase/auth logic)
  return {
    id: 'example',
    email,
    displayName: email.split('@')[0],
  };
};

// Example logout service (replace with your actual auth service, e.g., Firebase)
const logoutService = async () => {
  // Simulate logout (replace with actual Firebase/auth logic)
  return true;
};

function* handleLogin(action: ReturnType<typeof login>): Generator<any, void, any> {
  try {
    if (!action.payload) {
      throw new Error('Login payload is undefined');
    }
    const { email, password } = action.payload;
    const user = yield call(loginService, email, password);
    yield put(loginSuccess(user));
  } catch (error: any) {
    yield put(loginFailure(error.message || 'Login failed'));
  }
}

function* handleLogout() {
  try {
    yield call(logoutService);

    // For development, we'll "log out" to the mock user
    if (!isProduction()) {
      yield put(resetToMockUser());
    } else {
      yield put(logoutSuccess());
    }
  } catch (error: any) {
    yield put(logoutFailure(error.message || 'Logout failed'));
  }
}

// Special handler to reset to mock user
function handleResetToMockUser() {
  // This is just a passthrough action - the reducer handles the actual state change
  console.log('Resetting to mock user');
}

export function* watchAuth() {
  yield takeLatest(login.type, handleLogin);
  yield takeLatest(logout.type, handleLogout);
  yield takeLatest(resetToMockUser.type, handleResetToMockUser);
}

export default function* authSaga() {
  yield watchAuth();
}
