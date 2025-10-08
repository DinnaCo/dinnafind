/**
 * Typed Redux hooks for the application
 *
 * Re-exports the typed hooks from the store for convenience.
 * For the store and persistor, import from '@/store' directly.
 */

// Re-export typed hooks and types from store
export { useAppDispatch, useAppSelector } from '@/store';
export type { RootState, AppDispatch } from '@/store';
