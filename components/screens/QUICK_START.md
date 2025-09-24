# Quick Start: Testing Screens

This is a quick reference guide for adding tests to screen components. For complete details, see [TESTING_SCREENS.md](TESTING_SCREENS.md).

## File Structure

```
components/screens/YourScreen/
├── index.tsx
└── __tests__/
    └── YourScreen.test.tsx
```

## Basic Template

```typescript
import React from 'react';
import { Alert } from 'react-native';
import { renderWithProviders, screen, fireEvent, renderer } from '@/test-utils';
import { mockUserWithPhoto } from '@/__fixtures__';
import { YourScreen } from '../index';

// Mock dependencies as needed
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUserWithPhoto,
    signOut: jest.fn(),
  }),
}));

describe('YourScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Snapshot test (always include)
  it('matches snapshot', () => {
    const tree = renderer.create(<YourScreen />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  // 2. Rendering tests
  it('renders with data from Redux', () => {
    renderWithProviders(<YourScreen />, {
      preloadedState: {
        yourSlice: {
          data: mockData,
        },
      },
    });

    expect(screen.getByText('Expected Text')).toBeTruthy();
  });

  // 3. Interaction tests
  it('handles button press', () => {
    renderWithProviders(<YourScreen />);

    const button = screen.getByText('Click Me');
    fireEvent.press(button);

    // Assert expected behavior
  });

  // 4. Loading states
  it('shows loading indicator', () => {
    renderWithProviders(<YourScreen />, {
      preloadedState: {
        yourSlice: { loading: true },
      },
    });

    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
  });

  // 5. Empty states
  it('shows empty state message', () => {
    renderWithProviders(<YourScreen />, {
      preloadedState: {
        yourSlice: { items: [] },
      },
    });

    expect(screen.getByText('No items found')).toBeTruthy();
  });
});
```

## Common Patterns

### Testing Alert Dialogs
```typescript
it('shows confirmation dialog', () => {
  const mockAlert = jest.spyOn(Alert, 'alert');

  renderWithProviders(<YourScreen />);
  fireEvent.press(screen.getByText('Delete'));

  expect(mockAlert).toHaveBeenCalledWith(
    'Confirm',
    expect.any(String),
    expect.arrayContaining([
      expect.objectContaining({ text: 'Cancel' }),
      expect.objectContaining({ text: 'Confirm' }),
    ])
  );
});
```

### Testing Navigation
```typescript
// Navigation is mocked globally, override if needed
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({
    push: mockPush,
  }),
  useLocalSearchParams: () => ({ id: '123' }),
}));
```

### Testing Forms
```typescript
it('submits form with input values', async () => {
  const mockSubmit = jest.fn();

  renderWithProviders(<YourScreen />);

  fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
  fireEvent.press(screen.getByText('Submit'));

  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });
});
```

### Testing Async Operations
```typescript
import { waitFor } from '@/test-utils';

it('loads data asynchronously', async () => {
  renderWithProviders(<YourScreen />);

  // Initially shows loading
  expect(screen.getByTestId('loading')).toBeTruthy();

  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('Loaded Data')).toBeTruthy();
  });
});
```

## Available Fixtures

Import from `@/__fixtures__`:

```typescript
// Users
mockUserWithPhoto
mockUserWithoutPhoto
mockUserSingleName
mockUserEmailOnly
mockUserEmpty

// Restaurants
mockRestaurantPizza
mockRestaurantSushi
mockRestaurantBurger
mockRestaurants

// Bucket List
mockBucketListItemHigh
mockBucketListItemVisited
mockBucketListItems

// Categories
mockCategoryPizza
mockCategorySushi
mockCategories
```

## Checklist

When adding tests to a new screen:

- [ ] Create `__tests__/` directory
- [ ] Add snapshot test
- [ ] Test rendering with data
- [ ] Test loading state
- [ ] Test empty state
- [ ] Test user interactions
- [ ] Test error states
- [ ] Mock necessary contexts/dependencies
- [ ] Run tests: `npm test -- YourScreen`
- [ ] Update snapshots if needed: `npm test -- YourScreen -u`

## Running Tests

```bash
# Run specific screen
npm test -- ProfileScreen

# Run all screens
npm test -- components/screens

# Watch mode
npm test -- ProfileScreen --watch

# Update snapshots
npm test -- ProfileScreen -u

# See coverage
npm test -- ProfileScreen --coverage
```

## Need Help?

1. See example: [ProfileScreen/__tests__/ProfileScreen.test.tsx](ProfileScreen/__tests__/ProfileScreen.test.tsx)
2. Check full guide: [TESTING_SCREENS.md](TESTING_SCREENS.md)
3. Main testing docs: [../../TESTING.md](../../TESTING.md)
