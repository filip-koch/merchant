import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  initializeMerchantInstance,
  loadMerchantData,
  saveMerchantSettings,
  saveMerchantProduct,
  deleteMerchantProduct,
  addMerchantEvent,
  updateMerchantEvent,
  deleteMerchantEvent,
  addMerchantEventExpense,
  deleteMerchantEventExpense,
  recordMerchantSale,
  exportMerchantBackup,
  importMerchantBackup,
  deleteMerchantInstance,
} from '../src/services/storage/merchantStorage.js'

// In-memory mock store for test execution environment (Node.js)
const memoryStore = new Map()

const createLocalStorageMock = () => {
  const map = new Map()
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === 'getItem') return (k) => map.get(k) ?? null
        if (prop === 'setItem') return (k, v) => map.set(k, String(v))
        if (prop === 'removeItem') return (k) => map.delete(k)
        if (prop === 'clear') return () => map.clear()
        if (prop === 'length') return map.size
        if (prop === 'key') return (i) => Array.from(map.keys())[i] ?? null
        return map.get(prop)
      },
      set(target, prop, value) {
        map.set(prop, String(value))
        return true
      },
      deleteProperty(target, prop) {
        return map.delete(prop)
      },
      ownKeys() {
        return Array.from(map.keys())
      },
      getOwnPropertyDescriptor(target, prop) {
        if (map.has(prop)) {
          return { enumerable: true, configurable: true, value: map.get(prop) }
        }
        return undefined
      },
    }
  )
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createLocalStorageMock()
}

// Install globals for Node environment if missing
if (typeof globalThis.indexedDB === 'undefined') {
  globalThis.indexedDB = {
    open: () => {
      const request = {
        result: {
          objectStoreNames: { contains: () => true },
          createObjectStore: () => {},
          transaction: () => ({
            objectStore: () => ({
              get: (key) => {
                const record = memoryStore.get(key)
                const req = {
                  result: record !== undefined ? record : undefined,
                }
                setTimeout(() => req.onsuccess?.({ target: req }), 0)
                return req
              },
              put: (item, optKey) => {
                const key = optKey !== undefined ? optKey : item?.key
                memoryStore.set(key, item)
                const req = { result: key }
                setTimeout(() => req.onsuccess?.({ target: req }), 0)
                return req
              },
              delete: (key) => {
                memoryStore.delete(key)
                const req = { result: undefined }
                setTimeout(() => req.onsuccess?.({ target: req }), 0)
                return req
              },
              clear: () => {
                memoryStore.clear()
                const req = { result: undefined }
                setTimeout(() => req.onsuccess?.({ target: req }), 0)
                return req
              },
            }),
          }),
        },
      }
      setTimeout(() => {
        request.onupgradeneeded?.({ target: request })
        request.onsuccess?.({ target: request })
      }, 0)
      return request
    },
  }
}

describe('merchantStorage', () => {
  beforeEach(async () => {
    memoryStore.clear()
    globalThis.localStorage.clear()
  })

  it('initializes a new merchant instance with settings and sample items', async () => {
    const res = await initializeMerchantInstance({
      name: 'Stánek Slunce',
      accountNumber: '19-1234567890',
      bankId: '0800',
      includeSampleProducts: true,
    })

    assert.equal(res.instance.name, 'Stánek Slunce')
    assert.equal(res.instance.isInitialized, true)
    assert.equal(res.settings.accountNumber, '19-1234567890')
    assert.equal(res.settings.bankId, '0800')
    assert.ok(res.products.length > 0)

    const loaded = await loadMerchantData()
    assert.equal(loaded.instance?.name, 'Stánek Slunce')
    assert.equal(loaded.products.length, res.products.length)
    assert.equal(loaded.events.length, 0)
    assert.equal(loaded.sales.length, 0)
  })

  it('updates settings and syncs instance name', async () => {
    await initializeMerchantInstance({ name: 'Old Name' })
    const updated = await saveMerchantSettings({
      businessName: 'New Name',
      accountNumber: '12345678',
      bankId: '0100',
    })

    assert.equal(updated.instance.name, 'New Name')
    assert.equal(updated.settings.businessName, 'New Name')
    assert.equal(updated.settings.accountNumber, '12345678')

    const loaded = await loadMerchantData()
    assert.equal(loaded.instance.name, 'New Name')
    assert.equal(loaded.settings.businessName, 'New Name')
  })

  it('saves and updates products safely', async () => {
    await initializeMerchantInstance({
      name: 'Store',
      includeSampleProducts: false,
    })

    const p1 = { id: 'p1', name: 'Zboží A', price: 60, script: '' }
    await saveMerchantProduct(p1)

    let loaded = await loadMerchantData()
    assert.equal(loaded.products.length, 1)
    assert.equal(loaded.products[0].name, 'Zboží A')

    // Update same product
    await saveMerchantProduct({ id: 'p1', name: 'Zboží A Speciál', price: 75 })
    loaded = await loadMerchantData()
    assert.equal(loaded.products.length, 1)
    assert.equal(loaded.products[0].name, 'Zboží A Speciál')
    assert.equal(loaded.products[0].price, 75)

    // Delete product
    await deleteMerchantProduct('p1')
    loaded = await loadMerchantData()
    assert.equal(loaded.products.length, 0)
  })

  it('manages events lifecycle (add, update, delete)', async () => {
    await initializeMerchantInstance({ name: 'Store' })

    const start = new Date('2026-06-01T10:00:00.000Z').toISOString()
    const end = new Date('2026-06-01T20:00:00.000Z').toISOString()

    const { createdEvent, events } = await addMerchantEvent({
      name: 'Festival 2026',
      startDateTime: start,
      endDateTime: end,
    })

    assert.equal(createdEvent.name, 'Festival 2026')
    assert.equal(events.length, 1)

    // Update event
    const { updatedEvent } = await updateMerchantEvent(createdEvent.id, {
      name: 'Festival 2026 - Změna',
    })
    assert.equal(updatedEvent.name, 'Festival 2026 - Změna')

    // Delete event
    const afterDelete = await deleteMerchantEvent(createdEvent.id)
    assert.equal(afterDelete.length, 0)
  })

  it('manages event expenses (add, delete)', async () => {
    await initializeMerchantInstance({ name: 'Store' })

    const { createdEvent } = await addMerchantEvent({
      name: 'Trh 2026',
      startDateTime: new Date('2026-06-01T10:00:00.000Z').toISOString(),
      endDateTime: new Date('2026-06-01T20:00:00.000Z').toISOString(),
    })

    // Add expense
    const { createdExpense, events: afterExpense } =
      await addMerchantEventExpense(createdEvent.id, {
        name: 'Pronájem stánku',
        amount: 1500,
      })

    assert.equal(createdExpense.name, 'Pronájem stánku')
    assert.equal(createdExpense.amount, 1500)
    assert.equal(afterExpense[0].expenses.length, 1)

    // Delete expense
    const afterDeleteExpense = await deleteMerchantEventExpense(
      createdEvent.id,
      createdExpense.id
    )
    assert.equal(afterDeleteExpense[0].expenses.length, 0)
  })

  it('records and persists sales', async () => {
    await initializeMerchantInstance({ name: 'Store' })

    const sale = {
      totalAmount: 180,
      paymentType: 'qr',
      items: [{ name: 'Položka A', price: 60, quantity: 3, total: 180 }],
      timestamp: Date.now(),
    }

    const { createdSale, sales } = await recordMerchantSale(sale)
    assert.equal(createdSale.totalAmount, 180)
    assert.equal(createdSale.paymentType, 'qr')
    assert.equal(sales.length, 1)

    const loaded = await loadMerchantData()
    assert.equal(loaded.sales.length, 1)
    assert.equal(loaded.sales[0].items[0].name, 'Položka A')
  })

  it('exports merchant backup as valid JSON structure with events and sales', async () => {
    await initializeMerchantInstance({
      name: 'Slunce',
      accountNumber: '19-1234567890',
      bankId: '0800',
      includeSampleProducts: false,
    })
    await saveMerchantProduct({ id: 'p1', name: 'Zboží 1', price: 100 })
    await addMerchantEvent({
      name: 'Akce A',
      startDateTime: new Date('2026-06-01T10:00:00.000Z').toISOString(),
      endDateTime: new Date('2026-06-01T20:00:00.000Z').toISOString(),
      expenses: [{ id: 'ex-1', name: 'Poplatek', amount: 500 }],
    })
    await recordMerchantSale({
      totalAmount: 100,
      paymentType: 'cash',
      items: [{ name: 'Zboží 1', price: 100, quantity: 1, total: 100 }],
      timestamp: Date.now(),
    })

    const { jsonString, filename, backup } = await exportMerchantBackup()

    assert.ok(jsonString.includes('Slunce'))
    assert.ok(jsonString.includes('Akce A'))
    assert.ok(jsonString.includes('Poplatek'))
    assert.ok(filename.endsWith('.json'))
    assert.equal(backup.schemaVersion, '2.0')
    assert.equal(backup.events.length, 1)
    assert.equal(backup.events[0].expenses.length, 1)
    assert.equal(backup.sales.length, 1)
  })

  it('imports merchant backup replacing existing state', async () => {
    await initializeMerchantInstance({ name: 'Old Shop' })

    const backupPayload = {
      schemaVersion: '2.0',
      merchant: {
        id: 'imported_123',
        name: 'Nový Importovaný Stánek',
        isInitialized: true,
      },
      settings: {
        businessName: 'Nový Importovaný Stánek',
        accountNumber: '20-9876543210',
        bankId: '0100',
        currency: 'CZK',
      },
      products: [
        { id: 'imp-1', name: 'Kniha', price: 250, script: '' },
        { id: 'imp-2', name: 'Sešit', price: 40, script: '' },
      ],
      events: [
        {
          id: 'ev-1',
          name: 'Veletrh',
          startDateTime: '2026-07-01T08:00:00.000Z',
          endDateTime: '2026-07-01T18:00:00.000Z',
          expenses: [{ id: 'ex-1', name: 'Nájem', amount: 2000 }],
        },
      ],
      sales: [
        {
          id: 's-1',
          totalAmount: 250,
          paymentType: 'qr',
          timestamp: new Date('2026-07-01T12:00:00.000Z').getTime(),
        },
      ],
    }

    const res = await importMerchantBackup(backupPayload)
    assert.equal(res.instance.name, 'Nový Importovaný Stánek')
    assert.equal(res.products.length, 2)
    assert.equal(res.events.length, 1)
    assert.equal(res.events[0].expenses.length, 1)
    assert.equal(res.sales.length, 1)

    const loaded = await loadMerchantData()
    assert.equal(loaded.instance.name, 'Nový Importovaný Stánek')
    assert.equal(loaded.products.length, 2)
    assert.equal(loaded.events.length, 1)
    assert.equal(loaded.sales.length, 1)
  })

  it('permanently deletes merchant instance and wipes storage including events and sales', async () => {
    await initializeMerchantInstance({
      name: 'Temp',
      includeSampleProducts: false,
    })
    await saveMerchantProduct({ id: 'p', name: 'Položka', price: 10 })
    await addMerchantEvent({
      name: 'Dočasná akce',
      startDateTime: '2026-08-01T10:00:00.000Z',
      endDateTime: '2026-08-01T20:00:00.000Z',
    })
    await recordMerchantSale({ totalAmount: 10, paymentType: 'cash' })

    await deleteMerchantInstance()

    const loaded = await loadMerchantData()
    assert.equal(loaded.instance, null)
    assert.equal(loaded.products.length, 0)
    assert.equal(loaded.events.length, 0)
    assert.equal(loaded.sales.length, 0)
  })
})
