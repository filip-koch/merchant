import React, { useState } from 'react';
import { ShoppingBag, ChevronUp, ChevronDown, Trash2, Banknote, QrCode, AlertTriangle } from 'lucide-react';

export default function CartDrawer({ 
  cart, 
  onUpdateQuantity, 
  onRemoveItem, 
  onSelectPayment,
  bankConfigured 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (cart.length === 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 py-4 px-6 flex justify-center items-center gap-2 text-zinc-400 text-sm font-medium z-40 select-none shadow-[0_-4px_12px_rgba(0,0,0,0.03)] safe-bottom">
        <ShoppingBag size={18} strokeWidth={2} />
        <span>Košík je prázdný</span>
      </div>
    );
  }

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  const handlePaymentClick = (type) => {
    setIsOpen(false);
    onSelectPayment(type);
  };

  return (
    <>
      {/* Drawer Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity animate-fade-in" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Drawer Container */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 rounded-t-2xl z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col ${
          isOpen ? 'max-h-[85vh] translate-y-0' : 'translate-y-0'
        }`}
      >
        
        {/* DRAG HANDLE / COLLAPSED BAR HEADER */}
        <div className="px-6 py-4 flex flex-col items-center cursor-pointer border-b border-zinc-50 select-none shrink-0" onClick={toggleDrawer}>
          <div className="w-10 h-1 bg-zinc-200 rounded-full mb-3 shrink-0" />
          <div className="w-full flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <span className="bg-zinc-950 text-white text-[11px] font-bold min-w-[20px] h-5 rounded-full flex justify-center items-center px-1.5 shadow-sm">
                {totalItems}
              </span>
              <span className="font-semibold text-sm text-zinc-800">
                {isOpen ? 'Položky v košíku' : 'Zobrazit košík'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {isOpen && <span className="text-xs text-zinc-400">K úhradě:</span>}
              <span className="font-bold text-base text-zinc-900">
                {totalPrice.toLocaleString('cs-CZ')} Kč
              </span>
              <span className="text-zinc-400 transition-transform duration-200">
                {isOpen ? <ChevronDown size={18} strokeWidth={2.5} /> : <ChevronUp size={18} strokeWidth={2.5} />}
              </span>
            </div>
          </div>
        </div>

        {/* DRAWER EXPANDED CONTENT */}
        {isOpen && (
          <div className="flex flex-col overflow-hidden max-h-[calc(85vh-70px)] animate-fade-in">
            
            {/* ITEM LIST */}
            <div className="overflow-y-auto px-6 py-4 max-h-[40vh] flex flex-col gap-4 custom-scrollbar">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2.5 border-b border-zinc-100 last:border-0">
                  <div className="flex flex-col gap-0.5 flex-1 pr-4">
                    <span className="font-medium text-sm text-zinc-800 leading-snug">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {item.price.toLocaleString('cs-CZ')} Kč/ks • {(item.price * item.quantity).toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-zinc-50 border border-zinc-200/80 rounded-xl p-0.5 select-none">
                      <button 
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex justify-center items-center text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-lg transition-all text-sm font-semibold active:scale-90"
                        aria-label="Snížit množství"
                      >
                        -
                      </button>
                      <span className="text-xs font-semibold text-zinc-800 w-7 text-center">
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex justify-center items-center text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-lg transition-all text-sm font-semibold active:scale-90"
                        aria-label="Zvýšit množství"
                      >
                        +
                      </button>
                    </div>

                    <button 
                      onClick={() => onRemoveItem(item.id)}
                      className="p-2 text-zinc-400 hover:text-zinc-900 active:scale-90 transition-colors"
                      aria-label="Odstranit položku"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* CHECKOUT METHODS */}
            <div className="p-6 bg-white border-t border-zinc-100 flex flex-col gap-4 pb-safe safe-bottom">
              {!bankConfigured && (
                <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-3 text-xs leading-relaxed flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>Platby QR kódem nebudou fungovat bez vyplnění čísla bankovního účtu v nastavení.</span>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={() => handlePaymentClick('cash')} 
                  className="flex-1 flex items-center justify-center gap-3 py-3.5 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 font-semibold rounded-2xl cursor-pointer active:scale-[0.98] transition-all"
                >
                  <Banknote size={18} strokeWidth={2} className="text-zinc-600" />
                  <div className="text-left leading-none">
                    <span className="block text-sm font-bold text-zinc-800">Hotovost</span>
                    <span className="block text-[10px] opacity-75 mt-0.5 text-zinc-500 font-normal">Automaticky 10s</span>
                  </div>
                </button>

                <button 
                  onClick={() => handlePaymentClick('qr')} 
                  disabled={!bankConfigured}
                  className={`flex-1 flex items-center justify-center gap-3 py-3.5 font-semibold rounded-2xl transition-all ${
                    bankConfigured 
                      ? 'bg-zinc-950 hover:bg-zinc-800 text-white cursor-pointer active:scale-[0.98]' 
                      : 'bg-zinc-50 border border-zinc-200 text-zinc-300 cursor-not-allowed'
                  }`}
                >
                  <QrCode size={18} strokeWidth={2} />
                  <div className="text-left leading-none">
                    <span className="block text-sm font-bold">QR Platba</span>
                    <span className="block text-[10px] opacity-75 mt-0.5 font-normal">
                      {bankConfigured ? 'Standard SPAYD' : 'Nastavit účet'}
                    </span>
                  </div>
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
