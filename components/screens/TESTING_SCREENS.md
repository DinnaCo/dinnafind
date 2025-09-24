# Testing Screen Components - Standard Operating Procedure

This document outlines the conventions and patterns for testing screen components in `components/screens/`.

## Directory Structure Convention

Each screen should follow this structure:

```
components/screens/
├── AuthScreen/
│   ├── index.tsx                    # Main screen component
│   └── __tests__/
│       ├── AuthScreen.test.tsx      # Component tests
│       ├── AuthScreen.integration.test.tsx  # Integration tests (optional)
│       └── __snapshots__/
│           └── AuthScreen.test.tsx.snap
│
├── ProfileScreen/
│   ├── index.tsx
│   └── __tests__/
│       └── ProfileScreen.test.tsx
│
└── LoadingScreen/                   # ✅ Already following convention
    ├── index.tsx
    └── __tests__/
        └── LoadingScreen.test.tsx
```

## Screen Testing Levels

Screens are more complex than components and typically need multiple test types:

### 1. **Snapshot Tests** (Always)
Quick visual regression tests to catch unexpected UI changes.

### 2. **Unit Tests** (Always)
Test individual behaviors, conditional rendering, and user interactions.

### 3. **Integration Tests** (For complex screens)
Test Redux integration, navigation, API calls, and data flow.

## Basic Screen Test Template

```typescript
// components/screens/ProfileScreen/__tests__/ProfileScreen.test.tsx
import React from 'react';
import { renderWithProviders, screen, fireEvent, renderer } from '@/test-utils';
import { mockUserWithPhoto } from '@/__fixtures__';
import { ProfileScreen } from '../index';

// Mock any screen-specific dependencies
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUserWithPhoto,
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
  }),
}));

describe('ProfileScreen', () => {
  // 1. Snapshot test
  it('matches snapshot', () => {
    const tree = renderer.create(<ProfileScreen />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  // 2. Rendering tests
  it('renders user information', () => {
    renderWithProviders(<ProfileScreen />);

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('john@example.com')).toBeTruthy();
  });

  // 3. Interaction tests
  it('shows sign out confirmation when button pressed', () => {
    const mockAlert = jest.spyOn(Alert, 'alert');
    renderWithProviders(<ProfileScreen />);

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.press(signOutButton);

    expect(mockAlert).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.any(Array)
    );
  });

  // 4. Redux integration tests
  it('displays user data from Redux store', () => {
    renderWithProviders(<ProfileScreen />, {
      preloadedState: {
        auth: {
          user: mockUserWithPhoto,
          isAuthenticated: true,
        },
      },
    });

    expect(screen.getByText('John Doe')).toBeTruthy();
  });
});
```

## Testing Patterns by Screen Type

### Authentication Screens (AuthScreen, OTPScreen, PasswordResetScreen)

**Key testing areas:**
- Form validation
- Loading states
- Error handling
- Navigation after auth
- Different auth methods (email, Google, Apple)

```typescript
describe('AuthScreen', () => {
  const mockSignIn = jest.fn();
  const mockSignUp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mock('@/contexts/AuthContext', () => ({
      useAuth: () => ({
        signIn: mockSignIn,
        signUp: mockSignUp,
        isAuthenticated: false,
      }),
    }));
  });

  it('toggles between sign in and sign up modes', () => {
    renderWithProviders(<AuthScreen />);

    expect(screen.getByText('Sign In')).toBeTruthy();

    const toggleButton = screen.getByText('Create Account');
    fireEvent.press(toggleButton);

    expect(screen.getByText('Sign Up')).toBeTruthy();
  });

  it('calls signIn with email and password', async () => {
    renderWithProviders(<AuthScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows loading state during authentication', async () => {
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithProviders(<AuthScreen />);

    fireEvent.press(screen.getByText('Sign In'));

    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
  });

  it('displays error message on auth failure', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid credentials'));
    const mockAlert = jest.spyOn(Alert, 'alert');

    renderWithProviders(<AuthScreen />);

    fireEvent.press(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Invalid credentials');
    });
  });
});
```

### Data-Driven Screens (BucketListScreen, SearchScreen, ExploreScreen)

**Key testing areas:**
- Loading states
- Empty states
- Data rendering
- Filtering/searching
- Item interactions
- Redux integration

```typescript
import { mockRestaurants } from '@/__fixtures__';

describe('BucketListScreen', () => {
  it('shows loading state while fetching data', () => {
    renderWithProviders(<BucketListScreen />, {
      preloadedState: {
        bucketList: {
          items: [],
          loading: true,
          error: null,
        },
      },
    });

    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
  });

  it('shows empty state when no items', () => {
    renderWithProviders(<BucketListScreen />, {
      preloadedState: {
        bucketList: {
          items: [],
          loading: false,
          error: null,
        },
      },
    });

    expect(screen.getByText('Your bucket list is empty')).toBeTruthy();
  });

  it('renders bucket list items', () => {
    renderWithProviders(<BucketListScreen />, {
      preloadedState: {
        bucketList: {
          items: mockRestaurants,
          loading: false,
          error: null,
        },
      },
    });

    expect(screen.getByText(mockRestaurants[0].name)).toBeTruthy();
  });

  it('filters items by search query', () => {
    renderWithProviders(<BucketListScreen />, {
      preloadedState: {
        bucketList: {
          items: mockRestaurants,
          loading: false,
          error: null,
        },
      },
    });

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.changeText(searchInput, 'Pizza');

    expect(screen.getByText('Pizza Place')).toBeTruthy();
    expect(screen.queryByText('Sushi Bar')).toBeNull();
  });
});
```

### Profile/Settings Screens (ProfileScreen)

**Key testing areas:**
- User data display
- Settings toggles
- Account actions (sign out, delete)
- Navigation

```typescript
describe('ProfileScreen', () => {
  it('displays user profile information', () => {
    renderWithProviders(<ProfileScreen />, {
      preloadedState: {
        auth: {
          user: mockUserWithPhoto,
          isAuthenticated: true,
        },
      },
    });

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('john@example.com')).toBeTruthy();
  });

  it('navigates to settings when settings button pressed', () => {
    const mockPush = jest.fn();
    jest.mock('expo-router', () => ({
      useRouter: () => ({ push: mockPush }),
    }));

    renderWithProviders(<ProfileScreen />);

    const settingsButton = screen.getByTestId('settings-button');
    fireEvent.press(settingsButton);

    expect(mockPush).toHaveBeenCalledWith('/settings');
  });
});
```

### Detail Screens (DetailScreen)

**Key testing areas:**
- Route params handling
- Data fetching based on ID
- Loading states
- Actions (save, share, navigate)

```typescript
describe('DetailScreen', () => {
  const mockVenue = mockRestaurants[0];

  it('loads venue data based on route params', async () => {
    jest.mock('expo-router', () => ({
      useLocalSearchParams: () => ({ id: '123' }),
    }));

    const mockFetch = jest.fn().mockResolvedValue(mockVenue);

    renderWithProviders(<DetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(mockVenue.name)).toBeTruthy();
    });
  });

  it('shows error state when venue not found', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Not found'));

    renderWithProviders(<DetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Venue not found')).toBeTruthy();
    });
  });
});
```

## Required Fixtures for Screens

Create screen-specific fixtures in `__fixtures__/`:

```typescript
// __fixtures__/restaurants.ts
export const mockRestaurant = {
  id: '1',
  name: 'Pizza Palace',
  address: '123 Main St',
  rating: 4.5,
  cuisine: 'Italian',
};

export const mockRestaurants = [
  mockRestaurant,
  { id: '2', name: 'Sushi Bar', /* ... */ },
  { id: '3', name: 'Burger Joint', /* ... */ },
];

// __fixtures__/bucketList.ts
export const mockBucketListItem = {
  id: '1',
  venueId: '123',
  userId: 'user-123',
  priority: 'high',
  notes: 'Try the margherita pizza',
  createdAt: '2024-01-01T00:00:00Z',
};
```

## Common Mocks for Screens

### Navigation (expo-router)
Already globally mocked in `__mocks__/expo-router.ts`. Override per-test if needed:

```typescript
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  useLocalSearchParams: () => ({ id: '123' }),
}));
```

### Context Providers
Mock on a per-screen basis:

```typescript
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUserWithPhoto,
    isAuthenticated: true,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));
```

### Alert Dialogs
Mock Alert.alert to test confirmation dialogs:

```typescript
const mockAlert = jest.spyOn(Alert, 'alert');

// In test
expect(mockAlert).toHaveBeenCalledWith(
  'Delete Account',
  expect.any(String),
  expect.arrayContaining([
    expect.objectContaining({ text: 'Cancel' }),
    expect.objectContaining({ text: 'Delete' }),
  ])
);
```

## Testing Checklist for New Screens

- [ ] Snapshot test
- [ ] Renders with default/empty state
- [ ] Renders with populated data (from Redux or props)
- [ ] Loading state displays correctly
- [ ] Error state handles gracefully
- [ ] User interactions trigger expected behavior
- [ ] Navigation works correctly
- [ ] Redux actions dispatched when appropriate
- [ ] Form validation (if applicable)
- [ ] API calls mocked and tested
- [ ] Alert/Modal interactions tested

## Best Practices

### 1. **Use `renderWithProviders` Always**
Screens almost always need Redux and Theme providers:

```typescript
renderWithProviders(<ProfileScreen />, {
  preloadedState: { /* your state */ }
});
```

### 2. **Mock External Dependencies**
Don't test external libraries - mock them:

```typescript
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
}));
```

### 3. **Test User Flows, Not Implementation**
Focus on what users see and do:

```typescript
// ✅ Good - tests user behavior
it('user can add item to bucket list', () => {
  renderWithProviders(<DetailScreen />);
  fireEvent.press(screen.getByText('Add to Bucket List'));
  expect(screen.getByText('Added to bucket list!')).toBeTruthy();
});

// ❌ Bad - tests implementation details
it('calls dispatch with correct action', () => {
  const mockDispatch = jest.fn();
  // ... testing Redux internals
});
```

### 4. **Use Fixtures Over Inline Data**
Keeps tests DRY and consistent:

```typescript
// ✅ Good
import { mockRestaurants } from '@/__fixtures__';
renderWithProviders(<BucketListScreen />, {
  preloadedState: { bucketList: { items: mockRestaurants } }
});

// ❌ Bad
renderWithProviders(<BucketListScreen />, {
  preloadedState: { bucketList: { items: [{ id: '1', name: 'Test' }] } }
});
```

### 5. **Test Accessibility**
Ensure screens work for all users:

```typescript
it('has accessible labels', () => {
  renderWithProviders(<ProfileScreen />);

  expect(screen.getByLabelText('User avatar')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Sign Out' })).toBeTruthy();
});
```

## Running Screen Tests

```bash
# Run all screen tests
npm test -- components/screens

# Run specific screen tests
npm test -- components/screens/ProfileScreen

# Run tests in watch mode
npm test -- components/screens/ProfileScreen --watch

# Update snapshots
npm test -- components/screens/ProfileScreen -u
```

## Example: Complete Screen Test Suite

See [LoadingScreen/__tests__/LoadingScreen.test.tsx](LoadingScreen/__tests__/LoadingScreen.test.tsx) as a reference implementation.

For more complex examples with Redux and navigation, refer to the patterns above.

## Migration Checklist

To add tests to existing screens:

1. Create `__tests__/` directory in screen folder
2. Create `ScreenName.test.tsx` file
3. Start with snapshot test
4. Add rendering tests for different states
5. Add interaction tests
6. Add Redux integration tests if needed
7. Run tests and verify they pass
8. Commit tests with the screen implementation

## Additional Resources

- [Main Testing Guide](../../TESTING.md)
- [Test Utils Documentation](../../test-utils/README.md)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing React Navigation](https://reactnavigation.org/docs/testing/)
