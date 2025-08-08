# Deep Link Migration Guide

## What Changed

The previous deep link implementation had multiple issues:
1. Multiple hooks (`useDeferredDeepLink`, `useSimpleDeferredLink`, `useTestFlightDeferredLink`) all trying to handle the same deep links
2. `Linking.getInitialURL()` being called on every re-render, causing duplicate processing
3. Complex AsyncStorage management with multiple keys that weren't being cleared properly
4. Race conditions between different handlers

## New Simple Solution

The new implementation uses a single `useDeepLinkOnce` hook that:
- Processes each URL exactly once using an in-memory Set
- Has a single storage key for pending deep links (when user not authenticated)
- Properly handles the initial URL only once per app session
- Prevents duplicate processing with simple, clean logic

## Migration Steps

1. **Update your `_layout.tsx`:**
   ```tsx
   // Old imports
   - import { useDeferredDeepLink, parseDeepLink, clearAllDeepLinkStorage } from '@/hooks/useDeferredDeepLink';
   - import { useSimpleDeferredLink } from '@/hooks/useSimpleDeferredLink';
   
   // New import
   + import { useDeepLinkOnce, parseDeepLink, storePendingDeepLink } from '@/hooks/useDeepLinkOnce';
   ```

2. **Simplify the deep link handling:**
   ```tsx
   // Remove all the complex ref tracking and multiple hook calls
   // Just use the single hook:
   useDeepLinkOnce(handleDeepLink, isAuthenticated);
   ```

3. **Update the handleDeepLink function:**
   - Remove all the `processingDeepLinkRef` logic
   - Remove all the `clearAllDeepLinkStorage()` calls
   - Keep just the navigation logic

4. **Clean up AsyncStorage:**
   Run this once to clear old storage keys:
   ```javascript
   AsyncStorage.multiRemove([
     'dinnafind_deferred_deeplink',
     'dinnafind_simple_deferred_link',
     'dinnafind_initial_url_processed'
   ]);
   ```

## Key Differences

### Old Approach:
- Multiple hooks and storage keys
- Complex duplicate prevention with refs and timeouts
- Persistent storage of processed URLs
- Race conditions between handlers

### New Approach:
- Single hook, single storage key
- Simple in-memory Set for tracking
- Process once per app session
- No race conditions

## Testing

1. Test app launch with deep link
2. Test receiving deep link while app is open
3. Test deep link when not authenticated (should store and process after auth)
4. Test app refresh - should NOT reprocess the same link

## Files Changed

- Created: `hooks/useDeepLinkOnce.ts`
- Backed up: `hooks/useDeferredDeepLink.ts` → `hooks/useDeferredDeepLink.ts.backup`
- Backed up: `hooks/useSimpleDeferredLink.ts` → `hooks/useSimpleDeferredLink.ts.backup`
- To update: `app/_layout.tsx`

## Clean Up Commands

After testing and confirming everything works:

```bash
# Remove backup files
rm hooks/useDeferredDeepLink.ts.backup
rm hooks/useSimpleDeferredLink.ts.backup

# Remove unused TestFlight hook if exists
rm hooks/useTestFlightDeferredLink.ts

# Remove debug components if not needed
rm components/DeepLinkDebugger.tsx
rm components/DeepLinkDebugPanel.tsx
```