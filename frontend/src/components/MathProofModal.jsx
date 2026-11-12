import React from 'react';
import { BookOpen, CheckCircle2, Award, Zap, Compass, ShieldCheck, X } from 'lucide-react';

export default function MathProofModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="clay-modal-overlay" onClick={onClose}>
      <div className="clay-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '880px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 8px 18px rgba(126, 34, 206, 0.3)'
            }}>
              <BookOpen size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="clay-pill pill-lavender">ALGORITHMIC PROOFS</span>
                <span className="clay-pill pill-mint">AI SYSTEM SPECIFICATION</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#382314', margin: '2px 0 0 0' }}>
                Mathematical Proofs & Architecture Talking Points
              </h2>
            </div>
          </div>

          <button onClick={onClose} className="clay-btn clay-btn-secondary" style={{ width: '38px', height: '38px', padding: 0, borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Admissible Heuristic Proof */}
        <div className="clay-card-flat" style={{ padding: '20px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Award size={20} color="#7E22CE" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#382314', margin: 0 }}>
              1. Mathematical Guarantees: Admissible & Consistent A* Search
            </h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#4A5568', lineHeight: 1.6, marginBottom: '12px' }}>
            The AgriFresh routing engine computes minimum quality-loss trajectories using an $A^*$ graph search.
            For any node $n$ and destination goal $g$, the heuristic function is defined as:
          </p>

          <div style={{ background: '#FAF6F0', padding: '14px 20px', borderRadius: '16px', border: '1.5px solid rgba(220, 205, 190, 0.4)', fontFamily: 'serif', fontSize: '1.05rem', textAlign: 'center', marginBottom: '12px' }}>
            <strong>h(n) = EuclideanDistance(n, goal) / v_max</strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <strong style={{ color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <CheckCircle2 size={14} color="#059669" /> Admissibility Theorem (h(n) ≤ h*(n))
              </strong>
              <p style={{ color: '#64748B' }}>
                Because the Euclidean straight-line distance is strictly less than or equal to any physical road distance,
                and vehicle speed cannot exceed theoretical maximum cruising speed $v_{max}$, $h(n)$ is a guaranteed lower bound.
                Hence, $A^*$ is mathematically proven to find the global optimum without exhaustive graph search.
              </p>
            </div>

            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <strong style={{ color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <CheckCircle2 size={14} color="#059669" /> Monotonicity / Consistency
              </strong>
              <p style={{ color: '#64748B' }}>
                By the triangle inequality on flat metric spaces, $h(n) \le c(n, p) + h(p)$ for all neighbors $p$.
                This guarantees that when a node is chosen from the priority heap, its path is globally optimal and never requires re-opening.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Cold-Chain Spoilage Formulation */}
        <div className="clay-card-flat" style={{ padding: '20px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Zap size={20} color="#EA7317" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#382314', margin: 0 }}>
              2. Cold-Chain Spoilage Physics & Edge Cost Function
            </h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#4A5568', lineHeight: 1.6, marginBottom: '12px' }}>
            Unlike generic navigation engines (Google Maps, OSRM) which optimize solely for shortest distance or time,
            AgriFresh integrates produce degradation kinetics directly into the graph cost:
          </p>

          <div style={{ background: '#FAF6F0', padding: '14px 20px', borderRadius: '16px', border: '1.5px solid rgba(220, 205, 190, 0.4)', fontFamily: 'serif', fontSize: '1.05rem', textAlign: 'center', marginBottom: '12px' }}>
            <strong>c(u, v) = base_time(u, v) × [ 1 + α·Congestion(u, v) + β·AmbientTempPenalty ]</strong>
          </div>

          <ul style={{ fontSize: '0.82rem', color: '#64748B', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>
              <strong>Active Reefer Vehicles:</strong> Maintain 2°C–6°C cooling via onboard compressor. Ambient penalty is 0, so reefers comfortably take direct highway transit.
            </li>
            <li>
              <strong>Ambient Crated Vans:</strong> Experience exponential spoilage when temperatures exceed 15°C threshold: 
              <code>temp_penalty = max(0, (ambient_temp - 15) / 5)</code>. When a heatwave hits an expressway, ambient vans automatically deviate to cooler or shaded bypass routes!
            </li>
          </ul>
        </div>

        {/* Section 3: Separation of Concerns */}
        <div className="clay-card-flat" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <ShieldCheck size={20} color="#2563EB" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#382314', margin: 0 }}>
              3. Separation of Concerns: Hierarchical AI Architecture
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.82rem' }}>
            <div style={{ background: '#EFF6FF', padding: '14px', borderRadius: '14px', border: '1px solid #BFDBFE' }}>
              <span className="clay-pill pill-blue" style={{ fontSize: '0.7rem', marginBottom: '6px' }}>
                LEVEL 1: DISCRETE CSP
              </span>
              <h4 style={{ fontSize: '0.9rem', color: '#1E40AF', margin: '4px 0 6px 0' }}>
                Combinatorial Fleet Allocation
              </h4>
              <p style={{ color: '#1E3A8A', lineHeight: 1.5 }}>
                Solves the multi-stop order-to-vehicle allocation problem via backtracking with forward-checking.
                Enforces maximum vehicle payload ($W_{max}$), driver shift duration ($T_{max}$), and perishability shelf-life deadlines ($Dead_i$).
              </p>
            </div>

            <div style={{ background: '#ECFDF5', padding: '14px', borderRadius: '14px', border: '1px solid #A7F3D0' }}>
              <span className="clay-pill pill-mint" style={{ fontSize: '0.7rem', marginBottom: '6px' }}>
                LEVEL 2: CONTINUOUS A*
              </span>
              <h4 style={{ fontSize: '0.9rem', color: '#065F46', margin: '4px 0 6px 0' }}>
                Perishable Metric Trajectory
              </h4>
              <p style={{ color: '#064E3B', lineHeight: 1.5 }}>
                Executes optimal road-network spatial routing between assigned waypoints.
                Monitors IoT thermal telemetry and triggers dynamic instant re-routing whenever congestion or heatwaves spike spoilage risks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

