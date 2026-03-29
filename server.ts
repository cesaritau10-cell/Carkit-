import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";

// Mock data
type CartStatus = 'in_store' | 'in_use' | 'abandoned' | 'partner_parking';

interface Cart {
  id: string;
  status: CartStatus;
  batteryLevel: number;
  location: { lat: number; lng: number };
  lastUpdate: string;
  geofenceBreached: boolean;
}

const STORE_LOCATION = { lat: -31.7565, lng: -52.3611 }; // AV DUQUE DE CAXIAS 837 PELOTAS
const GEOFENCE_RADIUS_METERS = 2000;

// Haversine formula to calculate distance in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

let carts: Cart[] = [
  { id: 'C-001', status: 'in_store', batteryLevel: 100, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-002', status: 'in_store', batteryLevel: 98, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-003', status: 'partner_parking', batteryLevel: 85, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-004', status: 'partner_parking', batteryLevel: 82, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-005', status: 'partner_parking', batteryLevel: 90, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-006', status: 'abandoned', batteryLevel: 45, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-007', status: 'abandoned', batteryLevel: 30, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-008', status: 'abandoned', batteryLevel: 15, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-009', status: 'abandoned', batteryLevel: 10, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-010', status: 'abandoned', batteryLevel: 5, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: true },
  { id: 'C-011', status: 'in_use', batteryLevel: 70, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-012', status: 'in_use', batteryLevel: 8, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-013', status: 'abandoned', batteryLevel: 40, location: { ...STORE_LOCATION }, lastUpdate: new Date().toISOString(), geofenceBreached: true }, // > 2km away
];

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // WebSocket connection
  wss.on('connection', (ws) => {
    console.log('Client connected');
    
    // Send initial state
    ws.send(JSON.stringify({ type: 'init', data: carts }));

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  // Simulate real-time updates
  setInterval(() => {
    carts = carts.map(cart => {
      const isMoving = cart.status === 'in_use' || cart.status === 'abandoned';
      const newLocation = isMoving ? {
        lat: cart.location.lat + (Math.random() - 0.5) * 0.0005,
        lng: cart.location.lng + (Math.random() - 0.5) * 0.0005
      } : cart.location;

      const distanceToStore = calculateDistance(
        newLocation.lat, newLocation.lng,
        STORE_LOCATION.lat, STORE_LOCATION.lng
      );

      return {
        ...cart,
        batteryLevel: Math.max(0, cart.batteryLevel - Math.floor(Math.random() * 2)),
        location: newLocation,
        lastUpdate: new Date().toISOString(),
        geofenceBreached: distanceToStore > GEOFENCE_RADIUS_METERS
      };
    });

    // Broadcast updates to all connected clients
    const updateMessage = JSON.stringify({ type: 'update', data: carts });
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(updateMessage);
      }
    });
  }, 30000); // 30 seconds

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
