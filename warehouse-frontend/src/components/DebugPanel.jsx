import { useState } from 'react';
import { addOrUpdateMedicine, listOrders, processOrder, listActiveOrders, completeOrder } from '../api';

export default function DebugPanel() {
  const [debugOutput, setDebugOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const runTest = async (testName, testFunction) => {
    setLoading(true);
    setDebugOutput(prev => prev + `\n\n=== ${testName} ===\n`);
    
    try {
      const result = await testFunction();
      setDebugOutput(prev => prev + `Success: ${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      setDebugOutput(prev => prev + `Error: ${error.message}\n`);
      console.error(`${testName} failed:`, error);
    } finally {
      setLoading(false);
    }
  };

  const tests = {
    'Test Add Medicine': () => addOrUpdateMedicine({
      name: 'Test Medicine',
      bin: 'A1',
      qty: 5
    }),
    'Test List Orders': () => listOrders(),
    'Test List Active Orders': () => listActiveOrders(),
    'Test Process Order (sample ID)': () => processOrder('68b5a6f6f9cff126a2bc6c43'),
    'Test Complete Order (sample ID)': () => completeOrder('68b5a6f6f9cff126a2bc6c43')
  };

  return (
    <div className="card debug-panel">
      <div className="card-header">
        <h3 className="card-title">🐛 Debug Panel</h3>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        {Object.entries(tests).map(([testName, testFunc]) => (
          <button
            key={testName}
            onClick={() => runTest(testName, testFunc)}
            disabled={loading}
            className="btn btn-small"
            style={{ margin: '4px', backgroundColor: '#fdcb6e', color: '#2d3436' }}
          >
            {testName}
          </button>
        ))}
        <button 
          onClick={() => setDebugOutput('')} 
          className="btn btn-small btn-danger"
          style={{ margin: '4px' }}
        >
          🗑️ Clear
        </button>
      </div>
      
      <div style={{ marginBottom: '15px', padding: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
        <strong>🌐 API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
      </div>
      
      {loading && (
        <div style={{ color: '#fdcb6e', marginBottom: '15px' }}>
          <span className="loading"></span> Running test...
        </div>
      )}
      
      <textarea
        value={debugOutput}
        readOnly
        className="debug-output"
        placeholder="🔍 Debug output will appear here. Click any test button above to start debugging..."
      />
    </div>
  );
}
