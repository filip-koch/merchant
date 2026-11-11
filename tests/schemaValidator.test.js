import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateProduct,
  validateSettings,
  validateBackupPayload,
} from '../src/services/storage/schemaValidator.js'

describe('schemaValidator', () => {
  describe('validateProduct', () => {
    it('accepts valid product', () => {
      const res = validateProduct({ name: 'Espresso', price: 50 })
      assert.equal(res.valid, true)
      assert.equal(res.product.name, 'Espresso')
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
      const res = validateSettings({ businessName: 'Moje Kavárna' })
      assert.equal(res.valid, true)
      assert.equal(res.settings.businessName, 'Moje Kavárna')
      assert.equal(res.settings.accountNumber, '')
      assert.equal(res.settings.bankId, '')
    })

    it('validates Czech bank account and 4-digit bankId', () => {
      const valid = validateSettings({
        businessName: 'Kavárna',
        accountNumber: '19-1234567890',
        bankId: '0800',
      })
      assert.equal(valid.valid, true)

      const invalidAccount = validateSettings({
        businessName: 'Kavárna',
        accountNumber: 'invalid-account!@#',
        bankId: '0800',
      })
      assert.equal(invalidAccount.valid, false)

      const invalidBankId = validateSettings({
        businessName: 'Kavárna',
        accountNumber: '12345678',
        bankId: '80', // not 4 digits
      })
      assert.equal(invalidBankId.valid, false)
    })
  })

  describe('validateBackupPayload', () => {
    it('validates and normalizes complete backup payload', () => {
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
      }

      const res = validateBackupPayload(payload)
      assert.equal(res.valid, true)
      assert.equal(res.backup.settings.businessName, 'Art Studio')
      assert.equal(res.backup.products.length, 2)
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
