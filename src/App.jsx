import { useState } from 'react'
import { Settings, ShoppingBag, BarChart3 } from 'lucide-react'
import { useMerchant } from './context/useMerchant.js'
import SettingsScreen from './components/SettingsScreen.jsx'
import StatisticsScreen from './components/StatisticsScreen.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import PaymentModal from './components/PaymentModal.jsx'
import OnboardingScreen from './components/Onboarding/OnboardingScreen.jsx'
import { getItemTotal, triggerHaptic } from './utils/paymentUtils.js'

function PosApp() {
  const { instance, settings, products, isLoading, recordSale } = useMerchant()

  // Screens & overlays state
  const [activeScreen, setActiveScreen] = useState('pos') // 'pos' | 'settings' | 'statistics'

  // Cart state
  const [cart, setCart] = useState([])

  // Payment flow state
  const [paymentFlow, setPaymentFlow] = useState({ isOpen: false, type: null }) // type: 'cash' or 'qr'

  // Bank configuration
  const bankInfo = {
    accountNumber: settings.accountNumber || '',
    bankId: settings.bankId || '',
  }
  const isBankConfigured = Boolean(bankInfo.accountNumber && bankInfo.bankId)

  // Cart Functions
  const handleAddToCart = (product) => {
    triggerHaptic(15)
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id)
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prevCart, { ...product, quantity: 1 }]
    })
  }

  const handleRemoveItem = (id) => {
    triggerHaptic([30, 40, 30])
    setCart((prevCart) => prevCart.filter((item) => item.id !== id))
  }

  const handleUpdateQuantity = (id, quantity) => {
    triggerHaptic(10)
    if (quantity <= 0) {
      handleRemoveItem(id)
    } else {
      setCart((prevCart) =>
        prevCart.map((item) => (item.id === id ? { ...item, quantity } : item))
      )
    }
  }

  const handleClearCart = () => {
    triggerHaptic([40, 30, 40])
    setCart([])
  }

  const cartTotal = cart.reduce((sum, item) => sum + getItemTotal(item), 0)

  // Confirm payment and record sale into storage
  const handleConfirmPayment = async () => {
    try {
      if (cart.length > 0) {
        await recordSale({
          totalAmount: cartTotal,
          paymentType: paymentFlow.type || 'cash',
          items: cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: getItemTotal(item),
          })),
          timestamp: Date.now(),
          date: new Date().toISOString(),
        })
      }
    } catch (e) {
      console.error('Chyba při ukládání prodeje:', e)
    }
    handleClearCart()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-zinc-50 select-none">
        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-md animate-pop text-white font-black text-lg select-none">
          M
        </div>
        <span className="text-xs font-bold text-zinc-500 mt-4 tracking-wider uppercase">
          Merchant
        </span>
      </div>
    )
  }

  // If no instance exists or not initialized yet, show the Onboarding screen
  if (!instance?.isInitialized) {
    return <OnboardingScreen />
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-zinc-50 select-none">
      {/* HEADER SECTION */}
      <header className="flex justify-between items-center bg-white border-b border-zinc-100 px-6 py-4 safe-top z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {settings.logo ? (
            <img
              src={settings.logo}
              alt={settings.businessName || 'Logo'}
              className="w-8 h-8 rounded-lg object-cover border border-zinc-200/80 shadow-sm shrink-0 bg-white"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-black text-sm select-none shadow-sm shrink-0">
              M
            </div>
          )}
          <span className="text-xl font-bold tracking-tight text-zinc-900 truncate">
            {settings.businessName || 'Pokladna'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Statistics Button */}
          <button
            onClick={() => {
              triggerHaptic(10)
              setActiveScreen('statistics')
            }}
            className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 rounded-full transition-all active:scale-90 cursor-pointer"
            title="Statistiky a události"
            aria-label="Statistiky"
          >
            <BarChart3 size={20} strokeWidth={2} />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              triggerHaptic(10)
              setActiveScreen('settings')
            }}
            className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 rounded-full transition-all active:scale-90 cursor-pointer"
            title="Nastavení"
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
              <h3 className="text-sm font-bold text-zinc-900">
                Zatím nemáte žádné produkty
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs mt-1.5 leading-relaxed">
                Přejděte do nastavení kliknutím na ozubené kolečko v pravém
                horním rohu a přidejte své vlastní produkty a ceny.
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
                className="bg-white border border-zinc-200/80 rounded-2xl p-5 flex flex-col justify-between items-start min-h-[110px] text-left hover:border-zinc-400 active:scale-[0.94] active:border-zinc-300 transition-all duration-150 cursor-pointer shadow-sm shadow-zinc-100/50 group"
              >
                <span className="text-[15px] font-semibold text-zinc-900 leading-tight mt-1">
                  {product.name}
                </span>
                <span className="text-sm font-medium text-zinc-500 mt-2 font-mono">
                  {product.price.toLocaleString('cs-CZ')} Kč
                </span>
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

      {/* STATISTICS VIEW COVER */}
      {activeScreen === 'statistics' && (
        <StatisticsScreen onClose={() => setActiveScreen('pos')} />
      )}

      {/* PAYMENT MODAL FLOWS */}
      {paymentFlow.isOpen && (
        <PaymentModal
          type={paymentFlow.type}
          amount={cartTotal}
          bankInfo={bankInfo}
          shopName={settings.businessName}
          logo={settings.logo}
          onClose={() => setPaymentFlow({ isOpen: false, type: null })}
          onConfirm={handleConfirmPayment}
        />
      )}
    </div>
  )
}

export default function App() {
  return <PosApp />
}
