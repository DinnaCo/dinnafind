import React from 'react';
import { Alert } from 'react-native';
import { act } from 'react-test-renderer';
import { renderWithProviders, screen, fireEvent, renderer } from '@/test-utils';
import { mockUserWithPhoto } from '@/__fixtures__';
import { ProfileScreen } from '../index';

// Mock the AuthContext
const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: mockUserWithPhoto.uid,
      email: mockUserWithPhoto.email,
      user_metadata: {
        full_name: mockUserWithPhoto.displayName,
      },
    },
    signOut: mockSignOut,
    deleteAccount: mockDeleteAccount,
  }),
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot', () => {
    const { container } = renderWithProviders(<ProfileScreen />, {
      preloadedState: {
        auth: {
          user: mockUserWithPhoto,
          isAuthenticated: true,
          loading: false,
          error: null,
        },
      },
    });
    expect(container).toMatchSnapshot();
  });

  it('renders user information from Redux store', () => {
    renderWithProviders(<ProfileScreen />, {
      preloadedState: {
        auth: {
          user: mockUserWithPhoto,
          isAuthenticated: true,
          loading: false,
          error: null,
        },
      },
    });

    // User's name should be displayed
    expect(screen.getByText(mockUserWithPhoto.displayName)).toBeTruthy();
  });

  it('shows sign out confirmation when button pressed', () => {
    const mockAlert = jest.spyOn(Alert, 'alert');

    renderWithProviders(<ProfileScreen />, {
      preloadedState: {
        auth: {
          user: mockUserWithPhoto,
          isAuthenticated: true,
          loading: false,
          error: null,
        },
      },
    });

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.press(signOutButton);

    expect(mockAlert).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Sign Out' }),
      ])
    );
  });

  it('shows delete account confirmation when delete button pressed', () => {
    const mockAlert = jest.spyOn(Alert, 'alert');

    renderWithProviders(<ProfileScreen />, {
      preloadedState: {
        auth: {
          user: mockUserWithPhoto,
          isAuthenticated: true,
          loading: false,
          error: null,
        },
      },
    });

    const deleteButton = screen.getByText('Delete Account');
    fireEvent.press(deleteButton);

    expect(mockAlert).toHaveBeenCalledWith(
      'Delete Account',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Delete Account' }),
      ])
    );
  });

  it('renders user avatar', () => {
    renderWithProviders(<ProfileScreen />, {
      preloadedState: {
        auth: {
          user: mockUserWithPhoto,
          isAuthenticated: true,
          loading: false,
          error: null,
        },
      },
    });

    // UserAvatar component should be rendered
    // This assumes UserAvatar has a testID or accessible element
    const avatar = screen.getByTestId('user-avatar-image');
    expect(avatar).toBeTruthy();
  });
});
