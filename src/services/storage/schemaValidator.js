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

  let logo = ''
  if (typeof raw.logo === 'string') {
    const trimmed = raw.logo.trim()
    if (trimmed.startsWith('data:image/') && trimmed.length <= 600000) {
      logo = trimmed
    }
  }

  const language = raw.language === 'en' ? 'en' : 'cs'

  return {
    valid: true,
    settings: {
      businessName,
      accountNumber,
      bankId,
      logo,
      currency: 'CZK',
      language,
    },
  }
}

/**
 * Validates and sanitizes a single expense object.
 *
 * @param {unknown} item
 * @returns {{ valid: boolean, expense?: object, error?: string }}
 */
export function validateExpense(item) {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Položka výdaje musí být objekt.' }
  }

  const raw = /** @type {Record<string, any>} */ (item)

  if (typeof raw.name !== 'string' || !raw.name.trim()) {
    return { valid: false, error: 'Název výdaje je povinný řetězec.' }
  }

  const amountNum =
    typeof raw.amount === 'number' ? raw.amount : parseFloat(raw.amount)

  if (isNaN(amountNum) || amountNum <= 0 || !isFinite(amountNum)) {
    return { valid: false, error: 'Částka výdaje musí být kladné číslo.' }
  }

  const sanitizedName = raw.name.trim().slice(0, 120)
  const sanitizedId =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim().slice(0, 64)
      : `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return {
    valid: true,
    expense: {
      id: sanitizedId,
      name: sanitizedName,
      amount: Math.round(amountNum * 100) / 100,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    },
  }
}

/**
 * Validates and sanitizes a single event object.
 *
 * @param {unknown} item
 * @returns {{ valid: boolean, event?: object, error?: string }}
 */
export function validateEvent(item) {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Položka události musí být objekt.' }
  }

  const raw = /** @type {Record<string, any>} */ (item)

  if (typeof raw.name !== 'string' || !raw.name.trim()) {
    return { valid: false, error: 'Název události je povinný řetězec.' }
  }

  if (!raw.startDateTime) {
    return { valid: false, error: 'Čas začátku události je povinný.' }
  }

  if (!raw.endDateTime) {
    return { valid: false, error: 'Čas konce události je povinný.' }
  }

  const startTime = new Date(raw.startDateTime).getTime()
  const endTime = new Date(raw.endDateTime).getTime()

  if (isNaN(startTime)) {
    return { valid: false, error: 'Neplatný formát začátku události.' }
  }

  if (isNaN(endTime)) {
    return { valid: false, error: 'Neplatný formát konce události.' }
  }

  if (endTime < startTime) {
    return {
      valid: false,
      error: 'Konec události nesmí být dříve než začátek.',
    }
  }

  const sanitizedName = raw.name.trim().slice(0, 120)
  const sanitizedId =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim().slice(0, 64)
      : `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  // Validate expenses array
  const rawExpenses = Array.isArray(raw.expenses) ? raw.expenses : []
  const validatedExpenses = []
  for (let i = 0; i < rawExpenses.length; i++) {
    const expValidation = validateExpense(rawExpenses[i])
    if (expValidation.valid && expValidation.expense) {
      validatedExpenses.push(expValidation.expense)
    }
  }

  return {
    valid: true,
    event: {
      id: sanitizedId,
      name: sanitizedName,
      startDateTime: new Date(startTime).toISOString(),
      endDateTime: new Date(endTime).toISOString(),
      expenses: validatedExpenses,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    },
  }
}

/**
 * Validates and sanitizes a single sale record.
 *
 * @param {unknown} item
 * @returns {{ valid: boolean, sale?: object, error?: string }}
 */
export function validateSale(item) {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Položka prodeje musí být objekt.' }
  }

  const raw = /** @type {Record<string, any>} */ (item)

  const totalNum =
    typeof raw.totalAmount === 'number'
      ? raw.totalAmount
      : typeof raw.total === 'number'
        ? raw.total
        : parseFloat(raw.totalAmount || raw.total)

  if (isNaN(totalNum) || totalNum < 0 || !isFinite(totalNum)) {
    return {
      valid: false,
      error: 'Částka prodeje musí být nezáporné číslo.',
    }
  }

  const timestamp =
    typeof raw.timestamp === 'number'
      ? raw.timestamp
      : raw.date
        ? new Date(raw.date).getTime()
        : Date.now()

  const safeTimestamp = isNaN(timestamp) ? Date.now() : timestamp
  const dateStr = new Date(safeTimestamp).toISOString()
  const paymentType = raw.paymentType === 'qr' ? 'qr' : 'cash'

  const items = Array.isArray(raw.items)
    ? raw.items
        .filter(
          (it) => it && typeof it === 'object' && typeof it.name === 'string'
        )
        .map((it) => {
          const price =
            typeof it.price === 'number' ? it.price : Number(it.price) || 0
          const quantity =
            typeof it.quantity === 'number'
              ? it.quantity
              : Number(it.quantity) || 1
          const total =
            typeof it.total === 'number' ? it.total : price * quantity
          return {
            id: typeof it.id === 'string' ? it.id.slice(0, 64) : '',
            name: String(it.name).slice(0, 120),
            price: Math.round(price * 100) / 100,
            quantity: Math.max(1, Math.round(quantity)),
            total: Math.round(total * 100) / 100,
          }
        })
    : []

  const sanitizedId =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim().slice(0, 64)
      : `sale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return {
    valid: true,
    sale: {
      id: sanitizedId,
      totalAmount: Math.round(totalNum * 100) / 100,
      paymentType,
      items,
      timestamp: safeTimestamp,
      date: dateStr,
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
    language: data.settings?.language || 'cs',
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

  // Validate events list
  const rawEvents = Array.isArray(data.events) ? data.events : []
  const validatedEvents = []
  for (let i = 0; i < rawEvents.length; i++) {
    const eventValidation = validateEvent(rawEvents[i])
    if (eventValidation.valid && eventValidation.event) {
      validatedEvents.push(eventValidation.event)
    }
  }

  // Validate sales list
  const rawSales = Array.isArray(data.sales) ? data.sales : []
  const validatedSales = []
  for (let i = 0; i < rawSales.length; i++) {
    const saleValidation = validateSale(rawSales[i])
    if (saleValidation.valid && saleValidation.sale) {
      validatedSales.push(saleValidation.sale)
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
      schemaVersion: '2.0',
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
      events: validatedEvents,
      sales: validatedSales,
    },
  }
}
