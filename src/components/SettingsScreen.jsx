import React, { useState, useEffect } from 'react';
import { ArrowLeft, Info, Trash2, Plus } from 'lucide-react';
import { validateCzechAccount, validateBankId } from '../utils/paymentUtils.js';

export default function SettingsScreen({ onClose }) {
  const [businessName, setBusinessName] = useState('Artist');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankId, setBankId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Custom products states
  const [products, setProducts] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemScript, setNewItemScript] = useState('');
  const [showScriptField, setShowScriptField] = useState(false);

  // Load configuration and products on mount
  useEffect(() => {
    const savedAccount = localStorage.getItem('pos_bank_account') || '';
    const savedBankId = localStorage.getItem('pos_bank_id') || '';
    setAccountNumber(savedAccount);
    setBankId(savedBankId);

    const savedName = localStorage.getItem('pos_business_name') || 'Artist';
    setBusinessName(savedName);

    const storedProducts = localStorage.getItem('pos_products');
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    }
  }, []);

  const handleSaveConfig = (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate bank details ONLY if they are entered
    const cleanAccount = accountNumber.trim();
    const cleanBank = bankId.trim();

    if (cleanAccount || cleanBank) {
      if (!validateCzechAccount(cleanAccount)) {
        setError('Neplatný formát čísla účtu. Použijte číslice (např. 12345678) nebo formát s předčíslím (např. 19-12345678).');
        return;
      }
      if (!validateBankId(cleanBank)) {
        setError('Kód banky musí být přesně 4 číslice (např. 0800).');
        return;
      }
      localStorage.setItem('pos_bank_account', cleanAccount);
      localStorage.setItem('pos_bank_id', cleanBank);
    } else {
      localStorage.removeItem('pos_bank_account');
      localStorage.removeItem('pos_bank_id');
    }

    // Save business name
    localStorage.setItem('pos_business_name', businessName.trim() || 'Artist');
    
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
    }, 2000);
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    const name = newItemName.trim();
    const price = parseFloat(newItemPrice);

    if (!name || isNaN(price) || price <= 0) return;

    const newProduct = {
      id: `prod-${Date.now()}`,
      name,
      price,
      script: showScriptField ? newItemScript.trim() : ''
    };

    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));

    // Reset form fields
    setNewItemName('');
    setNewItemPrice('');
    setNewItemScript('');
    setShowScriptField(false);
  };

  const handleDeleteProduct = (id) => {
    const updatedProducts = products.filter(p => p.id !== id);
    setProducts(updatedProducts);
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));
  };

  return (
    <div className="fixed inset-0 bg-zinc-50 z-[100] flex flex-col overflow-hidden animate-slide-up select-none">
      
      {/* Header */}
      <header className="flex justify-between items-center bg-white border-b border-zinc-100 px-6 py-4 safe-top shrink-0">
        <button 
          onClick={onClose} 
          className="p-2 text-zinc-500 hover:text-zinc-955 hover:bg-zinc-50 rounded-full transition-all active:scale-90 cursor-pointer" 
          aria-label="Zpět"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h2 className="text-base font-bold text-zinc-900">Nastavení pokladny</h2>
        <div className="w-9 h-9"></div> {/* Spacer for symmetry */}
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar max-w-lg mx-auto w-full pb-16">
        
        {/* Section 1: General settings */}
        <h3 className="text-sm font-bold text-zinc-900 mb-4">Obecná nastavení a platby</h3>
        
        <div className="flex gap-3 bg-zinc-100/50 border border-zinc-200/50 p-4 rounded-2xl mb-5">
          <Info size={16} className="text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-zinc-500">
            Zadejte název pokladny a bankovní údaje pro příjem QR plateb. Údaje se ukládají lokálně na tomto zařízení.
          </p>
        </div>

        <form onSubmit={handleSaveConfig} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="businessName" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Záhlaví
            </label>
            <input
              id="businessName"
              type="text"
              placeholder="Např. Artist"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <label htmlFor="accountNumber" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Číslo účtu (nepovinné)
            </label>
            <input
              id="accountNumber"
              type="text"
              inputMode="decimal"
              placeholder="Např. 19-1234567890"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 font-mono transition-all"
            />
            <span className="text-[10px] text-zinc-400 mt-0.5 leading-normal">
              Formát: [předčíslí-]číslo_účtu (pouze číslice a pomlčka)
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bankId" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Kód banky (4 číslice)
            </label>
            <input
              id="bankId"
              type="text"
              inputMode="numeric"
              maxLength="4"
              placeholder="Např. 0800"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 font-mono transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-800 rounded-xl px-4 py-3 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-4 py-3 text-xs font-semibold text-center">
              Nastavení bylo úspěšně uloženo!
            </div>
          )}

          <button 
            type="submit" 
            className="bg-zinc-950 hover:bg-zinc-800 text-white font-semibold py-3.5 px-4 rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer text-center w-full mt-2"
          >
            Uložit nastavení
          </button>
        </form>

        {/* Divider line */}
        <div className="border-t border-zinc-200/60 my-8 pt-8"></div>

        {/* Section 2: Products settings */}
        <h3 className="text-sm font-bold text-zinc-900 mb-4">Správa produktů</h3>

        {/* Form to add a new product */}
        <form onSubmit={handleAddProduct} className="flex flex-col gap-4 bg-white border border-zinc-200 rounded-2xl p-5 mb-6 shadow-sm shadow-zinc-100/50">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nový produkt</span>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase">Název</label>
              <input
                type="text"
                placeholder="Např. Plátno 40x50"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="bg-zinc-50/50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all"
                required
              />
            </div>

            <div className="sm:w-36 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase">Cena (Kč)</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Např. 550"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="bg-zinc-50/50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all font-medium"
                required
              />
            </div>
          </div>

          {/* Script section */}
          <div className="border-t border-zinc-100 pt-4 flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-500 select-none">
              <input
                type="checkbox"
                checked={showScriptField}
                onChange={(e) => setShowScriptField(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
              />
              Aktivovat pokročilé chování (skript)
            </label>

            {showScriptField && (
              <div className="flex flex-col gap-2.5 animate-fade-in">
                <span className="text-[10px] text-zinc-400 leading-normal">
                  Napište JavaScript, který vrátí celkovou cenu (v Kč) pro daný počet kusů. K dispozici jsou proměnné <code className="bg-zinc-100 px-1 rounded text-zinc-700 font-mono">quantity</code> (množství) a <code className="bg-zinc-100 px-1 rounded text-zinc-700 font-mono">price</code> (cena za kus).
                </span>
                
                <textarea
                  placeholder="return quantity * price;"
                  rows="3"
                  value={newItemScript}
                  onChange={(e) => setNewItemScript(e.target.value)}
                  className="bg-zinc-50/50 border border-zinc-200 rounded-xl px-4 py-3 text-xs font-mono text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all w-full"
                />

                <div className="flex flex-wrap gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewItemScript('return (Math.floor(quantity / 3) * 2 + (quantity % 3)) * price;')}
                    className="text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold px-2 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                  >
                    Šablona: 3 za cenu 2 (2+1 zdarma)
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="bg-zinc-950 hover:bg-zinc-800 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-1.5 mt-2"
          >
            <Plus size={14} strokeWidth={2.5} /> Přidat produkt
          </button>
        </form>

        {/* List of stored custom products */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Aktuální nabídka ({products.length})</span>
          {products.length === 0 ? (
            <p className="text-xs text-zinc-400 italic text-center py-8 border border-dashed border-zinc-200 rounded-2xl bg-white shadow-sm shadow-zinc-100/50">
              V nabídce nejsou žádné produkty. Přidejte je pomocí formuláře výše.
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {products.map((product) => (
                <div key={product.id} className="flex justify-between items-center bg-white border border-zinc-200/80 rounded-xl p-3.5 shadow-sm shadow-zinc-100/50">
                  <div className="flex flex-col pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-800 leading-snug">{product.name}</span>
                      {product.script && (
                        <span className="bg-zinc-50 border border-zinc-200/60 text-zinc-500 text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider select-none shrink-0" title="Obsahuje speciální chování">
                          Skript
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-900">{product.price} Kč</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer active:scale-90"
                      aria-label="Smazat produkt"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
