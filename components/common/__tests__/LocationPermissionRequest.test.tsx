import React from 'react';
import { fireEvent, renderWithProviders as render, waitFor } from "@/test-utils";
import { LocationPermissionRequest } from '../LocationPermissionRequest';
import * as Location from 'expo-location';
import { Linking } from 'react-native';
import { theme } from '@/theme';

// Mock expo-location
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

// Mock Linking
jest.spyOn(Linking, 'openSettings').mockImplementation(() => Promise.resolve());

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('LocationPermissionRequest', () => {
  const mockOnRequestLocation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial state correctly (checking permissions)', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });

    const { getByText, getByTestId } = render(
      <LocationPermissionRequest onRequestLocation={mockOnRequestLocation} />
    );

    await waitFor(() => {
      expect(getByText('Location Access Needed')).toBeTruthy();
      expect(getByTestId('allow-location-button')).toBeTruthy();
    });
  });

  it('calls onRequestLocation immediately if permission is already granted', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    render(
      <LocationPermissionRequest onRequestLocation={mockOnRequestLocation} />
    );

    await waitFor(() => {
      expect(mockOnRequestLocation).toHaveBeenCalled();
    });
  });

  it('requests permission when "Allow Location Access" is pressed', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    const { getByTestId } = render(
      <LocationPermissionRequest onRequestLocation={mockOnRequestLocation} />
    );

    const allowButton = await waitFor(() => getByTestId('allow-location-button'));
    fireEvent.press(allowButton);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(mockOnRequestLocation).toHaveBeenCalled();
    });
  });

  it('shows denied state when permission is denied', async () => {
    // Initial check says denied
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const { getByText, getByTestId, queryByTestId } = render(
      <LocationPermissionRequest onRequestLocation={mockOnRequestLocation} />
    );

    await waitFor(() => {
        expect(getByText('Location Permission Denied')).toBeTruthy();
        expect(getByText(/Access to your location was denied/)).toBeTruthy();
        // Allow button should be gone
        expect(queryByTestId('allow-location-button')).toBeNull();
        // Open Settings button should be visible and primary logic relies on style check which is hard in unit test,
        // but we can check existence
        expect(getByTestId('open-settings-button')).toBeTruthy();
    });
  });

  it('opens settings when "Open Settings" is pressed', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const { getByTestId } = render(
      <LocationPermissionRequest onRequestLocation={mockOnRequestLocation} />
    );

    const settingsButton = await waitFor(() => getByTestId('open-settings-button'));
    fireEvent.press(settingsButton);

    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it('handles permission request error gracefully', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'undetermined',
      });
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValue(new Error('Permission error'));

      const { getByTestId } = render(
          <LocationPermissionRequest onRequestLocation={mockOnRequestLocation} />
      );

      const allowButton = await waitFor(() => getByTestId('allow-location-button'));
      fireEvent.press(allowButton);

      await waitFor(() => {
          expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
          expect(mockOnRequestLocation).not.toHaveBeenCalled();
      });
  });
});
