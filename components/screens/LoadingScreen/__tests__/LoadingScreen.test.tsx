import React from 'react';
import { renderWithProviders } from '@/test-utils';
import { LoadingScreen } from '../index';

// expo-router is automatically mocked via __mocks__/expo-router.ts

describe('LoadingScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly with default message', () => {
    const { getByText } = renderWithProviders(<LoadingScreen />);
    expect(getByText('DinnaFind')).toBeTruthy();
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders correctly with custom message', () => {
    const { getByText } = renderWithProviders(<LoadingScreen message="Please wait..." />);
    expect(getByText('DinnaFind')).toBeTruthy();
    expect(getByText('Please wait...')).toBeTruthy();
  });
});
