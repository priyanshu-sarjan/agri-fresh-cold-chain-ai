"""
AgriFresh Cold-Chain Logistics Engine - Produce Catalog & Presets
Defines perishable goods parameters, shelf life degradation curves, and standard fleets.
"""
from typing import Dict, Any, List

PRODUCE_TYPES: Dict[str, Dict[str, Any]] = {
    "STRAWBERRIES": {
        "name": "Organic Alpine Strawberries",
        "category": "Berries",
        "optimal_temp_c": 2.0,
        "max_ambient_temp_c": 12.0,
        "spoilage_rate_per_deg": 1.4,
        "icon": "🍓",
        "color": "#FF6B8B"
    },
    "SPINACH": {
        "name": "Hydroponic Baby Spinach",
        "category": "Leafy Greens",
        "optimal_temp_c": 4.0,
        "max_ambient_temp_c": 14.0,
        "spoilage_rate_per_deg": 1.25,
        "icon": "🥬",
        "color": "#48BB78"
    },
    "TOMATOES": {
        "name": "Vine-Ripened Heirloom Tomatoes",
        "category": "Solanaceae",
        "optimal_temp_c": 13.0,
        "max_ambient_temp_c": 22.0,
        "spoilage_rate_per_deg": 0.9,
        "icon": "🍅",
        "color": "#F56565"
    },
    "DAIRY_CHEESE": {
        "name": "Artisanal Goat & Cow Cheese",
        "category": "Dairy",
        "optimal_temp_c": 4.0,
        "max_ambient_temp_c": 10.0,
        "spoilage_rate_per_deg": 1.5,
        "icon": "🧀",
        "color": "#ECC94B"
    },
    "BLUEBERRIES": {
        "name": "Highbush Fresh Blueberries",
        "category": "Berries",
        "optimal_temp_c": 1.0,
        "max_ambient_temp_c": 12.0,
        "spoilage_rate_per_deg": 1.3,
        "icon": "🫐",
        "color": "#4299E1"
    },
    "MUSHROOMS": {
        "name": "Organic Shiitake Mushrooms",
        "category": "Fungi",
        "optimal_temp_c": 3.0,
        "max_ambient_temp_c": 15.0,
        "spoilage_rate_per_deg": 1.1,
        "icon": "🍄",
        "color": "#ED8936"
    }
}

DEFAULT_FLEET = [
    {
        "vehicle_id": "REEFER_01",
        "name": "ThermoKing Reefer Express",
        "capacity_kg": 500.0,
        "max_shift_min": 240.0,
        "is_refrigerated": True,
        "model_type": "Chilled Reefer Van (-2°C to 8°C)"
    },
    {
        "vehicle_id": "VAN_02",
        "name": "EcoCrate Transit Standard",
        "capacity_kg": 250.0,
        "max_shift_min": 180.0,
        "is_refrigerated": False,
        "model_type": "Ventilated Dry Van (Ambient)"
    },
    {
        "vehicle_id": "REEFER_03",
        "name": "CryoFleet Sprint Reefer",
        "capacity_kg": 400.0,
        "max_shift_min": 210.0,
        "is_refrigerated": True,
        "model_type": "Dual-Temp Reefer Cruiser"
    }
]

DEFAULT_ORDERS = [
    {
        "order_id": "ORD_101",
        "destination_node": "FARM_A",
        "weight_kg": 120.0,
        "expiry_window_min": 90.0,
        "produce_type": "SPINACH",
        "priority": "High"
    },
    {
        "order_id": "ORD_102",
        "destination_node": "FARM_B",
        "weight_kg": 180.0,
        "expiry_window_min": 60.0,
        "produce_type": "STRAWBERRIES",
        "priority": "Urgent"
    },
    {
        "order_id": "ORD_103",
        "destination_node": "RETAIL_1",
        "weight_kg": 200.0,
        "expiry_window_min": 120.0,
        "produce_type": "TOMATOES",
        "priority": "Standard"
    },
    {
        "order_id": "ORD_104",
        "destination_node": "RETAIL_2",
        "weight_kg": 100.0,
        "expiry_window_min": 45.0,
        "produce_type": "DAIRY_CHEESE",
        "priority": "Critical"
    }
]

