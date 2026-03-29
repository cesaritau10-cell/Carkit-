import React, { useState } from 'react';
import { Cart, STORE_LOCATION } from '../data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Navigation, AlertTriangle, BatteryWarning, CheckCircle2, Store } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

// Distance calculation function
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Return in meters
}

interface RouteListProps {
  routeStops: Cart[];
}

export default function RouteList({ routeStops }: RouteListProps) {
  const [visitedCarts, setVisitedCarts] = useState<Set<string>>(new Set());

  const toggleVisited = (id: string) => {
    setVisitedCarts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

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
          <div className="space-y-4 pb-4">
            {/* Start Point */}
            <div className="flex items-start gap-4 p-3 rounded-lg border bg-blue-500/10 border-blue-500/30 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold bg-blue-500 text-white">
                <Store className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-900 dark:text-blue-100">Ponto de Saída (Base)</span>
                </div>
                <div className="text-sm text-blue-800/80 dark:text-blue-200/80">
                  Supermercado STOK<br/>
                  6JR9+XM Fragata, Pelotas - RS
                </div>
              </div>
            </div>

            {routeStops.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">Nenhum carrinho precisa de coleta no momento.</div>
            ) : (
              routeStops.map((stop, index) => {
                const distanceToStore = calculateDistance(stop.location.lat, stop.location.lng, STORE_LOCATION.lat, STORE_LOCATION.lng);
                const isVeryClose = distanceToStore < 500; // Less than 500 meters
                const isVisited = visitedCarts.has(stop.id);

                return (
                  <div 
                    key={stop.id} 
                    className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${
                      isVisited ? 'bg-muted/50 border-muted opacity-60' : 
                      isVeryClose ? 'bg-green-500/10 border-green-500/30' : 
                      'bg-card hover:bg-accent/50'
                    }`}
                  >
                    <div 
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold cursor-pointer transition-colors ${
                        isVisited ? 'bg-green-500 text-white' : 
                        isVeryClose ? 'bg-green-500/20 text-green-700' :
                        'bg-primary/10 text-primary'
                      }`}
                      onClick={() => toggleVisited(stop.id)}
                      title={isVisited ? "Marcar como pendente" : "Marcar como coletado"}
                    >
                      {isVisited ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${isVisited ? 'line-through text-muted-foreground' : ''}`}>
                          Carrinho {stop.id}
                        </span>
                        <div className="flex gap-2">
                          {isVeryClose && !isVisited && <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50"><Store className="w-3 h-3 mr-1" /> Próximo</Badge>}
                          {stop.geofenceBreached && !isVisited && <Badge variant="destructive">Fora da Área</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BatteryWarning className="w-4 h-4" />
                          {stop.batteryLevel}%
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {distanceToStore < 1000 ? `${Math.round(distanceToStore)}m` : `${(distanceToStore/1000).toFixed(1)}km`} da loja
                        </span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => toggleVisited(stop.id)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            isVisited ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          {isVisited ? 'Desfazer' : 'Marcar Coletado'}
                        </button>
                        {!isVisited && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* End Point */}
            {routeStops.length > 0 && (
              <div className="flex items-start gap-4 p-3 rounded-lg border bg-blue-500/10 border-blue-500/30 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold bg-blue-500 text-white">
                  <Store className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900 dark:text-blue-100">Ponto de Chegada (Retorno)</span>
                  </div>
                  <div className="text-sm text-blue-800/80 dark:text-blue-200/80">
                    Supermercado STOK<br/>
                    6JR9+XM Fragata, Pelotas - RS
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
