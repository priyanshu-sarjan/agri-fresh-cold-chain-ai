import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, ArrowRight, Truck, Clock, Scale, AlertOctagon, X } from 'lucide-react';

export default function CSPInspectorModal({ isOpen, onClose, cspTrace, fleetRoutes }) {
  const [filterType, setFilterType] = useState('ALL');

  if (!isOpen) return null;

  const filteredTrace = (cspTrace || []).filter((step) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'PRUNED') return step.type === 'PRUNED';
    if (filterType === 'ASSIGNED') return step.type === 'ASSIGNED' || step.type === 'SUCCESS';
    return true;
  });

  return (
    <div className="clay-modal-overlay" onClick={onClose}>
      <div className="clay-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '860px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 8px 18px rgba(37, 99, 235, 0.3)'
            }}>
              <ShieldCheck size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="clay-pill pill-blue">CSP SOLVER ENGINE</span>
                <span className="clay-pill pill-mint">BACKTRACKING & FORWARD-CHECKING</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#382314', margin: '2px 0 0 0' }}>
                Fleet Assignment & Shift Scheduling Inspector
              </h2>
            </div>
          </div>

          <button onClick={onClose} className="clay-btn clay-btn-secondary" style={{ width: '38px', height: '38px', padding: 0, borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* 3 Core Constraints Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '22px' }}>
          <div className="clay-card-flat" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontWeight: 800, fontSize: '0.82rem', marginBottom: '4px' }}>
              <Scale size={16} />
              CONSTRAINT 1: PAYLOAD (Wmax)
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Assigned produce mass must not exceed vehicle gross payload rating.
            </p>
          </div>

          <div className="clay-card-flat" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EA7317', fontWeight: 800, fontSize: '0.82rem', marginBottom: '4px' }}>
              <Clock size={16} />
              CONSTRAINT 2: DRIVER SHIFT (Tmax)
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Total multi-stop transit + return to hub cannot violate statutory duty limit.
            </p>
          </div>

          <div className="clay-card-flat" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 800, fontSize: '0.82rem', marginBottom: '4px' }}>
              <AlertOctagon size={16} />
              CONSTRAINT 3: SHELF-LIFE (Deadi)
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Arrival time &lt; expiry deadline. Active chilling multiplies shelf life by 2.5x.
            </p>
          </div>
        </div>

        {/* Fleet Allocation Summary Bars */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#382314', marginBottom: '12px' }}>
            Active Vehicle Schedule & Utilization
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            {fleetRoutes && Object.entries(fleetRoutes).map(([vid, r]) => (
              <div key={vid} className="clay-card-flat" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#382314' }}>{r.vehicle_name}</strong>
                  <span className={`clay-pill ${r.is_refrigerated ? 'pill-blue' : 'pill-yellow'}`} style={{ fontSize: '0.68rem' }}>
                    {r.is_refrigerated ? 'Reefer' : 'Dry Van'}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cargo: {r.assigned_weight_kg}kg / {r.capacity_kg}kg</span>
                  <strong>{r.utilization_pct}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ width: `${r.utilization_pct}%`, height: '100%', background: r.is_refrigerated ? '#2563EB' : '#EA7317', borderRadius: '4px' }} />
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Shift Duration: {r.estimated_transit_min}m</span>
                  <strong>{r.shift_utilization_pct}% shift</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${r.shift_utilization_pct}%`, height: '100%', background: '#10B981', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Backtracking Decision Trace Log */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#382314', margin: 0 }}>
              CSP Backtracking & Pruning Decision Trace ({filteredTrace.length} events)
            </h3>

            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'ASSIGNED', 'PRUNED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterType(filter)}
                  className={`clay-btn clay-btn-sm ${filterType === filter ? 'clay-btn-orange' : 'clay-btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            background: '#FAF6F0',
            borderRadius: '18px',
            border: '1.5px solid rgba(220, 205, 190, 0.4)',
            maxHeight: '280px',
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {filteredTrace.map((step, idx) => {
              const isAssigned = step.type === 'ASSIGNED' || step.type === 'SUCCESS';
              const isPruned = step.type === 'PRUNED';

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: isAssigned ? '#ECFDF5' : (isPruned ? '#FEF2F2' : '#FFFFFF'),
                    border: `1px solid ${isAssigned ? '#A7F3D0' : (isPruned ? '#FECACA' : '#E2E8F0')}`,
                    fontSize: '0.78rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isAssigned && <CheckCircle2 size={16} color="#059669" />}
                    {isPruned && <XCircle size={16} color="#DC2626" />}
                    {!isAssigned && !isPruned && <span className="clay-pill pill-lavender" style={{ fontSize: '0.65rem' }}>STEP {step.step}</span>}

                    <span style={{ fontWeight: 700, color: isPruned ? '#991B1B' : '#1E293B' }}>
                      {step.message || step.detail}
                    </span>
                  </div>

                  {step.type && (
                    <span className={`clay-pill ${isAssigned ? 'pill-mint' : (isPruned ? 'pill-pink' : 'pill-yellow')}`} style={{ fontSize: '0.65rem' }}>
                      {step.type}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

