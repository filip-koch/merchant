import React, { useState, useEffect } from 'react';
import { Settings, ShoppingBag } from 'lucide-react';
import SettingsScreen from './components/SettingsScreen';
import CartDrawer from './components/CartDrawer';
import PaymentModal from './components/PaymentModal';

function App() {
  // Screens & overlays state
  const [activeScreen, setActiveScreen] = useState('pos'); // 'pos' or 'settings'
  
  // Cart state
  const [cart, setCart] = useState([]);
  
  // Dynamic products list loaded from localStorage
  const [products, setProducts] = useState([]);

  // Business/Header name state
  const [businessName, setBusinessName] = useState('Artist');

  // Payment flow state
  const [paymentFlow, setPaymentFlow] = useState({ isOpen: false, type: null }); // type: 'cash' or 'qr'
  
  // Loaded bank account details
  const [bankInfo, setBankInfo] = useState({ accountNumber: '', bankId: '' });

  // Load configuration from localStorage
  const loadConfig = () => {
    const accountNumber = localStorage.getItem('pos_bank_account') || '';
    const bankId = localStorage.getItem('pos_bank_id') || '';
    setBankInfo({ accountNumber, bankId });

    const savedName = localStorage.getItem('pos_business_name');
    setBusinessName(savedName || 'Artist');
  };

  // Load products list from localStorage
  const loadProducts = () => {
    const stored = localStorage.getItem('pos_products');
    if (stored) {
      setProducts(JSON.parse(stored));
    } else {
      setProducts([]);
    }
  };

  useEffect(() => {
    loadConfig();
    loadProducts();
  }, []);

  // Reload config and products when returning from settings screen
  useEffect(() => {
    if (activeScreen === 'pos') {
      loadConfig();
      loadProducts();
    }
  }, [activeScreen]);

  const isBankConfigured = !!(bankInfo.accountNumber && bankInfo.bankId);

  // Cart Functions
  const handleAddToCart = (product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      handleRemoveItem(id);
    } else {
      setCart((prevCart) =>
        prevCart.map((item) => (item.id === id ? { ...item, quantity } : item))
      );
    }
  };

  const handleRemoveItem = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 select-none">
      
      {/* HEADER SECTION */}
      <header className="flex justify-between items-center bg-white border-b border-zinc-100 px-6 py-4 safe-top z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-zinc-900">{businessName}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Settings Button */}
          <button 
            onClick={() => setActiveScreen('settings')} 
            className="p-2 text-zinc-500 hover:text-zinc-955 hover:bg-zinc-50 rounded-full transition-all active:scale-90 cursor-pointer"
            aria-label="Nastavení"
          >
            <Settings size={20} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* POS WORKSPACE / PRODUCTS GRID */}
      <main className="flex-1 overflow-y-auto px-6 py-6 pb-28 custom-scrollbar">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
          
          {products.length === 0 ? (
            <div className="col-span-2 sm:col-span-3 flex flex-col items-center justify-center text-center py-16 px-6 bg-white border border-zinc-200/80 rounded-2xl shadow-sm shadow-zinc-100/50">
              <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center mb-4">
                <ShoppingBag size={22} className="text-zinc-400" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900">Zatím nemáte žádné produkty</h3>
              <p className="text-xs text-zinc-400 max-w-xs mt-1.5 leading-relaxed">
                Přejděte do nastavení kliknutím na ozubené kolečko v pravém horním rohu a přidejte své vlastní produkty a ceny.
              </p>
              <button
                onClick={() => setActiveScreen('settings')}
                className="mt-5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl py-2.5 px-4 active:scale-95 transition-all cursor-pointer"
              >
                Nastavit produkty
              </button>
            </div>
          ) : (
            products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddToCart(product)}
                className="bg-white border border-zinc-200/80 rounded-2xl p-5 flex flex-col justify-between items-start min-h-[110px] text-left hover:border-zinc-400 active:scale-[0.98] transition-all cursor-pointer shadow-sm shadow-zinc-100/50 group"
              >
                <span className="text-[15px] font-semibold text-zinc-900 leading-tight mt-1">{product.name}</span>
                <span className="text-sm font-medium text-zinc-505 mt-2">{product.price.toLocaleString('cs-CZ')} Kč</span>
              </button>
            ))
          )}

        </div>
      </main>

      {/* STICKY BOTTOM DRAWER (CART) */}
      <CartDrawer
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onSelectPayment={(type) => setPaymentFlow({ isOpen: true, type })}
        bankConfigured={isBankConfigured}
      />

      {/* SETTINGS VIEW COVER */}
      {activeScreen === 'settings' && (
        <SettingsScreen onClose={() => setActiveScreen('pos')} />
      )}

      {/* PAYMENT MODAL FLOWS */}
      {paymentFlow.isOpen && (
        <PaymentModal
          type={paymentFlow.type}
          amount={cartTotal}
          bankInfo={bankInfo}
          onClose={() => setPaymentFlow({ isOpen: false, type: null })}
          onConfirm={handleClearCart}
        />
      )}

    </div>
  );
}

export default App;
