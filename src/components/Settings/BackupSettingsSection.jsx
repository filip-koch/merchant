import { useState, useRef } from 'react'
import {
  Download,
  Upload,
  Copy,
  Check,
  Trash2,
  FileJson,
  AlertCircle,
} from 'lucide-react'
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
      setImportError('Vyberte prosím platný soubor zálohy s příponou .json.')
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
    <div className="flex flex-col gap-6">
      {/* Export / Backup instance card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm shadow-zinc-100/50 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FileJson size={18} className="text-zinc-700" />
          <h4 className="text-xs font-bold text-zinc-900">
            Zálohování a export instance
          </h4>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Stáhněte kompletní zálohu této pokladny ve formátu{' '}
          <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">
            .json
          </code>
          . Záloha obsahuje název obchodu, bankovní údaje a veškeré produkty
          včetně cenových pravidel.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 mt-1">
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <Download size={15} />
            <span>Stáhnout zálohu (.json)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyJson}
            className="border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
            title="Zkopírovat JSON do schránky"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span className="text-emerald-700 font-bold">Zkopírováno!</span>
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
          <div className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center">
            Záloha byla úspěšně vygenerována a stažena.
          </div>
        )}
      </div>

      {/* Import backup card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm shadow-zinc-100/50 flex flex-col gap-3">
        <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
          <Upload size={16} />
          Obnovit instanci ze zálohy
        </h4>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Nahrajte dříve exportovaný soubor{' '}
          <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">
            .json
          </code>
          . Tímto krokem nahradíte stávající data pokladny daty ze zálohy.
        </p>

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
          className="border border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 text-zinc-700 font-semibold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
        >
          <Upload size={15} />
          <span>Vybrat soubor zálohy...</span>
        </button>

        {importError && (
          <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{importError}</span>
          </div>
        )}

        {importSuccess && (
          <div className="text-xs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
            Instance byla úspěšně obnovena ze zálohy!
          </div>
        )}
      </div>

      {/* Permanent delete danger zone card */}
      <div className="border border-red-200/80 bg-red-50/30 rounded-2xl p-5 flex flex-col gap-3">
        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
          Nebezpečná zóna
        </span>
        <div>
          <h4 className="text-xs font-bold text-zinc-900">
            Trvale smazat tuto instanci
          </h4>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            Vymaže veškeré produkty a nastavení. Pokladna bude resetována do
            výchozího stavu.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 w-full shadow-sm"
        >
          <Trash2 size={14} />
          <span>Trvale smazat instanci pokladny</span>
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
