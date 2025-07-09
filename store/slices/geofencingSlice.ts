import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface GeofencingEvent {
  id: string;
  eventType: 'enter' | 'exit';
  timestamp: number;
}

interface GeofencingState {
  geofences: Geofence[];
  status: 'idle' | 'starting' | 'running' | 'stopping' | 'error';
  lastEvent?: GeofencingEvent;
  error?: string;
}

const initialState: GeofencingState = {
  geofences: [],
  status: 'idle',
  lastEvent: undefined,
  error: undefined,
};

const geofencingSlice = createSlice({
  name: 'geofencing',
  initialState,
  reducers: {
    startGeofencing(state, action: PayloadAction<Geofence[]>) {
      state.status = 'starting';
      state.geofences = action.payload;
      state.error = undefined;
    },
    stopGeofencing(state) {
      state.status = 'stopping';
      state.error = undefined;
    },
    geofencingEventReceived(state, action: PayloadAction<GeofencingEvent>) {
      state.lastEvent = action.payload;
      state.status = 'running';
    },
    geofencingError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
  },
});

export const { startGeofencing, stopGeofencing, geofencingEventReceived, geofencingError } =
  geofencingSlice.actions;

export default geofencingSlice.reducer;
