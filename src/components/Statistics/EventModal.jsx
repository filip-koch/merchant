import { useState } from 'react'
import { X, Clock } from 'lucide-react'
import { toDatetimeLocalValue } from '../../utils/statisticsUtils.js'
import { triggerHaptic } from '../../utils/paymentUtils.js'
import { useI18n } from '../../i18n/useI18n.js'

function EventModalContent({ onClose, onSave, eventToEdit }) {
  const { t } = useI18n()
  const [name, setName] = useState(eventToEdit?.name || '')
  const [startDateTime, setStartDateTime] = useState(() => {
    if (eventToEdit?.startDateTime) {
      return toDatetimeLocalValue(eventToEdit.startDateTime)
    }
    return toDatetimeLocalValue(new Date())
  })
  const [endDateTime, setEndDateTime] = useState(() => {
    if (eventToEdit?.endDateTime) {
      return toDatetimeLocalValue(eventToEdit.endDateTime)
    }
    return toDatetimeLocalValue(new Date(Date.now() + 4 * 60 * 60 * 1000))
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(t('eventModal.missingName'))
      return
    }

    if (!startDateTime || !endDateTime) {
      setError(t('common.required'))
      return
    }

    const startMs = new Date(startDateTime).getTime()
    const endMs = new Date(endDateTime).getTime()

    if (isNaN(startMs) || isNaN(endMs)) {
      setError(t('common.error'))
      return
    }

    if (endMs < startMs) {
      setError(t('eventModal.invalidDates'))
      return
    }

    try {
      triggerHaptic(15)
      await onSave({
        name: trimmedName,
        startDateTime: new Date(startMs).toISOString(),
        endDateTime: new Date(endMs).toISOString(),
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
      <div className="relative bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-zinc-200 animate-scale-in z-10 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto custom-scrollbar select-none">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">
              {eventToEdit
                ? t('eventModal.editTitle')
                : t('eventModal.newTitle')}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t('statistics.uncategorizedDesc')}
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
          {/* Event Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              {t('eventModal.nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('eventModal.namePlaceholder')}
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 text-sm font-medium text-zinc-900 bg-zinc-50/50 transition-all"
              autoFocus
            />
          </div>

          {/* Start Datetime */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1 flex items-center gap-1">
              <Clock size={12} className="text-zinc-400" />
              {t('eventModal.startLabel')}
            </label>
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 text-sm font-medium text-zinc-900 bg-zinc-50/50 transition-all font-mono"
            />
          </div>

          {/* End Datetime */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1 flex items-center gap-1">
              <Clock size={12} className="text-zinc-400" />
              {t('eventModal.endLabel')}
            </label>
            <input
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 text-sm font-medium text-zinc-900 bg-zinc-50/50 transition-all font-mono"
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
              {eventToEdit ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  eventToEdit = null,
}) {
  if (!isOpen) return null

  return (
    <EventModalContent
      key={eventToEdit ? eventToEdit.id : 'new-event'}
      onClose={onClose}
      onSave={onSave}
      eventToEdit={eventToEdit}
    />
  )
}
