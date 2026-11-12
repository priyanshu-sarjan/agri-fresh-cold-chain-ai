import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import TelemetryHUD from './components/TelemetryHUD';
import DisruptionControls from './components/DisruptionControls';
import CSPInspectorModal from './components/CSPInspectorModal';
import ProduceCatalogModal from './components/ProduceCatalogModal';
import MathProofModal from './components/MathProofModal';
import { Cpu, Flame, ShieldAlert, Sparkles, AlertTriangle, ArrowRight, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';
import './clay.css';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// Helper to compute real-time interpolated vehicle telemetry client-side (zero lag, serverless-friendly)
function computeTelemetrySnapshot(prog, fleetRoutes, networkEdges) {
  if (!fleetRoutes || Object.keys(fleetRoutes).length === 0) return [];

  const findEdgeMeta = (uNode, vNode) => {
    if (!networkEdges) return null;
    return networkEdges.find(
      (e) => (e.from === uNode && e.to === vNode) || (e.from === vNode && e.to === uNode)
    );
  };

  const list = [];
  for (const [vid, r] of Object.entries(fleetRoutes)) {
    const coords = r.path_coords;
    if (!coords || coords.length < 2) continue;

    const totalSegments = coords.length - 1;
    const clamped = Math.max(0, Math.min(1, prog));
    const scaledP = clamped * totalSegments;
    let currSeg = Math.floor(scaledP);
    let localT = 0;
    if (currSeg >= totalSegments) {
      currSeg = totalSegments - 1;
      localT = 1.0;
    } else {
      localT = scaledP - currSeg;
    }

    const p1 = coords[currSeg];
    const p2 = coords[currSeg + 1];
    const currentLat = p1[0] + (p2[0] - p1[0]) * localT;
    const currentLon = p1[1] + (p2[1] - p1[1]) * localT;

    const coordEdges = r.coord_edges || [];
    const pair = coordEdges[currSeg] || [
      r.path[Math.min(currSeg, r.path.length - 1)],
      r.path[Math.min(currSeg + 1, r.path.length - 1)]
    ];
    const uNode = pair[0];
    const vNode = pair[1];
    const edgeData = findEdgeMeta(uNode, vNode) || {};

    const ambientT = edgeData.temp ?? 32.0;
    const cong = edgeData.congestion ?? 1.0;
    const isRef = r.is_refrigerated;
    const internalTemp = isRef
      ? 3.5 + (ambientT - 30.0) * 0.04
      : ambientT - 2.0 + localT * 3.0;
    const humidityPct = isRef ? 85.0 : 55.0 - (ambientT - 25.0) * 1.2;
    const spoilagePdi = r.produce_deterioration_index * clamped;

    let spoilageRisk = 'OPTIMAL_COLD_CHAIN';
    if (internalTemp > 18.0) spoilageRisk = 'CRITICAL';
    else if (internalTemp > 10.0) spoilageRisk = 'ELEVATED';
    else if (internalTemp > 6.0) spoilageRisk = 'MODERATE';

    list.push({
      vehicle_id: vid,
      vehicle_name: r.vehicle_name,
      is_refrigerated: isRef,
      current_lat: Number(currentLat.toFixed(5)),
      current_lon: Number(currentLon.toFixed(5)),
      current_edge: `${uNode} ➔ ${vNode}`,
      current_road: edgeData.road_name || 'Transit link',
      speed_kmh: Number((45.0 / cong).toFixed(1)),
      internal_temp_c: Number(internalTemp.toFixed(1)),
      ambient_temp_c: Number(ambientT.toFixed(1)),
      humidity_pct: Number(Math.max(30.0, humidityPct).toFixed(1)),
      accumulated_pdi: Number(spoilagePdi.toFixed(2)),
      risk_status: spoilageRisk,
      active_orders_count: r.orders ? r.orders.length : 0
    });
  }
  return list;
}

export default function App() {
  const [network, setNetwork] = useState({ nodes: [], edges: [], active_incidents: [] });
  const [routes, setRoutes] = useState({});
  const [fleetSummary, setFleetSummary] = useState(null);
  const [cspTrace, setCspTrace] = useState([]);
  const [catalog, setCatalog] = useState({});
  const [orders, setOrders] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState([]);
  
  // UI Modals
  const [isDisruptionOpen, setIsDisruptionOpen] = useState(false);
  const [isCSPOpen, setIsCSPOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isMathOpen, setIsMathOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeIncidentBanner, setActiveIncidentBanner] = useState(null);

  // Simulation Playback State
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0.35);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [telemetryVehicles, setTelemetryVehicles] = useState([]);

  // Fetch initial data
  useEffect(() => {
    const initLoad = async () => {
      const [netData, _, ordersData] = await Promise.all([
        fetchNetwork(),
        fetchCatalog(),
        fetchOrders()
      ]);
      await computeDispatchPlan(false, ordersData, [], netData?.edges);
    };
    initLoad();
  }, []);

  const fetchNetwork = async () => {
    try {
      const res = await fetch(`${API_BASE}/network`);
      const data = await res.json();
      setNetwork(data);
      return data;
    } catch (err) {
      console.error('Failed to load network:', err);
      return null;
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await fetch(`${API_BASE}/produce/catalog`);
      const data = await res.json();
      setCatalog(data.catalog || {});
    } catch (err) {
      console.error('Failed to load catalog:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders`);
      const data = await res.json();
      const loaded = data.orders || [];
      setOrders(loaded);
      return loaded;
    } catch (err) {
      console.error('Failed to load orders:', err);
      return [];
    }
  };

  const computeDispatchPlan = async (
    showConfetti = true,
    customOrders = null,
    customIncidents = null,
    customEdges = null
  ) => {
    setIsOptimizing(true);
    try {
      const ordersToSend = customOrders !== null ? customOrders : orders;
      const incidentsToSend = customIncidents !== null ? customIncidents : activeIncidents;
      const bodyPayload = {};
      if (ordersToSend && ordersToSend.length > 0) bodyPayload.orders = ordersToSend;
      if (incidentsToSend) bodyPayload.incidents = incidentsToSend;

      const res = await fetch(`${API_BASE}/dispatch/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      const newRoutes = data.fleet_routes || {};
      setRoutes(newRoutes);
      setFleetSummary(data.fleet_summary || null);
      setCspTrace(data.csp_trace || []);

      if (showConfetti) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#EA7317', '#10B981', '#3B82F6', '#F59E0B']
        });
      }
      setTelemetryVehicles(
        computeTelemetrySnapshot(progress, newRoutes, customEdges || network.edges)
      );
    } catch (err) {
      console.error('Dispatch planning failed:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Playback animation loop (smooth local interpolation)
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          let next = prev + 0.004 * playbackSpeed;
          if (next > 1.0) {
            next = 0.0;
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Keep telemetry synced whenever progress, routes, or network edges update
  useEffect(() => {
    setTelemetryVehicles(computeTelemetrySnapshot(progress, routes, network.edges));
  }, [progress, routes, network.edges]);

  const handleProgressChange = (newProgress) => {
    setProgress(newProgress);
  };

  const handleResetSimulation = () => {
    setProgress(0.0);
  };

  const handleInjectDisruption = async (payload) => {
    const res = await fetch(`${API_BASE}/disruption/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, incidents: activeIncidents })
    });
    const data = await res.json();
    setActiveIncidentBanner(data);

    const newIncident = data.incident;
    const nextIncidents = newIncident ? [...activeIncidents, newIncident] : activeIncidents;
    setActiveIncidents(nextIncidents);

    // Update network edges client-side so map highlights affected road immediately even on serverless
    const updatedEdges = network.edges.map((e) => {
      const match =
        (e.from === data.affected_edge[0] && e.to === data.affected_edge[1]) ||
        (e.from === data.affected_edge[1] && e.to === data.affected_edge[0]);
      if (!match) return e;
      return {
        ...e,
        congestion: payload.congestion_multiplier,
        temp: payload.ambient_temp_c,
        is_disrupted: payload.congestion_multiplier > 1.5 || payload.ambient_temp_c > 38.0
      };
    });
    setNetwork((prev) => ({
      ...prev,
      edges: updatedEdges,
      active_incidents: nextIncidents
    }));

    await computeDispatchPlan(false, orders, nextIncidents, updatedEdges);
    return data;
  };

  const handleResetDisruptions = async () => {
    await fetch(`${API_BASE}/disruption/reset`, { method: 'POST' });
    setActiveIncidentBanner(null);
    setActiveIncidents([]);
    const freshNet = await fetchNetwork();
    await computeDispatchPlan(false, orders, [], freshNet?.edges);
    setIsDisruptionOpen(false);
  };

  const handleAddOrder = async (orderPayload) => {
    await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const nextOrders = [...orders, orderPayload];
    setOrders(nextOrders);
    await computeDispatchPlan(true, nextOrders, activeIncidents);
  };

  const handleQuickGridlock = async () => {
    await handleInjectDisruption({
      u: 'HUB',
      v: 'RETAIL_1',
      congestion_multiplier: 4.8,
      ambient_temp_c: 44.0,
      incident_type: 'Central Expressway Heatwave & Traffic Gridlock'
    });
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px', minHeight: '100vh' }}>
      {/* 3D Tactile Navbar */}
      <Navbar
        onOpenCSP={() => setIsCSPOpen(true)}
        onOpenDisruption={() => setIsDisruptionOpen(true)}
        onOpenCatalog={() => setIsCatalogOpen(true)}
        onOpenMath={() => setIsMathOpen(true)}
        onComputeSchedule={() => computeDispatchPlan(true)}
        isOptimizing={isOptimizing}
      />

      {/* Hero Showcase Card styled directly following AI_UI.png reference */}
      <div className="clay-card" style={{ padding: '32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          {/* Left Column: Heading & Description */}
          <div style={{ flex: '1 1 500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span className="clay-pill pill-orange">
                #EA7317 HERO SYSTEM
              </span>
              <span className="clay-pill pill-mint">
                COLD-CHAIN 4.0
              </span>
              <span className="clay-pill pill-lavender">
                AUTONOMOUS DISPATCH
              </span>
            </div>

            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#382314', lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: '12px' }}>
              Perishable Quality-Loss A* Routing &amp; CSP Fleet Scheduling
            </h2>

            <p style={{ fontSize: '0.96rem', color: '#7C604B', lineHeight: 1.6, maxWidth: '640px', marginBottom: '20px' }}>
              In perishable logistics, shortest distance does not equal best freshness. AgriFresh combines a 
              <strong> Backtracking CSP Fleet Scheduler</strong> with a 
              <strong> Quality-Weighted A* Search Engine</strong> featuring an admissible Euclidean heuristic to mitigate produce spoilage across real-time thermal spikes and traffic jams.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => computeDispatchPlan(true)}
                disabled={isOptimizing}
                className="clay-btn clay-btn-orange"
              >
                <Cpu size={18} />
                {isOptimizing ? 'Evaluating CSP & A*...' : 'Compute Optimal CSP Schedule'}
              </button>

              <button
                onClick={handleQuickGridlock}
                className="clay-btn clay-btn-danger"
              >
                <Flame size={18} />
                Simulate Heat/Traffic Incident
              </button>

              {network.active_incidents && network.active_incidents.length > 0 && (
                <button
                  onClick={handleResetDisruptions}
                  className="clay-btn clay-btn-secondary"
                >
                  <RefreshCw size={18} />
                  Restore Baseline
                </button>
              )}
            </div>
          </div>

          {/* Right Column: 3D Steps Indicator (1, 2, 3 discs from AI_UI.png) */}
          <div style={{
            background: 'linear-gradient(135deg, #FFFDF9 0%, #FAF5EE 100%)',
            padding: '24px',
            borderRadius: '24px',
            border: '2px solid rgba(255,255,255,0.95)',
            boxShadow: '0 12px 28px -6px rgba(120, 85, 60, 0.12), inset 0 2px 4px rgba(255, 255, 255, 0.9)',
            minWidth: '320px',
            flex: '1 1 340px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#382314', letterSpacing: '0.04em' }}>
                HOW THE DUAL ENGINE WORKS
              </span>
              <div className="window-dots">
                <div className="window-dot dot-pink" />
                <div className="window-dot dot-purple" />
                <div className="window-dot dot-mint" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="clay-step-disc step-mint">1</div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#13603F', margin: 0 }}>
                    CSP Fleet Assignment
                  </h4>
                  <p style={{ fontSize: '0.76rem', color: '#7C604B', margin: 0 }}>
                    Enforces payload (Wmax), driver shift (Tmax), and shelf-life (Deadi).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="clay-step-disc step-lavender">2</div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#50278A', margin: 0 }}>
                    Quality-Weighted A* Search
                  </h4>
                  <p style={{ fontSize: '0.76rem', color: '#7C604B', margin: 0 }}>
                    Computes trajectory balancing base time with Produce Deterioration Index.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="clay-step-disc step-pink">3</div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#8E2047', margin: 0 }}>
                    IoT Telemetry & Dynamic Reroute
                  </h4>
                  <p style={{ fontSize: '0.76rem', color: '#7C604B', margin: 0 }}>
                    IoT sensor stream detects temperature spikes and instantly re-dispatches.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Incident Warning Alert Banner */}
      {activeIncidentBanner && (
        <div className="clay-card" style={{
          background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
          padding: '16px 24px',
          marginBottom: '24px',
          border: '2px solid #FDA4AF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '14px',
              background: '#EF4444',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#9F1239', fontSize: '0.92rem' }}>
                INCIDENT ACTIVE: {activeIncidentBanner.affected_edge.join(' ➔ ')} (Congestion {activeIncidentBanner.incident?.new_congestion}x, Temp {activeIncidentBanner.incident?.new_temp}°C)
              </div>
              <div style={{ fontSize: '0.8rem', color: '#BE123C' }}>
                Algorithmic dynamic reroute engaged! Ambient Van detour: <strong>{activeIncidentBanner.ambient_reroute?.path.join(' ➔ ')}</strong> (Cost: {activeIncidentBanner.ambient_reroute?.cost_index})
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setIsDisruptionOpen(true)} className="clay-btn clay-btn-sm clay-btn-secondary">
              View Disruption Manager
            </button>
            <button onClick={handleResetDisruptions} className="clay-btn clay-btn-sm clay-btn-orange">
              Reset Network
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Map (Left/Center) + Live Route Summary (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', marginBottom: '24px' }}>
        {/* Map View */}
        <div style={{ minWidth: 0 }}>
          <MapView
            network={network}
            routes={routes}
            activeIncidents={network.active_incidents}
            telemetryVehicles={telemetryVehicles}
            onEdgeClick={(edge) => {
              setIsDisruptionOpen(true);
            }}
          />
        </div>

        {/* Right Sidebar: Active Fleet Routes Overview */}
        <div className="clay-card" style={{ padding: '24px', height: '560px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#382314', margin: 0 }}>
              Active Fleet Routes
            </h3>
            <span className="clay-pill pill-orange" style={{ fontSize: '0.7rem' }}>
              {Object.keys(routes).length} Vehicles
            </span>
          </div>

          {Object.entries(routes).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7C604B' }}>
              <p style={{ fontSize: '0.88rem' }}>No routes computed yet.</p>
              <button onClick={() => computeDispatchPlan(true)} className="clay-btn clay-btn-orange clay-btn-sm" style={{ marginTop: '12px' }}>
                Compute Optimal Schedule
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(routes).map(([vid, r]) => {
                const isReefer = r.is_refrigerated;
                const color = isReefer ? '#2563EB' : '#F59E0B';

                return (
                  <div key={vid} className="clay-card-flat" style={{ padding: '16px', borderLeft: `5px solid ${color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#382314' }}>{r.vehicle_name}</strong>
                      <span className={`clay-pill ${isReefer ? 'pill-blue' : 'pill-yellow'}`} style={{ fontSize: '0.65rem' }}>
                        {isReefer ? 'Reefer' : 'Dry Van'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '8px' }}>
                      Path: <strong style={{ color: '#1E293B' }}>{r.path.join(' ➔ ')}</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', background: '#FAF6F0', padding: '8px 10px', borderRadius: '12px' }}>
                      <div>
                        <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>COST INDEX</span>
                        <div style={{ fontWeight: 800, color: '#EA7317' }}>{r.cost_index}</div>
                      </div>
                      <div>
                        <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>PDI SPOILAGE</span>
                        <div style={{ fontWeight: 800, color: isReefer ? '#2563EB' : '#D97706' }}>
                          {r.produce_deterioration_index}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>EST. TRANSIT</span>
                        <div style={{ fontWeight: 800, color: '#334155' }}>{r.estimated_transit_min} min</div>
                      </div>
                      <div>
                        <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>CARGO WEIGHT</span>
                        <div style={{ fontWeight: 800, color: '#059669' }}>{r.assigned_weight_kg} kg</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Live IoT Sensor Telemetry HUD & Playback */}
      <div style={{ marginBottom: '24px' }}>
        <TelemetryHUD
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          progress={progress}
          onProgressChange={handleProgressChange}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          onReset={handleResetSimulation}
          vehiclesTelemetry={telemetryVehicles}
          fleetRoutes={routes}
          fleetSummary={fleetSummary}
        />
      </div>

      {/* Modals */}
      <DisruptionControls
        isOpen={isDisruptionOpen}
        onClose={() => setIsDisruptionOpen(false)}
        edges={network.edges}
        activeIncidents={network.active_incidents}
        onInjectDisruption={handleInjectDisruption}
        onResetDisruptions={handleResetDisruptions}
      />

      <CSPInspectorModal
        isOpen={isCSPOpen}
        onClose={() => setIsCSPOpen(false)}
        cspTrace={cspTrace}
        fleetRoutes={routes}
      />

      <ProduceCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        catalog={catalog}
        orders={orders}
        nodes={network.nodes}
        onAddOrder={handleAddOrder}
      />

      <MathProofModal
        isOpen={isMathOpen}
        onClose={() => setIsMathOpen(false)}
      />
    </div>
  );
}
