import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { translations } from '../src/i18n/translations.js'
import { validateSettings } from '../src/services/storage/schemaValidator.js'
import {
  formatDisplayDate,
  formatDisplayTime,
  calculateSalesSummary,
  categorizeSales,
} from '../src/utils/statisticsUtils.js'

describe('i18n translations & localization', () => {
  it('contains both Czech and English language dictionaries', () => {
    assert.ok(translations.cs)
    assert.ok(translations.en)
  })

  it('has matching key structures between cs and en dictionaries', () => {
    function getKeys(obj, prefix = '') {
      let keys = []
      for (const [key, val] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          keys = keys.concat(getKeys(val, fullKey))
        } else {
          keys.push(fullKey)
        }
      }
      return keys
    }

    const csKeys = getKeys(translations.cs).sort()
    const enKeys = getKeys(translations.en).sort()

    // Ensure all critical sections exist in both
    for (const key of csKeys) {
      assert.ok(
        enKeys.includes(key),
        `Missing English translation key for "${key}"`
      )
    }
  })

  it('validates settings with language selection', () => {
    const validCs = validateSettings({ businessName: 'Test', language: 'cs' })
    assert.equal(validCs.valid, true)
    assert.equal(validCs.settings.language, 'cs')

    const validEn = validateSettings({ businessName: 'Test', language: 'en' })
    assert.equal(validEn.valid, true)
    assert.equal(validEn.settings.language, 'en')

    const fallback = validateSettings({ businessName: 'Test', language: 'de' })
    assert.equal(fallback.valid, true)
    assert.equal(fallback.settings.language, 'cs')
  })

  it('formats dates and times according to selected language', () => {
    const testDate = new Date('2026-11-12T14:30:00Z')
    const csDate = formatDisplayDate(testDate, 'cs')
    const enDate = formatDisplayDate(testDate, 'en')

    assert.ok(csDate.length > 0)
    assert.ok(enDate.length > 0)

    const csTime = formatDisplayTime(testDate, 'cs')
    const enTime = formatDisplayTime(testDate, 'en')
    assert.ok(csTime.length >= 4)
    assert.ok(enTime.length >= 4)
  })

  it('uses bilingual item fallback names and uncategorized day formats in statistics', () => {
    const sale = {
      id: 's1',
      timestamp: '2026-11-12T10:00:00Z',
      totalAmount: 50,
      paymentType: 'cash',
      items: [{ quantity: 1, price: 50, total: 50 }],
    }

    const summaryCs = calculateSalesSummary([sale], 'cs')
    assert.equal(summaryCs.itemBreakdown[0].name, 'Neznámá položka')

    const summaryEn = calculateSalesSummary([sale], 'en')
    assert.equal(summaryEn.itemBreakdown[0].name, 'Unknown item')

    const resultEn = categorizeSales([sale], [], 'en')
    assert.equal(resultEn.uncategorizedDays.length, 1)
    assert.ok(resultEn.uncategorizedDays[0].displayDate.length > 0)
  })
})
