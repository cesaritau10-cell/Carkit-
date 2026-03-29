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

const STORE_LOCATION = { lat: -31.7544, lng: -52.3650 };

let carts: Cart[] = [
  { id: 'C-001', status: 'in_store', batteryLevel: 100, location: { lat: -31.7544, lng: -52.3650 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-002', status: 'in_store', batteryLevel: 98, location: { lat: -31.7544, lng: -52.3650 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-003', status: 'partner_parking', batteryLevel: 85, location: { lat: -31.7560, lng: -52.3620 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-004', status: 'partner_parking', batteryLevel: 82, location: { lat: -31.7561, lng: -52.3621 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-005', status: 'partner_parking', batteryLevel: 90, location: { lat: -31.7560, lng: -52.3622 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-006', status: 'abandoned', batteryLevel: 45, location: { lat: -31.7520, lng: -52.3680 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-007', status: 'abandoned', batteryLevel: 30, location: { lat: -31.7521, lng: -52.3681 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-008', status: 'abandoned', batteryLevel: 15, location: { lat: -31.7522, lng: -52.3679 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-009', status: 'abandoned', batteryLevel: 10, location: { lat: -31.7520, lng: -52.3682 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
  { id: 'C-010', status: 'abandoned', batteryLevel: 5, location: { lat: -31.7400, lng: -52.3800 }, lastUpdate: new Date().toISOString(), geofenceBreached: true },
  { id: 'C-011', status: 'in_use', batteryLevel: 70, location: { lat: -31.7550, lng: -52.3660 }, lastUpdate: new Date().toISOString(), geofenceBreached: false },
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
      return {
        ...cart,
        batteryLevel: Math.max(0, cart.batteryLevel - Math.floor(Math.random() * 2)),
        location: isMoving ? {
          lat: cart.location.lat + (Math.random() - 0.5) * 0.0005,
          lng: cart.location.lng + (Math.random() - 0.5) * 0.0005
        } : cart.location,
        lastUpdate: new Date().toISOString()
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
