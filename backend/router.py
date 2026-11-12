"""
AgriFresh Cold-Chain Logistics Engine - Quality-Weighted A* Search Engine
Implements an admissible Euclidean heuristic and dynamic Produce Deterioration Index (PDI)
to find minimum quality-loss trajectories through the temperature-augmented road graph.
"""
import heapq
import math
import networkx as nx
from typing import Dict, List, Tuple, Any, Optional

class AgriPathFinder:
    def __init__(self, graph: nx.Graph, max_speed_kmh: float = 60.0, alpha: float = 0.6, beta: float = 0.4):
        self.graph = graph
        self.max_speed_kmh = max_speed_kmh
        self.max_speed_km_per_min = max_speed_kmh / 60.0
        self.alpha = alpha  # congestion weight
        self.beta = beta    # thermal degradation weight

    def euclidean_heuristic(self, node_a: str, node_b: str) -> float:
        """
        Admissible & consistent Euclidean heuristic:
        h(n) = straight_line_distance(n, goal) / v_max
        Guarantees h(n) <= h*(n) since straight-line distance is lower bound on graph path length
        and v_max is upper bound on vehicle speed.
        """
        pos_a = self.graph.nodes[node_a]['pos']
        pos_b = self.graph.nodes[node_b]['pos']
        
        # Distance in km (WGS84 flat-plane projection approximation)
        dx = (pos_a[0] - pos_b[0]) * 111.0
        dy = (pos_a[1] - pos_b[1]) * 111.0 * math.cos(math.radians(pos_a[0]))
        distance_km = math.sqrt(dx * dx + dy * dy)
        
        return distance_km / self.max_speed_km_per_min

    def get_edge_spoilage_cost(
        self,
        u: str,
        v: str,
        is_refrigerated: bool = False
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculates edge cost: c(u, v) = base_time * (1 + alpha*(congestion-1) + beta*temp_penalty)
        Also computes detailed metrics for telemetry HUD.
        """
        edge_data = self.graph[u][v]
        base_time = edge_data.get('base_time_min', 10.0)
        congestion = edge_data.get('congestion_factor', 1.0)
        ambient_temp = edge_data.get('ambient_temp_c', 30.0)

        # Thermal Degradation calculation
        if is_refrigerated:
            # Active chilling keeps internal container at 2-6°C.
            # Only slight stress penalty if ambient > 38°C (cooling unit load)
            temp_penalty = max(0.0, (ambient_temp - 38.0) * 0.1)
            effective_cargo_temp = 4.0 + (ambient_temp - 30.0) * 0.05
        else:
            # Ambient crates absorb full solar/ambient heat.
            # Perishable goods deteriorate above 15°C threshold.
            temp_penalty = max(0.0, (ambient_temp - 15.0) / 5.0)
            effective_cargo_temp = ambient_temp

        # Cost components
        congestion_penalty = max(0.0, congestion - 1.0) * self.alpha
        thermal_penalty = temp_penalty * self.beta
        
        multiplier = 1.0 + congestion_penalty + thermal_penalty
        total_edge_cost = base_time * multiplier

        # Estimated spoilage increment (PDI: Produce Deterioration Index)
        # PDI increases with time spent * thermal stress
        pdi_increment = (base_time * congestion) * (1.0 + temp_penalty * 0.5)

        breakdown = {
            "base_time": round(base_time, 2),
            "actual_time": round(base_time * congestion, 2),
            "congestion": round(congestion, 2),
            "ambient_temp": round(ambient_temp, 1),
            "cargo_temp": round(effective_cargo_temp, 1),
            "temp_penalty": round(temp_penalty, 2),
            "pdi_increment": round(pdi_increment, 2),
            "total_edge_cost": round(total_edge_cost, 2)
        }
        return total_edge_cost, breakdown

    def find_optimal_spoilage_route(
        self,
        start: str,
        goal: str,
        is_refrigerated: bool = False
    ) -> Tuple[List[str], float, List[Dict[str, Any]], Dict[str, Any]]:
        """
        Calculates the minimum quality-loss path using A* search.
        Returns: (path, total_cost, edge_breakdowns, search_stats)
        """
        frontier: List[Tuple[float, float, str, List[str]]] = []
        heapq.heappush(frontier, (0.0, 0.0, start, [start]))
        
        cost_so_far: Dict[str, float] = {start: 0.0}
        nodes_explored = 0

        while frontier:
            f, current_g, current_node, path = heapq.heappop(frontier)
            nodes_explored += 1

            if current_node == goal:
                # Compile detailed edge breakdowns along the chosen path
                edge_breakdowns = []
                total_base_time = 0.0
                total_pdi = 0.0
                for i in range(len(path) - 1):
                    u, v = path[i], path[i+1]
                    cost, breakdown = self.get_edge_spoilage_cost(u, v, is_refrigerated)
                    edge_breakdowns.append({"from": u, "to": v, **breakdown})
                    total_base_time += breakdown["actual_time"]
                    total_pdi += breakdown["pdi_increment"]

                search_stats = {
                    "nodes_explored": nodes_explored,
                    "total_transit_min": round(total_base_time, 2),
                    "total_pdi": round(total_pdi, 2),
                    "admissible_heuristic_start": round(self.euclidean_heuristic(start, goal), 2)
                }
                return path, current_g, edge_breakdowns, search_stats

            for neighbor in self.graph.neighbors(current_node):
                edge_cost, _ = self.get_edge_spoilage_cost(current_node, neighbor, is_refrigerated)
                new_g = current_g + edge_cost

                if neighbor not in cost_so_far or new_g < cost_so_far[neighbor]:
                    cost_so_far[neighbor] = new_g
                    priority = new_g + self.euclidean_heuristic(neighbor, goal)
                    heapq.heappush(frontier, (priority, new_g, neighbor, path + [neighbor]))

        return [], float('inf'), [], {"nodes_explored": nodes_explored, "total_transit_min": 0, "total_pdi": 0}

