import { useState, useRef } from 'react'
import { Info, Check, Image as ImageIcon, Trash2 } from 'lucide-react'
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
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 bg-zinc-100/50 border border-zinc-200/50 p-4 rounded-2xl">
        <Info size={16} className="text-zinc-500 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-zinc-500">
          Zadejte název pokladny a volitelné bankovní údaje pro příjem plateb
          přes QR kód.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Business Name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="settingBusinessName"
            className="text-xs font-bold text-zinc-400 uppercase tracking-wider"
          >
            Název pokladny (Záhlaví & Text QR rámečku)
          </label>
          <input
            id="settingBusinessName"
            type="text"
            placeholder="Např. Kavárna"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all font-semibold"
          />
          <span className="text-[10px] text-zinc-400 mt-0.5">
            Tento název se automaticky zobrazí a naškáluje v rámečku QR kódu.
          </span>
        </div>

        {/* Logo Upload Section */}
        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Logo pokladny pro QR kód (volitelné)
          </label>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleLogoChange}
          />

          {logo ? (
            <div className="flex items-center gap-3 bg-white border border-zinc-200/90 rounded-2xl p-3 shadow-sm">
              <img
                src={logo}
                alt="Logo náhled"
                className="w-14 h-14 rounded-xl border border-zinc-200/70 object-cover bg-white shadow-sm shrink-0"
              />
              <div className="flex-1 flex flex-col justify-center gap-1">
                <span className="text-xs font-bold text-zinc-800">
                  Logo je aktivní
                </span>
                <span className="text-[10px] text-zinc-400">
                  Čtvercový formát 1:1, zobrazeno ve středu QR kódu.
                </span>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="text-[11px] font-semibold text-zinc-700 hover:text-zinc-950 underline cursor-pointer"
                  >
                    Změnit
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer ml-2"
                  >
                    <Trash2 size={12} />
                    Odstranit
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={isProcessingLogo}
              className="border border-dashed border-zinc-300 hover:border-zinc-400 bg-white hover:bg-zinc-50 rounded-2xl p-4 flex items-center justify-center gap-2.5 text-xs text-zinc-600 font-semibold transition-all cursor-pointer shadow-sm group"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors">
                <ImageIcon size={16} />
              </div>
              <span>
                {isProcessingLogo
                  ? 'Zpracovávám obrázek...'
                  : 'Nahrát logo (PNG, JPG, SVG, WebP)'}
              </span>
            </button>
          )}
          <span className="text-[10px] text-zinc-400">
            Nahraný obrázek je automaticky oříznut na čtverec a optimalizován
            pro QR kód.
          </span>
        </div>

        {/* Bank Credentials */}
        <div className="flex flex-col gap-1.5 border-t border-zinc-100 pt-3">
          <label
            htmlFor="settingAccountNumber"
            className="text-xs font-bold text-zinc-400 uppercase tracking-wider"
          >
            Číslo účtu (nepovinné)
          </label>
          <input
            id="settingAccountNumber"
            type="text"
            inputMode="decimal"
            placeholder="Např. 19-1234567890"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 font-mono transition-all"
          />
          <span className="text-[10px] text-zinc-400 mt-0.5 leading-normal">
            Formát: [předčíslí-]číslo_účtu (pouze číslice a pomlčka)
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="settingBankId"
            className="text-xs font-bold text-zinc-400 uppercase tracking-wider"
          >
            Kód banky (4 číslice)
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
              className="w-24 bg-white border border-zinc-200 rounded-xl px-3 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 font-mono transition-all"
            />
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="flex-1 bg-white border border-zinc-200 rounded-xl px-3 py-3 text-xs text-zinc-700 focus:outline-none focus:border-zinc-800 transition-all cursor-pointer truncate"
            >
              <option value="">Rychlý výběr banky...</option>
              {CZECH_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-800 rounded-xl px-4 py-3 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-4 py-3 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
            <Check size={14} />
            Nastavení bylo úspěšně uloženo!
          </div>
        )}

        <button
          type="submit"
          className="bg-zinc-950 hover:bg-zinc-800 text-white font-semibold py-3.5 px-4 rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer text-center w-full mt-2"
        >
          Uložit změny
        </button>
      </form>
    </div>
  )
}
