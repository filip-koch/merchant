import { AlertTriangle, Trash2, X } from 'lucide-react'
import { triggerHaptic } from '../../utils/paymentUtils.js'

export default function DeleteConfirmModal({
  merchantName,
  isOpen,
  onClose,
  onConfirm,
}) {
  if (!isOpen) return null

  const handleConfirm = () => {
    triggerHaptic([60, 50, 60])
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-zinc-200 animate-scale-in z-10 flex flex-col gap-3.5 select-none">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={20} strokeWidth={2} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-full transition-colors cursor-pointer"
            aria-label="Zavřít"
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <h3 className="text-base font-semibold text-zinc-900">
            Smazat pokladnu?
          </h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Opravdu chcete smazat instanci{' '}
            <strong className="text-zinc-800">„{merchantName}“</strong>? Dojde k
            vymazání všech produktů a nastavení pokladny.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Trash2 size={14} />
            <span>Smazat</span>
          </button>
        </div>
      </div>
    </div>
  )
}
