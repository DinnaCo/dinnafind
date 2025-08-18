import { type PayloadAction } from '@reduxjs/toolkit';
import { call, put, select, takeLatest } from 'redux-saga/effects';

import { unifiedSearchService } from '@/api/unifiedSearch';
import { type Coordinates, type Venue, type VenueSearchResponse } from '@/models/venue';
import { type RootState } from '@/store';
import { logger } from '@/utils/logger';
import {
  fetchNearbyVenues,
  fetchNearbyVenuesFailure,
  fetchNearbyVenuesSuccess,
  fetchRecommendedVenues,
  fetchRecommendedVenuesFailure,
  fetchRecommendedVenuesSuccess,
  searchVenues,
  searchVenuesFailure,
  searchVenuesSuccess,
  selectVenue,
  setSelectedVenue,
} from '@/store/slices/venuesSlice';

// Handle fetch nearby venues
function* handleFetchNearbyVenues(
  action: PayloadAction<{
    coordinates: Coordinates;
    radius?: number;
    categories?: string[];
  }>
) {
  try {
    const { coordinates, radius = 4828, categories } = action.payload;

    // Call Unified Search API (Google Places)
    const response: VenueSearchResponse = yield call(
      unifiedSearchService.searchNearbyVenues.bind(unifiedSearchService),
      coordinates,
      undefined, // No query for nearby venues
      categories,
      radius
    );

    // Handle success
    yield put(fetchNearbyVenuesSuccess(response.results));
  } catch (error: any) {
    logger.error('Failed to fetch nearby venues:', error);

    yield put(fetchNearbyVenuesFailure(error.message || 'Failed to fetch nearby venues'));
  }
}

// Handle fetch recommended venues
export function* handleFetchRecommendedVenues(
  action: PayloadAction<{
    coordinates: Coordinates;
    limit?: number;
  }>
) {
  try {
    const { coordinates, limit = 10 } = action.payload;

    // Call Unified Search API (Google Places)
    const response: VenueSearchResponse = yield call(
      unifiedSearchService.getRecommendedVenues.bind(unifiedSearchService),
      coordinates,
      limit
    );

    // Handle success
    yield put(fetchRecommendedVenuesSuccess(response.results));
  } catch (error: any) {
    logger.error('Failed to fetch recommended venues:', error);
    yield put(fetchRecommendedVenuesFailure(error.message || 'Failed to fetch recommended venues'));
  }
}

// Handle search venues
function* handleSearchVenues(
  action: PayloadAction<{
    coordinates: Coordinates;
    query: string;
    categories?: string[];
    radius?: number;
  }>
) {
  try {
    const { coordinates, query, categories, radius = 4828 } = action.payload;

    // Call Unified Search API (Google Places)
    const response: VenueSearchResponse = yield call(
      unifiedSearchService.searchNearbyVenues.bind(unifiedSearchService),
      coordinates,
      query,
      categories,
      radius
    );

    // Handle success
    yield put(searchVenuesSuccess(response.results));
  } catch (error: any) {
    logger.error('Failed to search venues:', error);
    yield put(searchVenuesFailure(error.message || 'Failed to search venues'));
  }
}

// Handle select venue (fetching details if needed)
function* handleSelectVenue(action: PayloadAction<string>) {
  try {
    const venueId = action.payload;

    // Check if venue is already in state
    const state: RootState = yield select();
    let venue: Venue | undefined;

    // Look for venue in all lists
    venue = state.venues.nearby.venues.find(v => v.id === venueId || v.fsq_id === venueId);
    if (!venue) {
      venue = state.venues.recommended.venues.find(v => v.id === venueId || v.fsq_id === venueId);
    }

    venue ??= state.venues.search.venues.find(v => v.id === venueId || v.fsq_id === venueId);

    if (venue) {
      // If venue is already in state, use it
      yield put(setSelectedVenue(venue));
    } else {
      // Otherwise fetch from API
      const venueDetails: Venue | null = yield call(
        unifiedSearchService.getVenueDetails.bind(unifiedSearchService),
        venueId
      );

      if (venueDetails) {
        // Handle success
        yield put(setSelectedVenue(venueDetails));
      } else {
        throw new Error('Venue not found');
      }
    }
  } catch (error: any) {
    logger.error('Failed to get venue details:', error);
    // Use fetchNearbyVenuesFailure for error handling
    yield put(fetchNearbyVenuesFailure(`Failed to get venue details: ${error.message}`));
  }
}

// Watch for venue actions
export function* watchVenues() {
  yield takeLatest(fetchNearbyVenues.type, handleFetchNearbyVenues);
  yield takeLatest(fetchRecommendedVenues.type, handleFetchRecommendedVenues);
  yield takeLatest(searchVenues.type, handleSearchVenues);
  yield takeLatest(selectVenue.type, handleSelectVenue);
}
