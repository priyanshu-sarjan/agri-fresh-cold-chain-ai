import React from 'react';
import { Truck, Cpu, ShieldCheck, Flame, BookOpen, ShoppingBag, Sparkles } from 'lucide-react';

export default function Navbar({ onOpenCSP, onOpenDisruption, onOpenCatalog, onOpenMath, onComputeSchedule, isOptimizing }) {
  return (
    <header className="clay-card" style={{ padding: '16px 28px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      {/* Brand & Pill Tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #FFA05C 0%, #EA7317 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF',
          boxShadow: '0 8px 18px rgba(234, 115, 23, 0.35), 0 3px 0 #9E4502',
          border: '2px solid rgba(255, 255, 255, 0.6)'
        }}>
          <Truck size={28} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="clay-pill pill-orange">
              <Sparkles size={12} />
              AI COLD-CHAIN DISPATCH
            </span>
            <span className="clay-pill pill-mint">
              CSP + A* ENGINE
            </span>
            <div className="window-dots" style={{ marginLeft: '8px' }}>
              <div className="window-dot dot-pink" />
              <div className="window-dot dot-purple" />
              <div className="window-dot dot-mint" />
            </div>
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#382314', letterSpacing: '-0.02em', margin: 0 }}>
            AgriFresh <span style={{ color: '#EA7317' }}>Cold-Chain Logistics</span> Engine
          </h1>
        </div>
      </div>

      {/* Navigation Buttons matching 3D tactile aesthetic */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button 
          onClick={onComputeSchedule} 
          disabled={isOptimizing}
          className="clay-btn clay-btn-orange"
          style={{ minWidth: '220px' }}
        >
          <Cpu size={18} />
          {isOptimizing ? 'Solving CSP & A*...' : 'Compute Optimal Schedule'}
        </button>

        <button onClick={onOpenCSP} className="clay-btn clay-btn-secondary">
          <ShieldCheck size={18} color="#2563EB" />
          CSP Inspector
        </button>

        <button onClick={onOpenDisruption} className="clay-btn clay-btn-secondary">
          <Flame size={18} color="#EA7317" />
          Inject Disruption
        </button>

        <button onClick={onOpenCatalog} className="clay-btn clay-btn-secondary">
          <ShoppingBag size={18} color="#059669" />
          Produce & Orders
        </button>

        <button onClick={onOpenMath} className="clay-btn clay-btn-secondary">
          <BookOpen size={18} color="#7C3AED" />
          Math & Proofs
        </button>
      </div>
    </header>
  );
}

