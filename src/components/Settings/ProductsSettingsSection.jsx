import { useState } from 'react'
import { Plus, Trash2, Code2 } from 'lucide-react'
import { triggerHaptic } from '../../utils/paymentUtils.js'

export default function ProductsSettingsSection({
  products,
  onAddProduct,
  onDeleteProduct,
}) {
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemScript, setNewItemScript] = useState('')
  const [showScriptField, setShowScriptField] = useState(false)
  const [error, setError] = useState('')

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const name = newItemName.trim()
    const price = parseFloat(newItemPrice)

    if (!name) {
      setError('Zadejte název produktu.')
      return
    }

    if (isNaN(price) || price <= 0) {
      setError('Cena musí být kladné číslo.')
      return
    }

    triggerHaptic(15)
    await onAddProduct({
      name,
      price,
      script: showScriptField ? newItemScript.trim() : '',
    })

    // Reset form
    setNewItemName('')
    setNewItemPrice('')
    setNewItemScript('')
    setShowScriptField(false)
  }

  const handleDelete = async (id) => {
    triggerHaptic([30, 40, 30])
    await onDeleteProduct(id)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Form to add a new product */}
      <form
        onSubmit={handleAddSubmit}
        className="flex flex-col gap-4 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm shadow-zinc-100/50"
      >
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          Nový produkt
        </span>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase">
              Název
            </label>
            <input
              type="text"
              placeholder="Např. Káva Cappuccino"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="bg-zinc-50/50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all font-medium"
              required
            />
          </div>

          <div className="sm:w-36 flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase">
              Cena (Kč)
            </label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Např. 85"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              className="bg-zinc-50/50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all font-medium"
              required
            />
          </div>
        </div>

        {/* Script section */}
        <div className="border-t border-zinc-100 pt-3 flex flex-col gap-2.5">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-500 select-none">
            <input
              type="checkbox"
              checked={showScriptField}
              onChange={(e) => setShowScriptField(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
            />
            <span>Aktivovat pokročilé chování (skript)</span>
          </label>

          {showScriptField && (
            <div className="flex flex-col gap-2 animate-fade-in">
              <span className="text-[10px] text-zinc-400 leading-normal">
                Napište JavaScript kód vracející celkovou cenu. K dispozici jsou
                proměnné{' '}
                <code className="bg-zinc-100 px-1 rounded text-zinc-700 font-mono">
                  quantity
                </code>{' '}
                a{' '}
                <code className="bg-zinc-100 px-1 rounded text-zinc-700 font-mono">
                  price
                </code>
                .
              </span>

              <textarea
                placeholder="return quantity * price;"
                rows={2}
                value={newItemScript}
                onChange={(e) => setNewItemScript(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all w-full"
              />

              <div className="flex flex-wrap gap-1.5 mt-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setNewItemScript(
                      'return (Math.floor(quantity / 3) * 2 + (quantity % 3)) * price;'
                    )
                  }
                  className="text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold px-2 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Code2 size={11} />
                  Šablona: 3 za cenu 2 (2+1 zdarma)
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-800 rounded-xl px-3 py-2 text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="bg-zinc-950 hover:bg-zinc-800 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-1.5"
        >
          <Plus size={14} strokeWidth={2.5} /> Přidat produkt
        </button>
      </form>

      {/* List of stored custom products */}
      <div className="flex flex-col gap-2.5">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          Aktuální nabídka ({products.length})
        </span>

        {products.length === 0 ? (
          <p className="text-xs text-zinc-400 italic text-center py-8 border border-dashed border-zinc-200 rounded-2xl bg-white shadow-sm shadow-zinc-100/50">
            V nabídce nejsou žádné produkty. Přidejte je pomocí formuláře výše.
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex justify-between items-center bg-white border border-zinc-200/80 rounded-xl p-3.5 shadow-sm shadow-zinc-100/50"
              >
                <div className="flex flex-col pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-800 leading-snug">
                      {product.name}
                    </span>
                    {product.script && (
                      <span
                        className="bg-zinc-100 border border-zinc-200 text-zinc-600 text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider select-none shrink-0"
                        title="Obsahuje speciální chování výpočtu"
                      >
                        Skript
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-900 font-mono">
                    {product.price.toLocaleString('cs-CZ')} Kč
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer active:scale-90"
                    aria-label={`Smazat ${product.name}`}
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
