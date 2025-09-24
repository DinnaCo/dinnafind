import React from 'react';
import { renderWithProviders, screen } from '@/test-utils';
import { UserAvatar } from '../UserAvatar';
import {
  mockUserWithPhoto,
  mockUserSingleName,
  mockUserEmailOnly,
  mockUserEmpty,
  mockUserForSnapshot,
} from '@/__fixtures__';

describe('UserAvatar', () => {
  it('renders initials when no photo URL is provided', () => {
    const user = {
      displayName: 'John Doe',
      email: 'john@example.com',
    };

    renderWithProviders(<UserAvatar user={user} />);

    // Should show "JD" for John Doe
    expect(screen.getByText('JD')).toBeTruthy();
  });

  it('renders single initial for single name', () => {
    renderWithProviders(<UserAvatar user={mockUserSingleName} />);

    // Should show "J" for John
    expect(screen.getByText('J')).toBeTruthy();
  });

  it('renders email initial when no display name', () => {
    renderWithProviders(<UserAvatar user={mockUserEmailOnly} />);

    // Should show "J" from email
    expect(screen.getByText('J')).toBeTruthy();
  });

  it('renders question mark when no name or email', () => {
    renderWithProviders(<UserAvatar user={mockUserEmpty} />);

    // Should show "?" as fallback
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('renders image when photo URL is provided', () => {
    renderWithProviders(<UserAvatar user={mockUserWithPhoto} />);

    // Should render an Image component
    const image = screen.getByTestId('user-avatar-image');
    expect(image).toBeTruthy();

    // Should NOT have fallback initials visible (mutually exclusive)
    const initials = screen.queryByTestId('user-avatar-initials');
    expect(initials).toBeNull();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithProviders(<UserAvatar user={mockUserForSnapshot} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
