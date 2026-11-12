import { useState } from 'react'
import { ArrowLeft, Store, Package, Database } from 'lucide-react'
import { useMerchant } from '../../context/useMerchant.js'
import GeneralSettingsSection from './GeneralSettingsSection.jsx'
import ProductsSettingsSection from './ProductsSettingsSection.jsx'
import BackupSettingsSection from './BackupSettingsSection.jsx'
import { triggerHaptic } from '../../utils/paymentUtils.js'
import { useI18n } from '../../i18n/useI18n.js'

export default function SettingsScreen({ onClose }) {
  const { t } = useI18n()
  const {
    instance,
    settings,
    products,
    updateSettings,
    addProduct,
    updateProduct,
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
      <header className="flex justify-between items-center bg-white border-b border-zinc-200/80 px-4 sm:px-6 py-3.5 safe-top shrink-0">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-full transition-all active:scale-95 cursor-pointer"
          aria-label={t('common.back')}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
          {t('settings.title')}
        </h2>
        <div className="w-8 h-8" /> {/* Spacer for symmetry */}
      </header>

      {/* Segmented Control Bar */}
      <div className="bg-white border-b border-zinc-200/80 px-4 py-2 shrink-0">
        <div className="max-w-md mx-auto flex bg-zinc-100 p-1 rounded-full">
          <button
            type="button"
            onClick={() => handleTabChange('general')}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Store size={14} />
            <span>{t('settings.tabGeneral')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('products')}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'products'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Package size={14} />
            <span>
              {t('settings.tabProducts')} ({products.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('backup')}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Database size={14} />
            <span>{t('settings.tabBackup')}</span>
          </button>
        </div>
      </div>

      {/* Tab content body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 custom-scrollbar max-w-md mx-auto w-full pb-safe">
        {activeTab === 'general' && (
          <GeneralSettingsSection settings={settings} onSave={updateSettings} />
        )}

        {activeTab === 'products' && (
          <ProductsSettingsSection
            products={products}
            onAddProduct={addProduct}
            onUpdateProduct={updateProduct}
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
