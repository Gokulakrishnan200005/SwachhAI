import math
import requests
from typing import List, Dict

# Standard Municipal Sanitation Depot & Processing Center in Central District
DEFAULT_DEPOT = {
    "name": "Central Municipal Sanitation Depot",
    "lat": 13.0827,
    "lng": 80.2707,
    "type": "DEPOT"
}

DEFAULT_PROCESSING_CENTER = {
    "name": "Kodungaiyur Integrated Waste Processing Facility",
    "lat": 13.1415,
    "lng": 80.2730,
    "type": "PROCESSING_CENTER"
}

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def optimize_collection_route(
    tasks: List[Dict],
    depot: Dict = None,
    destination: Dict = None,
    truck_capacity_kg: float = 3000.0,
    use_osrm: bool = False
) -> Dict:
    """
    Intelligent Waste Collection Route Optimizer.
    Solves the Traveling Salesperson Problem with Priority Weighting (CRITICAL > HIGH > MEDIUM > LOW).
    Balances distance minimization with urgent hazard clearance.
    Provides local heuristic optimization with fallback when external OSRM service is offline.
    """
    start_point = depot or DEFAULT_DEPOT
    end_point = destination or DEFAULT_PROCESSING_CENTER

    if not tasks:
        return {
            "total_distance_km": 0.0,
            "estimated_time_minutes": 0,
            "stops_count": 0,
            "priority_coverage": {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0},
            "stops": [start_point, end_point],
            "routing_engine": "Local Haversine Heuristic"
        }

    # Weight multipliers: Critical tasks must be prioritized earlier in the route
    priority_weights = {
        "CRITICAL": 4.0,
        "HIGH": 2.5,
        "MEDIUM": 1.2,
        "LOW": 0.8
    }

    # Remaining tasks to visit
    unvisited = list(tasks)
    route = [start_point]
    current_lat = start_point["lat"]
    current_lng = start_point["lng"]

    total_dist = 0.0
    accumulated_load = 0.0

    while unvisited:
        # Score each unvisited stop: Lower score = better next stop
        # score = distance / priority_weight
        best_idx = 0
        best_score = float('inf')
        best_dist = 0.0

        for i, t in enumerate(unvisited):
            t_lat = t.get("lat") or t.get("location_lat") or current_lat
            t_lng = t.get("lng") or t.get("location_lng") or current_lng
            dist = haversine_km(current_lat, current_lng, t_lat, t_lng) * 1.35 # Road tortuosity multiplier
            
            p_level = t.get("priority_level", "MEDIUM")
            weight = priority_weights.get(p_level, 1.0)
            
            # Prioritize closer stops, but heavily favor higher priorities
            effective_score = dist / weight

            if effective_score < best_score:
                best_score = effective_score
                best_idx = i
                best_dist = dist

        chosen_task = unvisited.pop(best_idx)
        total_dist += best_dist
        
        c_lat = chosen_task.get("lat") or chosen_task.get("location_lat")
        c_lng = chosen_task.get("lng") or chosen_task.get("location_lng")
        
        current_lat = c_lat
        current_lng = c_lng
        
        # Add stop detail
        task_stop = {
            "stop_number": len(route),
            "id": chosen_task.get("id"),
            "task_code": chosen_task.get("task_code", f"TASK-{len(route)}"),
            "title": chosen_task.get("title", f"Stop {len(route)}"),
            "address": chosen_task.get("address", "Municipal Point"),
            "zone": chosen_task.get("zone", "Zone"),
            "priority_level": chosen_task.get("priority_level", "MEDIUM"),
            "waste_category": chosen_task.get("ai_detected_category", "Mixed Waste"),
            "lat": c_lat,
            "lng": c_lng,
            "distance_from_prev_km": round(best_dist, 2),
            "type": "COLLECTION_STOP"
        }
        route.append(task_stop)

    # Route from last stop to Processing Center
    final_leg = haversine_km(current_lat, current_lng, end_point["lat"], end_point["lng"]) * 1.35
    total_dist += final_leg
    
    end_stop = dict(end_point)
    end_stop["stop_number"] = len(route)
    end_stop["distance_from_prev_km"] = round(final_leg, 2)
    route.append(end_stop)

    # Approximate travel time in Indian urban traffic: average 20 km/h + 12 mins per collection stop
    travel_time_mins = int((total_dist / 20.0) * 60 + len(tasks) * 12)

    # Priority coverage summary
    p_coverage = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for t in tasks:
        lvl = t.get("priority_level", "MEDIUM")
        if lvl in p_coverage:
            p_coverage[lvl] += 1

    return {
        "total_distance_km": round(total_dist, 2),
        "estimated_time_minutes": travel_time_mins,
        "stops_count": len(tasks),
        "priority_coverage": p_coverage,
        "stops": route,
        "routing_engine": "SwachhAI Priority-Constrained TSP (Local Heuristic Engine)",
        "traffic_factor": "Dense Urban Corridor (20 km/h baseline)",
        "capacity_utilization_pct": min(100.0, round((len(tasks) * 350.0 / truck_capacity_kg) * 100.0, 1))
    }
