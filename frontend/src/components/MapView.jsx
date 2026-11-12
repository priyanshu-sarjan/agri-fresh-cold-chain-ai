import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Thermometer, AlertTriangle, ShieldAlert, Sparkles, Navigation } from 'lucide-react';

// Create custom 3D tactile DivIcons for facilities
const createNodeIcon = (type, label) => {
  let bgGradient = 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)';
  let emoji = '❄️';
  let badgeColor = '#2563EB';

  if (type === 'FARM') {
    bgGradient = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
    emoji = '🌱';
    badgeColor = '#059669';
  } else if (type === 'RETAIL') {
    bgGradient = 'linear-gradient(135deg, #EA7317 0%, #C25406 100%)';
    emoji = '🛒';
    badgeColor = '#EA7317';
  } else if (type === 'SORTING') {
    bgGradient = 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)';
    emoji = '📦';
    badgeColor = '#7C3AED';
  } else if (type === 'TRANSIT') {
    bgGradient = 'linear-gradient(135deg, #64748B 0%, #475569 100%)';
    emoji = '🛣️';
    badgeColor = '#475569';
  }

  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
      <div style="
        background: ${bgGradient};
        color: white;
        padding: 6px 12px;
        border-radius: 18px;
        font-weight: 800;
        font-size: 11px;
        letter-spacing: 0.02em;
        display: flex;
        align-items: center;
        gap: 6px;
        border: 2.5px solid #FFFFFF;
        box-shadow: 0 8px 18px rgba(0,0,0,0.25), 0 3px 0 rgba(0,0,0,0.2), inset 0 2px 3px rgba(255,255,255,0.7);
        white-space: nowrap;
      ">
        <span style="font-size: 13px;">${emoji}</span>
        <span>${label}</span>
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid ${badgeColor};
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
      "></div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-clay-pin',
    html: html,
    iconSize: [120, 40],
    iconAnchor: [60, 40]
  });
};

// Create animated moving vehicle icon
const createVehicleIcon = (vehicle) => {
  const isReefer = vehicle.is_refrigerated;
  const borderColor = isReefer ? '#2563EB' : '#EA7317';
  const glow = isReefer ? 'rgba(37, 99, 235, 0.45)' : 'rgba(234, 115, 23, 0.45)';
  const truckEmoji = isReefer ? '🚛' : '🚚';
  const tempBadgeBg = vehicle.internal_temp_c > 15 ? '#FEE2E2' : (vehicle.internal_temp_c > 8 ? '#FEF3C7' : '#EFF6FF');
  const tempBadgeText = vehicle.internal_temp_c > 15 ? '#DC2626' : (vehicle.internal_temp_c > 8 ? '#D97706' : '#2563EB');

  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
      <div style="
        background: ${tempBadgeBg};
        color: ${tempBadgeText};
        font-weight: 800;
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 10px;
        border: 1.5px solid #FFF;
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        margin-bottom: 3px;
        white-space: nowrap;
      ">
        ${vehicle.internal_temp_c}°C | ${isReefer ? '❄️ Reefer' : '📦 Dry'}
      </div>
      <div style="
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border: 3.5px solid ${borderColor};
        box-shadow: 0 10px 20px ${glow}, 0 0 0 4px rgba(255,255,255,0.9);
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        ${truckEmoji}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-clay-pin',
    html: html,
    iconSize: [70, 70],
    iconAnchor: [35, 35]
  });
};

export default function MapView({ network, routes, activeIncidents, telemetryVehicles, onEdgeClick }) {
  const [mapStyle, setMapStyle] = React.useState('osm'); // 'osm' or 'positron'

  const getNodeCoords = (nodeId) => {
    const node = network.nodes.find(n => n.id === nodeId);
    return node ? node.pos : [26.2300, 78.1800];
  };

  // Route colors for vehicles
  const getVehicleRouteColor = (vid) => {
    if (vid.includes('REEFER_01')) return '#2563EB'; // Blue
    if (vid.includes('VAN_02')) return '#F59E0B';     // Amber
    if (vid.includes('REEFER_03')) return '#0D9488'; // Teal
    return '#8B5CF6';
  };

  return (
    <div className="clay-card" style={{ height: '560px', overflow: 'hidden', position: 'relative', border: '3px solid rgba(255, 255, 255, 0.95)' }}>
      {/* Top Map Status Banner */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '20px',
        zIndex: 1000,
        background: 'rgba(255, 253, 249, 0.94)',
        backdropFilter: 'blur(10px)',
        padding: '10px 16px',
        borderRadius: '20px',
        border: '2px solid rgba(255,255,255,0.95)',
        boxShadow: '0 8px 20px rgba(120, 85, 60, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }} />
          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#382314' }}>Gwalior Cold-Chain Corridor</span>
        </div>
        <span style={{ color: '#D1C0B2' }}>|</span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span className="clay-pill pill-blue" style={{ fontSize: '0.7rem' }}>❄️ Reefer Route</span>
          <span className="clay-pill pill-yellow" style={{ fontSize: '0.7rem' }}>📦 Ambient Transit</span>
          {activeIncidents && activeIncidents.length > 0 && (
            <span className="clay-pill pill-pink" style={{ fontSize: '0.7rem' }}>
              🔥 {activeIncidents.length} Disruption Active
            </span>
          )}
        </div>
      </div>

      {/* Top-Right Free Tile Layer Switcher (OSM / Carto Positron / Satellite) */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 1000,
        background: 'rgba(255, 253, 249, 0.94)',
        backdropFilter: 'blur(10px)',
        padding: '6px',
        borderRadius: '18px',
        border: '2px solid rgba(255,255,255,0.95)',
        boxShadow: '0 8px 20px rgba(120, 85, 60, 0.15)',
        display: 'flex',
        gap: '4px'
      }}>
        {[
          { id: 'osm', label: '🗺️ Street Map' },
          { id: 'positron', label: '✨ Light Map' },
          { id: 'satellite', label: '🛰️ Satellite' }
        ].map((layer) => (
          <button
            key={layer.id}
            onClick={() => setMapStyle(layer.id)}
            style={{
              padding: '6px 12px',
              borderRadius: '13px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.74rem',
              fontWeight: 800,
              background: mapStyle === layer.id ? '#EA7317' : 'transparent',
              color: mapStyle === layer.id ? '#FFFFFF' : '#533824',
              boxShadow: mapStyle === layer.id ? '0 4px 10px rgba(234, 115, 23, 0.35)' : 'none',
              transition: 'all 0.18s ease'
            }}
          >
            {layer.label}
          </button>
        ))}
      </div>

      <MapContainer 
        center={[26.2310, 78.1830]} 
        zoom={13} 
        style={{ height: '100%', width: '100%', borderRadius: '24px' }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />

        {mapStyle === 'osm' && (
          <TileLayer
            key="osm"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
        )}

        {mapStyle === 'positron' && (
          <TileLayer
            key="positron"
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={20}
          />
        )}

        {mapStyle === 'satellite' && (
          <TileLayer
            key="satellite"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP'
            maxZoom={19}
          />
        )}

        {/* 1. Render all Network Road Edges (Real-World Street-Snapped Geometry) */}
        {network.edges.map((edge, idx) => {
          const pos1 = getNodeCoords(edge.from);
          const pos2 = getNodeCoords(edge.to);
          const edgePositions = edge.geometry && edge.geometry.length > 1 ? edge.geometry : [pos1, pos2];
          const isDisrupted = edge.is_disrupted;

          return (
            <Polyline
              key={`edge-${edge.from}-${edge.to}-${idx}`}
              positions={edgePositions}
              pathOptions={{
                color: isDisrupted ? '#EF4444' : '#94A3B8',
                weight: isDisrupted ? 7 : 4,
                opacity: isDisrupted ? 0.95 : 0.55,
                dashArray: isDisrupted ? '6, 8' : undefined
              }}
              eventHandlers={{
                click: () => onEdgeClick && onEdgeClick(edge)
              }}
            >
              <Popup>
                <div style={{ padding: '4px', minWidth: '190px' }}>
                  <strong style={{ color: '#382314', fontSize: '0.95rem' }}>{edge.road_name}</strong>
                  <div style={{ margin: '6px 0', fontSize: '0.82rem', color: '#64748B' }}>
                    Segment: <strong>{edge.from} ➔ {edge.to}</strong> ({edge.distance_km || 5} km)
                  </div>
                  <div style={{ fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Base Transit Time:</span>
                    <strong>{edge.base_time} min</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Traffic Congestion:</span>
                    <strong style={{ color: edge.congestion > 1.5 ? '#DC2626' : '#059669' }}>
                      {edge.congestion}x {edge.congestion > 1.5 ? '(JAMMED)' : '(Smooth)'}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ambient Temperature:</span>
                    <strong style={{ color: edge.temp > 35 ? '#DC2626' : '#2563EB' }}>
                      {edge.temp}°C {edge.temp > 35 ? '⚠️ Thermal Strain' : '✅ Moderate'}
                    </strong>
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* 2. Render Calculated Fleet Trajectories (Real-World Street-Following Paths) */}
        {Object.entries(routes).map(([vid, route]) => {
          const positions = route.path_coords && route.path_coords.length > 1
            ? route.path_coords
            : route.path.map(id => getNodeCoords(id));
          const color = getVehicleRouteColor(vid);

          return (
            <React.Fragment key={`route-${vid}`}>
              {/* Thick soft glowing underlay */}
              <Polyline
                positions={positions}
                pathOptions={{
                  color: color,
                  weight: 12,
                  opacity: 0.25,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              {/* Sharp primary trajectory */}
              <Polyline
                positions={positions}
                pathOptions={{
                  color: color,
                  weight: 5,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              >
                <Tooltip sticky>
                  <div>
                    <strong>{route.vehicle_name}</strong> ({vid})<br />
                    Stops: {route.stops.join(' ➔ ')}<br />
                    Cost Index: {route.cost_index} | PDI: {route.produce_deterioration_index}
                  </div>
                </Tooltip>
              </Polyline>
            </React.Fragment>
          );
        })}

        {/* 3. Render Network Facility Nodes */}
        {network.nodes.map(node => (
          <Marker
            key={node.id}
            position={node.pos}
            icon={createNodeIcon(node.type, node.label)}
          >
            <Popup>
              <div style={{ padding: '6px', minWidth: '220px' }}>
                <span className="clay-pill pill-mint" style={{ fontSize: '0.7rem', marginBottom: '6px' }}>
                  {node.type} FACILITY
                </span>
                <h4 style={{ margin: '4px 0', fontSize: '1rem', color: '#382314' }}>{node.label}</h4>
                <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '8px' }}>{node.description}</p>
                <div style={{ fontSize: '0.78rem', background: '#F8FAFC', padding: '6px', borderRadius: '8px' }}>
                  <strong>Node ID:</strong> <code>{node.id}</code><br />
                  <strong>Coordinates:</strong> {node.pos[0].toFixed(4)}, {node.pos[1].toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. Render Live Animated Telemetry Vehicles */}
        {telemetryVehicles && telemetryVehicles.map(vehicle => (
          <Marker
            key={`live-${vehicle.vehicle_id}`}
            position={[vehicle.current_lat, vehicle.current_lon]}
            icon={createVehicleIcon(vehicle)}
            zIndexOffset={500}
          >
            <Popup>
              <div style={{ padding: '8px', minWidth: '230px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#382314' }}>{vehicle.vehicle_name}</strong>
                  <span className={`clay-pill ${vehicle.is_refrigerated ? 'pill-blue' : 'pill-yellow'}`} style={{ fontSize: '0.7rem' }}>
                    {vehicle.is_refrigerated ? 'Active Reefer' : 'Ambient Van'}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '8px' }}>
                  Current Road: <strong>{vehicle.current_road}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#FFFDF9', padding: '8px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>CARGO TEMP</span>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: vehicle.internal_temp_c > 10 ? '#DC2626' : '#2563EB' }}>
                      {vehicle.internal_temp_c}°C
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>AMBIENT TEMP</span>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: vehicle.ambient_temp_c > 35 ? '#DC2626' : '#059669' }}>
                      {vehicle.ambient_temp_c}°C
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>SPEED</span>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#334155' }}>
                      {vehicle.speed_kmh} km/h
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>PDI SPOILAGE</span>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#EA7317' }}>
                      {vehicle.accumulated_pdi}
                    </div>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

