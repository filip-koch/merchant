import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { triggerHaptic } from '../utils/paymentUtils.js'
import { toSvg, czechAccountToIban } from '../qr/index.js'

export default function PaymentModal({
  type,
  amount,
  bankInfo,
  shopName = 'QR Platba',
  logo = '',
  onClose,
  onConfirm,
}) {
  const [timeLeft, setTimeLeft] = useState(10) // 10 seconds for cash
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [finalAmount] = useState(amount)
  const timerRef = useRef(null)

  // Resolve IBAN from bank credentials
  const iban = useMemo(() => {
    if (!bankInfo?.accountNumber || !bankInfo?.bankId) return ''
    try {
      return czechAccountToIban(`${bankInfo.accountNumber}/${bankInfo.bankId}`)
    } catch {
      return ''
    }
  }, [bankInfo])

  // Generate SVG QR Code with CBA frame, scaled shop name, and optional logo
  const qrSvg = useMemo(() => {
    if (type !== 'qr' || !iban) return ''

    try {
      return toSvg({
        iban,
        amount,
        currency: 'CZK',
        businessName: shopName || 'QR Platba',
        message: `${shopName || 'POS'} Platba`,
        size: 320,
        margin: 24,
        logo: logo
          ? {
              src: logo,
              background: '#ffffff',
              backgroundShape: 'rounded-rect',
              size: 0.22,
            }
          : null,
        frame: {
          show: true,
          text: shopName || 'QR Platba',
          color: '#09090b',
          textColor: '#09090b',
        },
        qr: {
          color: { dark: '#09090b' },
        },
      })
    } catch (err) {
      console.error('Chyba při generování QR SVG:', err)
      return ''
    }
  }, [type, iban, amount, shopName, logo])

  const handleConfirm = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPaymentSuccess(true)
    triggerHaptic([80, 50, 120])

    onConfirm()

    setTimeout(() => {
      onClose()
    }, 2500)
  }, [onConfirm, onClose])

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    onClose()
  }

  // Handle status bar blending when modal is open
  useEffect(() => {
    let meta = document.getElementById('dynamic-theme-color')
    if (!meta) {
      meta = document.createElement('meta')
      meta.id = 'dynamic-theme-color'
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = '#b2b2b2'
    document.documentElement.classList.add('modal-open')
    document.body.classList.add('modal-open')

    return () => {
      const currentMeta = document.getElementById('dynamic-theme-color')
      if (currentMeta) {
        currentMeta.content = '#ffffff'
      }
      document.documentElement.classList.remove('modal-open')
      document.body.classList.remove('modal-open')
    }
  }, [])

  // Handle Cash Countdown Timer
  useEffect(() => {
    if (type === 'cash' && !paymentSuccess) {
      const startTime = Date.now()
      const duration = 12000 // 10 seconds in ms

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, (duration - elapsed) / 1000)

        setTimeLeft(remaining)

        if (remaining <= 0) {
          clearInterval(timerRef.current)
          handleConfirm()
        }
      }, 50)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [type, paymentSuccess, handleConfirm])

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in select-none">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-zinc-100 animate-scale-in flex flex-col p-6 min-h-[380px]">
        {/* SUCCESS SCREEN STATE */}
        {paymentSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 animate-fade-in">
            <div className="flex items-center justify-center">
              <svg
                className="checkmark"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 52 52"
              >
                <circle
                  className="checkmark__circle"
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                />
                <path
                  className="checkmark__check"
                  fill="none"
                  d="M14.1 27.2l7.1 7.2 16.7-16.8"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mt-6">
              Platba dokončena!
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Transakce byla úspěšně zpracována.
            </p>
            <p className="text-3xl font-black text-zinc-950 mt-5">
              {finalAmount.toLocaleString('cs-CZ')} Kč
            </p>
            <button
              onClick={onClose}
              className="mt-8 bg-zinc-950 hover:bg-zinc-800 text-white font-semibold rounded-xl text-sm py-3 px-6 active:scale-95 transition-all w-full cursor-pointer"
            >
              Zavřít
            </button>
          </div>
        ) : (
          /* ACTIVE PAYMENT STATE */
          <div className="flex-1 flex flex-col animate-fade-in">
            <div className="text-center pb-4 border-b border-zinc-100">
              <h3 className="font-bold text-base text-zinc-900">
                {type === 'cash' ? 'Platba hotovostí' : 'Platba QR kódem'}
              </h3>
            </div>

            <div className="text-center py-4">
              <span className="text-4xl font-black text-zinc-900 tracking-tight font-mono">
                {finalAmount.toLocaleString('cs-CZ')}
              </span>
              <span className="text-base font-bold text-zinc-900 ml-1.5">
                Kč
              </span>
            </div>

            {/* CASH PAYMENT MODULE */}
            {type === 'cash' && (
              <div className="flex flex-col items-center justify-center py-4 my-2">
                <div className="w-full bg-zinc-100 h-1 rounded-full overflow-hidden mb-3">
                  <div
                    className="bg-zinc-900 h-full transition-all duration-75"
                    style={{ width: `${(timeLeft / 10) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-400">
                  Automatické potvrzení za{' '}
                  <strong className="text-zinc-800 font-semibold">
                    {timeLeft.toFixed(1)}s
                  </strong>
                </p>
              </div>
            )}

            {/* QR PAYMENT MODULE (USING SVG FROM SRC/QR) */}
            {type === 'qr' && (
              <div className="flex flex-col items-center justify-center mb-3">
                {iban && qrSvg ? (
                  <div
                    className="w-[210px] h-[210px] flex items-center justify-center rounded-2xl bg-white shadow-sm border border-zinc-100 p-0.5 animate-scale-in"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="text-center py-6 text-zinc-500 flex flex-col items-center">
                    <AlertTriangle size={28} className="text-amber-500 mb-2" />
                    <p className="font-semibold text-xs text-zinc-800">
                      Chybí bankovní spojení
                    </p>
                    <p className="text-[11px] mt-1 text-zinc-400 max-w-[200px] leading-normal">
                      Pro generování QR kódů musíte nastavit číslo účtu (kolečko
                      v záhlaví).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ACTIONS */}
            <div className="flex gap-3 mt-auto pt-4 border-t border-zinc-100">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold rounded-xl text-xs transition-all cursor-pointer active:scale-95 text-center border border-zinc-200/40"
              >
                Zrušit
              </button>

              {(type === 'cash' || iban) && (
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer active:scale-95 text-center shadow-sm"
                >
                  {type === 'cash' ? 'Potvrdit' : 'Potvrdit přijetí'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
