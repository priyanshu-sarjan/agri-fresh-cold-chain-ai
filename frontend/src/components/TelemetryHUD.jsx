import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Thermometer, ShieldAlert, CheckCircle2, TrendingUp, Navigation, Package } from 'lucide-react';

export default function TelemetryHUD({
  isPlaying,
  onTogglePlay,
  progress,
  onProgressChange,
  playbackSpeed,
  onSpeedChange,
  onReset,
  vehiclesTelemetry,
  fleetRoutes,
  fleetSummary
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Simulation Playback Control Bar */}
      <div className="clay-card" style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onTogglePlay}
            className={`clay-btn ${isPlaying ? 'clay-btn-secondary' : 'clay-btn-orange'}`}
            style={{ width: '52px', height: '52px', padding: 0, borderRadius: '50%' }}
            title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          >
            {isPlaying ? <Pause size={22} color="#EA7317" /> : <Play size={22} style={{ marginLeft: '3px' }} />}
          </button>

          <button
            onClick={onReset}
            className="clay-btn clay-btn-secondary"
            style={{ width: '44px', height: '44px', padding: 0, borderRadius: '50%' }}
            title="Reset Simulation to Start"
          >
            <RotateCcw size={18} color="#7C604B" />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#382314' }}>
                IoT Fleet Telemetry Stream
              </span>
              <span className={`clay-pill ${isPlaying ? 'pill-mint' : 'pill-yellow'}`} style={{ fontSize: '0.72rem' }}>
                {isPlaying ? '● LIVE ACTIVE' : 'PAUSED'}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#7C604B' }}>
              Simulated Transit Progress: <strong>{(progress * 100).toFixed(0)}%</strong> of cold-chain route
            </div>
          </div>
        </div>

        {/* Progress Slider */}
        <div style={{ flex: '1 1 260px', maxWidth: '400px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A8907E' }}>0%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={progress}
            onChange={(e) => onProgressChange(parseFloat(e.target.value))}
            className="clay-slider"
          />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A8907E' }}>100%</span>
        </div>

        {/* Playback Speed Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C604B' }}>Speed:</span>
          {[1, 2, 5].map((spd) => (
            <button
              key={spd}
              onClick={() => onSpeedChange(spd)}
              className={`clay-btn clay-btn-sm ${playbackSpeed === spd ? 'clay-btn-orange' : 'clay-btn-secondary'}`}
              style={{ padding: '6px 12px', minWidth: '42px', height: '34px' }}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* 2. Fleet Telemetry & Spoilage Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {vehiclesTelemetry && vehiclesTelemetry.map((v) => {
          const isReefer = v.is_refrigerated;
          const routeMeta = fleetRoutes[v.vehicle_id] || {};
          const isOverheated = v.internal_temp_c > 12.0;

          return (
            <div key={v.vehicle_id} className="clay-card" style={{ padding: '22px', position: 'relative' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '16px',
                    background: isReefer ? 'linear-gradient(135deg, #93C5FD 0%, #2563EB 100%)' : 'linear-gradient(135deg, #FDE68A 0%, #EA7317 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    color: '#FFF',
                    boxShadow: '0 6px 14px rgba(0,0,0,0.12)'
                  }}>
                    {isReefer ? '❄️' : '📦'}
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#382314', margin: 0 }}>
                      {v.vehicle_name}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#7C604B' }}>
                      ID: <strong>{v.vehicle_id}</strong> | {routeMeta.model_type || 'Standard'}
                    </div>
                  </div>
                </div>

                <span className={`clay-pill ${isReefer ? 'pill-blue' : 'pill-yellow'}`}>
                  {isReefer ? 'Active Reefer' : 'Dry Ventilated'}
                </span>
              </div>

              {/* Real-time Readings Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                background: '#FAF6F0',
                padding: '14px',
                borderRadius: '18px',
                border: '1.5px solid rgba(220, 205, 190, 0.4)',
                marginBottom: '14px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7C604B', fontSize: '0.75rem', fontWeight: 700 }}>
                    <Thermometer size={14} color={isOverheated ? '#DC2626' : '#2563EB'} />
                    INTERNAL CARGO TEMP
                  </div>
                  <div style={{
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    color: isOverheated ? '#DC2626' : (isReefer ? '#2563EB' : '#D97706'),
                    marginTop: '2px'
                  }}>
                    {v.internal_temp_c}°C
                  </div>
                  <span style={{ fontSize: '0.72rem', color: isOverheated ? '#DC2626' : '#059669', fontWeight: 700 }}>
                    {isOverheated ? '⚠️ Thermal Degradation' : '✅ Compliant Range'}
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7C604B', fontSize: '0.75rem', fontWeight: 700 }}>
                    <Thermometer size={14} color="#EA7317" />
                    AMBIENT SENSOR
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#382314', marginTop: '2px' }}>
                    {v.ambient_temp_c}°C
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#7C604B' }}>
                    Relative Humidity: <strong>{v.humidity_pct}%</strong>
                  </span>
                </div>
              </div>

              {/* Progress & Edge Info */}
              <div style={{ marginBottom: '14px', fontSize: '0.82rem', color: '#533824' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Current Edge:</span>
                  <strong>{v.current_edge}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Traversing Road:</span>
                  <span style={{ color: '#7C604B', fontWeight: 600 }}>{v.current_road}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Speed / Congestion:</span>
                  <strong>{v.speed_kmh} km/h</strong>
                </div>
              </div>

              {/* Produce Deterioration Index (PDI) Bar */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                  <span style={{ color: '#7C604B' }}>Produce Deterioration Index (PDI):</span>
                  <strong style={{ color: v.accumulated_pdi > 30 ? '#DC2626' : '#EA7317' }}>
                    {v.accumulated_pdi}
                  </strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#EFE4D8', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (v.accumulated_pdi / 60) * 100)}%`,
                      background: isOverheated ? 'linear-gradient(90deg, #F59E0B, #EF4444)' : 'linear-gradient(90deg, #10B981, #2563EB)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>

              {/* Assigned Cargo Orders */}
              <div style={{ borderTop: '1px solid rgba(220, 205, 190, 0.4)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#382314' }}>
                    ASSIGNED CARGO ({routeMeta.assigned_weight_kg || 0}kg / {routeMeta.capacity_kg || 500}kg)
                  </span>
                  <span className="clay-pill pill-mint" style={{ fontSize: '0.7rem' }}>
                    {routeMeta.utilization_pct || 0}% Payload
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {routeMeta.orders && routeMeta.orders.map((ord) => (
                    <span key={ord.order_id} className="clay-pill pill-lavender" style={{ fontSize: '0.72rem' }}>
                      <Package size={11} />
                      {ord.order_id}: {ord.produce_name} ({ord.weight_kg}kg) ➔ {ord.destination_node}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Global Cold-Chain KPI Footer */}
      {fleetSummary && (
        <div className="clay-card" style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #FFFDF9 0%, #FAF3E8 100%)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C604B', letterSpacing: '0.04em' }}>
                TOTAL PAYLOAD DISPATCHED
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#382314', marginTop: '2px' }}>
                {fleetSummary.total_payload_kg} kg
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C604B', letterSpacing: '0.04em' }}>
                COMBINED TRANSIT DURATION
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2563EB', marginTop: '2px' }}>
                {fleetSummary.total_transit_min} min
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C604B', letterSpacing: '0.04em' }}>
                QUALITY COST INDEX
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EA7317', marginTop: '2px' }}>
                {fleetSummary.total_cost_index}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C604B', letterSpacing: '0.04em' }}>
                CUMULATIVE SPOILAGE (PDI)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
                {fleetSummary.total_pdi_spoilage}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

