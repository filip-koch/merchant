import { useState } from 'react'
import { X } from 'lucide-react'
import { triggerHaptic } from '../../utils/paymentUtils.js'
import { useI18n } from '../../i18n/useI18n.js'

function ExpenseModalContent({ eventName, onClose, onSave }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(t('expenseModal.missingName'))
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(t('expenseModal.invalidAmount'))
      return
    }

    try {
      triggerHaptic(15)
      await onSave({
        name: trimmedName,
        amount: Math.round(numAmount * 100) / 100,
        createdAt: Date.now(),
      })
      onClose()
    } catch (err) {
      setError(err.message || t('common.error'))
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-zinc-200 animate-scale-in z-10 flex flex-col gap-3.5 max-h-[90dvh] overflow-y-auto custom-scrollbar select-none">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 leading-tight">
              {t('expenseModal.title')}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[220px]">
              {eventName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-full transition-colors cursor-pointer"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Expense Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              {t('expenseModal.nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('expenseModal.namePlaceholder')}
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 text-sm font-medium text-zinc-900 bg-zinc-50/50 transition-all"
              autoFocus
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              {t('expenseModal.amountLabel')}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t('expenseModal.amountPlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 text-sm font-medium text-zinc-900 bg-zinc-50/50 transition-all font-mono"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer"
            >
              {t('expenseModal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ExpenseModal({ isOpen, eventName, onClose, onSave }) {
  if (!isOpen) return null

  return (
    <ExpenseModalContent
      key={eventName}
      eventName={eventName}
      onClose={onClose}
      onSave={onSave}
    />
  )
}
