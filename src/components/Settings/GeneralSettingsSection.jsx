import { useState } from 'react'
import { Info, Check } from 'lucide-react'
import {
  validateCzechAccount,
  validateBankId,
  CZECH_BANKS,
  triggerHaptic,
} from '../../utils/paymentUtils.js'

export default function GeneralSettingsSection({ settings, onSave }) {
  const [businessName, setBusinessName] = useState(
    settings?.businessName || 'Pokladna'
  )
  const [accountNumber, setAccountNumber] = useState(
    settings?.accountNumber || ''
  )
  const [bankId, setBankId] = useState(settings?.bankId || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
          Zadejte název pokladny a volitelné bankovní údaje pro příjem QR
          plateb.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="settingBusinessName"
            className="text-xs font-bold text-zinc-400 uppercase tracking-wider"
          >
            Název pokladny (Záhlaví)
          </label>
          <input
            id="settingBusinessName"
            type="text"
            placeholder="Např. Kavárna"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all font-semibold"
          />
        </div>

        <div className="flex flex-col gap-1.5">
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
