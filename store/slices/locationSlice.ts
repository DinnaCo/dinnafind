import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as Location from 'expo-location';

interface LocationState {
  current: Location.LocationObject | null;
  status: 'idle' | 'watching' | 'error';
  error?: string;
}

const initialState: LocationState = {
  current: null,
  status: 'idle',
  error: undefined,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    startLocationWatch(state) {
      state.status = 'watching';
      state.error = undefined;
    },
    stopLocationWatch(state) {
      state.status = 'idle';
    },
    locationUpdated(state, action: PayloadAction<Location.LocationObject>) {
      state.current = action.payload;
      state.status = 'watching';
    },
    locationError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
  },
});

export const { startLocationWatch, stopLocationWatch, locationUpdated, locationError } =
  locationSlice.actions;

export default locationSlice.reducer;
