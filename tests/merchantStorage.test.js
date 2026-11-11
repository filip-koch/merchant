import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Create in-memory mock for localStorage
const memoryStorage = new Map()
globalThis.localStorage = {
  getItem: (k) => memoryStorage.get(k) || null,
  setItem: (k, v) => memoryStorage.set(k, String(v)),
  removeItem: (k) => memoryStorage.delete(k),
  clear: () => memoryStorage.clear(),
  get length() {
    return memoryStorage.size
  },
  key: (i) => Array.from(memoryStorage.keys())[i] || null,
}

// In-memory mock for IDB
const idbMemory = new Map()
globalThis.indexedDB = {
  open: () => {
    const req = {
      result: {
        objectStoreNames: { contains: () => true },
        transaction: () => ({
          objectStore: () => ({
            get: (k) => {
              const r = { result: idbMemory.get(k) || null }
              setTimeout(() => r.onsuccess && r.onsuccess(), 1)
              return r
            },
            put: (val) => {
              idbMemory.set(val.key, val)
              const r = {}
              setTimeout(() => r.onsuccess && r.onsuccess(), 1)
              return r
            },
            delete: (k) => {
              idbMemory.delete(k)
              const r = {}
              setTimeout(() => r.onsuccess && r.onsuccess(), 1)
              return r
            },
            clear: () => {
              idbMemory.clear()
              const r = {}
              setTimeout(() => r.onsuccess && r.onsuccess(), 1)
              return r
            },
          }),
        }),
        close: () => {},
      },
    }
    setTimeout(() => req.onsuccess && req.onsuccess(), 1)
    return req
  },
}

const {
  initializeMerchantInstance,
  saveMerchantSettings,
  saveMerchantProducts,
  exportMerchantBackup,
  importMerchantBackup,
  deleteMerchantInstance,
  loadMerchantData,
} = await import('../src/services/storage/merchantStorage.js')

describe('merchantStorage', () => {
  beforeEach(() => {
    memoryStorage.clear()
    idbMemory.clear()
  })

  it('initializes a new merchant instance with settings and sample items', async () => {
    const res = await initializeMerchantInstance({
      name: 'Kavárna Slunce',
      accountNumber: '19-1234567890',
      bankId: '0800',
      includeSampleProducts: true,
    })

    assert.equal(res.instance.name, 'Kavárna Slunce')
    assert.equal(res.instance.isInitialized, true)
    assert.equal(res.settings.accountNumber, '19-1234567890')
    assert.equal(res.settings.bankId, '0800')
    assert.ok(res.products.length > 0)

    const loaded = await loadMerchantData()
    assert.equal(loaded.instance?.name, 'Kavárna Slunce')
    assert.equal(loaded.products.length, res.products.length)
  })

  it('updates settings and syncs instance name', async () => {
    await initializeMerchantInstance({ name: 'Old Name' })
    const updated = await saveMerchantSettings({
      businessName: 'New Name',
      accountNumber: '12345678',
      bankId: '0100',
    })

    assert.equal(updated.businessName, 'New Name')
    const loaded = await loadMerchantData()
    assert.equal(loaded.instance?.name, 'New Name')
    assert.equal(loaded.settings.businessName, 'New Name')
    assert.equal(loaded.settings.accountNumber, '12345678')
  })

  it('saves and updates products safely', async () => {
    await initializeMerchantInstance({ name: 'Shop' })
    const products = [
      { id: 'p1', name: 'Káva', price: 60, script: '' },
      { id: 'p2', name: 'Čaj', price: 50, script: '' },
    ]
    const saved = await saveMerchantProducts(products)
    assert.equal(saved.length, 2)

    const loaded = await loadMerchantData()
    assert.equal(loaded.products.length, 2)
    assert.equal(loaded.products[0].name, 'Káva')
  })

  it('exports merchant backup as valid JSON structure', async () => {
    await initializeMerchantInstance({
      name: 'Bistro',
      accountNumber: '12345678',
      bankId: '0800',
      includeSampleProducts: true,
    })

    const backup = await exportMerchantBackup()
    assert.ok(backup.filename.includes('merchant_bistro_backup_'))
    assert.ok(backup.jsonString.length > 0)
    assert.equal(backup.payload.type, 'merchant_backup')
    assert.equal(backup.payload.settings.businessName, 'Bistro')
    assert.ok(backup.payload.products.length > 0)
  })

  it('imports merchant backup replacing existing state', async () => {
    await initializeMerchantInstance({ name: 'Old Instance' })

    const backupData = {
      version: '2.0',
      type: 'merchant_backup',
      exportedAt: new Date().toISOString(),
      merchant: { id: 'inst-imported', name: 'Restored Shop' },
      settings: {
        businessName: 'Restored Shop',
        accountNumber: '12345678',
        bankId: '2010',
      },
      products: [{ id: 'p-new', name: 'Novinka', price: 120, script: '' }],
    }

    const restored = await importMerchantBackup(backupData)
    assert.equal(restored.instance.name, 'Restored Shop')
    assert.equal(restored.settings.bankId, '2010')
    assert.equal(restored.products.length, 1)

    const loaded = await loadMerchantData()
    assert.equal(loaded.instance?.name, 'Restored Shop')
    assert.equal(loaded.products[0].name, 'Novinka')
  })

  it('permanently deletes merchant instance and wipes storage', async () => {
    await initializeMerchantInstance({
      name: 'To Delete',
      includeSampleProducts: true,
    })

    await deleteMerchantInstance()

    const loaded = await loadMerchantData()
    assert.equal(loaded.instance, null)
    assert.equal(loaded.products.length, 0)
  })
})
