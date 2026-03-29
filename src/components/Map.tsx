import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Cart, STORE_LOCATION, GEOFENCE_RADIUS_METERS } from '../data/mockData';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const icons = {
  store: createIcon('#3b82f6'), // blue
  partner_parking: createIcon('#22c55e'), // green
  abandoned: createIcon('#ef4444'), // red
  in_use: createIcon('#eab308'), // yellow
  breached: new L.DivIcon({
    className: 'custom-icon',
    html: `<div class="animate-pulse" style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px 5px rgba(239, 68, 68, 0.8);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }),
};

interface MapProps {
  carts: Cart[];
  routeStops?: Cart[];
  selectedCartId?: string | null;
  onSelectCart?: (id: string) => void;
}

export default function Map({ carts, routeStops, selectedCartId, onSelectCart }: MapProps) {
  const routePositions = routeStops && routeStops.length > 0
    ? [
        [STORE_LOCATION.lat, STORE_LOCATION.lng],
        ...routeStops.map(c => [c.location.lat, c.location.lng]),
        [STORE_LOCATION.lat, STORE_LOCATION.lng]
      ]
    : [];

  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden border border-border">
      <MapContainer center={[STORE_LOCATION.lat, STORE_LOCATION.lng]} zoom={15} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Geofence */}
        <Circle 
          center={[STORE_LOCATION.lat, STORE_LOCATION.lng]} 
          radius={GEOFENCE_RADIUS_METERS} 
          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.05, dashArray: '5, 10' }} 
        />

        {/* Store Marker */}
        <Marker position={[STORE_LOCATION.lat, STORE_LOCATION.lng]} icon={icons.store}>
          <Popup>
            <div className="font-semibold">Supermercado STOK (Fragata)</div>
          </Popup>
        </Marker>

        {/* Route Polyline */}
        {routePositions.length > 0 && (
          <Polyline 
            positions={routePositions as any} 
            color="#f97316" 
            weight={4} 
            dashArray="10, 10" 
            opacity={0.8}
          />
        )}

        {/* Cart Markers */}
        <MarkerClusterGroup 
          chunkedLoading
          iconCreateFunction={(cluster: any) => {
            return L.divIcon({
              html: `<div class="flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground rounded-full border-4 border-background shadow-md font-bold">${cluster.getChildCount()}</div>`,
              className: 'custom-cluster-icon',
              iconSize: L.point(40, 40, true),
            });
          }}
        >
          {carts.filter(c => c.status !== 'in_store').map(cart => {
            let icon = icons[cart.status as keyof typeof icons] || icons.abandoned;
            if (cart.geofenceBreached) icon = icons.breached;

            return (
              <Marker 
                key={cart.id} 
                position={[cart.location.lat, cart.location.lng]} 
                icon={icon}
                eventHandlers={{
                  click: () => {
                    if (onSelectCart) onSelectCart(cart.id);
                  }
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">Carrinho {cart.id}</div>
                    <div className="text-sm">Status: {cart.status}</div>
                    <div className="text-sm">Bateria: {cart.batteryLevel}%</div>
                    {cart.geofenceBreached && (
                      <div className="text-xs font-bold text-red-600">FORA DA ÁREA PERMITIDA</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
