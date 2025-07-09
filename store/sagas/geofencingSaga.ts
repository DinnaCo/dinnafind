import {
  takeLatest,
  put,
  call,
  take,
  race,
  delay,
  fork,
  cancel,
  cancelled,
} from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import GeofencingService from '@/services/GeofencingService';
import {
  startGeofencing,
  stopGeofencing,
  geofencingEventReceived,
  geofencingError,
  Geofence,
  GeofencingEvent,
} from '../slices/geofencingSlice';

// Create a channel to emit geofencing events
function createGeofencingChannel() {
  return eventChannel(emitter => {
    const onEvent = (event: GeofencingEvent) => emitter({ event });
    const onError = (error: Error) => emitter({ error });
    GeofencingService.subscribe(onEvent, onError);
    return () => GeofencingService.unsubscribe();
  });
}

function* handleStartGeofencing(action: ReturnType<typeof startGeofencing>) {
  try {
    // Start geofencing for each geofence
    for (const geofence of action.payload) {
      yield call([GeofencingService, GeofencingService.addGeofence], geofence);
    }
    // Listen for geofencing events
    const channel: ReturnType<typeof createGeofencingChannel> = yield call(createGeofencingChannel);
    while (true) {
      const { event, error } = yield take(channel);
      if (event) {
        yield put(geofencingEventReceived(event));
      } else if (error) {
        yield put(geofencingError(error.message));
      }
    }
  } catch (err: any) {
    yield put(geofencingError(err.message));
  } finally {
    if (yield cancelled()) {
      // Cleanup if saga is cancelled
      yield call([GeofencingService, GeofencingService.unsubscribe]);
    }
  }
}

function* handleStopGeofencing() {
  try {
    yield call([GeofencingService, GeofencingService.removeAllGeofences]);
    yield call([GeofencingService, GeofencingService.unsubscribe]);
  } catch (err: any) {
    yield put(geofencingError(err.message));
  }
}

export default function* geofencingSaga() {
  let task;
  yield takeLatest(startGeofencing.type, function* (action) {
    if (task) {
      yield cancel(task);
    }
    task = yield fork(handleStartGeofencing, action);
  });
  yield takeLatest(stopGeofencing.type, function* () {
    if (task) {
      yield cancel(task);
      task = null;
    }
    yield call(handleStopGeofencing);
  });
}
