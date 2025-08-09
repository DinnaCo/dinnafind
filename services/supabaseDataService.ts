import { supabase } from '@/utils/supabase';
import { type BucketListItem } from '@/models/bucket-list';
import { type UserProfile } from '@/models/app-state';

export interface SupabaseUserProfile {
  id: string;
  email: string;
  display_name?: string;
  photo_url?: string;
  created_at: string;
  last_login: string;
  preferences?: Record<string, any>;
  updated_at: string;
}

export interface SupabaseBucketListItem {
  id: string;
  user_id: string;
  venue_id: string;
  venue_data: any;
  notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  added_at: string;
  planned_visit_date?: string;
  visited_at?: string;
  user_rating?: number;
  review?: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export class SupabaseDataService {
  /**
   * Load user profile from Supabase
   */
  static async loadUserProfile(userId: string): Promise<UserProfile | null> {
    console.log('[SupabaseDataService] Loading user profile for user ID:', userId);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[SupabaseDataService] Error loading user profile:', error);
        return null;
      }

      if (!data) {
        console.log('[SupabaseDataService] No user profile found for user ID:', userId);
        return null;
      }

      const userProfile = {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        photoUrl: data.photo_url,
        createdAt: new Date(data.created_at).getTime(),
        lastLogin: new Date(data.last_login).getTime(),
        preferences: data.preferences || {},
      };

      console.log('[SupabaseDataService] User profile loaded successfully:', userProfile);
      return userProfile;
    } catch (error) {
      console.error('[SupabaseDataService] Failed to load user profile:', error);
      return null;
    }
  }

  /**
   * Load bucket list items from Supabase
   */
  static async loadBucketListItems(userId: string): Promise<BucketListItem[]> {
    console.log('[SupabaseDataService] Loading bucket list items for user ID:', userId);
    try {
      const { data, error } = await supabase
        .from('bucket_list_items')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('[SupabaseDataService] Error loading bucket list items:', error);
        return [];
      }

      if (!data) {
        console.log('[SupabaseDataService] No bucket list items found for user ID:', userId);
        return [];
      }

      const bucketListItems = data.map(
        (item: SupabaseBucketListItem): BucketListItem => ({
          id: item.id,
          venueId: item.venue_id,
          userId: item.user_id,
          venue: {
            id: item.venue_id,
            name: item.venue_data.name || '',
            categories: item.venue_data.categories || [],
            location: item.venue_data.location || {},
            geocodes: item.venue_data.geocodes || {},
            category: item.venue_data.category || '',
            iconUrl: item.venue_data.iconUrl || '',
            address: item.venue_data.address || '',
            coordinates: item.venue_data.coordinates || {},
            photo: item.venue_data.photo || '',
            heroImageUrl: item.venue_data.heroImageUrl || '',
            rating: item.venue_data.rating || 0,
          },
          notes: item.notes || '',
          tags: item.tags || [],
          priority: item.priority || 'medium',
          addedAt: new Date(item.added_at).getTime(),
          plannedVisitDate: item.planned_visit_date
            ? new Date(item.planned_visit_date).getTime()
            : undefined,
          visitedAt: item.visited_at ? new Date(item.visited_at).getTime() : undefined,
          userRating: item.user_rating || undefined,
          review: item.review || '',
          notificationsEnabled: item.notifications_enabled ?? true,
        })
      );

      console.log('[SupabaseDataService] Loaded', bucketListItems.length, 'bucket list items');
      return bucketListItems;
    } catch (error) {
      console.error('[SupabaseDataService] Failed to load bucket list items:', error);
      return [];
    }
  }

  /**
   * Load user preferences from Supabase
   */
  static async loadUserPreferences(userId: string): Promise<Record<string, any>> {
    console.log('[SupabaseDataService] Loading user preferences for user ID:', userId);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[SupabaseDataService] Error loading user preferences:', error);
        return {};
      }

      const preferences = data?.preferences || {};
      console.log('[SupabaseDataService] User preferences loaded:', preferences);
      return preferences;
    } catch (error) {
      console.error('[SupabaseDataService] Failed to load user preferences:', error);
      return {};
    }
  }

  /**
   * Create or update user profile
   */
  static async upsertUserProfile(profile: Partial<UserProfile>): Promise<boolean> {
    console.log('[SupabaseDataService] Starting upsert user profile for user ID:', profile.id);
    try {
      // Check if required fields are present
      if (!profile.id || !profile.email) {
        console.error(
          '[SupabaseDataService] Error upserting user profile: Missing required fields (id or email)'
        );
        return false;
      }

      const { error } = await supabase.from('user_profiles').upsert(
        {
          id: profile.id,
          email: profile.email,
          display_name: profile.displayName,
          photo_url: profile.photoUrl,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );

      if (error) {
        console.error('[SupabaseDataService] Error upserting user profile:', error);
        return false;
      }

      console.log('[SupabaseDataService] User profile upserted successfully');
      return true;
    } catch (error) {
      console.error('[SupabaseDataService] Failed to upsert user profile:', error);
      return false;
    }
  }

  /**
   * Migrate existing Redux persisted data to Supabase
   */
  static async migratePersistedData(
    userId: string,
    persistedState: {
      auth?: any;
      bucketList?: any;
      ui?: any;
    }
  ): Promise<boolean> {
    try {
      console.log('Starting migration of persisted data to Supabase...');

      // Migrate user profile
      if (persistedState.auth?.user) {
        await this.upsertUserProfile(persistedState.auth.user);
      }

      // Migrate bucket list items
      if (persistedState.bucketList?.items && Array.isArray(persistedState.bucketList.items)) {
        for (const item of persistedState.bucketList.items) {
          await supabase.from('bucket_list_items').upsert(
            {
              user_id: userId,
              venue_id: item.venueId || item.venue?.id,
              venue_data: item.venue || {},
              notes: item.notes || '',
              tags: item.tags || [],
              priority: item.priority || 'medium',
              added_at: new Date(item.addedAt).toISOString(),
              planned_visit_date: item.plannedVisitDate
                ? new Date(item.plannedVisitDate).toISOString()
                : null,
              visited_at: item.visitedAt ? new Date(item.visitedAt).toISOString() : null,
              user_rating: item.userRating || null,
              review: item.review || '',
              notifications_enabled: item.notificationsEnabled ?? true,
            },
            {
              onConflict: 'user_id,venue_id',
            }
          );
        }
      }

      // Migrate UI preferences
      if (persistedState.ui) {
        await supabase
          .from('user_profiles')
          .update({
            preferences: {
              theme: persistedState.ui.theme || 'light',
              hasCompletedOnboarding: persistedState.ui.hasCompletedOnboarding || false,
              networkStatus: persistedState.ui.networkStatus || 'online',
              masterNotificationsEnabled:
                persistedState.bucketList?.masterNotificationsEnabled ?? true,
              distanceMiles: persistedState.bucketList?.distanceMiles ?? 1.25,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }

      console.log('Migration completed successfully');
      return true;
    } catch (error) {
      console.error('Failed to migrate persisted data:', error);
      return false;
    }
  }
}
