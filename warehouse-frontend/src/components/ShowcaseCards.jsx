export default function ShowcaseCards() {
  return (
    <div className="grid grid-2" style={{ marginBottom: '30px' }}>
      <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ color: 'white' }}>🎯 Features</h3>
        </div>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '10px' }}>✅ Modern, responsive design</li>
          <li style={{ marginBottom: '10px' }}>🎨 Beautiful gradients and animations</li>
          <li style={{ marginBottom: '10px' }}>📱 Mobile-friendly interface</li>
          <li style={{ marginBottom: '10px' }}>⚡ Real-time data updates</li>
          <li style={{ marginBottom: '10px' }}>🔍 Comprehensive debugging tools</li>
          <li style={{ marginBottom: '10px' }}>🚀 Auto-hide completed orders</li>
        </ul>
      </div>
      
      <div className="card" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ color: 'white' }}>📊 Quick Stats</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>💊</div>
            <div>Medicine Management</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>📦</div>
            <div>Order Processing</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>🔄</div>
            <div>Real-time Updates</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>✅</div>
            <div>Auto Completion</div>
          </div>
        </div>
      </div>
    </div>
  );
}
