import sys
from main import plan_dispatch, inject_disruption, DisruptionPayload, get_network

print("Testing get_network()...")
net = get_network()
print(f"Nodes: {len(net['nodes'])}, Edges: {len(net['edges'])}")

print("\nTesting plan_dispatch()...")
plan = plan_dispatch()
print(f"Status: {plan['status']}")
print(f"CSP Trace steps: {len(plan['csp_trace'])}")
for vid, r in plan['fleet_routes'].items():
    print(f"Vehicle {vid}: {r['vehicle_name']}")
    print(f"  Path: {' -> '.join(r['path'])}")
    print(f"  Cost Index: {r['cost_index']}, PDI: {r['produce_deterioration_index']}, Weight: {r['assigned_weight_kg']}kg")

print("\nTesting Disruption Injection on HUB -> RETAIL_1 (Heat 44C, Congestion 4.8x)...")
res = inject_disruption(DisruptionPayload(u="HUB", v="RETAIL_1", congestion_multiplier=4.8, ambient_temp_c=44.0))
print("Ambient vehicle reroute:", " -> ".join(res["ambient_reroute"]["path"]), "Cost:", res["ambient_reroute"]["cost_index"])
print("Reefer vehicle reroute:", " -> ".join(res["reefer_reroute"]["path"]), "Cost:", res["reefer_reroute"]["cost_index"])
print("\nALL BACKEND TESTS PASSED!")

