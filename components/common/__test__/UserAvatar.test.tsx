import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  it('renders initials when no photo URL is provided', () => {
    const user = {
      displayName: 'John Doe',
      email: 'john@example.com',
    };

    render(<UserAvatar user={user} />);

    // Should show "JD" for John Doe
    expect(screen.getByText('JD')).toBeTruthy();
  });

  it('renders single initial for single name', () => {
    const user = {
      displayName: 'John',
      email: 'john@example.com',
    };

    render(<UserAvatar user={user} />);

    // Should show "J" for John
    expect(screen.getByText('J')).toBeTruthy();
  });

  it('renders email initial when no display name', () => {
    const user = {
      email: 'john@example.com',
    };

    render(<UserAvatar user={user} />);

    // Should show "J" from email
    expect(screen.getByText('J')).toBeTruthy();
  });

  it('renders question mark when no name or email', () => {
    const user = {};

    render(<UserAvatar user={user} />);

    // Should show "?" as fallback
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('renders image when photo URL is provided', () => {
    const user = {
      displayName: 'John Doe',
      email: 'john@example.com',
      photoUrl: 'https://example.com/avatar.jpg',
    };

    render(<UserAvatar user={user} />);

    // Should render an Image component
    const image = screen.getByTestId('user-avatar-image');
    expect(image).toBeTruthy();
    
    // Should also have fallback initials
    const initials = screen.getByTestId('user-avatar-initials');
    expect(initials).toBeTruthy();
  });
});
