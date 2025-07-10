import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const GEOFENCE_TASK_NAME = 'MINIMAL_GEOFENCE_TASK';

type Geofence = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
};

TaskManager.defineTask(
  GEOFENCE_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<any>) => {
    if (error) {
      console.error('Geofence error:', error);
      return;
    }
    if (data && data.eventType && data.region) {
      const { eventType, region } = data;
      // Handle geofence event (e.g., send notification)
      console.log('Geofence event:', eventType, region);
    }
  }
);

class GeofencingService {
  geofences: Geofence[] = [];

  async addGeofence(geofence: Geofence): Promise<void> {
    this.geofences.push(geofence);
    await this._updateGeofences();
  }

  async removeGeofence(id: string): Promise<void> {
    this.geofences = this.geofences.filter(g => g.id !== id);
    await this._updateGeofences();
  }

  async _updateGeofences(): Promise<void> {
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    } catch {}
    if (this.geofences.length === 0) return;
    await Location.startGeofencingAsync(
      GEOFENCE_TASK_NAME,
      this.geofences.map(g => ({
        identifier: g.id,
        latitude: g.latitude,
        longitude: g.longitude,
        radius: g.radius,
        notifyOnEnter: true,
        notifyOnExit: false,
      }))
    );
  }
}

export default new GeofencingService();
