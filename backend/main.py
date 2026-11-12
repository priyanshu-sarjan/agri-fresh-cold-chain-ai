"""
AgriFresh Cold-Chain Logistics Engine - FastAPI Backend Service
Coordinates CSP Fleet Scheduling, Perishable-Aware A* Routing,
Dynamic Disruption Injection, and Telemetry Simulation.
Supports both local execution and Vercel Serverless deployment (/api/*).
"""
import copy
import json
import os
import urllib.request
from typing import Any, Dict, List, Optional

import networkx as nx
from fastapi import APIRouter, Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from csp_scheduler import AgriFleetCSP, ProduceOrder, Vehicle
from produce_catalog import DEFAULT_FLEET, DEFAULT_ORDERS, PRODUCE_TYPES
from router import AgriPathFinder

app = FastAPI(
    title="AgriFresh Cold-Chain Logistics Engine",
    description="Autonomous Dispatch & Dynamic Rerouting Engine for Perishable Produce",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# Graph Initialization & Real-World OSRM Geometry Loading
# -------------------------------------------------------------
G = nx.Graph()

GEOM_FILE = os.path.join(os.path.dirname(__file__), "road_geometries.json")
ROAD_GEOMS = {}
if os.path.exists(GEOM_FILE):
    with open(GEOM_FILE, "r") as f:
        ROAD_GEOMS = json.load(f)

SNAPPED_NODES = ROAD_GEOMS.get("nodes", {})

NODES = {
    "HUB": {
        "pos": tuple(SNAPPED_NODES.get("HUB", (26.21844, 78.18171))),
        "label": "Central Cold Hub",
        "type": "HUB",
        "description": "Primary cold storage & multi-temp cross-docking depot (Padav / Gwalior Junction)"
    },
    "FARM_A": {
        "pos": tuple(SNAPPED_NODES.get("FARM_A", (26.24001, 78.15993))),
        "label": "Green Valley Hydroponics",
        "type": "FARM",
        "description": "Hydroponic baby greens & microgreen farm (Bahodapur Road)"
    },
    "FARM_B": {
        "pos": tuple(SNAPPED_NODES.get("FARM_B", (26.25518, 78.19996))),
        "label": "Sunrise Organic Farm",
        "type": "FARM",
        "description": "Organic berry orchards & orchard packhouse (Hazira / Birla Nagar)"
    },
    "HUB_NORTH": {
        "pos": tuple(SNAPPED_NODES.get("HUB_NORTH", (26.28018, 78.18925))),
        "label": "North Sorting Facility",
        "type": "SORTING",
        "description": "Regional transit node & rapid precooling station (NH-44 Airport Corridor)"
    },
    "RETAIL_1": {
        "pos": tuple(SNAPPED_NODES.get("RETAIL_1", (26.21000, 78.20998))),
        "label": "City Hypermarket",
        "type": "RETAIL",
        "description": "Downtown distribution partner & supermarket hub (City Center / Patel Nagar)"
    },
    "RETAIL_2": {
        "pos": tuple(SNAPPED_NODES.get("RETAIL_2", (26.19515, 78.17425))),
        "label": "Fresh Mart Cluster",
        "type": "RETAIL",
        "description": "Southside grocery cluster & consumer cooperative (Lashkar / Kampoo)"
    },
    "WEST_CORRIDOR": {
        "pos": tuple(SNAPPED_NODES.get("WEST_CORRIDOR", (26.20502, 78.15000))),
        "label": "West Highway Bypass",
        "type": "TRANSIT",
        "description": "Elevated bypass corridor with lower thermal absorption (Gol Pahadiya Bypass)"
    }
}

for node_id, data in NODES.items():
    G.add_node(node_id, **data)

INITIAL_EDGES = [
    ("HUB", "FARM_A", 12.0, 1.0, 31.0, "Northwest Farm Road"),
    ("HUB", "RETAIL_1", 10.0, 1.0, 34.0, "Central Expressway"),
    ("HUB", "RETAIL_2", 8.0, 1.0, 33.0, "South Valley Arterial"),
    ("FARM_A", "FARM_B", 9.0, 1.0, 30.0, "Rural Connecting Link"),
    ("FARM_B", "HUB_NORTH", 11.0, 1.0, 29.0, "North Ridge Highway"),
    ("HUB_NORTH", "RETAIL_1", 18.0, 1.0, 34.0, "East Ring Road"),
    ("FARM_A", "HUB_NORTH", 15.0, 1.0, 32.0, "Highland Transit Road"),
    ("RETAIL_1", "RETAIL_2", 14.0, 1.0, 35.0, "Metro Cross Connector"),
    ("HUB", "WEST_CORRIDOR", 7.0, 1.0, 30.0, "Outer Ring West"),
    ("WEST_CORRIDOR", "RETAIL_2", 6.0, 1.0, 31.0, "Southwest Spur"),
    ("WEST_CORRIDOR", "FARM_A", 10.0, 1.0, 29.0, "Agri-Corridor Connector")
]

def load_default_graph():
    edge_geoms = ROAD_GEOMS.get("edges", {})
    for u, v, t, cong, temp, road_name in INITIAL_EDGES:
        geom_entry = edge_geoms.get(f"{u}|{v}")
        coords = geom_entry["coords"] if geom_entry else [list(NODES[u]["pos"]), list(NODES[v]["pos"])]
        base_t = geom_entry["base_time_min"] if geom_entry else t
        dist_km = geom_entry.get("distance_km", 5.0) if geom_entry else 5.0

        G.add_edge(
            u, v,
            base_time_min=base_t,
            distance_km=dist_km,
            congestion_factor=cong,
            ambient_temp_c=temp,
            road_name=road_name,
            geometry=coords,
            geom_direction=(u, v),
            initial_base_time=base_t,
            initial_congestion=cong,
            initial_temp=temp
        )

load_default_graph()
router = AgriPathFinder(G)

# In-memory dynamic state (for local single-process runs)
active_orders_store = copy.deepcopy(DEFAULT_ORDERS)
active_fleet_store = copy.deepcopy(DEFAULT_FLEET)
active_incidents: List[Dict[str, Any]] = []
latest_plan_cache: Dict[str, Any] = {}


# -------------------------------------------------------------
# Request / Response Schemas
# -------------------------------------------------------------
class DisruptionPayload(BaseModel):
    u: str
    v: str
    congestion_multiplier: float = Field(..., ge=1.0, le=10.0)
    ambient_temp_c: float = Field(..., ge=15.0, le=55.0)
    incident_type: Optional[str] = "Thermal Spoilage & Traffic Jam"
    incidents: Optional[List[Dict[str, Any]]] = None

class OrderCreatePayload(BaseModel):
    order_id: str
    destination_node: str
    weight_kg: float
    expiry_window_min: float
    produce_type: str = "SPINACH"
    priority: str = "Standard"

class DispatchPlanPayload(BaseModel):
    orders: Optional[List[OrderCreatePayload]] = None
    incidents: Optional[List[Dict[str, Any]]] = None

class VehicleCreatePayload(BaseModel):
    vehicle_id: str
    name: str
    capacity_kg: float
    max_shift_min: float
    is_refrigerated: bool
    model_type: str = "Custom Fleet Vehicle"


# -------------------------------------------------------------
# Helpers
# -------------------------------------------------------------
def build_working_graph(incidents: Optional[List[Dict[str, Any]]] = None) -> nx.Graph:
    """
    Returns a working copy of the road graph. If `incidents` is explicitly passed
    (stateless serverless mode), resets edges to baseline and applies those incidents.
    """
    if incidents is None:
        return G

    wg = G.copy()
    for u, v in wg.edges:
        wg[u][v]["congestion_factor"] = wg[u][v].get("initial_congestion", 1.0)
        wg[u][v]["ambient_temp_c"] = wg[u][v].get("initial_temp", 30.0)

    for inc in incidents:
        edge = inc.get("edge", [])
        if len(edge) == 2 and wg.has_edge(edge[0], edge[1]):
            u, v = edge[0], edge[1]
            wg[u][v]["congestion_factor"] = float(inc.get("new_congestion", 1.0))
            wg[u][v]["ambient_temp_c"] = float(inc.get("new_temp", 30.0))
    return wg


def get_edge_polyline(graph: nx.Graph, u: str, v: str) -> List[List[float]]:
    edge_data = graph[u][v]
    geom = edge_data.get("geometry")
    if not geom:
        return [list(graph.nodes[u]["pos"]), list(graph.nodes[v]["pos"])]
    geom_dir = edge_data.get("geom_direction", (u, v))
    if geom_dir == (u, v):
        return geom
    return list(reversed(geom))


# -------------------------------------------------------------
# API Router (mounted at both /api/* and /*)
# -------------------------------------------------------------
api_router = APIRouter()

@api_router.get("/health")
def health():
    return {
        "engine": "AgriFresh Cold-Chain Logistics Engine",
        "status": "online",
        "nodes_count": G.number_of_nodes(),
        "edges_count": G.number_of_edges(),
        "docs_url": "/docs"
    }

@api_router.get("/network")
def get_network():
    nodes_out = [
        {
            "id": n,
            "label": G.nodes[n]["label"],
            "pos": G.nodes[n]["pos"],
            "type": G.nodes[n].get("type", "TRANSIT"),
            "description": G.nodes[n].get("description", "")
        }
        for n in G.nodes
    ]
    edges_out = [
        {
            "from": u,
            "to": v,
            "road_name": G[u][v].get("road_name", f"{u}-{v}"),
            "base_time": G[u][v]["base_time_min"],
            "distance_km": G[u][v].get("distance_km", 5.0),
            "congestion": G[u][v]["congestion_factor"],
            "temp": G[u][v]["ambient_temp_c"],
            "geometry": G[u][v].get("geometry", [list(G.nodes[u]["pos"]), list(G.nodes[v]["pos"])]),
            "is_disrupted": G[u][v]["congestion_factor"] > 1.5 or G[u][v]["ambient_temp_c"] > 38.0
        }
        for u, v in G.edges
    ]
    return {
        "nodes": nodes_out,
        "edges": edges_out,
        "active_incidents": active_incidents,
        "routing_source": "OSRM OpenStreetMap Real-World Road Network (Gwalior)"
    }

@api_router.post("/network/sync-osrm")
def sync_live_osrm():
    """Fetches fresh road-snapped polyline geometries and durations directly from OSRM public API."""
    updated_count = 0
    for u, v in G.edges:
        p1 = G.nodes[u]["pos"]
        p2 = G.nodes[v]["pos"]
        try:
            url = f"http://router.project-osrm.org/route/v1/driving/{p1[1]},{p1[0]};{p2[1]},{p2[0]}?overview=full&geometries=geojson"
            req = urllib.request.urlopen(url, timeout=6)
            data = json.loads(req.read().decode())
            if data.get("code") == "Ok" and data.get("routes"):
                route = data["routes"][0]
                coords_latlon = [[round(pt[1], 5), round(pt[0], 5)] for pt in route["geometry"]["coordinates"]]
                G[u][v]["geometry"] = coords_latlon
                G[u][v]["geom_direction"] = (u, v)
                G[u][v]["distance_km"] = round(route["distance"] / 1000.0, 2)
                updated_count += 1
        except Exception:
            continue
    return {"status": "synced", "edges_updated": updated_count}

@api_router.get("/produce/catalog")
def get_produce_catalog():
    return {"catalog": PRODUCE_TYPES}

@api_router.get("/orders")
def get_orders():
    return {"orders": active_orders_store}

@api_router.post("/orders")
def add_order(payload: OrderCreatePayload):
    if payload.destination_node not in G.nodes:
        raise HTTPException(status_code=400, detail=f"Destination node {payload.destination_node} does not exist.")

    order_dict = payload.model_dump()
    active_orders_store.append(order_dict)
    return {"status": "created", "order": order_dict}

@api_router.get("/fleet")
def get_fleet():
    return {"fleet": active_fleet_store}

@api_router.post("/dispatch/plan")
def plan_dispatch(payload: Optional[DispatchPlanPayload] = None):
    global latest_plan_cache

    working_G = build_working_graph(payload.incidents if payload and payload.incidents is not None else None)
    working_router = AgriPathFinder(working_G)

    orders_source = (
        [o.model_dump() for o in payload.orders]
        if payload and payload.orders is not None
        else active_orders_store
    )

    vehicles = [
        Vehicle(
            v["vehicle_id"],
            capacity_kg=v["capacity_kg"],
            max_shift_min=v["max_shift_min"],
            is_refrigerated=v["is_refrigerated"],
            name=v.get("name", v["vehicle_id"]),
            model_type=v.get("model_type", "Standard")
        )
        for v in active_fleet_store
    ]

    orders = [
        ProduceOrder(
            o["order_id"],
            destination_node=o["destination_node"],
            weight_kg=o["weight_kg"],
            expiry_window_min=o["expiry_window_min"],
            produce_name=PRODUCE_TYPES.get(o.get("produce_type", "TOMATOES"), {}).get("name", "Perishable Crate"),
            priority=o.get("priority", "Standard")
        )
        for o in orders_source
    ]

    # Pre-calculated dynamic transit time matrix using NetworkX Dijkstra
    dist_matrix = {}
    for n1 in working_G.nodes:
        dist_matrix[n1] = {}
        for n2 in working_G.nodes:
            if n1 == n2:
                dist_matrix[n1][n2] = 0.0
            else:
                try:
                    sp_time = nx.shortest_path_length(
                        working_G, source=n1, target=n2,
                        weight=lambda u, v, d: d.get("base_time_min", 10.0) * d.get("congestion_factor", 1.0)
                    )
                    dist_matrix[n1][n2] = round(sp_time, 2)
                except nx.NetworkXNoPath:
                    dist_matrix[n1][n2] = 999.0

    csp = AgriFleetCSP(vehicles, orders, dist_matrix)
    assignments = csp.solve()

    if not assignments:
        raise HTTPException(
            status_code=422,
            detail="No feasible CSP assignment satisfies cargo weight, driver shift, & produce shelf-life limits."
        )

    routes = {}
    fleet_summary = {
        "total_payload_kg": 0.0,
        "total_cost_index": 0.0,
        "total_transit_min": 0.0,
        "total_pdi_spoilage": 0.0
    }

    for vid, assigned_orders in assignments.items():
        vehicle_meta = next((v for v in vehicles if v.vehicle_id == vid), None)
        is_refrigerated = vehicle_meta.is_refrigerated if vehicle_meta else False

        stops = ["HUB"] + [o.destination_node for o in assigned_orders] + ["HUB"]
        full_path: List[str] = []
        all_edge_breakdowns: List[Dict[str, Any]] = []
        total_cost = 0.0
        total_time = 0.0
        total_pdi = 0.0
        search_traces = []

        for i in range(len(stops) - 1):
            sub_path, cost, breakdowns, stats = working_router.find_optimal_spoilage_route(
                stops[i], stops[i+1], is_refrigerated=is_refrigerated
            )
            if full_path:
                full_path.extend(sub_path[1:])
            else:
                full_path.extend(sub_path)

            all_edge_breakdowns.extend(breakdowns)
            total_cost += cost
            total_time += stats.get("total_transit_min", 0.0)
            total_pdi += stats.get("total_pdi", 0.0)
            search_traces.append({
                "leg": f"{stops[i]} ➔ {stops[i+1]}",
                "stats": stats
            })

        full_path_coords: List[List[float]] = []
        coord_edges: List[List[str]] = []
        for idx in range(len(full_path) - 1):
            u_n, v_n = full_path[idx], full_path[idx + 1]
            seg_pts = get_edge_polyline(working_G, u_n, v_n)
            if not full_path_coords:
                full_path_coords.extend(seg_pts)
                coord_edges.extend([[u_n, v_n]] * (len(seg_pts) - 1))
            else:
                full_path_coords.extend(seg_pts[1:])
                coord_edges.extend([[u_n, v_n]] * (len(seg_pts) - 1))

        if not full_path_coords and full_path:
            full_path_coords = [list(working_G.nodes[full_path[0]]["pos"])]

        assigned_weight = sum(o.weight_kg for o in assigned_orders)
        capacity = vehicle_meta.capacity_kg if vehicle_meta else 500.0
        max_shift = vehicle_meta.max_shift_min if vehicle_meta else 240.0

        routes[vid] = {
            "vehicle_id": vid,
            "vehicle_name": vehicle_meta.name if vehicle_meta else vid,
            "is_refrigerated": is_refrigerated,
            "model_type": vehicle_meta.model_type if vehicle_meta else "Standard",
            "capacity_kg": capacity,
            "assigned_weight_kg": round(assigned_weight, 1),
            "utilization_pct": round((assigned_weight / capacity) * 100, 1),
            "orders": [o.to_dict() for o in assigned_orders],
            "stops": stops,
            "path": full_path,
            "path_coords": full_path_coords,
            "coord_edges": coord_edges,
            "cost_index": round(total_cost, 2),
            "estimated_transit_min": round(total_time, 1),
            "shift_utilization_pct": round((total_time / max_shift) * 100, 1),
            "produce_deterioration_index": round(total_pdi, 2),
            "edge_breakdowns": all_edge_breakdowns,
            "search_traces": search_traces
        }

        fleet_summary["total_payload_kg"] += assigned_weight
        fleet_summary["total_cost_index"] += total_cost
        fleet_summary["total_transit_min"] += total_time
        fleet_summary["total_pdi_spoilage"] += total_pdi

    fleet_summary["total_payload_kg"] = round(fleet_summary["total_payload_kg"], 1)
    fleet_summary["total_cost_index"] = round(fleet_summary["total_cost_index"], 2)
    fleet_summary["total_transit_min"] = round(fleet_summary["total_transit_min"], 1)
    fleet_summary["total_pdi_spoilage"] = round(fleet_summary["total_pdi_spoilage"], 2)

    response_data = {
        "status": "optimized",
        "csp_trace": csp.trace_steps,
        "fleet_routes": routes,
        "fleet_summary": fleet_summary
    }

    latest_plan_cache = copy.deepcopy(response_data)
    return response_data

@api_router.post("/benchmark/compare")
def compare_routing_algorithms(u: str = "HUB", v: str = "RETAIL_1"):
    """
    Benchmarks Standard Shortest-Distance Dijkstra vs Perishable-Aware A*.
    Demonstrates the quantitative value of cold-chain spoilage modeling.
    """
    if u not in G.nodes or v not in G.nodes:
        raise HTTPException(status_code=400, detail="Invalid origin or destination node")

    try:
        standard_path = nx.shortest_path(
            G, source=u, target=v,
            weight=lambda n1, n2, d: d.get("initial_base_time", 10.0)
        )
    except nx.NetworkXNoPath:
        standard_path = []

    std_actual_time = 0.0
    std_pdi = 0.0
    for i in range(len(standard_path) - 1):
        _, breakdown = router.get_edge_spoilage_cost(standard_path[i], standard_path[i+1], is_refrigerated=False)
        std_actual_time += breakdown["actual_time"]
        std_pdi += breakdown["pdi_increment"]

    opt_path, opt_cost, _, opt_stats = router.find_optimal_spoilage_route(u, v, is_refrigerated=False)

    pdi_saved = max(0.0, std_pdi - opt_stats["total_pdi"])
    pct_spoilage_reduction = round((pdi_saved / max(1.0, std_pdi)) * 100, 1)

    return {
        "origin": u,
        "destination": v,
        "standard_distance_routing": {
            "name": "Standard Shortest-Distance Navigation (Dijkstra)",
            "path": standard_path,
            "transit_time_min": round(std_actual_time, 1),
            "spoilage_index_pdi": round(std_pdi, 1),
            "cold_chain_status": "HIGH SPOILAGE RISK" if std_pdi > 25 else "ACCEPTABLE"
        },
        "perishable_aware_astar": {
            "name": "AgriFresh Spoilage-Mitigated Routing (A*)",
            "path": opt_path,
            "transit_time_min": opt_stats["total_transit_min"],
            "spoilage_index_pdi": opt_stats["total_pdi"],
            "cold_chain_status": "OPTIMAL FRESHNESS"
        },
        "benefit_metrics": {
            "spoilage_reduction_pct": pct_spoilage_reduction,
            "pdi_points_saved": round(pdi_saved, 1),
            "estimated_produce_value_saved_usd": round(pdi_saved * 42.5, 2)
        }
    }

@api_router.post("/disruption/simulate")
def inject_disruption(payload: DisruptionPayload):
    u, v = payload.u, payload.v
    if not G.has_edge(u, v):
        if G.has_edge(v, u):
            u, v = v, u
        else:
            raise HTTPException(status_code=404, detail=f"Edge ({payload.u}, {payload.v}) not found in road network")

    working_G = build_working_graph(payload.incidents if payload.incidents is not None else None)
    prev_cong = working_G[u][v]["congestion_factor"]
    prev_temp = working_G[u][v]["ambient_temp_c"]

    # Update local graph & working graph
    G[u][v]["congestion_factor"] = payload.congestion_multiplier
    G[u][v]["ambient_temp_c"] = payload.ambient_temp_c
    working_G[u][v]["congestion_factor"] = payload.congestion_multiplier
    working_G[u][v]["ambient_temp_c"] = payload.ambient_temp_c

    incident_record = {
        "id": f"INC_{len(payload.incidents) + 1 if payload.incidents is not None else len(active_incidents) + 1}",
        "edge": [u, v],
        "road_name": working_G[u][v].get("road_name", f"{u}-{v}"),
        "previous_congestion": prev_cong,
        "new_congestion": payload.congestion_multiplier,
        "previous_temp": prev_temp,
        "new_temp": payload.ambient_temp_c,
        "incident_type": payload.incident_type
    }
    active_incidents.append(incident_record)

    working_router = AgriPathFinder(working_G)
    ambient_path, ambient_cost, _, _ = working_router.find_optimal_spoilage_route(u, "RETAIL_1", is_refrigerated=False)
    reefer_path, reefer_cost, _, _ = working_router.find_optimal_spoilage_route(u, "RETAIL_1", is_refrigerated=True)

    return {
        "event": "Disruption registered",
        "incident": incident_record,
        "affected_edge": [u, v],
        "ambient_reroute": {
            "path": ambient_path,
            "cost_index": round(ambient_cost, 2)
        },
        "reefer_reroute": {
            "path": reefer_path,
            "cost_index": round(reefer_cost, 2)
        }
    }

@api_router.post("/disruption/reset")
def reset_disruptions():
    active_incidents.clear()
    for u, v in G.edges:
        G[u][v]["congestion_factor"] = G[u][v].get("initial_congestion", 1.0)
        G[u][v]["ambient_temp_c"] = G[u][v].get("initial_temp", 30.0)

    return {"status": "reset", "message": "All network edges restored to baseline nominal conditions."}

@api_router.get("/telemetry/snapshot")
def get_telemetry_snapshot(progress: float = 0.5):
    """
    Simulates real-time IoT sensory telemetry along the planned routes
    given a progress fraction (0.0 to 1.0).
    """
    if not latest_plan_cache or "fleet_routes" not in latest_plan_cache:
        return {"status": "idle", "active_vehicles": [], "vehicles": []}

    telemetry_list = []
    routes = latest_plan_cache["fleet_routes"]

    for vid, r in routes.items():
        coords = r["path_coords"]
        if not coords or len(coords) < 2:
            continue

        total_segments = len(coords) - 1
        scaled_p = max(0.0, min(1.0, progress)) * total_segments
        curr_seg = int(scaled_p)
        if curr_seg >= total_segments:
            curr_seg = total_segments - 1
            local_t = 1.0
        else:
            local_t = scaled_p - curr_seg

        p1 = coords[curr_seg]
        p2 = coords[curr_seg + 1]

        current_lat = p1[0] + (p2[0] - p1[0]) * local_t
        current_lon = p1[1] + (p2[1] - p1[1]) * local_t

        coord_edges = r.get("coord_edges", [])
        if curr_seg < len(coord_edges):
            u_node, v_node = coord_edges[curr_seg]
        else:
            u_node = r["path"][min(curr_seg, len(r["path"]) - 1)]
            v_node = r["path"][min(curr_seg + 1, len(r["path"]) - 1)]
        edge_data = G.get_edge_data(u_node, v_node) or {}
        ambient_t = edge_data.get("ambient_temp_c", 32.0)
        cong = edge_data.get("congestion_factor", 1.0)

        is_ref = r["is_refrigerated"]
        internal_temp = 3.5 + (ambient_t - 30.0) * 0.04 if is_ref else (ambient_t - 2.0 + local_t * 3.0)
        humidity_pct = 85.0 if is_ref else 55.0 - (ambient_t - 25.0) * 1.2
        spoilage_pdi = r["produce_deterioration_index"] * progress

        if internal_temp > 18.0:
            spoilage_risk = "CRITICAL"
        elif internal_temp > 10.0:
            spoilage_risk = "ELEVATED"
        elif internal_temp > 6.0:
            spoilage_risk = "MODERATE"
        else:
            spoilage_risk = "OPTIMAL_COLD_CHAIN"

        telemetry_list.append({
            "vehicle_id": vid,
            "vehicle_name": r["vehicle_name"],
            "is_refrigerated": is_ref,
            "current_lat": round(current_lat, 5),
            "current_lon": round(current_lon, 5),
            "current_edge": f"{u_node} ➔ {v_node}",
            "current_road": edge_data.get("road_name", "Transit link"),
            "speed_kmh": round(45.0 / cong, 1),
            "internal_temp_c": round(internal_temp, 1),
            "ambient_temp_c": round(ambient_t, 1),
            "humidity_pct": round(max(30.0, humidity_pct), 1),
            "accumulated_pdi": round(spoilage_pdi, 2),
            "risk_status": spoilage_risk,
            "active_orders_count": len(r["orders"])
        })

    return {
        "status": "streaming",
        "progress": progress,
        "vehicles": telemetry_list
    }


# Mount API router under /api (Vercel & unified proxy) AND root (direct compatibility)
app.include_router(api_router, prefix="/api")
app.include_router(api_router)

# Mount static frontend build when running locally as a single FastAPI server
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(os.path.join(frontend_dist, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

@app.get("/")
def serve_index():
    index_file = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "engine": "AgriFresh Cold-Chain Logistics Engine",
        "status": "online",
        "frontend_build": "Run 'npm run build' in frontend directory to serve UI here, or run 'npm run dev' on port 5173",
        "docs": "/docs"
    }
