const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  try {
    console.log(`Making ${options.method || 'GET'} request to: ${BASE_URL}${path}`);
    if (options.body) {
      console.log('Request body:', options.body);
    }
    
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    
    let data;
    try {
      data = isJson ? await res.json() : await res.text();
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      data = await res.text();
    }
    
    console.log('Response status:', res.status);
    console.log('Response data:', data);

    if (!res.ok) {
      const detail = isJson ? (data.detail || data.message || JSON.stringify(data)) : data;
      throw new Error(detail || `Request failed: ${res.status} ${res.statusText}`);
    }
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export const addOrUpdateMedicine = (payload) =>
  request('/add-or-update-medicine', { method: 'POST', body: JSON.stringify(payload) });

export const listOrders = () => request('/orders');

export const processOrder = (orderId) =>
  request(`/process-order/${orderId}`, { method: 'POST' });

export const listActiveOrders = () => request('/active-orders');

export const completeOrder = (orderId) =>
  request(`/complete-order/${orderId}`, { method: 'POST' });
