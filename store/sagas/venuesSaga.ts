import { type PayloadAction } from '@reduxjs/toolkit';
import { call, put, select, takeLatest } from 'redux-saga/effects';

import { foursquareService } from '@/api/foursquare';
import { type Coordinates, type Venue, type VenueSearchResponse } from '@/models/venue';
import { type RootState } from '@/store';
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

    // Call API
    const response: VenueSearchResponse = yield call(
      foursquareService.searchNearbyVenues.bind(foursquareService),
      coordinates,
      undefined, // No query for nearby venues
      categories,
      radius
    );

    // Handle success
    yield put(fetchNearbyVenuesSuccess(response.results));
  } catch (error: any) {
    console.error('Failed to fetch nearby venues:', error);

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

    // Call API
    const response: VenueSearchResponse = yield call(
      foursquareService.getRecommendedVenues.bind(foursquareService),
      coordinates,
      limit
    );

    // Handle success
    yield put(fetchRecommendedVenuesSuccess(response.results));
  } catch (error: any) {
    console.error('Failed to fetch recommended venues:', error);
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

    // Call API
    const response: VenueSearchResponse = yield call(
      foursquareService.searchNearbyVenues.bind(foursquareService),
      coordinates,
      query,
      categories,
      radius
    );

    // Handle success
    yield put(searchVenuesSuccess(response.results));
  } catch (error: any) {
    console.error('Failed to search venues:', error);
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
      const venueDetails: Venue = yield call(
        foursquareService.getVenueDetails.bind(foursquareService),
        venueId
      );

      // Handle success
      yield put(setSelectedVenue(venueDetails));
    }
  } catch (error: any) {
    console.error('Failed to get venue details:', error);
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
