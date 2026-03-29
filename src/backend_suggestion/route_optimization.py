import math
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

# Exemplo de uso:
# carts_to_collect = [
#     {"id": "C-006", "lat": -30.0320, "lng": -51.2200, "battery": 45, "geofence_breached": False},
#     {"id": "C-010", "lat": -30.0450, "lng": -51.2000, "battery": 5, "geofence_breached": True}
# ]
# store = (-30.0346, -51.2177)
# route = optimize_route(store, carts_to_collect)
# print([c['id'] for c in route])
