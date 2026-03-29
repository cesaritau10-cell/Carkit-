export type CartStatus = 'in_store' | 'in_use' | 'abandoned' | 'partner_parking';

export interface Cart {
  id: string;
  status: CartStatus;
  batteryLevel: number; // 0 to 100
  location: {
    lat: number;
    lng: number;
  };
  lastUpdate: string;
  geofenceBreached: boolean;
}

// Stok Center, Av. Duque de Caxias, Fragata, Pelotas - RS approx: -31.7544, -52.3650
export const mockCarts: Cart[] = [
  // In Store
  { id: 'C-001', status: 'in_store', batteryLevel: 100, location: { lat: -31.7544, lng: -52.3650 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-002', status: 'in_store', batteryLevel: 98, location: { lat: -31.7544, lng: -52.3650 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  
  // Partner Parking (e.g., a nearby condo)
  { id: 'C-003', status: 'partner_parking', batteryLevel: 85, location: { lat: -31.7560, lng: -52.3620 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-004', status: 'partner_parking', batteryLevel: 82, location: { lat: -31.7561, lng: -52.3621 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-005', status: 'partner_parking', batteryLevel: 90, location: { lat: -31.7560, lng: -52.3622 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },

  // Abandoned (High density area - needs collection)
  { id: 'C-006', status: 'abandoned', batteryLevel: 45, location: { lat: -31.7520, lng: -52.3680 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-007', status: 'abandoned', batteryLevel: 30, location: { lat: -31.7521, lng: -52.3681 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-008', status: 'abandoned', batteryLevel: 15, location: { lat: -31.7522, lng: -52.3679 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-009', status: 'abandoned', batteryLevel: 10, location: { lat: -31.7520, lng: -52.3682 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },

  // Geofence Breached (Far away)
  { id: 'C-010', status: 'abandoned', batteryLevel: 5, location: { lat: -31.7400, lng: -52.3800 }, lastUpdate: new Date().toISOString(), geofenceBreached: true },
  
  // In Use
  { id: 'C-011', status: 'in_use', batteryLevel: 70, location: { lat: -31.7550, lng: -52.3660 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
];

export const STORE_LOCATION = { lat: -31.7544, lng: -52.3650 };
export const GEOFENCE_RADIUS_METERS = 1000;
