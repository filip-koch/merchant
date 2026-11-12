import { useState, useRef } from 'react'
import { Download, Upload, Copy, Check, Trash2 } from 'lucide-react'
import DeleteConfirmModal from './DeleteConfirmModal.jsx'
import { triggerHaptic } from '../../utils/paymentUtils.js'
import { validateBackupPayload } from '../../services/storage/schemaValidator.js'

export default function BackupSettingsSection({
  instance,
  onExport,
  onImport,
  onDeleteInstance,
}) {
  const [copied, setCopied] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const fileInputRef = useRef(null)

  const handleExport = async () => {
    triggerHaptic(20)
    try {
      await onExport()
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (err) {
      console.error('Export selhal:', err)
    }
  }

  const handleCopyJson = async () => {
    triggerHaptic(15)
    try {
      const backup = await onExport()
      if (backup?.jsonString && navigator.clipboard) {
        await navigator.clipboard.writeText(backup.jsonString)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch (err) {
      console.error('Kopírování selhalo:', err)
    }
  }

  const handleFileChange = (e) => {
    setImportError('')
    setImportSuccess(false)
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      setImportError('Vyberte prosím platný soubor zálohy (.json).')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result
        if (typeof text !== 'string') return

        const parsed = JSON.parse(text)
        const validation = validateBackupPayload(parsed)

        if (!validation.valid || !validation.backup) {
          setImportError(validation.error || 'Neplatná struktura zálohy.')
          return
        }

        triggerHaptic([40, 50, 40])
        await onImport(validation.backup)
        setImportSuccess(true)
        setTimeout(() => setImportSuccess(false), 3000)
      } catch (err) {
        setImportError(
          err.message || 'Chyba při čtení nebo importování záložního souboru.'
        )
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Export Card */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Zálohování a export
          </h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Stáhněte kompletní data této pokladny včetně položek, nastavení a
            historie událostí.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Download size={14} />
            <span>Stáhnout zálohu (.json)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyJson}
            className="border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium py-2.5 px-3.5 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span className="text-emerald-700 font-semibold">
                  Zkopírováno
                </span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Kopírovat JSON</span>
              </>
            )}
          </button>
        </div>

        {exportSuccess && (
          <div className="text-xs text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
            Záloha byla úspěšně stažena.
          </div>
        )}
      </div>

      {/* Import Card */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Obnovit ze zálohy
          </h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Nahrajte dříve stažený soubor{' '}
            <code className="font-mono text-zinc-700">.json</code> pro obnovu
            pokladny.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50 text-zinc-700 font-medium py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <Upload size={14} />
          <span>Vybrat soubor .json</span>
        </button>

        {importError && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 font-medium">
            {importError}
          </div>
        )}

        {importSuccess && (
          <div className="text-xs text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
            Pokladna byla úspěšně obnovena ze zálohy.
          </div>
        )}
      </div>

      {/* Danger Zone Card */}
      <div className="border border-rose-200/80 bg-white rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
        <div>
          <h3 className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
            Nebezpečná zóna
          </h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Vymaže všechny položky a historii pokladny. Akci nelze vzít zpět.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full"
        >
          <Trash2 size={14} />
          <span>Smazat data pokladny</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        merchantName={instance?.name || 'Moje Pokladna'}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          setIsDeleteModalOpen(false)
          await onDeleteInstance()
        }}
      />
    </div>
  )
}
