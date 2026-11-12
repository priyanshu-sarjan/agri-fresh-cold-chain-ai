"""
AgriFresh Cold-Chain Logistics Engine - CSP Scheduler
Handles discrete combinatorial vehicle-to-order allocation under payload,
duty shift, and produce shelf-life constraints with forward-checking trace.
"""
from typing import List, Dict, Any, Optional

class ProduceOrder:
    def __init__(
        self,
        order_id: str,
        destination_node: str,
        weight_kg: float,
        expiry_window_min: float,
        produce_name: str = "Fresh Produce",
        temp_threshold_c: float = 18.0,
        priority: str = "Standard"
    ):
        self.order_id = order_id
        self.destination_node = destination_node
        self.weight_kg = weight_kg
        self.expiry_window_min = expiry_window_min
        self.produce_name = produce_name
        self.temp_threshold_c = temp_threshold_c
        self.priority = priority

    def to_dict(self) -> Dict[str, Any]:
        return {
            "order_id": self.order_id,
            "destination_node": self.destination_node,
            "weight_kg": self.weight_kg,
            "expiry_window_min": self.expiry_window_min,
            "produce_name": self.produce_name,
            "temp_threshold_c": self.temp_threshold_c,
            "priority": self.priority
        }


class Vehicle:
    def __init__(
        self,
        vehicle_id: str,
        capacity_kg: float,
        max_shift_min: float,
        is_refrigerated: bool,
        name: str = "",
        model_type: str = "EcoVan"
    ):
        self.vehicle_id = vehicle_id
        self.capacity_kg = capacity_kg
        self.max_shift_min = max_shift_min
        self.is_refrigerated = is_refrigerated
        self.name = name or vehicle_id
        self.model_type = model_type

    def to_dict(self) -> Dict[str, Any]:
        return {
            "vehicle_id": self.vehicle_id,
            "capacity_kg": self.capacity_kg,
            "max_shift_min": self.max_shift_min,
            "is_refrigerated": self.is_refrigerated,
            "name": self.name,
            "model_type": self.model_type
        }


class AgriFleetCSP:
    def __init__(
        self,
        vehicles: List[Vehicle],
        orders: List[ProduceOrder],
        distance_matrix: Dict[str, Dict[str, float]]
    ):
        self.vehicles = vehicles
        self.orders = orders
        self.dist_matrix = distance_matrix  # in minutes of travel time
        self.trace_steps: List[Dict[str, Any]] = []

    def solve(self) -> Optional[Dict[str, List[ProduceOrder]]]:
        self.trace_steps.clear()
        assignment: Dict[str, List[ProduceOrder]] = {v.vehicle_id: [] for v in self.vehicles}
        
        self.trace_steps.append({
            "step": 0,
            "type": "INIT",
            "message": f"Starting CSP solver with {len(self.orders)} orders across {len(self.vehicles)} vehicles."
        })

        if self._backtrack(0, assignment):
            self.trace_steps.append({
                "step": len(self.trace_steps),
                "type": "SUCCESS",
                "message": "Feasible constraint-satisfying fleet schedule successfully established!"
            })
            return assignment

        self.trace_steps.append({
            "step": len(self.trace_steps),
            "type": "FAILED",
            "message": "No feasible assignment satisfies weight, shelf-life, and shift constraints."
        })
        return None

    def _is_valid(
        self,
        vehicle: Vehicle,
        current_orders: List[ProduceOrder],
        new_order: ProduceOrder,
        order_idx: int
    ) -> bool:
        # Constraint 1: Payload capacity
        total_weight = sum(o.weight_kg for o in current_orders) + new_order.weight_kg
        if total_weight > vehicle.capacity_kg:
            self.trace_steps.append({
                "step": len(self.trace_steps),
                "type": "PRUNED",
                "reason": "CAPACITY_EXCEEDED",
                "vehicle": vehicle.vehicle_id,
                "order": new_order.order_id,
                "detail": f"Weight {total_weight:.1f}kg exceeds capacity {vehicle.capacity_kg:.1f}kg"
            })
            return False

        # Constraint 2: Shift duration & produce expiry
        total_trip_time = 0.0
        prev_node = "HUB"
        temp_orders = current_orders + [new_order]

        for order in temp_orders:
            travel_time = self.dist_matrix.get(prev_node, {}).get(order.destination_node, 15.0)
            total_trip_time += travel_time

            # Shelf-life violation: Non-refrigerated vans must arrive before expiry; reefers extend shelf-life 2.5x
            effective_expiry = order.expiry_window_min if not vehicle.is_refrigerated else order.expiry_window_min * 2.5
            if total_trip_time > effective_expiry:
                self.trace_steps.append({
                    "step": len(self.trace_steps),
                    "type": "PRUNED",
                    "reason": "SHELF_LIFE_EXPIRED",
                    "vehicle": vehicle.vehicle_id,
                    "order": order.order_id,
                    "detail": f"Elapsed trip {total_trip_time:.1f}m > effective expiry {effective_expiry:.1f}m"
                })
                return False
            prev_node = order.destination_node

        # Return to hub travel time
        return_time = self.dist_matrix.get(prev_node, {}).get("HUB", 15.0)
        if (total_trip_time + return_time) > vehicle.max_shift_min:
            self.trace_steps.append({
                "step": len(self.trace_steps),
                "type": "PRUNED",
                "reason": "DRIVER_SHIFT_EXCEEDED",
                "vehicle": vehicle.vehicle_id,
                "order": new_order.order_id,
                "detail": f"Total trip {total_trip_time + return_time:.1f}m > driver shift {vehicle.max_shift_min:.1f}m"
            })
            return False

        return True

    def _backtrack(self, order_idx: int, assignment: Dict[str, List[ProduceOrder]]) -> bool:
        if order_idx == len(self.orders):
            return True

        current_order = self.orders[order_idx]

        for vehicle in self.vehicles:
            if self._is_valid(vehicle, assignment[vehicle.vehicle_id], current_order, order_idx):
                assignment[vehicle.vehicle_id].append(current_order)
                self.trace_steps.append({
                    "step": len(self.trace_steps),
                    "type": "ASSIGNED",
                    "vehicle": vehicle.vehicle_id,
                    "order": current_order.order_id,
                    "detail": f"Assigned {current_order.produce_name} to {vehicle.name}"
                })
                
                if self._backtrack(order_idx + 1, assignment):
                    return True
                
                # Backtrack step
                assignment[vehicle.vehicle_id].pop()
                self.trace_steps.append({
                    "step": len(self.trace_steps),
                    "type": "BACKTRACK",
                    "vehicle": vehicle.vehicle_id,
                    "order": current_order.order_id,
                    "detail": f"Reverted assignment for {current_order.order_id}"
                })

        return False

