# DetailScreen Testing Documentation

## Test Coverage

The DetailScreen component has comprehensive test coverage with **18 test cases** covering various scenarios.

### Test Categories

#### 1. Rendering Tests (4 tests)
- ✅ Loading state when fetching basic data
- ✅ Error state when no venue data is available
- ✅ Venue details with data from URL params
- ✅ Venue details with itemData param

#### 2. Venue Information Display (3 tests)
- ✅ Displays venue name correctly (appears in header and details)
- ✅ Displays venue category correctly
- ✅ Displays venue address correctly

#### 3. Visited Badge (1 test)
- ✅ Does not show visited badge for unsaved venues

#### 4. Hero Image (2 tests)
- ✅ Uses category icon as fallback when no photos available
- ✅ Constructs correct icon URL from params

#### 5. Map Display (2 tests)
- ✅ Renders map when coordinates are available
- ✅ Does not render map when coordinates are missing

#### 6. Error Handling (4 tests)
- ✅ Handles invalid JSON in data param gracefully
- ✅ Handles missing venue name gracefully (falls back to 'Restaurant')
- ✅ Handles missing category gracefully (falls back to 'Restaurant')
- ✅ Handles missing address gracefully (shows 'Address not available')

#### 7. Platform-specific Behavior (2 tests)
- ✅ Renders correctly on iOS
- ✅ Renders correctly on Android

## Running the Tests

```bash
# Run DetailScreen tests only
bun run test DetailScreen

# Run all tests
bun run test

# Run tests with coverage
bun run test --coverage
```

## Test Implementation Details

### Mocks Used
- **expo-router**: Mocked for navigation and route params
- **react-native-maps**: Mocked to avoid native module dependencies
- **API Services**: Mocked unifiedSearch and venueDetailsService
- **BranchService**: Mocked for deep linking functionality
- **React Native APIs**: Alert, Linking, Share

### Test Utilities
- Uses `renderWithProviders` from test-utils for Redux integration
- Uses `react-test-renderer` for snapshot testing
- Snapshots created for visual regression testing

## Key Testing Insights

1. **Dual Rendering**: The component displays the venue name in both the header and details section, so tests use `getAllByText` instead of `getByText`.

2. **Fallback Values**: The component has robust fallback handling:
   - Missing name → "Restaurant"
   - Missing category → "Restaurant"
   - Missing address → "Address not available"

3. **Multiple Data Sources**: The component can receive venue data from:
   - URL params (`data` parameter)
   - itemData parameter
   - venueId (triggers fetch)

4. **Hero Image Priority**: Image URL resolution follows this priority:
   1. Saved venue icon
   2. Category icon from venue data
   3. URL params (iconPrefix + iconSuffix)
   4. Venue details icon
   5. Default icon

## Snapshots

The test suite generates 11 snapshots covering various rendering scenarios. These snapshots ensure that visual changes to the component are intentional and reviewed.

## Future Test Improvements

Potential areas for additional testing:
- [ ] Test actual button interactions (save, share, directions)
- [ ] Test auto-save functionality when autoSave param is true
- [ ] Test integration with Redux store for saved venues
- [ ] Test image loading states and error handling
- [ ] Test async data fetching for venue details
- [ ] E2E tests for navigation flows

## Coverage

The DetailScreen test suite contributes to the overall test coverage of the application. Run `bun run test --coverage` to see detailed coverage metrics.
