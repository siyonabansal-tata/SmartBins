import React, { useState, useEffect } from 'react';
import './App.css';

const BASE_URL = "http://localhost:8000";

// Medicine price mapping dictionary
const MEDICINE_PRICE_MAP = {
  "paracetamol": 25,
  "acetaminophen": 30,
  "aspirin": 40,
  "azithromycin": 120,
  "covaxin": 600,
  "covishield": 700,
};

const App = () => {
  const [medicines, setMedicines] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showCart, setShowCart] = useState(false);

  // Function to get price for a medicine
  const getMedicinePrice = (medicineName) => {
    const normalizedName = medicineName.toLowerCase().trim();
    return MEDICINE_PRICE_MAP[normalizedName] || MEDICINE_PRICE_MAP["default"];
  };

  // Fetch medicines from API
  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/medicines`);
      const data = await response.json();
      
      // Map medicines with prices from the dictionary and normalize field names
      const medicinesWithPrices = data.map(medicine => ({
        ...medicine,
        price: getMedicinePrice(medicine.name),
        stock: medicine.qty, // Map qty to stock for consistency
        category: medicine.category || 'General' // Default category if not provided
      }));
      
      setMedicines(medicinesWithPrices);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      setMessage('Error loading medicines');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (medicine) => {
    const existingItem = cart.find(item => item.name === medicine.name);
    if (existingItem) {
      setCart(cart.map(item =>
        item.name === medicine.name
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...medicine, quantity: 1 }]);
    }
    setMessage(`${medicine.name} added to cart`);
    setTimeout(() => setMessage(''), 3000);
  };

  const removeFromCart = (medicineName) => {
    setCart(cart.filter(item => item.name !== medicineName));
  };

  const updateQuantity = (medicineName, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(medicineName);
    } else {
      setCart(cart.map(item =>
        item.name === medicineName
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      setMessage('Cart is empty');
      return;
    }

    try {
      setOrderLoading(true);
      
      // Order data structure matching your new backend API
      const orderData = {
        items: cart.map(item => ({
          medicine_name: item.name,
          quantity: item.quantity
        }))
      };

      console.log('Sending order data:', orderData); // Debug log

      const response = await fetch(`${BASE_URL}/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage('Order placed successfully!');
        setCart([]);
        setShowCart(false);
        console.log('Order result:', result);
      } else {
        // Log the error details for debugging
        const errorText = await response.text();
        console.error('Order error:', response.status, errorText);
        setMessage(`Error placing order: ${response.status}`);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setMessage('Error placing order');
    } finally {
      setOrderLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const toggleCart = () => {
    setShowCart(!showCart);
  };

  if (loading) {
    return <div className="loading">Loading medicines...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>TATA 1mg</h1>
        <div className="cart-summary" onClick={toggleCart}>
          <span className="cart-icon">🛒</span>
          <span>Cart: {cart.length} items (₹{getTotalPrice()})</span>
          <span className="cart-toggle">{showCart ? '✕' : '▼'}</span>
        </div>
      </header>

      {message && <div className="message">{message}</div>}

      <div className={`main-content ${showCart ? 'show-cart' : ''}`}>
        <div className="medicines-section">
          <h2>Available Medicines</h2>
          <div className="medicines-grid">
            {medicines.map((medicine, index) => (
              <div key={index} className="medicine-card">
                <h3>{medicine.name}</h3>
                <p className="category">{medicine.category}</p>
                <div
                  className={`stock-badge ${
                    medicine.stock === 0 ? 'out' : medicine.stock <= 5 ? 'low' : 'in'
                  }`}
                >
                  {medicine.stock === 0 ? 'Out of stock' : `In stock: ${medicine.stock}`}
                </div>
                <p className="price">
                  {medicine.price > 0 ? `₹${medicine.price}` : 'Price not available'}
                </p>
                <button 
                  className="add-to-cart-btn"
                  onClick={() => addToCart(medicine)}
                  disabled={medicine.price === 0 || medicine.stock === 0}
                >
                  {medicine.price === 0
                    ? 'Unavailable'
                    : medicine.stock === 0
                    ? 'Out of Stock'
                    : 'Add to Cart'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={`cart-section ${showCart ? 'mobile-visible' : ''}`}>
          <div className="cart-header">
            <h2>Shopping Cart</h2>
            <button className="close-cart mobile-only" onClick={toggleCart}>✕</button>
          </div>
          {cart.length === 0 ? (
            <p className="empty-cart">Your cart is empty</p>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item, index) => (
                  <div key={index} className="cart-item">
                    <div className="item-info">
                      <h4>{item.name}</h4>
                      <p>{item.category}</p>
                      <div className="item-price mobile-price">
                        ₹{item.price * item.quantity}
                      </div>
                    </div>
                    <div className="item-actions">
                      <div className="item-controls">
                        <button 
                          onClick={() => updateQuantity(item.name, item.quantity - 1)}
                          className="quantity-btn"
                        >
                          -
                        </button>
                        <span className="quantity">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.name, item.quantity + 1)}
                          className="quantity-btn"
                        >
                          +
                        </button>
                      </div>
                      <div className="item-price desktop-price">
                        ₹{item.price * item.quantity}
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.name)}
                        className="remove-btn"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <h3>Total: ₹{getTotalPrice()}</h3>
                <button 
                  className="place-order-btn"
                  onClick={placeOrder}
                  disabled={orderLoading}
                >
                  {orderLoading ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {showCart && <div className="cart-overlay mobile-only" onClick={toggleCart}></div>}
    </div>
  );
};

export default App;