import { eventChannel, EventChannel } from 'redux-saga';
import { call, put, take, takeLatest, cancel, fork } from 'redux-saga/effects';
import * as Location from 'expo-location';
import {
  startLocationWatch,
  stopLocationWatch,
  locationUpdated,
  locationError,
} from '../slices/locationSlice';

function createLocationChannel(options: Location.LocationOptions): EventChannel<any> {
  return eventChannel(emitter => {
    let subscription: any;
    Location.watchPositionAsync(
      options,
      location => emitter({ location }),
      (error: any) =>
        emitter({ error: typeof error === 'string' ? error : error?.message || 'Unknown error' })
    ).then(sub => {
      subscription = sub;
    });
    return () => {
      if (subscription) subscription.remove();
    };
  });
}

function* watchLocationSaga(
  action: ReturnType<typeof startLocationWatch>
): Generator<any, void, any> {
  const options: Location.LocationOptions = action.payload || {
    accuracy: Location.Accuracy.High,
    distanceInterval: 10,
  };
  const channel: EventChannel<any> = yield call(createLocationChannel, options);
  try {
    while (true) {
      const { location, error }: { location?: Location.LocationObject; error?: string } =
        yield take(channel);
      if (location) {
        yield put(locationUpdated(location));
      } else if (error) {
        yield put(locationError(error));
      }
    }
  } finally {
    channel.close();
  }
}

export default function* locationSaga(): Generator<any, void, any> {
  let task: any;
  yield takeLatest(
    startLocationWatch.type,
    function* (action: ReturnType<typeof startLocationWatch>) {
      if (task) yield cancel(task);
      task = yield fork(watchLocationSaga, action);
    }
  );
  yield takeLatest(stopLocationWatch.type, function* () {
    if (task) {
      yield cancel(task);
      task = null;
    }
  });
}
