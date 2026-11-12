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
import { useI18n } from '../../i18n/useI18n.js'

export default function OnboardingScreen() {
  const { initializeInstance, importInstance } = useMerchant()
  const { t, language, setLanguage } = useI18n()

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

  const handleLanguageChange = async (lang) => {
    triggerHaptic(15)
    await setLanguage(lang)
  }

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
    triggerHaptic([20, 20])
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
      setCreateError(t('eventModal.missingName'))
      return
    }

    const cleanAccount = accountNumber.trim()
    const cleanBank = bankId.trim()

    if (cleanAccount || cleanBank) {
      if (!validateCzechAccount(cleanAccount)) {
        setCreateError(t('settings.invalidAccount'))
        return
      }
      if (!validateBankId(cleanBank)) {
        setCreateError(t('settings.invalidBankId'))
        return
      }
    }

    setIsSubmitting(true)
    try {
      triggerHaptic(30)
      await initializeInstance({
        name: cleanName,
        accountNumber: cleanAccount,
        bankId: cleanBank,
        logo,
        language,
        includeSampleProducts: true,
      })
    } catch (err) {
      setCreateError(err.message || t('common.error'))
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e) => {
    setImportError('')
    setImportFile(null)
    setBackupPreview(null)

    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      setImportError(t('backup.importError'))
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result
        if (typeof text !== 'string') return

        const parsed = JSON.parse(text)
        const validation = validateBackupPayload(parsed)

        if (!validation.valid || !validation.backup) {
          setImportError(validation.error || t('backup.importError'))
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
        setImportError(t('backup.importError'))
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
      setImportError(err.message || t('backup.importError'))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-50 flex flex-col justify-between select-none safe-top safe-bottom p-5 sm:p-8">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
        {/* Language selector in top corner */}
        <div className="flex justify-end mb-4">
          <div className="inline-flex bg-zinc-200/70 p-0.5 rounded-full">
            <button
              type="button"
              onClick={() => handleLanguageChange('cs')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                language === 'cs'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              🇨🇿 CZ
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              🇬🇧 EN
            </button>
          </div>
        </div>

        {/* Brand Logo & Headline */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-black mx-auto flex items-center justify-center text-white font-black text-xl mb-3 shadow-sm select-none">
            M
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
            {t('onboarding.welcome')}
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
            {t('onboarding.subtitle')}
          </p>
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
            {t('eventModal.newTitle')}
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
            {t('backup.importTitle')}
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
                {t('onboarding.nameLabel')} *
              </label>
              <input
                id="shopName"
                type="text"
                autoFocus
                placeholder={t('onboarding.namePlaceholder')}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 font-semibold transition-all"
                required
              />
            </div>

            {/* Optional Logo Upload in Onboarding */}
            <div className="border-t border-zinc-100 pt-3 flex flex-col gap-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {t('settings.logo')}
              </label>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
              />

              {logo ? (
                <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200/80 rounded-xl p-2.5">
                  <img
                    src={logo}
                    alt="Logo"
                    className="w-12 h-12 rounded-lg border border-zinc-200 object-cover bg-white shrink-0"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-zinc-800 block">
                      {t('settings.activeLogo')}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {t('settings.logoDesc')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                    title={t('common.delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isProcessingLogo}
                  className="border border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50 rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-zinc-600 font-semibold transition-all cursor-pointer"
                >
                  <ImageIcon size={15} className="text-zinc-400" />
                  <span>
                    {isProcessingLogo
                      ? t('common.loading')
                      : t('settings.uploadLogo')}
                  </span>
                </button>
              )}
            </div>

            {/* Optional Bank account for QR payment */}
            <div className="border-t border-zinc-100 pt-3 flex flex-col gap-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                {t('settings.bankAccount')} ({t('cart.payQr')})
              </span>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="accountNumber"
                  className="text-[11px] font-semibold text-zinc-400 uppercase"
                >
                  {t('onboarding.accountLabel')}
                </label>
                <input
                  id="accountNumber"
                  type="text"
                  inputMode="decimal"
                  placeholder={t('onboarding.accountPlaceholder')}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 font-mono transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="bankId"
                  className="text-[11px] font-semibold text-zinc-400 uppercase"
                >
                  {t('onboarding.bankIdLabel')}
                </label>
                <div className="flex gap-2">
                  <input
                    id="bankId"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder={t('onboarding.bankIdPlaceholder')}
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="w-24 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 font-mono transition-all"
                  />
                  <select
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-700 focus:outline-none focus:border-zinc-800 transition-all cursor-pointer truncate"
                  >
                    <option value="">
                      {language === 'en'
                        ? 'Select bank...'
                        : 'Rychlý výběr banky...'}
                    </option>
                    {CZECH_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {createError && (
              <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-zinc-950 hover:bg-zinc-800 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-1 shadow-sm disabled:opacity-50"
            >
              <span>
                {isSubmitting ? t('common.loading') : t('onboarding.submit')}
              </span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Tab 2: Import Instance from JSON */}
        {activeTab === 'import' && (
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 sm:p-6 shadow-sm shadow-zinc-100 flex flex-col gap-4 animate-fade-in">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />

            {!backupPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 hover:border-zinc-500 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center gap-3 bg-zinc-50/50 hover:bg-zinc-50 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors">
                  <FileText size={24} />
                </div>
                <div>
                  <span className="text-sm font-bold text-zinc-900 block">
                    {t('backup.importButton')} (.json)
                  </span>
                  <span className="text-xs text-zinc-400 mt-1 block">
                    {t('backup.importDesc')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-bold">
                    {t('backup.importSuccess')}
                  </span>
                </div>
                <div className="text-xs text-zinc-700 flex flex-col gap-1 mt-1 pl-6">
                  <div>
                    <span className="text-zinc-400">
                      {t('settings.businessName')}:
                    </span>{' '}
                    <strong className="font-semibold text-zinc-900">
                      {backupPreview.name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-400">
                      {t('products.title')}:
                    </span>{' '}
                    <strong className="font-semibold text-zinc-900">
                      {backupPreview.productsCount}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setImportFile(null)
                    setBackupPreview(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-600 underline cursor-pointer self-start pl-6 mt-1"
                >
                  {t('backup.importButton')}
                </button>
              </div>
            )}

            {importError && (
              <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            <button
              type="button"
              disabled={!importFile || isSubmitting}
              onClick={handleConfirmImport}
              className="bg-zinc-950 hover:bg-zinc-800 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>
                {isSubmitting ? t('common.loading') : t('backup.importTitle')}
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Footer info */}
      <footer className="text-center text-[11px] text-zinc-400 mt-6 select-none">
        Merchant POS · Offline-first PWA
      </footer>
    </div>
  )
}
