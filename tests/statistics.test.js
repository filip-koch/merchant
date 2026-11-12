import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatDisplayDate,
  formatDisplayTime,
  formatDisplayDateTime,
  toDatetimeLocalValue,
  getLocalDateKey,
  getEventStatus,
  calculateEventExpenses,
  calculateSalesSummary,
  categorizeSales,
} from '../src/utils/statisticsUtils.js'

describe('statisticsUtils', () => {
  describe('date and time formatting', () => {
    it('formats date and time in Czech locale', () => {
      // Use an explicit UTC timestamp
      const date = new Date('2026-11-12T14:30:00Z')
      const displayDate = formatDisplayDate(date)
      assert.ok(displayDate.includes('12'))
      assert.ok(displayDate.includes('11'))
      assert.ok(displayDate.includes('2026'))

      const displayTime = formatDisplayTime(date)
      assert.ok(displayTime.length >= 4)

      const displayDateTime = formatDisplayDateTime(date)
      assert.ok(displayDateTime.includes('12'))
    })

    it('converts date to input datetime-local value', () => {
      const d = new Date(2026, 10, 12, 9, 15) // Month is 0-indexed: 10 is November
      const val = toDatetimeLocalValue(d)
      assert.equal(val, '2026-11-12T09:15')
    })

    it('returns local calendar day key', () => {
      const d = new Date(2026, 10, 12, 18, 0)
      const key = getLocalDateKey(d)
      assert.equal(key, '2026-11-12')
    })
  })

  describe('getEventStatus', () => {
    const event = {
      startDateTime: '2026-11-12T10:00:00.000Z',
      endDateTime: '2026-11-12T18:00:00.000Z',
    }

    it('identifies upcoming event', () => {
      const now = new Date('2026-11-12T08:00:00.000Z').getTime()
      assert.equal(getEventStatus(event, now), 'upcoming')
    })

    it('identifies active event', () => {
      const now = new Date('2026-11-12T12:00:00.000Z').getTime()
      assert.equal(getEventStatus(event, now), 'active')
    })

    it('identifies ended event', () => {
      const now = new Date('2026-11-12T19:00:00.000Z').getTime()
      assert.equal(getEventStatus(event, now), 'ended')
    })
  })

  describe('calculateEventExpenses', () => {
    it('sums up all expenses accurately', () => {
      const expenses = [
        { name: 'Stánek', amount: 1500 },
        { name: 'Doprava', amount: 450.5 },
        { name: 'Suroviny', amount: 200.25 },
      ]
      assert.equal(calculateEventExpenses(expenses), 2150.75)
    })

    it('handles empty or non-array inputs gracefully', () => {
      assert.equal(calculateEventExpenses([]), 0)
      assert.equal(calculateEventExpenses(null), 0)
    })
  })

  describe('calculateSalesSummary', () => {
    it('aggregates revenue, counts, and items sold breakdown', () => {
      const sales = [
        {
          totalAmount: 100,
          paymentType: 'cash',
          items: [{ name: 'Káva', quantity: 2, price: 50, total: 100 }],
        },
        {
          totalAmount: 150,
          paymentType: 'qr',
          items: [
            { name: 'Káva', quantity: 1, price: 50, total: 50 },
            { name: 'Dort', quantity: 1, price: 100, total: 100 },
          ],
        },
      ]

      const summary = calculateSalesSummary(sales)
      assert.equal(summary.totalRevenue, 250)
      assert.equal(summary.salesCount, 2)
      assert.equal(summary.cashTotal, 100)
      assert.equal(summary.cashCount, 1)
      assert.equal(summary.qrTotal, 150)
      assert.equal(summary.qrCount, 1)
      assert.equal(summary.itemBreakdown.length, 2)
      // Káva: 3 sold
      const kava = summary.itemBreakdown.find((i) => i.name === 'Káva')
      assert.equal(kava.quantity, 3)
      assert.equal(kava.total, 150)
    })
  })

  describe('categorizeSales', () => {
    it('categorizes sales during event into event, and sales outside into uncategorized by day', () => {
      const event1 = {
        id: 'event-fest',
        name: 'Gastro Festival',
        startDateTime: '2026-11-12T12:00:00.000Z',
        endDateTime: '2026-11-12T20:00:00.000Z',
        expenses: [
          { name: 'Nájem', amount: 50 },
          { name: 'Benzín', amount: 30 },
        ],
      }

      const sales = [
        // Morning sale on Nov 12 before event -> Uncategorized on 2026-11-12
        {
          id: 's-1',
          totalAmount: 80,
          paymentType: 'cash',
          timestamp: new Date('2026-11-12T10:00:00.000Z').getTime(),
          items: [{ name: 'Limonáda', quantity: 1, price: 80, total: 80 }],
        },
        // Afternoon sale on Nov 12 during event -> Categorized to Gastro Festival
        {
          id: 's-2',
          totalAmount: 200,
          paymentType: 'qr',
          timestamp: new Date('2026-11-12T14:30:00.000Z').getTime(),
          items: [{ name: 'Burger', quantity: 1, price: 200, total: 200 }],
        },
        // Evening sale on Nov 11 outside any event -> Uncategorized on 2026-11-11
        {
          id: 's-3',
          totalAmount: 120,
          paymentType: 'cash',
          timestamp: new Date('2026-11-11T16:00:00.000Z').getTime(),
          items: [{ name: 'Pivo', quantity: 2, price: 60, total: 120 }],
        },
      ]

      const res = categorizeSales(sales, [event1])

      // Total overall: revenue 400, expenses 80, profit 320
      assert.equal(res.overall.totalRevenue, 400)
      assert.equal(res.overall.totalExpenses, 80)
      assert.equal(res.overall.netProfit, 320)
      assert.equal(res.overall.profitMargin, 80) // (320 / 400) * 100
      assert.equal(res.overall.salesCount, 3)

      // Event categorization & profits
      assert.equal(res.events.length, 1)
      assert.equal(res.events[0].event.name, 'Gastro Festival')
      assert.equal(res.events[0].sales.length, 1)
      assert.equal(res.events[0].sales[0].id, 's-2')
      assert.equal(res.events[0].summary.totalRevenue, 200)
      assert.equal(res.events[0].summary.totalExpenses, 80)
      assert.equal(res.events[0].summary.netProfit, 120) // 200 - 80 = 120
      assert.equal(res.events[0].summary.profitMargin, 60) // 120/200 = 60%

      // Uncategorized categorization
      // Should have 2 uncategorized day categories labeled with date of the day
      assert.equal(res.uncategorizedDays.length, 2)

      const nov12 = res.uncategorizedDays.find((d) =>
        d.sales.some((s) => s.id === 's-1')
      )
      assert.ok(nov12)
      assert.equal(nov12.sales.length, 1)
      assert.equal(nov12.summary.totalRevenue, 80)
      assert.ok(nov12.displayDate.includes('12'))

      const nov11 = res.uncategorizedDays.find((d) =>
        d.sales.some((s) => s.id === 's-3')
      )
      assert.ok(nov11)
      assert.equal(nov11.sales.length, 1)
      assert.equal(nov11.summary.totalRevenue, 120)
      assert.ok(nov11.displayDate.includes('11'))
    })

    it('dynamically computes accurate loss when event expenses exceed sales', () => {
      const eventWithLoss = {
        id: 'e-loss',
        name: 'Trh v dešti',
        startDateTime: '2026-11-12T08:00:00.000Z',
        endDateTime: '2026-11-12T18:00:00.000Z',
        expenses: [{ name: 'Poplatek', amount: 1000 }],
      }

      const sales = [
        {
          id: 's-low',
          totalAmount: 300,
          paymentType: 'cash',
          timestamp: new Date('2026-11-12T10:00:00.000Z').getTime(),
          items: [{ name: 'Káva', quantity: 5, price: 60, total: 300 }],
        },
      ]

      const res = categorizeSales(sales, [eventWithLoss])
      assert.equal(res.events[0].summary.totalRevenue, 300)
      assert.equal(res.events[0].summary.totalExpenses, 1000)
      assert.equal(res.events[0].summary.netProfit, -700)
      assert.ok(res.events[0].summary.profitMargin < 0)
    })
  })
})
