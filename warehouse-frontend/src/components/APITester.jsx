import { useState } from 'react';

export default function APITester() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testAPI = async (endpoint) => {
    setLoading(true);
    setResult('');
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}${endpoint}`);
      const data = await response.text();
      setResult(`Status: ${response.status}\n${data}`);
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card api-tester">
      <div className="card-header">
        <h3 className="card-title">🌐 API Connectivity Tester</h3>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => testAPI('/')} 
          disabled={loading}
          className="btn btn-small"
          style={{ margin: '4px', backgroundColor: 'white', color: '#0984e3' }}
        >
          🏠 Test Root
        </button>
        <button 
          onClick={() => testAPI('/orders')} 
          disabled={loading}
          className="btn btn-small"
          style={{ margin: '4px', backgroundColor: 'white', color: '#0984e3' }}
        >
          📦 Test Orders
        </button>
        <button 
          onClick={() => testAPI('/active-orders')} 
          disabled={loading}
          className="btn btn-small"
          style={{ margin: '4px', backgroundColor: 'white', color: '#0984e3' }}
        >
          🔄 Test Active Orders
        </button>
      </div>
      
      {loading && (
        <div style={{ color: 'white', marginBottom: '15px' }}>
          <span className="loading"></span> Testing API connection...
        </div>
      )}
      
      {result && (
        <pre style={{ 
          background: 'rgba(0,0,0,0.3)', 
          color: '#00ff88',
          padding: '15px', 
          fontSize: '0.85rem', 
          overflow: 'auto',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {result}
        </pre>
      )}
    </div>
  );
}
