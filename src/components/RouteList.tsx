import React from 'react';
import { Cart } from '../data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Navigation, AlertTriangle, BatteryWarning } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface RouteListProps {
  routeStops: Cart[];
}

export default function RouteList({ routeStops }: RouteListProps) {
  const getGoogleMapsLink = (lat: number, lng: number) => 
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const getWazeLink = (lat: number, lng: number) => 
    `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Rota de Coleta Otimizada
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {routeStops.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">Nenhum carrinho precisa de coleta no momento.</div>
            ) : (
              routeStops.map((stop, index) => (
                <div key={stop.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Carrinho {stop.id}</span>
                      {stop.geofenceBreached && <Badge variant="destructive">Fora da Área</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BatteryWarning className="w-4 h-4" />
                        {stop.batteryLevel}%
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {stop.location.lat.toFixed(4)}, {stop.location.lng.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <a 
                        href={getGoogleMapsLink(stop.location.lat, stop.location.lng)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                      >
                        Google Maps
                      </a>
                      <a 
                        href={getWazeLink(stop.location.lat, stop.location.lng)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded hover:bg-cyan-200 transition-colors"
                      >
                        Waze
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
