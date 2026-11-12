import { useState } from 'react'
import { Plus, Trash2, Code2, Pencil, X, Check } from 'lucide-react'
import { triggerHaptic } from '../../utils/paymentUtils.js'
import { useI18n } from '../../i18n/useI18n.js'

export default function ProductsSettingsSection({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) {
  const { t, formatCurrency } = useI18n()

  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemScript, setNewItemScript] = useState('')
  const [showScriptField, setShowScriptField] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [error, setError] = useState('')

  const handleStartEdit = (product) => {
    triggerHaptic(15)
    setEditingProductId(product.id)
    setNewItemName(product.name)
    setNewItemPrice(String(product.price))
    setNewItemScript(product.script || '')
    setShowScriptField(Boolean(product.script))
    setError('')
  }

  const handleCancelEdit = () => {
    triggerHaptic(10)
    setEditingProductId(null)
    setNewItemName('')
    setNewItemPrice('')
    setNewItemScript('')
    setShowScriptField(false)
    setError('')
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const name = newItemName.trim()
    const price = parseFloat(newItemPrice)

    if (!name) {
      setError(t('eventModal.missingName'))
      return
    }

    if (isNaN(price) || price <= 0) {
      setError(t('expenseModal.invalidAmount'))
      return
    }

    triggerHaptic(15)

    if (editingProductId && onUpdateProduct) {
      await onUpdateProduct(editingProductId, {
        name,
        price,
        script: showScriptField ? newItemScript.trim() : '',
      })
      setEditingProductId(null)
    } else {
      await onAddProduct({
        name,
        price,
        script: showScriptField ? newItemScript.trim() : '',
      })
    }

    // Reset form
    setNewItemName('')
    setNewItemPrice('')
    setNewItemScript('')
    setShowScriptField(false)
  }

  const handleDelete = async (id) => {
    triggerHaptic([30, 40, 30])
    if (editingProductId === id) {
      handleCancelEdit()
    }
    await onDeleteProduct(id)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Form to add or edit a product */}
      <form
        onSubmit={handleFormSubmit}
        className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3.5"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {editingProductId
              ? t('products.editProductTitle')
              : t('products.newProductTitle')}
          </h3>
          {editingProductId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer font-medium"
            >
              <X size={13} />
              {t('common.cancel')}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">
              {t('products.name')}
            </label>
            <input
              type="text"
              placeholder={t('products.namePlaceholder')}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="bg-zinc-50/50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition-all font-medium"
              required
            />
          </div>

          <div className="sm:w-32 flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">
              {t('products.price')}
            </label>
            <input
              type="number"
              inputMode="decimal"
              placeholder={t('products.pricePlaceholder')}
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              className="bg-zinc-50/50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 font-mono transition-all font-medium"
              required
            />
          </div>
        </div>

        {/* Script section */}
        <div className="border-t border-zinc-100 pt-2 flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-600 select-none">
            <input
              type="checkbox"
              checked={showScriptField}
              onChange={(e) => setShowScriptField(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
            />
            <span>{t('products.customScript')}</span>
          </label>

          {showScriptField && (
            <div className="flex flex-col gap-2 mt-1 animate-fade-in">
              <span className="text-[11px] text-zinc-400 leading-normal">
                {t('products.customScriptDesc')}
              </span>

              <textarea
                placeholder="return quantity * price;"
                rows={2}
                value={newItemScript}
                onChange={(e) => setNewItemScript(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition-all w-full"
              />

              <button
                type="button"
                onClick={() =>
                  setNewItemScript(
                    'return (Math.floor(quantity / 3) * 2 + (quantity % 3)) * price;'
                  )
                }
                className="text-[11px] bg-zinc-100 hover:bg-zinc-200/70 text-zinc-700 font-medium px-2.5 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer self-start flex items-center gap-1"
              >
                <Code2 size={12} />
                2+1 Script
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3.5 py-2 text-xs font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-1.5"
        >
          {editingProductId ? (
            <>
              <Check size={14} strokeWidth={2.5} /> {t('common.save')}
            </>
          ) : (
            <>
              <Plus size={14} strokeWidth={2.5} /> {t('products.addProduct')}
            </>
          )}
        </button>
      </form>

      {/* List of stored custom products */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">
          {t('products.title')} ({products.length})
        </h3>

        {products.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-2xl bg-white border border-zinc-200/80 text-xs text-zinc-400">
            {t('products.empty')}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200/80 divide-y divide-zinc-100 overflow-hidden shadow-xs">
            {products.map((product) => (
              <div
                key={product.id}
                className={`flex justify-between items-center p-3.5 transition-colors ${
                  editingProductId === product.id
                    ? 'bg-zinc-100/70'
                    : 'hover:bg-zinc-50/70'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-3">
                  <span className="text-sm font-semibold text-zinc-900 truncate">
                    {product.name}
                  </span>
                  {product.script && (
                    <span className="bg-zinc-100 text-zinc-500 text-[10px] font-medium px-1.5 py-0.5 rounded">
                      script
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-zinc-900 font-mono mr-1">
                    {formatCurrency(product.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(product)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                    aria-label={`${t('common.edit')} ${product.name}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    aria-label={`${t('common.delete')} ${product.name}`}
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
  )
}
