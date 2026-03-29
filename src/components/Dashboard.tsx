import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { ShoppingCart, AlertCircle, Battery, Map as MapIcon, Route, Database } from 'lucide-react';
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
  const geofenceBreaches = carts.filter(c => c.geofenceBreached).length;

  const cartsToCollect = carts.filter(c => c.status === 'abandoned' || c.geofenceBreached);
  const routeStops = optimizeRoute(STORE_LOCATION, cartsToCollect);

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

  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">STOK CartTracker</h1>
          <p className="text-muted-foreground mt-2">Supermercado STOK - Fragata (Duque de Caxias)</p>
        </div>
        <div className="flex gap-4">
          <Badge variant="outline" className="text-sm py-1 px-3">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Sistema Online
          </Badge>
        </div>
      </div>

      {geofenceBreaches > 0 && (
        <div className="bg-destructive/15 border-2 border-destructive text-destructive px-4 py-3 rounded-lg flex items-center gap-3 animate-pulse shadow-lg shadow-destructive/20">
          <AlertCircle className="w-6 h-6" />
          <div>
            <p className="font-bold">Alerta de Segurança Crítico!</p>
            <p className="text-sm">{geofenceBreaches} carrinho(s) violaram o perímetro de segurança (Geofence).</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Carrinhos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCarts}</div>
            <p className="text-xs text-muted-foreground">
              {inStore} na loja | {inNeighborhood} no bairro
            </p>
          </CardContent>
        </Card>
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
                carts={carts} 
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
                  {carts.map((cart) => (
                    <TableRow 
                      key={cart.id}
                      className={
                        selectedCartId === cart.id 
                          ? 'bg-primary/20 hover:bg-primary/30 transition-colors' 
                          : cart.geofenceBreached
                            ? 'bg-destructive/10 border-l-4 border-l-destructive hover:bg-destructive/20 cursor-pointer'
                            : 'cursor-pointer'
                      }
                      onClick={() => setSelectedCartId(cart.id)}
                    >
                      <TableCell className="font-medium">{cart.id}</TableCell>
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
