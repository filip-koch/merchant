import { useState, useRef } from 'react'
import { Check, Image as ImageIcon, Trash2 } from 'lucide-react'
import {
  validateCzechAccount,
  validateBankId,
  CZECH_BANKS,
  triggerHaptic,
} from '../../utils/paymentUtils.js'
import { processAndSquareLogo } from '../../qr/index.js'

export default function GeneralSettingsSection({ settings, onSave }) {
  const [businessName, setBusinessName] = useState(
    settings?.businessName || 'Pokladna'
  )
  const [accountNumber, setAccountNumber] = useState(
    settings?.accountNumber || ''
  )
  const [bankId, setBankId] = useState(settings?.bankId || '')
  const [logo, setLogo] = useState(settings?.logo || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isProcessingLogo, setIsProcessingLogo] = useState(false)
  const logoInputRef = useRef(null)

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessingLogo(true)
    setError('')
    try {
      triggerHaptic(15)
      const squared = await processAndSquareLogo(file, 256)
      setLogo(squared)
    } catch (err) {
      setError(err.message || 'Nepodařilo se zpracovat obrázek loga.')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const cleanAccount = accountNumber.trim()
    const cleanBank = bankId.trim()

    if (cleanAccount || cleanBank) {
      if (!validateCzechAccount(cleanAccount)) {
        setError(
          'Neplatný formát čísla účtu. Použijte číslice (např. 12345678) nebo formát s předčíslím (např. 19-12345678).'
        )
        return
      }
      if (!validateBankId(cleanBank)) {
        setError('Kód banky musí být přesně 4 číslice (např. 0800).')
        return
      }
    }

    try {
      triggerHaptic(20)
      await onSave({
        businessName: businessName.trim() || 'Pokladna',
        accountNumber: cleanAccount,
        bankId: cleanBank,
        logo,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    } catch (err) {
      setError(err.message || 'Nepodařilo se uložit nastavení.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* CARD 1: Identity & Name */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Základní údaje
        </h3>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="settingBusinessName"
            className="text-xs font-medium text-zinc-700"
          >
            Název stánku / pokladny
          </label>
          <input
            id="settingBusinessName"
            type="text"
            placeholder="např. Náš stánek"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="bg-zinc-50/50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition-all font-medium"
          />
          <span className="text-[11px] text-zinc-400">
            Zobrazuje se v záhlaví a v rámečku vygenerovaného QR kódu.
          </span>
        </div>

        {/* Logo Section */}
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100">
          <label className="text-xs font-medium text-zinc-700">
            Logo pokladny (volitelné)
          </label>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleLogoChange}
          />

          {logo ? (
            <div className="flex items-center gap-3 bg-zinc-50/60 border border-zinc-200/80 rounded-xl p-3">
              <img
                src={logo}
                alt="Logo náhled"
                className="w-12 h-12 rounded-lg border border-zinc-200 object-cover bg-white shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-zinc-800 block">
                  Aktivní logo
                </span>
                <span className="text-[11px] text-zinc-400 block truncate">
                  Zobrazí se ve středu QR kódu
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="text-xs font-medium text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded-md hover:bg-zinc-100 cursor-pointer"
                >
                  Změnit
                </button>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="p-1 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                  title="Odstranit logo"
                  aria-label="Odstranit logo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={isProcessingLogo}
              className="border border-dashed border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50 rounded-xl p-3.5 flex items-center justify-center gap-2 text-xs text-zinc-600 font-medium transition-colors cursor-pointer"
            >
              <ImageIcon size={15} className="text-zinc-400" />
              <span>
                {isProcessingLogo ? 'Zpracovávám...' : 'Nahrát logo pro QR kód'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* CARD 2: Bank & QR settings */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Bankovní účet pro QR platby
        </h3>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="settingAccountNumber"
            className="text-xs font-medium text-zinc-700"
          >
            Číslo účtu
          </label>
          <input
            id="settingAccountNumber"
            type="text"
            inputMode="decimal"
            placeholder="např. 19-1234567890"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="bg-zinc-50/50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 font-mono transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="settingBankId"
            className="text-xs font-medium text-zinc-700"
          >
            Kód banky
          </label>
          <div className="flex gap-2">
            <input
              id="settingBankId"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="0800"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-20 bg-zinc-50/50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 font-mono transition-all"
            />
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="flex-1 bg-zinc-50/50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-700 focus:outline-none focus:border-zinc-900 transition-all cursor-pointer truncate"
            >
              <option value="">Vyberte banku ze seznamu...</option>
              {CZECH_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1">
            Doporučení: Před spuštěním prodeje vyzkoušejte cvičnou QR platbu
            (např. 1 Kč).
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3.5 py-2.5 text-xs font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
          <Check size={14} />
          <span>Nastavení bylo uloženo</span>
        </div>
      )}

      <button
        type="submit"
        className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer text-center w-full"
      >
        Uložit změny
      </button>
    </form>
  )
}
