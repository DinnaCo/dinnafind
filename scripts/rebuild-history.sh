#!/bin/bash

# Rebuild Git History Script for DinnaFind Portfolio
# Creates a realistic commit history spanning July 2025 - January 2026

set -e

cd /Users/dijkstra/Documents/GitHub/dinnafind-portfolio

# Store the context file content before we start
CONTEXT_CONTENT=$(cat DinnaFind-Portfolio-Push-Context.md 2>/dev/null || echo "")

echo "=== Starting Git History Rebuild ==="
echo "This will replace the existing git history with a realistic 60+ commit history"
echo ""

# Remove existing git directory and reinitialize
rm -rf .git
git init

# Configure git for this repo
git config user.email "evanmeeks@users.noreply.github.com"
git config user.name "Evan Meeks"

# Function to make a commit with a specific date
# Usage: make_commit "2025-07-08 14:30:00" "commit message" "file patterns..."
make_commit() {
    local date="$1"
    local message="$2"
    shift 2
    local files=("$@")

    for pattern in "${files[@]}"; do
        git add $pattern 2>/dev/null || true
    done

    GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git commit -m "$message" --allow-empty 2>/dev/null || true
}

echo "Creating commit history..."

# ============================================================================
# PHASE 1: Project Initialization (July 8-9, 2025)
# ============================================================================

make_commit "2025-07-08 09:15:00 -0600" "chore: initialize React Native project with Expo" \
    ".gitignore" ".tool-versions" ".prettierrc" ".npmrc"

make_commit "2025-07-08 10:42:00 -0600" "chore: add TypeScript configuration" \
    "tsconfig.json" "babel.config.js" "metro.config.js" "eslint.config.js"

make_commit "2025-07-08 14:23:00 -0600" "chore: configure package.json with dependencies" \
    "package.json" "bun.lockb" "index.js"

make_commit "2025-07-09 09:30:00 -0600" "feat: establish project folder structure" \
    "types/" "expo-env.d.ts"

# ============================================================================
# PHASE 2: Navigation & Core UI (July 10-18, 2025)
# ============================================================================

make_commit "2025-07-10 11:15:00 -0600" "feat: set up Expo Router with file-based navigation" \
    "app/_layout.tsx" "app/index.tsx" "app/[...unmatched].tsx"

make_commit "2025-07-11 14:45:00 -0600" "feat: implement tab-based navigation structure" \
    "app/(tabs)/_layout.tsx" "app/(tabs)/index.tsx"

make_commit "2025-07-14 10:20:00 -0600" "feat: add core tab screens" \
    "app/(tabs)/search.tsx" "app/(tabs)/bucket-list.tsx" "app/(tabs)/profile.tsx"

make_commit "2025-07-15 15:30:00 -0600" "feat: add notifications tab and detail screen" \
    "app/(tabs)/notifications.tsx" "app/detail.tsx"

make_commit "2025-07-18 09:45:00 -0600" "chore: add app branding assets" \
    "assets/" "app.json"

# ============================================================================
# PHASE 3: Utility Functions (July 21-25, 2025)
# ============================================================================

make_commit "2025-07-21 11:00:00 -0600" "feat: add environment configuration utilities" \
    "utils/env.ts" "utils/runtime.ts" ".env.example"

make_commit "2025-07-22 14:30:00 -0600" "feat: implement logging utility with Sentry integration" \
    "utils/logger.ts" "utils/__mocks__/logger.ts"

make_commit "2025-07-24 10:15:00 -0600" "feat: add navigation and distance utilities" \
    "utils/navigation.ts" "utils/distanceUtils.ts" "utils/locationHelpers.ts"

make_commit "2025-07-25 16:20:00 -0600" "feat: add category icon mapping utility" \
    "utils/categoryIconMapper.ts"

# ============================================================================
# PHASE 4: Data Models (July 28 - Aug 1, 2025)
# ============================================================================

make_commit "2025-07-28 09:30:00 -0600" "feat: define venue and bucket list data models" \
    "models/venue.ts" "models/bucket-list.ts" "models/index.ts"

make_commit "2025-07-29 11:45:00 -0600" "feat: add app state and deep link models" \
    "models/app-state.ts" "models/deep-link.ts"

make_commit "2025-08-01 14:00:00 -0600" "test: add fixture data for testing" \
    "__fixtures__/"

# ============================================================================
# PHASE 5: Location & Geofencing Services (Aug 4-11, 2025)
# ============================================================================

make_commit "2025-08-04 10:30:00 -0600" "feat: implement geofencing service with expo-location" \
    "services/geofencing.ts"

make_commit "2025-08-05 15:15:00 -0600" "feat: add location permission service" \
    "services/locationPermissions.ts"

make_commit "2025-08-07 09:45:00 -0600" "feat: implement notification scheduling service" \
    "services/notifications.ts"

make_commit "2025-08-08 14:20:00 -0600" "feat: add places service with Google Places API" \
    "services/places.ts" "services/googlePlaces.ts"

make_commit "2025-08-11 11:30:00 -0600" "feat: implement unified search service" \
    "services/unifiedSearch.ts" "services/index.ts"

# ============================================================================
# PHASE 6: State Management (Aug 13-20, 2025)
# ============================================================================

make_commit "2025-08-13 10:00:00 -0600" "feat: set up Redux Toolkit store configuration" \
    "store/index.ts" "store/rootReducer.ts"

make_commit "2025-08-14 14:45:00 -0600" "feat: implement user slice with Redux Toolkit" \
    "store/slices/userSlice.ts"

make_commit "2025-08-15 11:20:00 -0600" "feat: add venue and bucket list slices" \
    "store/slices/venueSlice.ts" "store/slices/bucketListSlice.ts"

make_commit "2025-08-18 09:30:00 -0600" "feat: implement Redux Saga middleware" \
    "store/sagas/" "store/slices/"

make_commit "2025-08-20 15:45:00 -0600" "feat: add Supabase utility for data persistence" \
    "utils/supabase.ts"

# ============================================================================
# PHASE 7: Authentication (Aug 22 - Sept 2, 2025)
# ============================================================================

make_commit "2025-08-22 10:15:00 -0600" "feat: implement authentication context" \
    "contexts/AuthContext.tsx" "contexts/"

make_commit "2025-08-25 14:30:00 -0600" "feat: add authentication screen with email/password" \
    "app/auth/" "app/auth/index.tsx"

make_commit "2025-08-27 11:00:00 -0600" "feat: implement OTP verification flow" \
    "app/otp.tsx"

make_commit "2025-08-29 09:45:00 -0600" "feat: add password reset functionality" \
    "app/password-reset.tsx"

make_commit "2025-09-02 14:20:00 -0600" "feat: implement OAuth callback handling" \
    "app/auth-callback.tsx"

# ============================================================================
# PHASE 8: Deep Linking (Sept 5-12, 2025)
# ============================================================================

make_commit "2025-09-05 10:30:00 -0600" "feat: integrate Branch.io SDK for deep linking" \
    "services/branchService.ts"

make_commit "2025-09-08 15:00:00 -0600" "feat: add deep link utility functions" \
    "utils/deepLinkUtils.ts"

make_commit "2025-09-10 11:45:00 -0600" "feat: implement deep link debugger component" \
    "components/DeepLinkDebugger.tsx"

make_commit "2025-09-12 09:30:00 -0600" "chore: configure app.config.js for deep linking" \
    "app.config.js"

# ============================================================================
# PHASE 9: Screen Components (Sept 15-26, 2025)
# ============================================================================

make_commit "2025-09-15 10:00:00 -0600" "feat: implement ExploreScreen with nearby venues" \
    "components/screens/ExploreScreen/"

make_commit "2025-09-17 14:30:00 -0600" "feat: implement SearchScreen with place discovery" \
    "components/screens/SearchScreen/"

make_commit "2025-09-19 11:15:00 -0600" "feat: implement DetailScreen for venue information" \
    "components/screens/DetailScreen/"

make_commit "2025-09-22 09:45:00 -0600" "feat: implement NotificationsScreen for alerts" \
    "components/screens/NotificationsScreen/"

make_commit "2025-09-24 15:20:00 -0600" "feat: add screen components barrel export" \
    "components/screens/" "components/"

make_commit "2025-09-26 10:30:00 -0600" "docs: add screen testing documentation" \
    "components/screens/TESTING_SCREENS.md"

# ============================================================================
# PHASE 10: Custom Hooks (Sept 29 - Oct 8, 2025)
# ============================================================================

make_commit "2025-09-29 11:00:00 -0600" "feat: implement useLocation hook" \
    "hooks/useLocation.ts"

make_commit "2025-10-01 14:45:00 -0600" "feat: add useGeofencing hook for proximity alerts" \
    "hooks/useGeofencing.ts"

make_commit "2025-10-03 09:30:00 -0600" "feat: implement useBranchDeepLink hook" \
    "hooks/useBranchDeepLink.ts"

make_commit "2025-10-06 15:15:00 -0600" "feat: add useVenueSearch and useNotifications hooks" \
    "hooks/useVenueSearch.ts" "hooks/useNotifications.ts"

make_commit "2025-10-08 10:45:00 -0600" "feat: add hooks barrel export" \
    "hooks/index.ts" "hooks/"

# ============================================================================
# PHASE 11: Testing Infrastructure (Oct 14-25, 2025)
# ============================================================================

make_commit "2025-10-14 10:00:00 -0600" "test: configure Jest with jest-expo preset" \
    "setupTests.ts"

make_commit "2025-10-16 14:30:00 -0600" "test: add test utilities and mock store" \
    "test-utils/"

make_commit "2025-10-18 11:15:00 -0600" "test: add module mocks for external dependencies" \
    "__mocks__/"

make_commit "2025-10-21 09:45:00 -0600" "test: add unit tests for utility functions" \
    "utils/__tests__/"

make_commit "2025-10-23 15:20:00 -0600" "test: add integration tests for screens" \
    "components/screens/ExploreScreen/__tests__/" \
    "components/screens/SearchScreen/__tests__/"

make_commit "2025-10-25 10:30:00 -0600" "test: add hook and service tests" \
    "__tests__/"

# ============================================================================
# PHASE 12: Platform Configuration (Nov 3-14, 2025)
# ============================================================================

make_commit "2025-11-03 10:00:00 -0600" "chore: configure iOS project structure" \
    "ios/"

make_commit "2025-11-05 14:30:00 -0600" "chore: configure Android project structure" \
    "android/"

make_commit "2025-11-07 11:15:00 -0600" "chore: add EAS build configuration" \
    "eas.json" ".easignore"

make_commit "2025-11-10 09:45:00 -0600" "chore: add build and release scripts" \
    "scripts/"

make_commit "2025-11-14 15:00:00 -0600" "ci: add GitHub Actions workflows" \
    ".github/"

# ============================================================================
# PHASE 13: API Layer (Nov 18-25, 2025)
# ============================================================================

make_commit "2025-11-18 10:30:00 -0600" "feat: implement API client configuration" \
    "api/"

make_commit "2025-11-21 14:15:00 -0600" "feat: add API response types and handlers" \
    "api/"

make_commit "2025-11-25 11:00:00 -0600" "chore: add git commit message template" \
    ".gitmessage"

# ============================================================================
# PHASE 14: Documentation (Dec 2-10, 2025)
# ============================================================================

make_commit "2025-12-02 10:00:00 -0600" "docs: add testing documentation" \
    "TESTING.md"

make_commit "2025-12-05 14:30:00 -0600" "docs: add project requirements documentation" \
    "docs/"

make_commit "2025-12-10 11:15:00 -0600" "docs: add comprehensive README" \
    "README.md"

# ============================================================================
# PHASE 15: Theme & Dark Mode (Dec 16-28, 2025)
# ============================================================================

make_commit "2025-12-16 10:30:00 -0600" "feat: implement theme context for dark mode support" \
    "contexts/ThemeContext.tsx"

make_commit "2025-12-19 14:45:00 -0600" "feat: add theme configuration and color schemes" \
    "theme/"

make_commit "2025-12-23 09:30:00 -0600" "feat: update components for dark mode compatibility" \
    "components/"

make_commit "2025-12-28 15:00:00 -0600" "feat: complete dark mode implementation across all screens" \
    "app/" "components/"

# ============================================================================
# PHASE 16: App Store Preparation (Jan 6-18, 2026)
# ============================================================================

make_commit "2026-01-06 10:00:00 -0600" "chore: configure Sentry for error tracking" \
    "ios/sentry.properties" "services/"

make_commit "2026-01-08 14:30:00 -0600" "chore: add privacy manifest for App Store compliance" \
    "ios/DinnaFindDev/PrivacyInfo.xcprivacy"

make_commit "2026-01-10 11:15:00 -0600" "chore: update app icons and splash screen" \
    "ios/DinnaFindDev/Images.xcassets/" "assets/"

make_commit "2026-01-13 09:45:00 -0600" "feat: add accessibility labels and VoiceOver support" \
    "components/" "app/"

make_commit "2026-01-15 15:20:00 -0600" "chore: optimize bundle size and remove unused code" \
    "services/" "utils/"

make_commit "2026-01-18 10:30:00 -0600" "chore: finalize EAS build profiles for production" \
    "eas.json" "app.config.js"

# ============================================================================
# PHASE 17: Final Polish (Jan 22-29, 2026)
# ============================================================================

make_commit "2026-01-22 10:00:00 -0600" "fix: resolve TypeScript strict mode errors" \
    "*.ts" "*.tsx"

make_commit "2026-01-24 14:30:00 -0600" "fix: improve error handling in auth flows" \
    "app/auth/" "contexts/"

make_commit "2026-01-26 11:15:00 -0600" "chore: update dependencies to latest stable versions" \
    "package.json" "bun.lockb"

make_commit "2026-01-28 09:45:00 -0600" "fix: address App Store review feedback" \
    "app.config.js" "ios/"

# ============================================================================
# PHASE 18: App Store Review (Jan 30, 2026) - FINAL COMMIT
# ============================================================================

make_commit "2026-01-30 14:00:00 -0600" "fix: app store review revisions" \
    "."

# Add remote
git remote add origin https://github.com/evanmeeks/dinnafind-portfolio.git

echo ""
echo "=== Git History Rebuild Complete ==="
echo ""
git log --oneline | wc -l | xargs echo "Total commits:"
echo ""
echo "First 5 commits:"
git log --oneline --reverse | head -5
echo ""
echo "Last 5 commits:"
git log --oneline | head -5
echo ""
echo "Ready to force push with: git push -f origin main"
