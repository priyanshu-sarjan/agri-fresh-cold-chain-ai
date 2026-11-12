import React, { useState } from 'react';
import { ShoppingBag, Plus, Sparkles, AlertCircle, Clock, Scale, X } from 'lucide-react';

export default function ProduceCatalogModal({
  isOpen,
  onClose,
  catalog,
  orders,
  nodes,
  onAddOrder
}) {
  const [destNode, setDestNode] = useState('RETAIL_1');
  const [weightKg, setWeightKg] = useState(140);
  const [expiryMin, setExpiryMin] = useState(75);
  const [produceType, setProduceType] = useState('STRAWBERRIES');
  const [priority, setPriority] = useState('Urgent');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newOrderId = `ORD_${Date.now().toString().slice(-3)}`;
    try {
      await onAddOrder({
        order_id: newOrderId,
        destination_node: destNode,
        weight_kg: parseFloat(weightKg),
        expiry_window_min: parseFloat(expiryMin),
        produce_type: produceType,
        priority: priority
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="clay-modal-overlay" onClick={onClose}>
      <div className="clay-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '840px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 8px 18px rgba(5, 150, 105, 0.3)'
            }}>
              <ShoppingBag size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="clay-pill pill-mint">PRODUCE TAXONOMY</span>
                <span className="clay-pill pill-yellow">COLD-CHAIN COMPLIANCE</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#382314', margin: '2px 0 0 0' }}>
                Perishable Goods Catalog & Order Dispatcher
              </h2>
            </div>
          </div>

          <button onClick={onClose} className="clay-btn clay-btn-secondary" style={{ width: '38px', height: '38px', padding: 0, borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* 1. Perishable Catalog Grid */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#382314', marginBottom: '12px' }}>
            Biological Spoilage Parameters by Category
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
            {catalog && Object.entries(catalog).map(([key, item]) => (
              <div key={key} className="clay-card-flat" style={{ padding: '14px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.8rem' }}>{item.icon}</span>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#382314', margin: 0 }}>
                      {item.name}
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{item.category}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.75rem', background: '#FAF6F0', padding: '8px', borderRadius: '12px' }}>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>OPTIMAL TEMP</span>
                    <div style={{ fontWeight: 800, color: '#059669' }}>{item.optimal_temp_c}°C</div>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>CRITICAL LIMIT</span>
                    <div style={{ fontWeight: 800, color: '#DC2626' }}>{item.max_ambient_temp_c}°C</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Add New Order Form */}
        <div style={{ background: '#FAF6F0', padding: '20px', borderRadius: '24px', border: '1.5px solid rgba(220, 205, 190, 0.4)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#382314', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="#EA7317" />
            Inject New Farm-to-Hub Produce Order
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C604B', display: 'block', marginBottom: '4px' }}>
                PRODUCE TYPE
              </label>
              <select
                value={produceType}
                onChange={(e) => setProduceType(e.target.value)}
                className="clay-input"
              >
                {catalog && Object.entries(catalog).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.icon} {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C604B', display: 'block', marginBottom: '4px' }}>
                DELIVERY DESTINATION
              </label>
              <select
                value={destNode}
                onChange={(e) => setDestNode(e.target.value)}
                className="clay-input"
              >
                {nodes && nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label} ({n.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C604B', display: 'block', marginBottom: '4px' }}>
                PAYLOAD WEIGHT (KG)
              </label>
              <input
                type="number"
                min="10"
                max="500"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="clay-input"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C604B', display: 'block', marginBottom: '4px' }}>
                SHELF-LIFE DEADLINE (MIN)
              </label>
              <input
                type="number"
                min="20"
                max="300"
                value={expiryMin}
                onChange={(e) => setExpiryMin(e.target.value)}
                className="clay-input"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C604B', display: 'block', marginBottom: '4px' }}>
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="clay-input"
              >
                <option value="Standard">Standard</option>
                <option value="Urgent">Urgent</option>
                <option value="Critical">Critical (Immediate Dispatch)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="clay-btn clay-btn-orange"
                style={{ width: '100%', height: '48px' }}
              >
                <Sparkles size={18} />
                {isSubmitting ? 'Dispatching...' : 'Add Order & Re-Plan'}
              </button>
            </div>
          </form>
        </div>

        {/* 3. Existing Orders Table */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#382314', marginBottom: '10px' }}>
            Active Orders in Pipeline ({orders ? orders.length : 0})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            {orders && orders.map((o) => (
              <div key={o.order_id} style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '16px', border: '1px solid #E2E8F0', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong>{o.order_id}</strong>
                  <span className={`clay-pill ${o.priority === 'Critical' ? 'pill-pink' : (o.priority === 'Urgent' ? 'pill-orange' : 'pill-mint')}`} style={{ fontSize: '0.65rem' }}>
                    {o.priority}
                  </span>
                </div>
                <div style={{ color: '#64748B', marginBottom: '2px' }}>
                  Destination: <strong>{o.destination_node}</strong>
                </div>
                <div style={{ color: '#64748B' }}>
                  Weight: <strong>{o.weight_kg} kg</strong> | Shelf-Life: <strong>{o.expiry_window_min} min</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

