import { Middleware } from '@reduxjs/toolkit';
import { supabase } from '@/utils/supabase';
import { RootState } from '@/store';

interface SupabaseMiddlewareConfig {
  syncAuth?: boolean;
  syncBucketList?: boolean;
  syncUI?: boolean;
}

export const createSupabaseMiddleware = (config: SupabaseMiddlewareConfig = {}): Middleware => {
  const { syncAuth = true, syncBucketList = true, syncUI = true } = config;

  return store => next => action => {
    // Execute the action first
    const result = next(action);
    const state = store.getState() as RootState;

    // Only sync if user is authenticated
    const userId = state.auth.user?.id;
    if (!userId) {
      return result;
    }

    // Handle different action types
    const actionType = (action as any).type;

    // Sync auth state changes
    if (syncAuth && actionType.startsWith('auth/')) {
      handleAuthSync(action as any, state, userId);
    }

    // Sync bucket list changes
    if (syncBucketList && actionType.startsWith('bucketList/')) {
      handleBucketListSync(action as any, state, userId);
    }

    // Sync UI preferences
    if (syncUI && actionType.startsWith('ui/')) {
      handleUISync(action as any, state, userId);
    }

    return result;
  };
};

// Handle auth state synchronization
async function handleAuthSync(action: any, state: RootState, userId: string) {
  try {
    const { auth } = state;

    if (action.type === 'auth/loginSuccess' || action.type === 'auth/logoutSuccess') {
      await supabase.from('user_profiles').upsert(
        {
          id: userId,
          email: auth.user?.email || '',
          display_name: auth.user?.displayName || '',
          photo_url: auth.user?.photoUrl || '',
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );
    }
  } catch (error) {
    console.error('Failed to sync auth state to Supabase:', error);
  }
}

// Handle bucket list synchronization
async function handleBucketListSync(action: any, state: RootState, userId: string) {
  try {
    const { bucketList } = state;

    switch (action.type) {
      case 'bucketList/add/fulfilled':
        // Add new bucket list item
        await supabase.from('bucket_list_items').insert({
          user_id: userId,
          venue_id: action.payload.venueId || action.payload.venue.id,
          venue_data: action.payload.venue,
          notes: action.payload.notes || '',
          tags: action.payload.tags || [],
          priority: action.payload.priority || 'medium',
          added_at: new Date(action.payload.addedAt).toISOString(),
          notifications_enabled: action.payload.notificationsEnabled ?? true,
        });
        break;

      case 'bucketList/update/fulfilled':
        // Update existing bucket list item
        const updatedItem = action.payload;
        await supabase
          .from('bucket_list_items')
          .update({
            notes: updatedItem.notes || '',
            tags: updatedItem.tags || [],
            priority: updatedItem.priority || 'medium',
            planned_visit_date: updatedItem.plannedVisitDate
              ? new Date(updatedItem.plannedVisitDate).toISOString()
              : null,
            notifications_enabled: updatedItem.notificationsEnabled ?? true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('venue_id', updatedItem.venueId || updatedItem.venue.id);
        break;

      case 'bucketList/remove/fulfilled':
        // Remove bucket list item
        await supabase
          .from('bucket_list_items')
          .delete()
          .eq('user_id', userId)
          .eq('venue_id', action.payload);
        break;

      case 'bucketList/markAsVisited/fulfilled':
        // Mark item as visited
        const visitedItem = action.payload;
        await supabase
          .from('bucket_list_items')
          .update({
            visited_at: new Date(visitedItem.visitedAt).toISOString(),
            user_rating: visitedItem.userRating || null,
            review: visitedItem.review || '',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('venue_id', visitedItem.venueId || visitedItem.venue.id);
        break;

      case 'bucketList/setMasterNotificationsEnabled':
        // Update master notifications setting in user preferences
        await supabase
          .from('user_profiles')
          .update({
            preferences: {
              masterNotificationsEnabled: action.payload,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        break;

      case 'bucketList/setDistanceMiles':
        // Update distance setting in user preferences
        await supabase
          .from('user_profiles')
          .update({
            preferences: {
              distanceMiles: action.payload,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        break;
    }
  } catch (error) {
    console.error('Failed to sync bucket list to Supabase:', error);
  }
}

// Handle UI preferences synchronization
async function handleUISync(action: any, state: RootState, userId: string) {
  try {
    const { ui } = state;

    if (action.type.startsWith('ui/')) {
      await supabase
        .from('user_profiles')
        .update({
          preferences: {
            theme: ui.theme,
            hasCompletedOnboarding: ui.hasCompletedOnboarding,
            networkStatus: ui.networkStatus,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }
  } catch (error) {
    console.error('Failed to sync UI preferences to Supabase:', error);
  }
}

// Export the default middleware configuration
export const supabaseMiddleware = createSupabaseMiddleware();
