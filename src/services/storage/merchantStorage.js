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
  validateBackupPayload,
} from './schemaValidator.js'

const KEYS = {
  INSTANCE: 'merchant_instance',
  SETTINGS: 'merchant_settings',
  PRODUCTS: 'merchant_products',
  MIGRATED: 'pos_migrated_v2',
}

/** Sample starter catalog when user creates an instance */
export const SAMPLE_PRODUCTS = [
  { id: 'sample-1', name: 'Espresso / Lungo', price: 65, script: '' },
  { id: 'sample-2', name: 'Cappuccino / Flat White', price: 85, script: '' },
  { id: 'sample-3', name: 'Domácí limonáda 0,4l', price: 79, script: '' },
  {
    id: 'sample-4',
    name: 'Dezert dne',
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
    const legacyProductsRaw = localStorage.getItem('pos_products')

    // If there is legacy data
    if (legacyName || legacyProductsRaw || legacyAccount) {
      let legacyProducts = []
      if (legacyProductsRaw) {
        try {
          const parsed = JSON.parse(legacyProductsRaw)
          if (Array.isArray(parsed)) {
            legacyProducts = parsed
              .map((p) => validateProduct(p))
              .filter((res) => res.valid && res.product)
              .map((res) => res.product)
          }
        } catch (e) {
          console.warn('Chyba při parsování starých produktů:', e)
        }
      }

      const instance = {
        id: `inst-migrated-${Date.now()}`,
        name: (legacyName || 'Artist').trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isInitialized: true,
        version: '2.0',
      }

      const settings = {
        businessName: (legacyName || 'Artist').trim(),
        accountNumber: legacyAccount.trim(),
        bankId: legacyBankId.trim(),
        currency: 'CZK',
      }

      await idbSet(KEYS.INSTANCE, instance)
      await idbSet(KEYS.SETTINGS, settings)
      await idbSet(KEYS.PRODUCTS, legacyProducts)

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
 *   storageStatus: object
 * }>}
 */
export async function loadMerchantData() {
  await checkAndMigrateLegacyData()

  // Ensure persistent storage is active
  await requestStoragePersistence()
  const storageStatus = await checkStorageStatus()

  const instance = await idbGet(KEYS.INSTANCE)
  const savedSettings = await idbGet(KEYS.SETTINGS)
  const savedProducts = await idbGet(KEYS.PRODUCTS)

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
 * @param {boolean} [params.includeSampleProducts]
 * @returns {Promise<{ instance: object, settings: object, products: Array<object> }>}
 */
export async function initializeMerchantInstance({
  name,
  accountNumber = '',
  bankId = '',
  logo = '',
  includeSampleProducts = false,
}) {
  const cleanName = (name || '').trim() || 'Moje Pokladna'

  const settingsValidation = validateSettings({
    businessName: cleanName,
    accountNumber,
    bankId,
    logo,
  })

  if (!settingsValidation.valid) {
    throw new Error(settingsValidation.error)
  }

  const instance = {
    id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isInitialized: true,
    version: '2.0',
  }

  const products = includeSampleProducts
    ? SAMPLE_PRODUCTS.map((p) => ({ ...p, id: `prod-${Date.now()}-${p.id}` }))
    : []

  await idbSet(KEYS.INSTANCE, instance)
  await idbSet(KEYS.SETTINGS, settingsValidation.settings)
  await idbSet(KEYS.PRODUCTS, products)

  // Request storage persistence again for the newly created instance
  await requestStoragePersistence()

  return {
    instance,
    settings: settingsValidation.settings,
    products,
  }
}

/**
 * Updates merchant settings.
 *
 * @param {object} newSettings
 * @returns {Promise<object>}
 */
export async function saveMerchantSettings(newSettings) {
  const validation = validateSettings(newSettings)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  await idbSet(KEYS.SETTINGS, validation.settings)

  // Update instance metadata name as well
  const instance = await idbGet(KEYS.INSTANCE)
  if (instance) {
    instance.name = validation.settings.businessName
    instance.updatedAt = Date.now()
    await idbSet(KEYS.INSTANCE, instance)
  }

  return validation.settings
}

/**
 * Persists the products array to storage.
 *
 * @param {Array<object>} products
 * @returns {Promise<Array<object>>}
 */
export async function saveMerchantProducts(products) {
  if (!Array.isArray(products)) {
    throw new Error('Produkty musí být pole.')
  }

  const validProducts = []
  for (const item of products) {
    const result = validateProduct(item)
    if (result.valid && result.product) {
      validProducts.push(result.product)
    }
  }

  await idbSet(KEYS.PRODUCTS, validProducts)
  return validProducts
}

/**
 * Generates an exportable backup object for the current merchant instance.
 *
 * @returns {Promise<{ filename: string, jsonString: string, payload: object }>}
 */
export async function exportMerchantBackup() {
  const instance = await idbGet(KEYS.INSTANCE)
  const settings = (await idbGet(KEYS.SETTINGS)) || { businessName: 'Merchant' }
  const products = (await idbGet(KEYS.PRODUCTS)) || []

  const payload = {
    version: '2.0',
    type: 'merchant_backup',
    exportedAt: new Date().toISOString(),
    merchant: instance || {
      id: `inst-${Date.now()}`,
      name: settings.businessName,
      createdAt: Date.now(),
      isInitialized: true,
    },
    settings,
    products,
  }

  const safeName = (settings.businessName || 'merchant')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `merchant_${safeName}_backup_${dateStr}.json`
  const jsonString = JSON.stringify(payload, null, 2)

  return { filename, jsonString, payload }
}

/**
 * Imports a merchant backup from parsed object or JSON string.
 *
 * @param {string|object} backupData
 * @returns {Promise<{ instance: object, settings: object, products: Array<object> }>}
 */
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

  // Request durability
  await requestStoragePersistence()

  return {
    instance: backup.merchant,
    settings: backup.settings,
    products: backup.products,
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
  await idbClear()

  // Clean legacy localStorage keys as well
  localStorage.removeItem('pos_business_name')
  localStorage.removeItem('pos_bank_account')
  localStorage.removeItem('pos_bank_id')
  localStorage.removeItem('pos_products')
  localStorage.removeItem(KEYS.MIGRATED)
}
