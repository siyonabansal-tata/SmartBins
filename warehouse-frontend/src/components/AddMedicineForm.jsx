import { useState, useRef, useEffect } from 'react';
import { addOrUpdateMedicine } from '../api';

export default function AddMedicineForm() {
  const [form, setForm] = useState({ name: '', bin: '', qty: 1 });
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState('');

  // Scanner UI/state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState('keyboard');
  const scannerHiddenRef = useRef(null);
  const [serialPort, setSerialPort] = useState(null);
  const [serialStatus, setSerialStatus] = useState('disconnected');
  const serialReaderRef = useRef(null);
  const isStoppingRef = useRef(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [autoSubmit, setAutoSubmit] = useState(false);

  // Debug logging function
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(`🔍 ${logEntry}`);
    setDebugLogs(prev => [...prev.slice(-10), { message: logEntry, type }]);
  };

  // Focus scanner input when modal opens
  useEffect(() => {
    if (scannerOpen && scannerMode === 'keyboard' && scannerHiddenRef.current) {
      const timer = setTimeout(() => {
        scannerHiddenRef.current?.focus();
        addDebugLog('Keyboard scanner input focused and ready');
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [scannerOpen, scannerMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serialPort && !isStoppingRef.current) {
        addDebugLog('Component unmounting, cleaning up serial connection');
        stopSerialRead().catch(err => console.error('Cleanup error:', err));
      }
    };
  }, [serialPort]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === 'qty' ? Number(value) : value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOutput(null);
    
    const payload = {
      name: form.name.trim(),
      bin: form.bin.trim(),
      qty: Number(form.qty) || 0,
    };
    
    console.log('Submitting medicine data:', payload);
    
    try {
      const res = await addOrUpdateMedicine(payload);
      setOutput(res);
      // Reset form on success
      setForm({ name: '', bin: '', qty: 1 });
    } catch (err) {
      console.error('Add medicine error:', err);
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  // Submit function that can be called manually or automatically
  const submitFormData = async (dataToSubmit = form) => {
    setLoading(true);
    setError('');
    setOutput(null);
    
    try {
      const payload = {
        name: dataToSubmit.name.trim(),
        bin: dataToSubmit.bin.trim() || 'A1', // Default bin if not provided
        qty: Number(dataToSubmit.qty) || 1
      };

      addDebugLog(`Submitting form data: ${JSON.stringify(payload)}`);
      const res = await addOrUpdateMedicine(payload);
      addDebugLog(`Response received: ${JSON.stringify(res)}`, 'success');
      
      setOutput(res);
      // Reset form on success
      setForm({ name: '', bin: '', qty: 1 });
    } catch (err) {
      console.error('Add medicine error:', err);
      const errorMsg = err.message || 'Request failed';
      setError(errorMsg);
      addDebugLog(`Submit error: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open scanner modal
  const openScanner = (mode = 'keyboard') => {
    addDebugLog(`Opening scanner with mode: ${mode}`);
    setScannerMode(mode);
    setScannerOpen(true);
    setError('');
    setDebugLogs([]);
  };

  const closeScanner = async () => {
    addDebugLog('Closing scanner');
    setScannerOpen(false);
    if (serialPort && !isStoppingRef.current) {
      try {
        await stopSerialRead();
      } catch (err) {
        console.error('Error closing scanner:', err);
      }
    }
  };

  // Enhanced QR data parsing that matches Python implementation
  const processScannedData = (rawData) => {
    if (!rawData || typeof rawData !== 'string') {
      addDebugLog(`Invalid scanned data: ${JSON.stringify(rawData)}`, 'error');
      setError('Invalid scanned data received');
      return;
    }
    
    const data = rawData.trim();
    addDebugLog('=== PROCESSING SCANNED DATA ===');
    addDebugLog(`Raw input: "${rawData}"`);
    addDebugLog(`Trimmed data: "${data}"`);
    addDebugLog(`Data length: ${data.length}`);

    if (!data) {
      addDebugLog('Empty scanned data', 'warning');
      setError('Empty data scanned');
      return;
    }

    let parsedData = { name: '', qty: 1, bin: '' };
    let processed = false;

    // Try to parse as JSON (medicine data) - matches Python logic
    try {
      const jsonData = JSON.parse(data);
      addDebugLog(`JSON parsed successfully: ${JSON.stringify(jsonData)}`);
      
      // Check if it's medicine data (matches Python check)
      if (jsonData.medicine && jsonData.quantity) {
        parsedData.name = String(jsonData.medicine).trim();
        parsedData.qty = parseInt(jsonData.quantity) || 1;
        parsedData.bin = jsonData.bin || '';
        
        addDebugLog(`✅ Medicine JSON format detected: ${parsedData.name}, quantity: ${parsedData.qty}`);
        
        // Show greeting message like Python version
        addDebugLog(`🏥 Medicine Information Processed!`, 'success');
        addDebugLog(`Hello! You have ${parsedData.name}, quantity: ${parsedData.qty} units`, 'success');
        
        processed = true;
      } else {
        // Generic JSON data - extract what we can
        parsedData.name = jsonData.name || jsonData.medicine_name || jsonData.product || jsonData.item || '';
        parsedData.qty = parseInt(jsonData.quantity || jsonData.count || jsonData.qty || jsonData.amount || 1) || 1;
        parsedData.bin = jsonData.bin || jsonData.location || '';
        
        if (parsedData.name) {
          addDebugLog(`✅ Generic JSON parsing successful: ${JSON.stringify(parsedData)}`);
          processed = true;
        }
      }
    } catch (e) {
      addDebugLog('Not JSON format, trying other formats...');
      
      // Check if it looks like medicine info in other format (matches Python logic)
      if (['tablet', 'mg', 'medicine', 'drug', 'pill', 'capsule'].some(keyword => 
          data.toLowerCase().includes(keyword))) {
        addDebugLog(`Hello! This appears to be medicine-related information: ${data}`);
      }
    }

    if (!processed) {
      // Try other formats like before
      if (data.includes('|')) {
        const parts = data.split('|');
        addDebugLog(`Pipe-separated parts: ${JSON.stringify(parts)}`);
        parsedData.name = parts[0]?.trim() || '';
        parsedData.qty = parseInt(parts[1]?.trim()) || 1;
        parsedData.bin = parts[2]?.trim() || '';
        processed = parsedData.name.length > 0;
      } else if (data.includes(',')) {
        const parts = data.split(',');
        addDebugLog(`Comma-separated parts: ${JSON.stringify(parts)}`);
        parsedData.name = String(parts[0] || '').trim();
        parsedData.qty = parseInt((parts[1] || '').trim()) || 1;
        parsedData.bin = String(parts[2] || '').trim();
        processed = parsedData.name.length > 0;
      } else if (data.includes(':')) {
        // Key-value format
        const keyValuePairs = data.split(/[,;\n]/);
        addDebugLog(`Key-value pairs: ${JSON.stringify(keyValuePairs)}`);
        
        for (const pair of keyValuePairs) {
          const [key, value] = pair.split(':').map(s => s.trim());
          if (key && value) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('name') || lowerKey.includes('medicine') || lowerKey.includes('product')) {
              parsedData.name = value;
            } else if (lowerKey.includes('quantity') || lowerKey.includes('count') || lowerKey.includes('qty')) {
              parsedData.qty = parseInt(value) || 1;
            } else if (lowerKey.includes('bin') || lowerKey.includes('location')) {
              parsedData.bin = value;
            }
          }
        }
        processed = parsedData.name.length > 0;
      } else {
        // Space separated (last part might be number)
        const parts = data.split(/\s+/);
        const last = parts[parts.length - 1];
        
        if (/^\d+$/.test(last) && parts.length > 1) {
          parsedData.qty = parseInt(last, 10);
          parsedData.name = parts.slice(0, -1).join(' ').trim();
          processed = true;
        } else {
          // Fallback - treat entire string as name
          parsedData.name = data;
          processed = true;
        }
      }
    }

    if (processed && parsedData.name) {
      addDebugLog(`✅ Final parsed data: ${JSON.stringify(parsedData)}`, 'success');
      
      // Update form data
      setForm(prev => ({
        ...prev,
        name: parsedData.name,
        qty: parsedData.qty,
        bin: parsedData.bin || prev.bin // Keep existing bin if not parsed
      }));

      // Show success message
      setError('');
      
      // Auto-submit if enabled, otherwise just close scanner
      if (autoSubmit) {
        addDebugLog('Auto-submitting scanned data...', 'success');
        closeScanner();
        submitFormData({
          ...form,
          name: parsedData.name,
          qty: parsedData.qty,
          bin: parsedData.bin || form.bin || 'A1' // Default bin if not provided
        });
      } else {
        closeScanner();
      }
    } else {
      addDebugLog('Failed to extract meaningful data from scan', 'error');
      setError('Could not extract medicine information from scanned data');
    }
  };

  // Improved keyboard scanner handlers
  const handleScannerInputKeyDown = (e) => {
    addDebugLog(`Key pressed: ${e.key}, Current value: "${e.target.value}"`);
    
    // Most handheld scanners send all data at once followed by Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const scannedValue = e.target.value.trim();
      addDebugLog(`📄 Scanner data received: "${scannedValue}"`);
      
      if (scannedValue) {
        processScannedData(scannedValue);
      } else {
        addDebugLog('Empty scan data received', 'warning');
      }
      
      // Clear the input for next scan
      e.target.value = '';
    }
  };

  const handleScannerInputPaste = (e) => {
    e.preventDefault();
    const pastedData = (e.clipboardData || window.clipboardData).getData('text');
    addDebugLog(`📋 Pasted data: "${pastedData}"`);
    
    // Clear the input and process pasted data
    e.target.value = '';
    
    if (pastedData.trim()) {
      processScannedData(pastedData);
    }
  };

  // Test function for the test input
  const handleTestInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const testData = e.target.value.trim();
      addDebugLog(`🧪 Testing parser with: "${testData}"`);
      processScannedData(testData);
      e.target.value = '';
    }
  };

  // Serial scanner functionality
  const startSerialRead = async () => {
    if (!('serial' in navigator)) {
      const msg = 'Web Serial API not supported in this browser. Use Chrome/Edge with HTTPS or localhost.';
      setError(msg);
      addDebugLog(msg, 'error');
      return;
    }

    setError('');
    setSerialStatus('connecting');
    addDebugLog('Starting serial scanner...');

    try {
      if (serialPort) {
        addDebugLog('Stopping existing serial connection...');
        await stopSerialRead();
      }

      // Show previously granted ports
      try {
        const known = await navigator.serial.getPorts();
        if (known.length) {
          addDebugLog(`Previously-authorized ports found: ${known.length} port(s)`);
        } else {
          addDebugLog('No previously-authorized ports found');
        }
      } catch (gpErr) {
        addDebugLog(`getPorts() failed: ${gpErr.message}`, 'warning');
      }

      addDebugLog('Opening device chooser...');

      // Try with and without filters
      let port = null;
      try {
        port = await navigator.serial.requestPort({
          filters: [
            { usbVendorId: 0x0403 }, // FTDI
            { usbVendorId: 0x2341 }, // Arduino
            { usbVendorId: 0x1A86 }, // QinHeng
            { usbVendorId: 0x10C4 }  // Silicon Labs
          ]
        });
      } catch (filterErr) {
        addDebugLog('Retrying without filters...', 'warning');
        try {
          port = await navigator.serial.requestPort();
        } catch (noFilterErr) {
          addDebugLog(`Device chooser cancelled: ${noFilterErr?.message || noFilterErr}`, 'error');
          setError('No serial device selected.');
          setSerialStatus('disconnected');
          return;
        }
      }

      if (!port) {
        setError('No serial device selected.');
        setSerialStatus('disconnected');
        return;
      }

      addDebugLog('Port selected, attempting to open');

      // Try common baud rates
      const baudRates = [9600, 115200, 38400, 19200, 57600];
      let opened = false;
      for (const baudRate of baudRates) {
        try {
          addDebugLog(`Trying baud rate: ${baudRate}`);
          await port.open({ baudRate, dataBits: 8, parity: 'none', stopBits: 1, flowControl: 'none' });
          addDebugLog(`✅ Opened with baud rate: ${baudRate}`);
          opened = true;
          break;
        } catch (openErr) {
          addDebugLog(`Failed at ${baudRate}: ${openErr.message}`, 'warning');
        }
      }

      if (!opened) {
        throw new Error('Unable to open port with common baud rates. Try keyboard mode.');
      }

      setSerialPort(port);
      setSerialStatus('connected');

      if (!port.readable) {
        addDebugLog('Port has no readable stream', 'error');
        setError('Serial port is not readable. Try reconnecting or use keyboard mode.');
        return;
      }

      const decoder = new TextDecoderStream();
      const inputDone = port.readable.pipeTo(decoder.writable);
      const reader = decoder.readable.getReader();
      serialReaderRef.current = { reader, inputDone, port };
      setSerialStatus('reading');
      addDebugLog('📡 Serial read loop started');

      // Serial reading loop
      (async () => {
        try {
          let buffer = '';
          while (port.readable) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              buffer += value;
              const lines = buffer.split(/[\r\n]+/);
              buffer = lines.pop() || '';
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                  addDebugLog(`📡 Serial data received: ${trimmed}`);
                  processScannedData(trimmed);
                  return;
                }
              }
            }
          }
        } catch (readErr) {
          addDebugLog(`Serial read error: ${readErr.message}`, 'error');
          setError('Serial read error: ' + (readErr.message || readErr));
        } finally {
          setSerialStatus('connected');
        }
      })();

    } catch (err) {
      addDebugLog(`Serial connection error: ${err?.message || err}`, 'error');
      if (err.name === 'NotFoundError') setError('No serial device found or selected.');
      else if (err.name === 'NotAllowedError') setError('Permission denied to access serial device.');
      else if (err.name === 'NetworkError') setError('Port busy or disconnected.');
      else setError(err.message || 'Failed to open serial port.');
      setSerialStatus('disconnected');
      addDebugLog('💡 Try keyboard scanner mode if device acts as HID/keyboard', 'warning');
      await stopSerialRead().catch(() => {});
    }
  };

  const stopSerialRead = async () => {
    if (isStoppingRef.current) {
      addDebugLog('Stop already in progress, skipping...');
      return;
    }
    isStoppingRef.current = true;
    addDebugLog('🔄 Stopping serial read...');

    try {
      if (serialReaderRef.current?.reader) {
        try {
          await serialReaderRef.current.reader.cancel();
          addDebugLog('✅ Reader canceled');
        } catch (err) {
          addDebugLog(`Warning - Error canceling reader: ${err.message}`, 'warning');
        }
        
        try {
          serialReaderRef.current.reader.releaseLock();
          addDebugLog('✅ Reader lock released');
        } catch (err) {
          addDebugLog(`Warning - Error releasing reader lock: ${err.message}`, 'warning');
        }
      }
      
      if (serialReaderRef.current?.inputDone) {
        try {
          await serialReaderRef.current.inputDone.catch(() => {});
          addDebugLog('✅ Input stream closed');
        } catch (err) {
          addDebugLog(`Warning - Input stream close error: ${err.message}`, 'warning');
        }
      }
      
      serialReaderRef.current = null;
      
      if (serialPort) {
        try {
          if (serialPort.readable || serialPort.writable) {
            await serialPort.close();
            addDebugLog('✅ Serial port closed successfully');
          } else {
            addDebugLog('Serial port was already closed');
          }
        } catch (err) {
          if (err.message.includes('already closed')) {
            addDebugLog('Serial port was already closed');
          } else {
            addDebugLog(`Warning - Error closing port: ${err.message}`, 'warning');
          }
        }
      }
      
      setSerialPort(null);
      setSerialStatus('disconnected');
      
    } catch (e) {
      addDebugLog(`General error during serial cleanup: ${e.message}`, 'error');
    } finally {
      isStoppingRef.current = false;
      setSerialPort(null);
      serialReaderRef.current = null;
      setSerialStatus('disconnected');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">💊 Add / Update Medicine</h3>
      </div>
      
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => openScanner('keyboard')}
          style={{ marginRight: '8px' }}
        >
          🖨️ Scan QR (Keyboard)
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => openScanner('serial')}
        >
          🔌 Scan QR (Serial)
        </button>
      </div>

      <p style={{ textAlign: 'center', margin: '16px 0', color: '#666', fontSize: '0.9rem' }}>
        OR enter manually:
      </p>
      
      <form onSubmit={onSubmit}>
        <div className="form-container">
          <div className="form-group">
            <label className="form-label">Medicine Name</label>
            <input 
              className="form-input"
              name="name" 
              value={form.name} 
              onChange={onChange} 
              required 
              placeholder="Enter medicine name"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Bin Location</label>
            <input 
              className="form-input"
              name="bin" 
              value={form.bin} 
              onChange={onChange}  
              placeholder="e.g., A1, B2, C3"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input 
              className="form-input"
              name="qty" 
              type="number" 
              min="0" 
              value={form.qty} 
              onChange={onChange} 
              required 
              placeholder="Enter quantity"
            />
          </div>
        </div>
        
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? <span className="loading"></span> : '💾 Save Medicine'}
        </button>
      </form>

      {error && (
        <div className="message message-error">
          🚨 Error: {error}
        </div>
      )}
      
      {output && (
        <div className="message message-success">
          ✅ Success! Medicine saved successfully.
          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600' }}>View Response</summary>
            <pre style={{ background: '#f8f9fa', padding: '12px', marginTop: '8px', borderRadius: '8px', fontSize: '0.85rem' }}>
              {JSON.stringify(output, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Scanner modal */}
      {scannerOpen && (
        <div
          className="qr-scanner-container"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            padding: 20
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeScanner();
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 600,
              maxWidth: '95%',
              background: '#fff',
              padding: 20,
              borderRadius: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h3 style={{ marginTop: 0 }}>QR Scan Mode: {scannerMode}</h3>

            {scannerMode === 'keyboard' && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={autoSubmit}
                      onChange={(e) => setAutoSubmit(e.target.checked)}
                    />
                    Auto-submit after successful scan
                  </label>
                </div>

                <p style={{ marginBottom: 16 }}>
                  <strong>📋 Instructions:</strong><br />
                  1. Click in the input field below<br />
                  2. Scan your QR code with the handheld scanner<br />
                  3. The scanner will automatically type the data and press Enter
                </p>

                <input
                  ref={scannerHiddenRef}
                  onKeyDown={handleScannerInputKeyDown}
                  onPaste={handleScannerInputPaste}
                  style={{
                    width: '100%',
                    padding: 12,
                    fontSize: 16,
                    border: '2px solid #007bff',
                    borderRadius: 4,
                    outline: 'none',
                    backgroundColor: '#f8f9fa'
                  }}
                  placeholder="🎯 Click here, then scan with your handheld scanner..."
                  autoFocus
                />

                <div style={{ marginTop: 12, padding: 12, backgroundColor: '#e9ecef', borderRadius: 4 }}>
                  <p style={{ fontSize: 13, color: '#495057', margin: 0 }}>
                    <strong>💡 Tips:</strong><br />
                    • Make sure the input field above is focused (clicked)<br />
                    • Your scanner should be in HID/Keyboard mode<br />
                    • Most scanners automatically press Enter after scanning<br />
                    • If nothing happens, try the Serial scanner mode instead
                  </p>
                </div>

                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  <button className="btn btn-secondary" onClick={() => closeScanner()}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {scannerMode === 'serial' && (
              <>
                <p>Connect to a serial/USB barcode scanner using Web Serial API:</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button
                    className="btn btn-primary"
                    onClick={startSerialRead}
                    disabled={serialStatus !== 'disconnected'}
                  >
                    {serialStatus === 'disconnected' ? 'Connect Scanner' :
                     serialStatus === 'connecting' ? 'Connecting...' :
                     serialStatus === 'connected' ? 'Connected' :
                     'Reading...'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={stopSerialRead}
                    disabled={serialStatus === 'disconnected'}
                  >
                    Disconnect
                  </button>
                  <button className="btn btn-secondary" onClick={closeScanner}>
                    Close
                  </button>
                </div>
                
                {/* Status indicator */}
                <div style={{ marginBottom: 12 }}>
                  {serialStatus === 'connected' && (
                    <p style={{ color: 'green', fontSize: 14, margin: 0 }}>
                      ✅ Scanner connected. Scan a barcode/QR code now.
                    </p>
                  )}
                  {serialStatus === 'reading' && (
                    <p style={{ color: 'blue', fontSize: 14, margin: 0 }}>
                      🔄 Listening for scanner data...
                    </p>
                  )}
                  {serialStatus === 'connecting' && (
                    <p style={{ color: 'orange', fontSize: 14, margin: 0 }}>
                      🔄 Connecting to scanner...
                    </p>
                  )}
                </div>
                
                {/* Test section */}
                <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                  <p style={{ fontSize: 14, fontWeight: 'bold', margin: '0 0 8px 0' }}>
                    🧪 Test Data Parser:
                  </p>
                  <input
                    type="text"
                    placeholder='Try: {"medicine": "paracetamol", "quantity": 10, "bin": "A1"}'
                    onKeyDown={handleTestInput}
                    style={{
                      width: '100%',
                      padding: 8,
                      fontSize: 13,
                      border: '1px solid #ddd',
                      borderRadius: 3
                    }}
                  />
                  <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0 0' }}>
                    Press Enter to test what the parser would do with this data
                  </p>
                </div>

                {/* Debug logs */}
                {debugLogs.length > 0 && (
                  <div style={{ marginTop: 16, padding: 12, background: '#f0f0f0', borderRadius: 4, maxHeight: '200px', overflowY: 'auto' }}>
                    <p style={{ fontSize: 14, fontWeight: 'bold', margin: '0 0 8px 0' }}>
                      📋 Debug Logs:
                    </p>
                    <div style={{ fontSize: 12, fontFamily: 'monospace' }}>
                      {debugLogs.map((log, index) => (
                        <div 
                          key={index} 
                          style={{ 
                            color: log.type === 'error' ? 'red' : 
                                   log.type === 'warning' ? 'orange' : 
                                   log.type === 'success' ? 'green' : 'black',
                            marginBottom: '2px'
                          }}
                        >
                          {log.message}
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setDebugLogs([])}
                      style={{ 
                        marginTop: 8, 
                        padding: '4px 8px', 
                        fontSize: 12, 
                        background: '#ddd', 
                        border: 'none', 
                        borderRadius: 3,
                        cursor: 'pointer'
                      }}
                    >
                      Clear Logs
                    </button>
                  </div>
                )}
                
                <p style={{ fontSize: 13, color: '#666', marginTop: 12 }}>
                  <strong>Note:</strong> Web Serial API requires HTTPS and is supported in Chrome/Edge browsers.<br />
                  If no data appears after scanning, your scanner might work better in keyboard mode.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
