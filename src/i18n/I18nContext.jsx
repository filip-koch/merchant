import { useMemo, useCallback } from 'react'
import { translations } from './translations.js'
import { useMerchant } from '../context/useMerchant.js'
import { I18nContext } from './I18nContextObject.js'

/**
 * Resolves a nested key in an object by dot-notation.
 * E.g. resolveKey(dict, 'settings.title')
 */
function resolveKey(obj, path) {
  if (!obj || !path) return null
  const segments = path.split('.')
  let current = obj
  for (const seg of segments) {
    if (current && typeof current === 'object' && seg in current) {
      current = current[seg]
    } else {
      return null
    }
  }
  return typeof current === 'string' ? current : null
}

export function I18nProvider({ children }) {
  const { settings, updateSettings } = useMerchant()

  const language = settings?.language === 'en' ? 'en' : 'cs'
  const locale = language === 'en' ? 'en-US' : 'cs-CZ'

  const setLanguage = useCallback(
    async (newLang) => {
      const validLang = newLang === 'en' ? 'en' : 'cs'
      if (settings && updateSettings) {
        await updateSettings({
          ...settings,
          language: validLang,
        })
      }
    },
    [settings, updateSettings]
  )

  /**
   * Translate function.
   * Usage:
   * t('common.save')
   * t('cart.itemCount', { count: 3 })
   */
  const t = useCallback(
    (key, params = {}) => {
      const currentDict = translations[language] || translations.cs
      const fallbackDict = translations.cs

      let text = resolveKey(currentDict, key)
      if (!text) {
        text = resolveKey(fallbackDict, key)
      }

      if (!text) {
        // Return key if translation is missing
        return key
      }

      // Variable interpolation {variable}
      return text.replace(/\{(\w+)\}/g, (_, match) => {
        return params[match] !== undefined
          ? String(params[match])
          : `{${match}}`
      })
    },
    [language]
  )

  const formatCurrency = useCallback(
    (amount) => {
      const num = typeof amount === 'number' ? amount : Number(amount) || 0
      const formatted = num.toLocaleString(locale)
      return language === 'en' ? `${formatted} CZK` : `${formatted} Kč`
    },
    [language, locale]
  )

  const formatDate = useCallback(
    (dateInput, options = {}) => {
      if (!dateInput) return ''
      const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
      if (isNaN(d.getTime())) return ''
      return d.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...options,
      })
    },
    [locale]
  )

  const formatDateTime = useCallback(
    (dateInput) => {
      if (!dateInput) return ''
      const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
      if (isNaN(d.getTime())) return ''
      return d.toLocaleString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    },
    [locale]
  )

  const formatTime = useCallback(
    (dateInput) => {
      if (!dateInput) return ''
      const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
      if (isNaN(d.getTime())) return ''
      return d.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      })
    },
    [locale]
  )

  const value = useMemo(
    () => ({
      language,
      locale,
      setLanguage,
      t,
      formatCurrency,
      formatDate,
      formatDateTime,
      formatTime,
    }),
    [
      language,
      locale,
      setLanguage,
      t,
      formatCurrency,
      formatDate,
      formatDateTime,
      formatTime,
    ]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
