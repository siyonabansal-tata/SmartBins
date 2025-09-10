import { useEffect, useState } from 'react';
import { listOrders, processOrder } from '../api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setLoadingList(true);
    setErr('');
    try {
      const data = await listOrders();
      console.log('Orders data received:', data);
      // Filter out completed orders
      const filteredOrders = Array.isArray(data) ? data.filter(order => order.status !== 'completed') : [];
      setOrders(filteredOrders);
    } catch (e) {
      console.error('Failed to fetch orders:', e);
      setErr(e.message || 'Failed to fetch orders');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleProcess = async (id) => {
    if (!id) return;
    console.log('Processing order:', id);
    setProcessing(true);
    setMessage('');
    setErr('');
    try {
      const res = await processOrder(id);
      console.log('Process order response:', res);
      setMessage(res.message || 'Order processed');
      await load(); // Reload orders
    } catch (e) {
      console.error('Failed to process order:', e);
      setErr(e.message || 'Failed to process');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">📦 Orders Management</h3>
      </div>

      <div className="form-container mb-2">
        <div className="form-group">
          <label className="form-label">Process Order by ID</label>
          <input
            className="form-input"
            placeholder="Enter Order ID (MongoDB _id)"
            value={processingId}
            onChange={(e) => setProcessingId(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ display: 'flex', alignItems: 'end', gap: '15px' }}>
          <button 
            onClick={() => handleProcess(processingId)} 
            disabled={processing || !processingId}
            className="btn btn-primary"
          >
            {processing ? <span className="loading"></span> : '⚡ Process Order'}
          </button>
          <button 
            onClick={load} 
            disabled={loadingList}
            className="btn btn-secondary"
          >
            {loadingList ? <span className="loading"></span> : '🔄 Refresh'}
          </button>
          <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#6c757d' }}>
            📊 Total: <strong>{orders?.length || 0}</strong> pending orders
          </div>
        </div>
      </div>

      {err && (
        <div className="message message-error">
          🚨 {err}
        </div>
      )}
      
      {message && (
        <div className="message message-success">
          ✅ {message}
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
            {(orders || []).map((o, idx) => (
              <tr key={o._id || idx}>
                <td className="id-column">
                  {o._id ? (
                    <div className="id-display" style={{ maxWidth: '180px' }}>
                      <div style={{ marginBottom: '10px', wordBreak: 'break-all', fontSize: '0.8rem' }}>{o._id}</div>
                      <button 
                        onClick={() => setProcessingId(o._id)}
                        className="btn btn-small"
                        style={{ fontSize: '0.7rem', padding: '6px 10px' }}
                      >
                        📋 Copy to Input
                      </button>
                    </div>
                  ) : (
                    <em>ID not provided</em>
                  )}
                </td>
                <td className="status-column">
                  <span className={`status-badge status-${o.status}`}>
                    {o.status === 'pending' && '⏳ '}
                    {o.status === 'processing' && '🔄 '}
                    {o.status === 'completed' && '✅ '}
                    {o.status}
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
                          💊 <strong>{it.medicine_name}</strong> × <span style={{ color: '#667eea', fontWeight: '600' }}>{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No items</span>
                  )}
                </td>
                <td className="actions-column">
                  <button 
                    disabled={!o._id || processing} 
                    onClick={() => handleProcess(o._id)}
                    className="btn btn-primary btn-small"
                    style={{ width: '100%', padding: '8px 12px' }}
                  >
                    {processing ? <span className="loading"></span> : '⚡ Process'}
                  </button>
                </td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={6} className="text-center" style={{ padding: '60px', opacity: 0.7 }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📭</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>No pending orders found</div>
                  <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '8px' }}>All orders have been processed or completed</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '12px', fontSize: '0.9rem', color: '#6c757d' }}>
        💡 <strong>Tip:</strong> Completed orders are automatically hidden from this view. Use the Order ID input above to process specific orders.
      </div>
    </div>
  );
}
