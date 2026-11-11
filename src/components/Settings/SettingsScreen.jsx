import { useState } from 'react'
import { ArrowLeft, Store, Package, Database } from 'lucide-react'
import { useMerchant } from '../../context/useMerchant.js'
import GeneralSettingsSection from './GeneralSettingsSection.jsx'
import ProductsSettingsSection from './ProductsSettingsSection.jsx'
import BackupSettingsSection from './BackupSettingsSection.jsx'
import { triggerHaptic } from '../../utils/paymentUtils.js'

export default function SettingsScreen({ onClose }) {
  const {
    instance,
    settings,
    products,
    updateSettings,
    addProduct,
    deleteProduct,
    exportInstance,
    importInstance,
    deleteInstance,
  } = useMerchant()

  const [activeTab, setActiveTab] = useState('general') // 'general' | 'products' | 'backup'

  const handleTabChange = (tab) => {
    triggerHaptic(10)
    setActiveTab(tab)
  }

  return (
    <div className="fixed inset-0 bg-zinc-50 z-[100] flex flex-col overflow-hidden animate-slide-up select-none">
      {/* Header */}
      <header className="flex justify-between items-center bg-white border-b border-zinc-100 px-6 py-4 safe-top shrink-0">
        <button
          onClick={onClose}
          className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 rounded-full transition-all active:scale-90 cursor-pointer"
          aria-label="Zpět do pokladny"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h2 className="text-base font-bold text-zinc-900">
          Nastavení pokladny
        </h2>
        <div className="w-9 h-9" /> {/* Spacer for symmetry */}
      </header>

      {/* Tabs bar */}
      <div className="bg-white border-b border-zinc-200/70 px-6 py-2.5 shrink-0">
        <div className="max-w-lg mx-auto flex bg-zinc-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => handleTabChange('general')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Store size={14} />
            <span>Údaje</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('products')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'products'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Package size={14} />
            <span>Položky ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('backup')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Database size={14} />
            <span>Záloha</span>
          </button>
        </div>
      </div>

      {/* Tab content body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar max-w-lg mx-auto w-full pb-safe">
        {activeTab === 'general' && (
          <GeneralSettingsSection settings={settings} onSave={updateSettings} />
        )}

        {activeTab === 'products' && (
          <ProductsSettingsSection
            products={products}
            onAddProduct={addProduct}
            onDeleteProduct={deleteProduct}
          />
        )}

        {activeTab === 'backup' && (
          <BackupSettingsSection
            instance={instance}
            onExport={exportInstance}
            onImport={importInstance}
            onDeleteInstance={async () => {
              await deleteInstance()
              onClose()
            }}
          />
        )}
      </div>
    </div>
  )
}
