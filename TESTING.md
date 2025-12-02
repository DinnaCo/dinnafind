# Testing Guide

This document outlines the testing conventions and structure for the project.

## Directory Structure

```
dinnafind/
├── __mocks__/                   # Global module mocks (auto-loaded by Jest)
│   ├── expo-router.ts           # Mock expo-router
│   ├── @rneui/
│   │   └── themed.ts            # Mock React Native Elements
│   ├── @/
│   │   └── theme.ts             # Mock app theme
│   └── @sentry/
│       └── react-native.ts      # Mock Sentry
│
├── __fixtures__/                # Shared test data
│   ├── users.ts                 # User fixtures
│   ├── categories.ts            # Category fixtures
│   └── index.ts                 # Export all fixtures
│
├── test-utils/                  # Test utilities and helpers
│   ├── setup.ts                 # Jest setup (runs before all tests)
│   ├── render.tsx               # Custom render with providers
│   ├── mockStore.ts             # Mock Redux store utilities
│   ├── index.ts                 # Main export
│   └── README.md                # Detailed usage guide
│
└── components/
    └── common/
        ├── UserAvatar.tsx
        └── __tests__/           # Component tests (co-located)
            ├── UserAvatar.test.tsx
            └── __snapshots__/
```

## Key Conventions

### 1. Test Directory Naming
- Use `__tests__/` (double underscore, plural)
- Co-locate tests with the code they test
- Example: `components/common/__tests__/UserAvatar.test.tsx`

### 2. Global Mocks (`__mocks__/`)
Place frequently used mocks here. Jest automatically applies them to all tests.

**When to use:**
- External dependencies (expo-router, @rneui, Sentry)
- Modules that need consistent mocking across tests
- Complex modules that are expensive to import

**Example:**
```typescript
// __mocks__/expo-router.ts
export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
}));
```

### 3. Fixtures (`__fixtures__/`)
Centralized test data for consistency and reusability.

**When to use:**
- User objects, categories, restaurants, etc.
- Any data used in multiple tests
- Sample data for snapshots

**Example:**
```typescript
// __fixtures__/users.ts
export const mockUserWithPhoto = {
  displayName: 'John Doe',
  email: 'john@example.com',
  photoUrl: 'https://example.com/avatar.jpg',
};

// In tests
import { mockUserWithPhoto } from '@/__fixtures__';
```

### 4. Test Utils (`test-utils/`)
Custom render functions and testing helpers.

**renderWithProviders:**
Use this instead of `render` from Testing Library. It wraps components with Redux and Theme providers.

```typescript
import { renderWithProviders, screen } from '@/test-utils';

test('renders correctly', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Hello')).toBeTruthy();
});
```

**With custom Redux state:**
```typescript
renderWithProviders(<MyComponent />, {
  preloadedState: {
    auth: { user: mockUser },
  },
});
```

**For snapshot tests:**
```typescript
import { renderer } from '@/test-utils';

const tree = renderer.create(<MyComponent />).toJSON();
expect(tree).toMatchSnapshot();
```

## Writing Tests

### Component Tests

```typescript
import React from 'react';
import { renderWithProviders, screen } from '@/test-utils';
import { mockUserWithPhoto } from '@/__fixtures__';
import { UserAvatar } from '../UserAvatar';

describe('UserAvatar', () => {
  it('renders image when photo URL is provided', () => {
    renderWithProviders(<UserAvatar user={mockUserWithPhoto} />);

    const image = screen.getByTestId('user-avatar-image');
    expect(image).toBeTruthy();
  });
});
```

### Snapshot Tests

```typescript
import React from 'react';
import { renderer } from '@/test-utils';
import { mockCategoryPizza } from '@/__fixtures__';
import { CategoryCard } from '../CategoryCard';

describe('CategoryCard', () => {
  it('matches snapshot', () => {
    const tree = renderer.create(
      <CategoryCard category={mockCategoryPizza} onPress={() => {}} />
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
```

### Tests with Redux

```typescript
import { renderWithProviders } from '@/test-utils';
import { MyConnectedComponent } from '../MyConnectedComponent';

test('shows user name from Redux', () => {
  const { store } = renderWithProviders(<MyConnectedComponent />, {
    preloadedState: {
      auth: {
        user: { displayName: 'John Doe' },
        isAuthenticated: true,
      },
    },
  });

  expect(screen.getByText('John Doe')).toBeTruthy();
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests without coverage
npm test -- --no-coverage

# Run tests in watch mode
npm test -- --watch

# Update snapshots
npm test -- -u

# Run specific test file
npm test -- UserAvatar.test.tsx
```

## Benefits of This Structure

### DRY (Don't Repeat Yourself)
- Mocks defined once, used everywhere
- Fixtures prevent duplicate test data
- Custom render eliminates repetitive provider setup

### Maintainable
- Change a mock in one place, affects all tests
- Update fixture data centrally
- Clear separation of concerns

### Discoverable
- Consistent naming conventions
- Predictable file locations
- Well-documented patterns

### Fast
- Auto-loaded global mocks reduce setup time
- Minimal boilerplate in test files
- Efficient test execution

## Best Practices

1. **Always use `renderWithProviders`** for component tests (unless testing pure components)
2. **Use fixtures** from `__fixtures__/` instead of creating inline test data
3. **Import from `@/test-utils`** for all testing utilities
4. **Don't create inline mocks** for things already mocked globally
5. **Co-locate tests** with the code they test using `__tests__/` directories
6. **Keep tests focused** - one concept per test
7. **Use descriptive test names** that explain what's being tested
8. **Update snapshots carefully** - review changes before committing

## Common Patterns

### Testing Conditional Rendering
```typescript
const tree = render(<Component showContent={false} />);
expect(screen.queryByTestId('content')).toBeNull();
```

### Testing User Interactions
```typescript
import { fireEvent } from '@/test-utils';

const onPress = jest.fn();
renderWithProviders(<Button onPress={onPress} />);
fireEvent.press(screen.getByText('Click Me'));
expect(onPress).toHaveBeenCalled();
```

### Testing Async Operations
```typescript
import { waitFor } from '@/test-utils';

test('loads data', async () => {
  renderWithProviders(<AsyncComponent />);

  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeTruthy();
  });
});
```

## Troubleshooting

### Module Not Found
Ensure `moduleNameMapper` in [package.json](package.json:153-155) includes the path alias:
```json
"moduleNameMapper": {
  "^@/(.*)$": "<rootDir>/$1"
}
```

### Mock Not Working
Global mocks must be in `__mocks__/` at project root and match the module structure.

### Transform Errors
Add problematic packages to `transformIgnorePatterns` in [package.json](package.json:156-158).

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [jest-expo Preset](https://docs.expo.dev/develop/unit-testing/)
- [Test Utils README](test-utils/README.md)
