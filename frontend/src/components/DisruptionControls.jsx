import React, { useState } from 'react';
import { Flame, AlertTriangle, RotateCcw, Zap, Compass, CheckCircle2, X } from 'lucide-react';

export default function DisruptionControls({
  isOpen,
  onClose,
  edges,
  activeIncidents,
  onInjectDisruption,
  onResetDisruptions
}) {
  const [selectedEdge, setSelectedEdge] = useState('HUB-RETAIL_1');
  const [congestion, setCongestion] = useState(4.5);
  const [temperature, setTemperature] = useState(42.0);
  const [incidentName, setIncidentName] = useState('High Thermal Solar Load & Traffic Congestion');
  const [lastRerouteResult, setLastRerouteResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (cong, temp, title) => {
    setCongestion(cong);
    setTemperature(temp);
    setIncidentName(title);
  };

  const handleSimulate = async () => {
    const [u, v] = selectedEdge.split('-');
    setIsSubmitting(true);
    try {
      const res = await onInjectDisruption({
        u,
        v,
        congestion_multiplier: parseFloat(congestion),
        ambient_temp_c: parseFloat(temperature),
        incident_type: incidentName
      });
      setLastRerouteResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="clay-modal-overlay" onClick={onClose}>
      <div className="clay-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #FF7676 0%, #EF4444 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 6px 14px rgba(239, 68, 68, 0.3)'
            }}>
              <Flame size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="clay-pill pill-pink" style={{ fontSize: '0.72rem' }}>DYNAMIC DISRUPTION</span>
                <span className="clay-pill pill-orange" style={{ fontSize: '0.72rem' }}>A* RE-EVALUATION</span>
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#382314', margin: '2px 0 0 0' }}>
                Simulate Road Blockage & Thermal Spike
              </h2>
            </div>
          </div>

          <button onClick={onClose} className="clay-btn clay-btn-secondary" style={{ width: '38px', height: '38px', padding: 0, borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Quick Presets */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#7C604B', display: 'block', marginBottom: '8px' }}>
            QUICK SCENARIO PRESETS:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => handleApplyPreset(4.5, 44.0, 'Expressway Solar Heatwave & Gridlock')}
              className="clay-btn clay-btn-secondary clay-btn-sm"
            >
              ☀️ Expressway Heatwave (44°C, 4.5x)
            </button>
            <button
              onClick={() => handleApplyPreset(5.0, 48.0, 'Extreme Heat Surge & Tanker Spill')}
              className="clay-btn clay-btn-secondary clay-btn-sm"
            >
              🔥 Extreme Heat Surge (48°C, 5.0x)
            </button>
            <button
              onClick={() => handleApplyPreset(3.5, 32.0, 'Metro Cross-Road Construction')}
              className="clay-btn clay-btn-secondary clay-btn-sm"
            >
              🚧 Construction Slowdown (32°C, 3.5x)
            </button>
          </div>
        </div>

        {/* Controls Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', background: '#FAF6F0', padding: '18px', borderRadius: '22px', border: '1.5px solid rgba(220, 205, 190, 0.4)', marginBottom: '20px' }}>
          {/* Edge Selector */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#7C604B', display: 'block', marginBottom: '6px' }}>
              TARGET ROAD SEGMENT
            </label>
            <select
              value={selectedEdge}
              onChange={(e) => setSelectedEdge(e.target.value)}
              className="clay-input"
              style={{ cursor: 'pointer' }}
            >
              {edges.map((e, idx) => (
                <option key={`${e.from}-${e.to}-${idx}`} value={`${e.from}-${e.to}`}>
                  {e.road_name} ({e.from} ➔ {e.to}) — Base: {e.base_time}m, Temp: {e.temp}°C
                </option>
              ))}
            </select>
          </div>

          {/* Congestion Multiplier */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#7C604B' }}>
                TRAFFIC CONGESTION MULTIPLIER
              </label>
              <strong style={{ color: congestion > 2.0 ? '#DC2626' : '#EA7317', fontSize: '0.9rem' }}>
                {congestion.toFixed(1)}x {congestion > 2.5 ? '(Severe Jam)' : '(Moderate Delay)'}
              </strong>
            </div>
            <input
              type="range"
              min="1.0"
              max="6.0"
              step="0.1"
              value={congestion}
              onChange={(e) => setCongestion(parseFloat(e.target.value))}
              className="clay-slider"
            />
          </div>

          {/* Ambient Temp */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#7C604B' }}>
                AMBIENT HEAT SPIKE (°C)
              </label>
              <strong style={{ color: temperature > 38 ? '#DC2626' : '#2563EB', fontSize: '0.9rem' }}>
                {temperature.toFixed(1)}°C {temperature > 38 ? '⚠️ Spoilage Threat' : 'Normal'}
              </strong>
            </div>
            <input
              type="range"
              min="20.0"
              max="52.0"
              step="0.5"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="clay-slider"
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button
            onClick={handleSimulate}
            disabled={isSubmitting}
            className="clay-btn clay-btn-orange"
            style={{ flex: 1, minWidth: '220px' }}
          >
            <Zap size={18} />
            {isSubmitting ? 'Computing A* Reroute...' : 'Inject Disruption & Reroute'}
          </button>

          <button
            onClick={onResetDisruptions}
            className="clay-btn clay-btn-secondary"
          >
            <RotateCcw size={18} />
            Restore Baseline Roads
          </button>
        </div>

        {/* Last Reroute Comparison Box */}
        {lastRerouteResult && (
          <div style={{
            background: '#FFFDF9',
            padding: '16px',
            borderRadius: '18px',
            border: '2px solid #FBCFE8',
            boxShadow: '0 8px 18px rgba(244, 114, 182, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Compass size={18} color="#EA7317" />
              <strong style={{ color: '#831843', fontSize: '0.92rem' }}>Dynamic A* Recalculation Live Outcome</strong>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#533824', marginBottom: '6px' }}>
              Disrupted Road: <strong>{lastRerouteResult.affected_edge.join(' ➔ ')}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <div style={{ background: '#FFF1F2', padding: '10px', borderRadius: '12px' }}>
                <span className="clay-pill pill-yellow" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>
                  Ambient Dry Van Path
                </span>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#991B1B' }}>
                  {lastRerouteResult.ambient_reroute.path.join(' ➔ ')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                  Cost (Heat + Time): <strong>{lastRerouteResult.ambient_reroute.cost_index}</strong>
                </div>
              </div>

              <div style={{ background: '#EFF6FF', padding: '10px', borderRadius: '12px' }}>
                <span className="clay-pill pill-blue" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>
                  Chilled Reefer Path
                </span>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1E40AF' }}>
                  {lastRerouteResult.reefer_reroute.path.join(' ➔ ')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                  Cost (Refrigerated): <strong>{lastRerouteResult.reefer_reroute.cost_index}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Incidents List */}
        {activeIncidents && activeIncidents.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#7C604B', display: 'block', marginBottom: '8px' }}>
              CURRENTLY ACTIVE NETWORK INCIDENTS ({activeIncidents.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeIncidents.map((inc) => (
                <div key={inc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FEE2E2', padding: '10px 14px', borderRadius: '14px', border: '1px solid #FCA5A5', fontSize: '0.82rem' }}>
                  <div>
                    <strong style={{ color: '#991B1B' }}>{inc.road_name} ({inc.edge.join(' ➔ ')})</strong>
                    <div style={{ color: '#B91C1C', fontSize: '0.75rem' }}>
                      {inc.incident_type} | Congestion: {inc.new_congestion}x | Temp: {inc.new_temp}°C
                    </div>
                  </div>
                  <span className="clay-pill pill-pink" style={{ fontSize: '0.68rem' }}>ACTIVE BLOCKAGE</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

