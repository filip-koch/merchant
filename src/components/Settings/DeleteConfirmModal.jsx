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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 animate-scale-in z-10 flex flex-col gap-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-600 rounded-full transition-colors cursor-pointer"
          aria-label="Zavřít"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
          <AlertTriangle size={24} strokeWidth={2} />
        </div>

        <div>
          <h3 className="text-base font-extrabold text-zinc-900">
            Trvale smazat instanci pokladny?
          </h3>
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
            Opravdu chcete smazat instanci{' '}
            <strong className="text-zinc-800">„{merchantName}“</strong>? Tato
            akce je nevratná. Dojde k vymazání všech produktů, cenových pravidel
            a nastavení pokladny.
          </p>
        </div>

        <div className="bg-red-50/70 border border-red-100 rounded-xl p-3 text-[11px] text-red-800 leading-snug">
          Tip: Před smazáním si můžete instanci zazálohovat kliknutím na
          tlačítko <strong>„Exportovat zálohu (.json)“</strong>.
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-red-200"
          >
            <Trash2 size={14} />
            Ano, smazat
          </button>
        </div>
      </div>
    </div>
  )
}
