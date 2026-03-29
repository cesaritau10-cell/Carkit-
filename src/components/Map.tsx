import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import HeatmapLayer from './HeatmapLayer';
import { Cart, STORE_LOCATION, GEOFENCE_RADIUS_METERS } from '../data/mockData';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createIcon = (color: string, isSelected: boolean = false) => {
  if (isSelected) {
    return new L.DivIcon({
      className: 'custom-icon',
      html: `<div class="animate-pulse" style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px 5px ${color}80;"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }
  return new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const icons = {
  store: createIcon('#3b82f6'), // blue
  store_selected: createIcon('#3b82f6', true),
  partner_parking: createIcon('#22c55e'), // green
  partner_parking_selected: createIcon('#22c55e', true),
  abandoned: createIcon('#ef4444'), // red
  abandoned_selected: createIcon('#ef4444', true),
  in_use: createIcon('#eab308'), // yellow
  in_use_selected: createIcon('#eab308', true),
  breached: new L.DivIcon({
    className: 'custom-icon',
    html: `<div class="animate-pulse" style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px 5px rgba(239, 68, 68, 0.8);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }),
  breached_selected: new L.DivIcon({
    className: 'custom-icon',
    html: `<div class="animate-pulse" style="background-color: #ef4444; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 20px 8px rgba(239, 68, 68, 0.9);"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  }),
};

interface MapProps {
  carts: Cart[];
  routeStops?: Cart[];
  selectedCartId?: string | null;
  onSelectCart?: (id: string) => void;
}

function MapController({ selectedCartId, carts }: { selectedCartId?: string | null, carts: Cart[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedCartId) {
      const cart = carts.find(c => c.id === selectedCartId);
      if (cart) {
        map.flyTo([cart.location.lat, cart.location.lng], 18, { duration: 1.5 });
      }
    }
  }, [selectedCartId, carts, map]);

  return null;
}

export default function Map({ carts, routeStops, selectedCartId, onSelectCart }: MapProps) {
  const routePositions = routeStops && routeStops.length > 0
    ? [
        [STORE_LOCATION.lat, STORE_LOCATION.lng],
        ...routeStops.map(c => [c.location.lat, c.location.lng]),
        [STORE_LOCATION.lat, STORE_LOCATION.lng]
      ]
    : [];

  // Generate heatmap points for carts with battery < 20%
  const heatPoints: [number, number, number][] = carts
    .filter(c => c.batteryLevel < 20 && c.status !== 'in_store')
    .map(c => [c.location.lat, c.location.lng, 1]); // intensity 1 for each cart

  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden border border-border">
      <MapContainer center={[STORE_LOCATION.lat, STORE_LOCATION.lng]} zoom={15} className="h-full w-full">
        <MapController selectedCartId={selectedCartId} carts={carts} />
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
            <div className="font-semibold">STOK (Av. Duque de Caxias, 837)</div>
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

        {/* Heatmap Layer for Low Battery Carts */}
        {heatPoints.length > 0 && <HeatmapLayer points={heatPoints} />}

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
            const isSelected = cart.id === selectedCartId;
            let iconKey = cart.status as keyof typeof icons;
            if (cart.geofenceBreached) iconKey = 'breached';
            
            if (isSelected) {
              iconKey = `${iconKey}_selected` as keyof typeof icons;
            }

            let icon = icons[iconKey] || icons.abandoned;

            return (
              <Marker 
                key={cart.id} 
                position={[cart.location.lat, cart.location.lng]} 
                icon={icon}
                zIndexOffset={isSelected ? 1000 : 0}
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
