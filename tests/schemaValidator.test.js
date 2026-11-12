import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateProduct,
  validateSettings,
  validateExpense,
  validateEvent,
  validateSale,
  validateBackupPayload,
} from '../src/services/storage/schemaValidator.js'

describe('schemaValidator', () => {
  describe('validateProduct', () => {
    it('accepts valid product', () => {
      const res = validateProduct({ name: 'Ruční výrobek', price: 50 })
      assert.equal(res.valid, true)
      assert.equal(res.product.name, 'Ruční výrobek')
      assert.equal(res.product.price, 50)
      assert.ok(res.product.id)
      assert.equal(res.product.script, '')
    })

    it('rejects product with missing or empty name', () => {
      const res = validateProduct({ name: '   ', price: 50 })
      assert.equal(res.valid, false)
      assert.match(res.error, /Název produktu/)
    })

    it('rejects product with invalid or negative price', () => {
      const res1 = validateProduct({ name: 'Test', price: -10 })
      assert.equal(res1.valid, false)

      const res2 = validateProduct({ name: 'Test', price: 'abc' })
      assert.equal(res2.valid, false)

      const res3 = validateProduct({ name: 'Test', price: 0 })
      assert.equal(res3.valid, false)
    })

    it('sanitizes script string and caps length', () => {
      const longScript = 'a'.repeat(5000)
      const res = validateProduct({
        name: 'Test',
        price: 10,
        script: longScript,
      })
      assert.equal(res.valid, true)
      assert.equal(res.product.script.length, 4000)
    })
  })

  describe('validateSettings', () => {
    it('accepts valid business name and empty bank info', () => {
      const res = validateSettings({ businessName: 'Můj Stánek' })
      assert.equal(res.valid, true)
      assert.equal(res.settings.businessName, 'Můj Stánek')
      assert.equal(res.settings.accountNumber, '')
      assert.equal(res.settings.bankId, '')
    })

    it('validates Czech bank account and 4-digit bankId', () => {
      const valid = validateSettings({
        businessName: 'Stánek',
        accountNumber: '19-1234567890',
        bankId: '0800',
      })
      assert.equal(valid.valid, true)

      const invalidAccount = validateSettings({
        businessName: 'Stánek',
        accountNumber: 'invalid-account!@#',
        bankId: '0800',
      })
      assert.equal(invalidAccount.valid, false)

      const invalidBankId = validateSettings({
        businessName: 'Stánek',
        accountNumber: '12345678',
        bankId: '80', // not 4 digits
      })
      assert.equal(invalidBankId.valid, false)
    })
  })

  describe('validateExpense', () => {
    it('accepts valid expense', () => {
      const res = validateExpense({ name: 'Pronájem stánku', amount: 1500 })
      assert.equal(res.valid, true)
      assert.equal(res.expense.name, 'Pronájem stánku')
      assert.equal(res.expense.amount, 1500)
      assert.ok(res.expense.id)
    })

    it('rejects expense with missing name or invalid amount', () => {
      const res1 = validateExpense({ name: '', amount: 100 })
      assert.equal(res1.valid, false)

      const res2 = validateExpense({ name: 'Test', amount: -50 })
      assert.equal(res2.valid, false)

      const res3 = validateExpense({ name: 'Test', amount: 0 })
      assert.equal(res3.valid, false)
    })
  })

  describe('validateEvent', () => {
    it('accepts valid event with optional expenses', () => {
      const res = validateEvent({
        name: 'Trh řemesel',
        startDateTime: '2026-11-12T10:00:00.000Z',
        endDateTime: '2026-11-12T20:00:00.000Z',
        expenses: [{ name: 'Stánek', amount: 1200 }],
      })
      assert.equal(res.valid, true)
      assert.equal(res.event.name, 'Trh řemesel')
      assert.equal(res.event.expenses.length, 1)
      assert.equal(res.event.expenses[0].name, 'Stánek')
      assert.equal(res.event.expenses[0].amount, 1200)
    })

    it('rejects event with missing name', () => {
      const res = validateEvent({
        name: '   ',
        startDateTime: '2026-11-12T10:00:00.000Z',
        endDateTime: '2026-11-12T20:00:00.000Z',
      })
      assert.equal(res.valid, false)
      assert.match(res.error, /Název události/)
    })

    it('rejects event when end date is before start date', () => {
      const res = validateEvent({
        name: 'Chybná akce',
        startDateTime: '2026-11-12T20:00:00.000Z',
        endDateTime: '2026-11-12T10:00:00.000Z',
      })
      assert.equal(res.valid, false)
      assert.match(res.error, /Konec události nesmí být dříve než začátek/)
    })
  })

  describe('validateSale', () => {
    it('accepts valid sale with items and payment type', () => {
      const res = validateSale({
        totalAmount: 150,
        paymentType: 'qr',
        items: [
          { name: 'Položka A', price: 65, quantity: 2, total: 130 },
          { name: 'Položka B', price: 20, quantity: 1, total: 20 },
        ],
        timestamp: 1731400000000,
      })
      assert.equal(res.valid, true)
      assert.equal(res.sale.totalAmount, 150)
      assert.equal(res.sale.paymentType, 'qr')
      assert.equal(res.sale.items.length, 2)
      assert.equal(res.sale.timestamp, 1731400000000)
    })

    it('rejects negative or NaN totalAmount', () => {
      const res = validateSale({ totalAmount: -50 })
      assert.equal(res.valid, false)
    })
  })

  describe('validateBackupPayload', () => {
    it('validates and normalizes complete backup payload including events and sales', () => {
      const payload = {
        version: '2.0',
        type: 'merchant_backup',
        exportedAt: '2026-11-11T12:00:00.000Z',
        merchant: { id: 'inst-1', name: 'Art Studio', createdAt: 123456 },
        settings: {
          businessName: 'Art Studio',
          accountNumber: '123456789',
          bankId: '0800',
        },
        products: [
          { id: 'p-1', name: 'Obraz', price: 1500, script: '' },
          { id: 'p-2', name: 'Plakát', price: 200, script: 'return price;' },
        ],
        events: [
          {
            id: 'e-1',
            name: 'Art Vernisáž',
            startDateTime: '2026-11-12T10:00:00.000Z',
            endDateTime: '2026-11-12T18:00:00.000Z',
            expenses: [{ name: 'Katalog', amount: 500 }],
          },
        ],
        sales: [
          {
            id: 's-1',
            totalAmount: 1500,
            paymentType: 'cash',
            timestamp: 1731410000000,
            items: [{ name: 'Obraz', price: 1500, quantity: 1, total: 1500 }],
          },
        ],
      }

      const res = validateBackupPayload(payload)
      assert.equal(res.valid, true)
      assert.equal(res.backup.settings.businessName, 'Art Studio')
      assert.equal(res.backup.products.length, 2)
      assert.equal(res.backup.events.length, 1)
      assert.equal(res.backup.events[0].name, 'Art Vernisáž')
      assert.equal(res.backup.events[0].expenses.length, 1)
      assert.equal(res.backup.sales.length, 1)
      assert.equal(res.backup.merchant.id, 'inst-1')
    })

    it('rejects backup with wrong type', () => {
      const payload = { type: 'unrelated_data' }
      const res = validateBackupPayload(payload)
      assert.equal(res.valid, false)
      assert.match(res.error, /není platnou zálohou/)
    })

    it('filters out corrupted items in product array', () => {
      const payload = {
        version: '2.0',
        settings: { businessName: 'Store' },
        products: [
          { name: 'Platný', price: 100 },
          { name: '', price: 100 }, // invalid
          null, // invalid
          { name: 'Neplatná cena', price: -5 }, // invalid
        ],
      }

      const res = validateBackupPayload(payload)
      assert.equal(res.valid, true)
      assert.equal(res.backup.products.length, 1)
      assert.equal(res.backup.products[0].name, 'Platný')
    })
  })
})
