import { useState, useRef } from 'react'
import {
  Store,
  Upload,
  CheckCircle2,
  FileText,
  AlertCircle,
  ArrowRight,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react'
import { useMerchant } from '../../context/useMerchant.js'
import {
  validateCzechAccount,
  validateBankId,
  CZECH_BANKS,
  triggerHaptic,
} from '../../utils/paymentUtils.js'
import { validateBackupPayload } from '../../services/storage/schemaValidator.js'
import { processAndSquareLogo } from '../../qr/index.js'

export default function OnboardingScreen() {
  const { initializeInstance, importInstance } = useMerchant()
  const [activeTab, setActiveTab] = useState('create') // 'create' or 'import'

  // New instance state
  const [shopName, setShopName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankId, setBankId] = useState('')
  const [logo, setLogo] = useState('')
  const [isProcessingLogo, setIsProcessingLogo] = useState(false)
  const [createError, setCreateError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const logoInputRef = useRef(null)

  // Import state
  const [importFile, setImportFile] = useState(null)
  const [backupPreview, setBackupPreview] = useState(null)
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef(null)

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessingLogo(true)
    setCreateError('')
    try {
      triggerHaptic(15)
      const squared = await processAndSquareLogo(file, 256)
      setLogo(squared)
    } catch (err) {
      setCreateError(err.message || 'Nepodařilo se zpracovat logo.')
    } finally {
      setIsProcessingLogo(false)
    }
  }

  const handleRemoveLogo = () => {
    triggerHaptic([30, 20])
    setLogo('')
    if (logoInputRef.current) {
      logoInputRef.current.value = ''
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setCreateError('')

    const cleanName = shopName.trim()
    if (!cleanName) {
      setCreateError('Zadejte prosím název pokladny nebo obchodu.')
      return
    }

    const cleanAccount = accountNumber.trim()
    const cleanBank = bankId.trim()

    if (cleanAccount || cleanBank) {
      if (!validateCzechAccount(cleanAccount)) {
        setCreateError(
          'Neplatný formát čísla účtu (např. 123456789 nebo 19-123456789).'
        )
        return
      }
      if (!validateBankId(cleanBank)) {
        setCreateError('Kód banky musí být 4 číslice (např. 0800).')
        return
      }
    }

    setIsSubmitting(true)
    try {
      triggerHaptic([40, 60, 40])
      await initializeInstance({
        name: cleanName,
        accountNumber: cleanAccount,
        bankId: cleanBank,
        logo,
      })
    } catch (err) {
      setCreateError(err.message || 'Nepodařilo se vytvořit instanci.')
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = (file) => {
    setImportError('')
    setBackupPreview(null)
    setImportFile(null)

    if (!file) return

    if (!file.name.endsWith('.json')) {
      setImportError('Vyberte prosím platný soubor zálohy ve formátu .json.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result
        if (typeof text !== 'string') return

        const parsed = JSON.parse(text)
        const validation = validateBackupPayload(parsed)

        if (!validation.valid || !validation.backup) {
          setImportError(validation.error || 'Neplatná struktura zálohy.')
          return
        }

        setImportFile(validation.backup)
        setBackupPreview({
          name: validation.backup.settings.businessName,
          productsCount: validation.backup.products.length,
          hasBank: Boolean(
            validation.backup.settings.accountNumber &&
            validation.backup.settings.bankId
          ),
          hasLogo: Boolean(validation.backup.settings.logo),
          exportedAt: validation.backup.exportedAt,
        })
        triggerHaptic(20)
      } catch {
        setImportError(
          'Soubor se nepodařilo přečíst. Zkontrolujte formát JSON.'
        )
      }
    }
    reader.readAsText(file)
  }

  const handleConfirmImport = async () => {
    if (!importFile) return
    setIsSubmitting(true)
    try {
      triggerHaptic([40, 60, 40])
      await importInstance(importFile)
    } catch (err) {
      setImportError(err.message || 'Nepodařilo se obnovit instanci ze zálohy.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-50 flex flex-col justify-between select-none safe-top safe-bottom p-5 sm:p-8">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
        {/* Brand Logo & Headline */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-black mx-auto flex items-center justify-center text-white font-black text-xl mb-3 shadow-sm select-none">
            M
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
            Nastavení vaší pokladny
          </h1>
        </div>

        {/* Tab switcher: Create vs Import */}
        <div className="flex bg-zinc-200/70 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10)
              setActiveTab('create')
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Store size={14} />
            Nová pokladna
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10)
              setActiveTab('import')
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'import'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Upload size={14} />
            Nahrát zálohu
          </button>
        </div>

        {/* Tab 1: Create New Instance */}
        {activeTab === 'create' && (
          <form
            onSubmit={handleCreateSubmit}
            className="bg-white border border-zinc-200/80 rounded-2xl p-5 sm:p-6 shadow-sm shadow-zinc-100 flex flex-col gap-4 animate-fade-in"
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="shopName"
                className="text-xs font-bold text-zinc-500 uppercase tracking-wider"
              >
                Název obchodu / pokladny *
              </label>
              <input
                id="shopName"
                type="text"
                autoFocus
                placeholder="Např. Kavárna Na Rohu"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 font-semibold transition-all"
                required
              />
            </div>

            {/* Optional Logo Upload in Onboarding */}
            <div className="border-t border-zinc-100 pt-3 flex flex-col gap-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Logo do QR kódu (nepovinné)
              </label>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
              />

              {logo ? (
                <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-xl p-2.5">
                  <img
                    src={logo}
                    alt="Logo preview"
                    className="w-11 h-11 rounded-lg border border-zinc-200 object-cover bg-white"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-800">
                      Čtvercové logo připraveno
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-1 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Odebrat logo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isProcessingLogo}
                  className="border border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 text-xs text-zinc-600 font-medium transition-all cursor-pointer"
                >
                  <ImageIcon size={14} className="text-zinc-400" />
                  <span>
                    {isProcessingLogo
                      ? 'Zpracovávám...'
                      : 'Přidat čtvercové logo (PNG, JPG, SVG)'}
                  </span>
                </button>
              )}
            </div>

            {/* Bank credentials (Optional) */}
            <div className="border-t border-zinc-100 pt-3 flex flex-col gap-3">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Bankovní spojení pro QR platby (nepovinné)
              </span>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="accountNumber"
                  className="text-[11px] font-semibold text-zinc-500 uppercase"
                >
                  Číslo účtu
                </label>
                <input
                  id="accountNumber"
                  type="text"
                  inputMode="decimal"
                  placeholder="Např. 19-1234567890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 font-mono transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="bankId"
                  className="text-[11px] font-semibold text-zinc-500 uppercase"
                >
                  Kód banky (4 číslice)
                </label>
                <div className="flex gap-2">
                  <input
                    id="bankId"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="0800"
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="w-24 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 font-mono transition-all"
                  />
                  <select
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-700 focus:outline-none focus:border-zinc-800 transition-all cursor-pointer truncate"
                  >
                    <option value="">Vybrat banku ze seznamu...</option>
                    {CZECH_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-amber-900 mt-1">
                  <AlertCircle
                    size={14}
                    className="text-amber-600 shrink-0 mt-0.5"
                  />
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    <strong className="font-semibold text-amber-900">
                      Důležité:
                    </strong>{' '}
                    Před použitím v reálném provozu nejprve ověřte funkčnost
                    testovací platbou (např. 1 Kč).
                  </p>
                </div>
              </div>
            </div>

            {createError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-xs leading-relaxed">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 bg-zinc-950 hover:bg-zinc-800 text-white font-bold py-3.5 px-5 rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Vytvářím...' : 'Spustit pokladnu'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Tab 2: Upload existing backup */}
        {activeTab === 'import' && (
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 sm:p-6 shadow-sm shadow-zinc-100 flex flex-col gap-4 animate-fade-in">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />

            {!backupPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleFileSelect(e.dataTransfer.files?.[0])
                }}
                className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-zinc-50/50 group"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center mb-3 transition-colors">
                  <Upload size={20} className="text-zinc-600" />
                </div>
                <span className="text-xs font-bold text-zinc-800">
                  Klepněte pro výběr souboru .json
                </span>
                <span className="text-[11px] text-zinc-400 mt-1">
                  nebo sem soubor přetáhněte myší
                </span>
              </div>
            ) : (
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-bold">
                    Záloha byla úspěšně načtena
                  </span>
                </div>
                <div className="text-xs text-zinc-700 flex flex-col gap-1 mt-1 pl-6">
                  <div>
                    <span className="text-zinc-400">Obchod:</span>{' '}
                    <strong className="font-semibold text-zinc-900">
                      {backupPreview.name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-400">Počet položek:</span>{' '}
                    <strong className="font-semibold text-zinc-900">
                      {backupPreview.productsCount}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-400">Platby:</span>{' '}
                    <span>
                      {backupPreview.hasBank
                        ? 'QR kód nastaven'
                        : 'Pouze hotovost'}
                    </span>
                  </div>
                  {backupPreview.hasLogo && (
                    <div>
                      <span className="text-zinc-400">Logo:</span>{' '}
                      <span className="text-emerald-700 font-semibold">
                        Zahrnuto v záloze
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBackupPreview(null)
                    setImportFile(null)
                  }}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600 underline mt-1 text-left pl-6 cursor-pointer"
                >
                  Vybrat jiný soubor
                </button>
              </div>
            )}

            {importError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-xs leading-relaxed">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            <button
              type="button"
              disabled={!backupPreview || isSubmitting}
              onClick={handleConfirmImport}
              className="bg-zinc-950 hover:bg-zinc-800 text-white font-bold py-3.5 px-5 rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText size={16} />
              <span>{isSubmitting ? 'Obnovuji...' : 'Obnovit pokladnu'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
