/**
 * Schema validation and sanitization for Merchant data and backups.
 * Zero-trust boundary validation against corrupted or malicious inputs.
 */

import {
  validateCzechAccount,
  validateBankId,
} from '../../utils/paymentUtils.js'

/**
 * Validates and sanitizes a single product object.
 *
 * @param {unknown} item
 * @returns {{ valid: boolean, product?: object, error?: string }}
 */
export function validateProduct(item) {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Položka produktu musí být objekt.' }
  }

  const raw = /** @type {Record<string, any>} */ (item)

  if (typeof raw.name !== 'string' || !raw.name.trim()) {
    return { valid: false, error: 'Název produktu je povinný řetězec.' }
  }

  const priceNum =
    typeof raw.price === 'number' ? raw.price : parseFloat(raw.price)
  if (isNaN(priceNum) || priceNum <= 0 || !isFinite(priceNum)) {
    return {
      valid: false,
      error: 'Cena produktu musí být kladné konečné číslo.',
    }
  }

  // Cap strings to prevent storage bloat or DoS
  const sanitizedName = raw.name.trim().slice(0, 120)
  const sanitizedScript =
    typeof raw.script === 'string' ? raw.script.slice(0, 4000) : ''
  const sanitizedId =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim().slice(0, 64)
      : `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return {
    valid: true,
    product: {
      id: sanitizedId,
      name: sanitizedName,
      price: Math.round(priceNum * 100) / 100,
      script: sanitizedScript,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    },
  }
}

/**
 * Validates and sanitizes settings.
 *
 * @param {unknown} settings
 * @returns {{ valid: boolean, settings?: object, error?: string }}
 */
export function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return { valid: false, error: 'Nastavení musí být objekt.' }
  }

  const raw = /** @type {Record<string, any>} */ (settings)
  const businessName =
    typeof raw.businessName === 'string' && raw.businessName.trim()
      ? raw.businessName.trim().slice(0, 80)
      : 'Pokladna'

  let accountNumber = ''
  if (typeof raw.accountNumber === 'string') {
    accountNumber = raw.accountNumber.trim().slice(0, 24)
    if (accountNumber && !validateCzechAccount(accountNumber)) {
      return {
        valid: false,
        error: 'Neplatný formát čísla účtu (např. 19-12345678).',
      }
    }
  }

  let bankId = ''
  if (typeof raw.bankId === 'string') {
    bankId = raw.bankId.trim().slice(0, 4)
    if (bankId && !validateBankId(bankId)) {
      return { valid: false, error: 'Kód banky musí mít přesně 4 číslice.' }
    }
  }

  return {
    valid: true,
    settings: {
      businessName,
      accountNumber,
      bankId,
      currency: 'CZK',
    },
  }
}

/**
 * Validates a full backup structure for importing.
 *
 * @param {unknown} rawData
 * @returns {{ valid: boolean, backup?: object, error?: string }}
 */
export function validateBackupPayload(rawData) {
  if (!rawData || typeof rawData !== 'object') {
    return {
      valid: false,
      error: 'Záložní soubor neobsahuje platný formát JSON.',
    }
  }

  const data = /** @type {Record<string, any>} */ (rawData)

  if (data.type && data.type !== 'merchant_backup') {
    return {
      valid: false,
      error: 'Tento soubor není platnou zálohou aplikace Merchant.',
    }
  }

  // Validate or normalize settings
  const rawSettings = data.settings || {
    businessName: data.merchant?.name || data.businessName || 'Pokladna',
    accountNumber: data.bankInfo?.accountNumber || data.accountNumber || '',
    bankId: data.bankInfo?.bankId || data.bankId || '',
  }

  const settingsValidation = validateSettings(rawSettings)
  if (!settingsValidation.valid) {
    return { valid: false, error: settingsValidation.error }
  }

  // Validate products list
  const rawProducts = Array.isArray(data.products) ? data.products : []
  const validatedProducts = []

  for (let i = 0; i < rawProducts.length; i++) {
    const prodValidation = validateProduct(rawProducts[i])
    if (prodValidation.valid && prodValidation.product) {
      validatedProducts.push(prodValidation.product)
    }
  }

  const instanceId =
    typeof data.merchant?.id === 'string'
      ? data.merchant.id.slice(0, 64)
      : `inst-${Date.now()}`

  return {
    valid: true,
    backup: {
      version: '2.0',
      type: 'merchant_backup',
      exportedAt:
        typeof data.exportedAt === 'string'
          ? data.exportedAt
          : new Date().toISOString(),
      merchant: {
        id: instanceId,
        name: settingsValidation.settings.businessName,
        createdAt: data.merchant?.createdAt || Date.now(),
        updatedAt: Date.now(),
        isInitialized: true,
      },
      settings: settingsValidation.settings,
      products: validatedProducts,
    },
  }
}
