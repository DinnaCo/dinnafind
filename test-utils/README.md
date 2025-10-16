# Test Utilities

This directory contains shared testing utilities, helpers, and configuration for the project.

## Structure

```
test-utils/
├── setup.ts           # Jest setup file (runs before all tests)
├── render.tsx         # Custom render function with providers
├── mockStore.ts       # Mock Redux store utilities
└── index.ts          # Main export file
```

## Usage

### Rendering Components

Use `renderWithProviders` instead of the standard `render` from Testing Library. This automatically wraps your component with Redux Provider and Theme Provider.

```typescript
import { renderWithProviders, screen } from '@/test-utils';
import { MyComponent } from './MyComponent';

test('renders correctly', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Hello')).toBeTruthy();
});
```

### With Custom Redux State

```typescript
import { renderWithProviders } from '@/test-utils';

renderWithProviders(<MyComponent />, {
  preloadedState: {
    auth: {
      user: mockUser,
      isAuthenticated: true,
    },
  },
});
```

### For Snapshot Tests

```typescript
import { renderer } from '@/test-utils';

test('matches snapshot', () => {
  const tree = renderer.create(<MyComponent />).toJSON();
  expect(tree).toMatchSnapshot();
});
```

### Creating Custom Stores

```typescript
import { createMockStore } from '@/test-utils';

const store = createMockStore({
  auth: { user: mockUser },
});
```

## Global Mocks

Global mocks in `__mocks__/` are automatically applied to all tests:
- `expo-router` - Router hooks and navigation
- `@rneui/themed` - React Native Elements components
- `@/theme` - App theme configuration

## Fixtures

Shared test data is available in `__fixtures__/`:

```typescript
import { mockUserWithPhoto, mockCategoryPizza } from '@/__fixtures__';
```

## Best Practices

1. Always use `renderWithProviders` for components that need Redux or Theme
2. Use fixtures from `__fixtures__/` instead of creating inline test data
3. Import from `@/test-utils` for all testing utilities
4. Don't create inline mocks for things already mocked globally
