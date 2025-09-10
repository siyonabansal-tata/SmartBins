import { useEffect, useState } from 'react';
import { listActiveOrders, completeOrder } from '../api';

export default function ActiveOrders() {
  const [active, setActive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [completingId, setCompletingId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await listActiveOrders();
      console.log('Active orders data received:', data);
      setActive(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch active orders:', e);
      setErr(e.message || 'Failed to fetch active orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleComplete = async (id) => {
    if (!id) return;
    console.log('Completing order:', id);
    setCompletingId(id);
    setErr('');
    setMsg('');
    try {
      const res = await completeOrder(id);
      console.log('Complete order response:', res);
      setMsg(res.message || 'Order completed');
      await load(); // Reload active orders
    } catch (e) {
      console.error('Failed to complete order:', e);
      setErr(e.message || 'Failed to complete order');
    } finally {
      setCompletingId('');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">🔄 Active Orders</h3>
      </div>
      
      <div className="mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={load} disabled={loading} className="btn btn-secondary">
          {loading ? <span className="loading"></span> : '🔄 Refresh Active Orders'}
        </button>
        <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
          🔄 Active: <strong>{active?.length || 0}</strong> orders in progress
        </div>
      </div>

      {err && (
        <div className="message message-error">
          🚨 {err}
        </div>
      )}
      
      {msg && (
        <div className="message message-success">
          ✅ {msg}
        </div>
      )}

      <div className="table-container">
        <table className="table table-expanded">
          <thead>
            <tr>
              <th className="id-column">Order ID</th>
              <th className="status-column">Status</th>
              <th className="color-column">Assigned Color</th>
              <th className="bins-column">Bins</th>
              <th className="items-column">Items</th>
              <th className="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(active || []).map((o) => (
              <tr key={o._id}>
                <td className="id-column">
                  <div className="id-display" style={{ maxWidth: '180px' }}>
                    <div style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>{o._id}</div>
                  </div>
                </td>
                <td className="status-column">
                  <span className={`status-badge status-${o.status}`}>
                    🔄 {o.status}
                  </span>
                </td>
                <td className="color-column">
                  {o.colour ? (
                    <div style={{ 
                      display: 'inline-block', 
                      padding: '6px 14px', 
                      borderRadius: '20px', 
                      background: o.colour, 
                      color: 'white',
                      fontWeight: '600',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                      fontSize: '0.85rem'
                    }}>
                      {o.colour}
                    </div>
                  ) : (
                    <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Not assigned</span>
                  )}
                </td>
                <td className="bins-column">
                  {(() => {
                    // Handle both old array format and new dict format
                    if (o.bins) {
                      if (Array.isArray(o.bins) && o.bins.length > 0) {
                        // Old format: ["A1", "B2"]
                        return (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {o.bins.map((bin, i) => (
                              <span key={i} style={{ 
                                background: '#f8f9fa', 
                                padding: '4px 10px', 
                                borderRadius: '12px',
                                border: '1px solid #e9ecef',
                                fontSize: '0.8rem',
                                fontWeight: '500'
                              }}>
                                📍 {bin}
                              </span>
                            ))}
                          </div>
                        );
                      } else if (typeof o.bins === 'object' && Object.keys(o.bins).length > 0) {
                        // New format: {"A1": 5, "B2": 3}
                        return (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {Object.entries(o.bins).map(([bin, quantity], i) => (
                              <span key={i} style={{ 
                                background: '#e3f2fd', 
                                padding: '4px 10px', 
                                borderRadius: '12px',
                                border: '1px solid #bbdefb',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                color: '#1976d2'
                              }}>
                                📍 {bin} <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({quantity})</span>
                              </span>
                            ))}
                          </div>
                        );
                      }
                    }
                    return <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No bins assigned</span>;
                  })()}
                </td>
                <td className="items-column">
                  {Array.isArray(o.items) && o.items.length > 0 ? (
                    <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                      {o.items.map((it, i) => (
                        <div key={i} style={{ 
                          marginBottom: '6px',
                          padding: '6px 10px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          border: '1px solid #e9ecef'
                        }}>
                          💊 <strong>{it.medicine_name}</strong> × <span style={{ color: '#11998e', fontWeight: '600' }}>{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No items</span>
                  )}
                </td>
                <td className="actions-column">
                  <button
                    onClick={() => handleComplete(o._id)}
                    disabled={completingId === o._id}
                    className="btn btn-success btn-small"
                    style={{ width: '100%', padding: '8px 12px' }}
                  >
                    {completingId === o._id ? <span className="loading"></span> : '✅ Complete'}
                  </button>
                </td>
              </tr>
            ))}
            {(!active || active.length === 0) && (
              <tr>
                <td colSpan={6} className="text-center" style={{ padding: '60px', opacity: 0.7 }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎉</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>No active orders</div>
                  <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '8px' }}>All orders are completed! Great work!</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
