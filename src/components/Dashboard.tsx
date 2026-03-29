import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { ShoppingCart, AlertCircle, Battery, Map as MapIcon, Route, Database, X } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { mockCarts, Cart, STORE_LOCATION } from '../data/mockData';
import Map from './Map';
import RouteList from './RouteList';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const playAlertSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

function optimizeRoute(storeLoc: {lat: number, lng: number}, cartsToCollect: Cart[]) {
  let unvisited = [...cartsToCollect];
  let route: Cart[] = [];
  let currentLoc = storeLoc;

  while (unvisited.length > 0) {
    let bestCart: Cart | null = null;
    let bestScore = Infinity;

    for (const cart of unvisited) {
      const dist = calculateDistance(currentLoc.lat, currentLoc.lng, cart.location.lat, cart.location.lng);
      
      // Weighting logic: Geofence breached > Low battery > Distance
      let weight = 1.0;
      if (cart.geofenceBreached) weight = 0.1;
      else if (cart.batteryLevel < 20) weight = 0.5;
      
      const score = dist * weight;
      if (score < bestScore) {
        bestScore = score;
        bestCart = cart;
      }
    }
    
    if (bestCart) {
      route.push(bestCart);
      unvisited = unvisited.filter(c => c.id !== bestCart!.id);
      currentLoc = bestCart.location;
    }
  }
  return route;
}

export default function Dashboard() {
  const [carts, setCarts] = useState<Cart[]>(mockCarts);
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('map');
  const [maxBatteryFilter, setMaxBatteryFilter] = useState<number>(100);
  const [showTotalCartsModal, setShowTotalCartsModal] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const notifiedCartsRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'init' || message.type === 'update') {
          setCarts(message.data);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, []);

  const totalCarts = carts.length;
  const inStore = carts.filter(c => c.status === 'in_store').length;
  const inNeighborhood = totalCarts - inStore;
  const lowBattery = carts.filter(c => c.batteryLevel < 20).length;
  const breachedCarts = carts.filter(c => c.geofenceBreached);
  const activeBreachedCarts = breachedCarts.filter(c => !dismissedAlerts.has(c.id));
  const geofenceBreaches = breachedCarts.length;

  const cartsToCollect = carts.filter(c => c.status === 'abandoned' || c.geofenceBreached);
  const routeStops = optimizeRoute(STORE_LOCATION, cartsToCollect);
  
  const filteredCarts = carts.filter(c => c.batteryLevel <= maxBatteryFilter);

  useEffect(() => {
    const newNotifiedCarts = new Set(notifiedCartsRef.current);
    let shouldPlaySound = false;

    carts.forEach(cart => {
      // Check if cart is critical (<10%) and NOT in the collection route (not abandoned/breached) and NOT in store
      const isCritical = cart.batteryLevel < 10;
      const isNotInRoute = !cartsToCollect.some(c => c.id === cart.id);
      const isNotInStore = cart.status !== 'in_store';

      if (isCritical && isNotInRoute && isNotInStore) {
        if (!newNotifiedCarts.has(cart.id)) {
          // New critical cart found
          toast.error(`Atenção! Carrinho ${cart.id} com bateria crítica (${cart.batteryLevel}%) e fora da rota de coleta!`, {
            duration: 10000,
            action: {
              label: 'Ver no Mapa',
              onClick: () => {
                setSelectedCartId(cart.id);
                setActiveTab('map');
              }
            }
          });
          newNotifiedCarts.add(cart.id);
          shouldPlaySound = true;
        }
      } else {
        // Remove from notified set if it no longer meets criteria (e.g. charged or added to route)
        if (newNotifiedCarts.has(cart.id)) {
          newNotifiedCarts.delete(cart.id);
        }
      }
    });

    if (shouldPlaySound) {
      playAlertSound();
    }

    notifiedCartsRef.current = newNotifiedCarts;
  }, [carts, cartsToCollect]);

  const handleLowBatteryClick = () => {
    const lowBatteryCarts = carts.filter(c => c.batteryLevel < 20);
    if (lowBatteryCarts.length === 0) return;
    
    if (lowBatteryCarts.length === 1) {
      const cart = lowBatteryCarts[0];
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${cart.location.lat},${cart.location.lng}`, '_blank');
      return;
    }

    const origin = `${STORE_LOCATION.lat},${STORE_LOCATION.lng}`;
    const destination = `${lowBatteryCarts[lowBatteryCarts.length - 1].location.lat},${lowBatteryCarts[lowBatteryCarts.length - 1].location.lng}`;
    const waypoints = lowBatteryCarts.slice(0, -1).map(c => `${c.location.lat},${c.location.lng}`).join('|');
    
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`, '_blank');
  };

  const handleDismissAlert = (id: string) => {
    setDismissedAlerts(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-8">
      <Toaster position="top-right" richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">STOK CartTracker</h1>
          <p className="text-muted-foreground mt-2">Supermercado STOK - Av. Duque de Caxias, 837 (6JR9+XM Fragata, Pelotas - RS)</p>
        </div>
        <div className="flex gap-4">
          <Badge variant="outline" className="text-sm py-1 px-3">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Sistema Online
          </Badge>
        </div>
      </div>

      {activeBreachedCarts.map(cart => (
        <div 
          key={cart.id}
          className="bg-destructive/15 border-2 border-destructive text-destructive px-4 py-3 rounded-lg flex items-center justify-between gap-3 animate-pulse shadow-lg shadow-destructive/20"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-bold">ALERTA DE SEGURANÇA CRÍTICO! (Carrinho {cart.id})</p>
              <p className="text-sm">Este carrinho ultrapassou o limite de 2km do supermercado STOK.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${cart.location.lat},${cart.location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-md hover:bg-destructive/90 transition-colors text-sm font-medium"
              title="Abrir localização no Google Maps"
            >
              <MapIcon className="w-4 h-4" />
              Ver no Mapa
            </a>
            <button
              onClick={() => handleDismissAlert(cart.id)}
              className="p-1.5 hover:bg-destructive/20 rounded-md transition-colors text-destructive"
              title="Dispensar alerta"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setShowTotalCartsModal(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Carrinhos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCarts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {inStore} na loja (6JR9+XM) | {inNeighborhood} no bairro
            </p>
          </CardContent>
        </Card>
        
        {showTotalCartsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowTotalCartsModal(false)}>
            <div className="bg-background border rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold">Localização Exata dos Carrinhos</h2>
                <button onClick={() => setShowTotalCartsModal(false)} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {carts.map(cart => (
                  <div key={cart.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-bold">Carrinho {cart.id}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: {cart.status === 'in_store' ? 'Na Loja' : cart.status === 'in_use' ? 'Em Uso' : cart.status === 'abandoned' ? 'Abandonado' : 'Estacionamento Parceiro'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bateria: {cart.batteryLevel}%
                      </p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${cart.location.lat},${cart.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      <MapIcon className="w-4 h-4" />
                      Ver no Google Maps
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={handleLowBatteryClick}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bateria Baixa (&lt;20%)</CardTitle>
            <Battery className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowBattery}</div>
            <p className="text-xs text-muted-foreground">
              Clique para ver a rota no Maps
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Geofence</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{geofenceBreaches}</div>
            <p className="text-xs text-muted-foreground">
              Fora do perímetro permitido
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estacionamentos Parceiros</CardTitle>
            <MapIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {carts.filter(c => c.status === 'partner_parking').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Carrinhos seguros
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Battery Filter */}
      <div className="flex items-center space-x-4 bg-card p-4 rounded-lg border shadow-sm">
        <Battery className="w-6 h-6 text-muted-foreground" />
        <div className="flex-1 max-w-md space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Filtrar por Bateria (Máx: {maxBatteryFilter}%)</label>
            <span className="text-sm font-bold text-primary">{maxBatteryFilter}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={maxBatteryFilter}
            onChange={(e) => setMaxBatteryFilter(Number(e.target.value))}
            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Exibindo {filteredCarts.length} de {carts.length} carrinhos
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapIcon className="w-4 h-4" /> Mapa de Calor & Localização
          </TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <Route className="w-4 h-4" /> Rotas de Coleta
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Database className="w-4 h-4" /> Inventário
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visão Geral do Bairro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Sede</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Parceiro</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Abandonado</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Em Uso</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Fora da Área</div>
              </div>
              <Map 
                carts={filteredCarts} 
                routeStops={routeStops} 
                selectedCartId={selectedCartId}
                onSelectCart={(id) => {
                  setSelectedCartId(id);
                  setActiveTab('inventory');
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <RouteList routeStops={routeStops} />
            <Card>
              <CardHeader>
                <CardTitle>Algoritmo de Otimização (Python)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono">
                  <pre>{`import math
from typing import List, Tuple

def calculate_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    # Haversine formula for distance
    R = 6371.0 # Earth radius in km
    lat1, lon1 = math.radians(p1[0]), math.radians(p1[1])
    lat2, lon2 = math.radians(p2[0]), math.radians(p2[1])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def optimize_route(store_loc: Tuple[float, float], carts: List[dict]) -> List[dict]:
    """
    TSP-style greedy nearest neighbor algorithm with priority weights.
    Priority: Geofence breached > Low battery > Distance
    """
    unvisited = carts.copy()
    route = []
    current_loc = store_loc

    while unvisited:
        best_cart = None
        best_score = float('inf')

        for cart in unvisited:
            dist = calculate_distance(current_loc, (cart['lat'], cart['lng']))
            
            # Weighting logic
            weight = 1.0
            if cart.get('geofence_breached'):
                weight = 0.1 # Highest priority
            elif cart.get('battery') < 20:
                weight = 0.5 # High priority
                
            score = dist * weight
            
            if score < best_score:
                best_score = score
                best_cart = cart
                
        route.append(best_cart)
        unvisited.remove(best_cart)
        current_loc = (best_cart['lat'], best_cart['lng'])
        
    return route
`}</pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status Detalhado dos Sensores</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bateria</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead>Geofence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCarts.map((cart) => (
                    <TableRow 
                      key={cart.id}
                      className={
                        selectedCartId === cart.id 
                          ? 'bg-primary/20 hover:bg-primary/30 transition-colors cursor-pointer' 
                          : cart.geofenceBreached
                            ? 'bg-destructive/10 border-l-4 border-l-destructive hover:bg-destructive/20 cursor-pointer'
                            : 'cursor-pointer hover:bg-muted/50'
                      }
                      onClick={() => {
                        setSelectedCartId(cart.id);
                        setActiveTab('map');
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {cart.id}
                          {(cart.status === 'abandoned' || cart.geofenceBreached) && (
                            <MapIcon className="w-4 h-4 text-primary animate-bounce" title="Ver no mapa" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cart.status === 'in_store' ? 'outline' : cart.status === 'abandoned' ? 'destructive' : 'secondary'}>
                          {cart.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${cart.batteryLevel < 20 ? 'bg-destructive' : cart.batteryLevel < 50 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                              style={{ width: `${cart.batteryLevel}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{cart.batteryLevel}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(cart.lastUpdate).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        {cart.geofenceBreached ? (
                          <Badge variant="destructive">Violado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600">Seguro</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
