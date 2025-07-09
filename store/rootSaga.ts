import { all, fork } from 'redux-saga/effects';

import { watchAuth } from './sagas/authSaga';
import { watchVenues } from './sagas/venuesSaga';
import locationSaga from './sagas/locationSaga';

// Root saga
export function* rootSaga() {
  yield all([
    fork(watchAuth),
    fork(watchVenues),
    fork(locationSaga), // <-- Add locationSaga
  ]);
}
