/**
 * High-level Merchant storage domain service.
 * Coordinates async IndexedDB transactions, legacy localStorage migration,
 * backup export/import (.json), and permanent instance deletion.
 */

import {
  idbGet,
  idbSet,
  idbDelete,
  idbClear,
  requestStoragePersistence,
  checkStorageStatus,
} from './indexedDbAdapter.js'
import {
  validateSettings,
  validateProduct,
  validateEvent,
  validateExpense,
  validateSale,
  validateBackupPayload,
} from './schemaValidator.js'

const KEYS = {
  INSTANCE: 'merchant_instance',
  SETTINGS: 'merchant_settings',
  PRODUCTS: 'merchant_products',
  EVENTS: 'merchant_events',
  SALES: 'merchant_sales',
  MIGRATED: 'pos_migrated_v2',
}

/** Sample starter catalog when user creates an instance */
export const SAMPLE_PRODUCTS = [
  { id: 'sample-1', name: 'Základní položka', price: 65, script: '' },
  { id: 'sample-2', name: 'Speciální položka', price: 85, script: '' },
  { id: 'sample-3', name: 'Doplňkový sortiment', price: 45, script: '' },
  {
    id: 'sample-4',
    name: 'Balíček 2+1 zdarma',
    price: 95,
    script: 'return (Math.floor(quantity / 3) * 2 + (quantity % 3)) * price;',
  },
]

/**
 * Checks for legacy v1 localStorage data and migrates it seamlessly into IndexedDB.
 */
async function checkAndMigrateLegacyData() {
  try {
    const isAlreadyMigrated = localStorage.getItem(KEYS.MIGRATED)
    if (isAlreadyMigrated) return

    const legacyName = localStorage.getItem('pos_business_name')
    const legacyAccount = localStorage.getItem('pos_bank_account') || ''
    const legacyBankId = localStorage.getItem('pos_bank_id') || ''
    const legacyRawProducts = localStorage.getItem('pos_products')

    if (legacyName || legacyAccount || legacyRawProducts) {
      let legacyProducts = []
      try {
        const parsed = JSON.parse(legacyRawProducts || '[]')
        if (Array.isArray(parsed)) {
          legacyProducts = parsed
            .map((item) => {
              const res = validateProduct(item)
              return res.valid ? res.product : null
            })
            .filter(Boolean)
        }
      } catch {
        legacyProducts = []
      }

      const instance = {
        id: `inst_${Date.now()}`,
        name: (legacyName || 'Pokladna').trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isInitialized: true,
        version: '2.0',
      }

      const settings = {
        businessName: (legacyName || 'Pokladna').trim(),
        accountNumber: legacyAccount.trim(),
        bankId: legacyBankId.trim(),
        currency: 'CZK',
      }

      await idbSet(KEYS.INSTANCE, instance)
      await idbSet(KEYS.SETTINGS, settings)
      await idbSet(KEYS.PRODUCTS, legacyProducts)
      await idbSet(KEYS.EVENTS, [])
      await idbSet(KEYS.SALES, [])

      localStorage.setItem(KEYS.MIGRATED, 'true')
    }
  } catch (error) {
    console.error('Migrace z v1 do v2 selhala:', error)
  }
}

/**
 * Loads the complete merchant data payload from IndexedDB.
 *
 * @returns {Promise<{
 *   instance: object|null,
 *   settings: object,
 *   products: Array<object>,
 *   events: Array<object>,
 *   sales: Array<object>,
 *   storageStatus: object
 * }>}
 */
export async function loadMerchantData() {
  await checkAndMigrateLegacyData()

  // Ensure persistent storage is active
  await requestStoragePersistence()

  const [
    instance,
    savedSettings,
    savedProducts,
    savedEvents,
    savedSales,
    storageStatus,
  ] = await Promise.all([
    idbGet(KEYS.INSTANCE),
    idbGet(KEYS.SETTINGS),
    idbGet(KEYS.PRODUCTS),
    idbGet(KEYS.EVENTS),
    idbGet(KEYS.SALES),
    checkStorageStatus(),
  ])

  const defaultSettings = {
    businessName: 'Pokladna',
    accountNumber: '',
    bankId: '',
    logo: '',
    currency: 'CZK',
  }

  return {
    instance: instance || null,
    settings: savedSettings
      ? { ...defaultSettings, ...savedSettings }
      : defaultSettings,
    products: Array.isArray(savedProducts) ? savedProducts : [],
    events: Array.isArray(savedEvents) ? savedEvents : [],
    sales: Array.isArray(savedSales) ? savedSales : [],
    storageStatus,
  }
}

/**
 * Initializes a new merchant instance.
 *
 * @param {object} params
 * @param {string} params.name
 * @param {string} [params.accountNumber]
 * @param {string} [params.bankId]
 * @param {boolean} [params.includeSampleProducts=true]
 * @returns {Promise<{ instance: object, settings: object, products: Array<object>, events: Array<object>, sales: Array<object> }>}
 */
export async function initializeMerchantInstance({
  name,
  accountNumber = '',
  bankId = '',
  includeSampleProducts = true,
}) {
  const safeName = (name || 'Pokladna').trim().slice(0, 80)
  const settingsValidation = validateSettings({
    businessName: safeName,
    accountNumber,
    bankId,
  })

  if (!settingsValidation.valid) {
    throw new Error(settingsValidation.error)
  }

  const now = Date.now()
  const instance = {
    id: `inst_${now}`,
    name: safeName,
    createdAt: now,
    updatedAt: now,
    isInitialized: true,
    version: '2.0',
  }

  const initialProducts = includeSampleProducts ? [...SAMPLE_PRODUCTS] : []
  const initialEvents = []
  const initialSales = []

  await idbSet(KEYS.INSTANCE, instance)
  await idbSet(KEYS.SETTINGS, settingsValidation.settings)
  await idbSet(KEYS.PRODUCTS, initialProducts)
  await idbSet(KEYS.EVENTS, initialEvents)
  await idbSet(KEYS.SALES, initialSales)

  // Request durability
  await requestStoragePersistence()

  return {
    instance,
    settings: settingsValidation.settings,
    products: initialProducts,
    events: initialEvents,
    sales: initialSales,
  }
}

/**
 * Saves and validates merchant settings.
 *
 * @param {object} newSettings
 * @returns {Promise<{ settings: object, instance: object|null }>}
 */
export async function saveMerchantSettings(newSettings) {
  const validation = validateSettings(newSettings)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  await idbSet(KEYS.SETTINGS, validation.settings)

  // Synchronize instance name with business name if instance exists
  const current = await loadMerchantData()
  let updatedInstance = current.instance
  if (current.instance) {
    updatedInstance = {
      ...current.instance,
      name: validation.settings.businessName,
      updatedAt: Date.now(),
    }
    await idbSet(KEYS.INSTANCE, updatedInstance)
  }

  return { settings: validation.settings, instance: updatedInstance }
}

/**
 * Adds or updates a single product in storage.
 *
 * @param {object} productData
 * @returns {Promise<Array<object>>} Updated products array
 */
export async function saveMerchantProduct(productData) {
  const validation = validateProduct(productData)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const currentProducts = (await idbGet(KEYS.PRODUCTS)) || []
  let nextProducts

  const exists = currentProducts.some((p) => p.id === validation.product.id)
  if (exists) {
    nextProducts = currentProducts.map((p) =>
      p.id === validation.product.id ? validation.product : p
    )
  } else {
    nextProducts = [...currentProducts, validation.product]
  }

  await idbSet(KEYS.PRODUCTS, nextProducts)
  return nextProducts
}

/**
 * Saves an array of products in storage (bulk update/sync).
 *
 * @param {Array<object>} productsArray
 * @returns {Promise<Array<object>>} Updated products array
 */
export async function saveMerchantProducts(productsArray) {
  if (!Array.isArray(productsArray)) {
    throw new Error('Produkty musí být pole.')
  }
  const validatedProducts = []
  for (const item of productsArray) {
    const validation = validateProduct(item)
    if (validation.valid && validation.product) {
      validatedProducts.push(validation.product)
    }
  }
  await idbSet(KEYS.PRODUCTS, validatedProducts)
  return validatedProducts
}

/**
 * Deletes a product from storage.
 *
 * @param {string} productId
 * @returns {Promise<Array<object>>} Updated products array
 */
export async function deleteMerchantProduct(productId) {
  const currentProducts = (await idbGet(KEYS.PRODUCTS)) || []
  const nextProducts = currentProducts.filter((p) => p.id !== productId)

  await idbSet(KEYS.PRODUCTS, nextProducts)
  return nextProducts
}

/**
 * Adds a new event to storage.
 *
 * @param {object} eventData
 * @returns {Promise<{ createdEvent: object, newEvent: object, events: Array<object>, allEvents: Array<object> }>}
 */
export async function addMerchantEvent(eventData) {
  const validation = validateEvent(eventData)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const currentEvents = (await idbGet(KEYS.EVENTS)) || []
  const nextEvents = [validation.event, ...currentEvents]

  await idbSet(KEYS.EVENTS, nextEvents)
  return {
    createdEvent: validation.event,
    newEvent: validation.event,
    events: nextEvents,
    allEvents: nextEvents,
  }
}

/**
 * Updates an existing event in storage.
 *
 * @param {string} eventId
 * @param {object} eventData
 * @returns {Promise<{ updatedEvent: object, events: Array<object>, allEvents: Array<object> }>}
 */
export async function updateMerchantEvent(eventId, eventData) {
  const currentEvents = (await idbGet(KEYS.EVENTS)) || []
  const existing = currentEvents.find((e) => e.id === eventId)
  if (!existing) {
    throw new Error('Událost nebyla nalezena.')
  }

  // Preserve existing expenses and id if not explicitly replaced
  const merged = {
    ...existing,
    ...eventData,
    id: eventId,
    expenses: eventData.expenses || existing.expenses || [],
  }

  const validation = validateEvent(merged)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const nextEvents = currentEvents.map((e) =>
    e.id === eventId ? validation.event : e
  )

  await idbSet(KEYS.EVENTS, nextEvents)
  return {
    updatedEvent: validation.event,
    events: nextEvents,
    allEvents: nextEvents,
  }
}

/**
 * Deletes an event by ID.
 * (Sales that occurred in this event's interval automatically fall back to uncategorized by day).
 *
 * @param {string} eventId
 * @returns {Promise<Array<object>>} Updated events array
 */
export async function deleteMerchantEvent(eventId) {
  const currentEvents = (await idbGet(KEYS.EVENTS)) || []
  const nextEvents = currentEvents.filter((e) => e.id !== eventId)

  await idbSet(KEYS.EVENTS, nextEvents)
  return nextEvents
}

/**
 * Adds an expense to an event.
 *
 * @param {string} eventId
 * @param {object} expenseData
 * @returns {Promise<{ createdExpense: object, newExpense: object, updatedEvent: object, events: Array<object>, allEvents: Array<object> }>}
 */
export async function addMerchantEventExpense(eventId, expenseData) {
  const validation = validateExpense(expenseData)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const currentEvents = (await idbGet(KEYS.EVENTS)) || []
  const targetEvent = currentEvents.find((e) => e.id === eventId)
  if (!targetEvent) {
    throw new Error('Událost pro přidání výdaje nebyla nalezena.')
  }

  const existingExpenses = Array.isArray(targetEvent.expenses)
    ? targetEvent.expenses
    : []
  const nextExpenses = [validation.expense, ...existingExpenses]

  const updatedEvent = {
    ...targetEvent,
    expenses: nextExpenses,
  }

  const nextEvents = currentEvents.map((e) =>
    e.id === eventId ? updatedEvent : e
  )

  await idbSet(KEYS.EVENTS, nextEvents)
  return {
    createdExpense: validation.expense,
    newExpense: validation.expense,
    updatedEvent,
    events: nextEvents,
    allEvents: nextEvents,
  }
}

/**
 * Deletes an expense from an event.
 *
 * @param {string} eventId
 * @param {string} expenseId
 * @returns {Promise<Array<object> & { updatedEvent: object, events: Array<object>, allEvents: Array<object> }>} Updated events array with helper properties
 */
export async function deleteMerchantEventExpense(eventId, expenseId) {
  const currentEvents = (await idbGet(KEYS.EVENTS)) || []
  const targetEvent = currentEvents.find((e) => e.id === eventId)
  if (!targetEvent) {
    throw new Error('Událost pro smazání výdaje nebyla nalezena.')
  }

  const existingExpenses = Array.isArray(targetEvent.expenses)
    ? targetEvent.expenses
    : []
  const nextExpenses = existingExpenses.filter((ex) => ex.id !== expenseId)

  const updatedEvent = {
    ...targetEvent,
    expenses: nextExpenses,
  }

  const nextEvents = currentEvents.map((e) =>
    e.id === eventId ? updatedEvent : e
  )

  await idbSet(KEYS.EVENTS, nextEvents)
  return Object.assign([...nextEvents], {
    updatedEvent,
    events: nextEvents,
    allEvents: nextEvents,
  })
}

/**
 * Records a new completed sale into IndexedDB.
 *
 * @param {object} saleData
 * @returns {Promise<{ createdSale: object, newSale: object, sales: Array<object>, allSales: Array<object> }>}
 */
export async function recordMerchantSale(saleData) {
  const validation = validateSale(saleData)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const currentSales = (await idbGet(KEYS.SALES)) || []
  const nextSales = [validation.sale, ...currentSales]

  await idbSet(KEYS.SALES, nextSales)
  return {
    createdSale: validation.sale,
    newSale: validation.sale,
    sales: nextSales,
    allSales: nextSales,
  }
}

export const addMerchantSale = recordMerchantSale

/**
 * Exports complete merchant payload for backup.
 *
 * @returns {Promise<{ jsonString: string, filename: string, backup: object }>}
 */
export async function exportMerchantBackup() {
  const data = await loadMerchantData()

  const backup = {
    version: '2.0',
    schemaVersion: '2.0',
    type: 'merchant_backup',
    exportedAt: new Date().toISOString(),
    merchant: data.instance,
    settings: data.settings,
    products: data.products,
    events: data.events,
    sales: data.sales,
  }

  const validation = validateBackupPayload(backup)
  if (!validation.valid) {
    throw new Error(
      `Příprava zálohy selhala: ${validation.error || 'Neplatná data'}`
    )
  }

  const jsonString = JSON.stringify(validation.backup, null, 2)
  const safeName = (data.instance?.name || 'merchant')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `${safeName}_backup_${dateStr}.json`

  // Trigger browser file download if in DOM environment
  if (typeof document !== 'undefined') {
    try {
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.warn('Nelze automaticky stáhnout soubor zálohy:', err)
    }
  }

  return { jsonString, filename, backup: validation.backup }
}

/**
 * Imports a merchant backup from parsed object or JSON string.
 *
 * @param {string|object} backupData
 * @returns {Promise<{ instance: object, settings: object, products: Array<object>, events: Array<object>, sales: Array<object> }>}\n */
export async function importMerchantBackup(backupData) {
  let parsed = backupData
  if (typeof backupData === 'string') {
    try {
      parsed = JSON.parse(backupData)
    } catch {
      throw new Error('Soubor neobsahuje platný JSON formát.')
    }
  }

  const validation = validateBackupPayload(parsed)
  if (!validation.valid || !validation.backup) {
    throw new Error(validation.error || 'Neplatná data zálohy.')
  }

  const { backup } = validation

  await idbSet(KEYS.INSTANCE, backup.merchant)
  await idbSet(KEYS.SETTINGS, backup.settings)
  await idbSet(KEYS.PRODUCTS, backup.products)
  await idbSet(KEYS.EVENTS, backup.events || [])
  await idbSet(KEYS.SALES, backup.sales || [])

  // Request durability
  await requestStoragePersistence()

  return {
    instance: backup.merchant,
    settings: backup.settings,
    products: backup.products,
    events: backup.events || [],
    sales: backup.sales || [],
  }
}

/**
 * Permanently deletes the merchant instance and resets all data.
 * Clears IndexedDB records and removes legacy keys.
 *
 * @returns {Promise<void>}
 */
export async function deleteMerchantInstance() {
  await idbDelete(KEYS.INSTANCE)
  await idbDelete(KEYS.SETTINGS)
  await idbDelete(KEYS.PRODUCTS)
  await idbDelete(KEYS.EVENTS)
  await idbDelete(KEYS.SALES)
  await idbClear()

  // Clean legacy localStorage keys as well
  localStorage.removeItem('pos_business_name')
  localStorage.removeItem('pos_bank_account')
  localStorage.removeItem('pos_bank_id')
  localStorage.removeItem('pos_products')
  localStorage.removeItem(KEYS.MIGRATED)
}
