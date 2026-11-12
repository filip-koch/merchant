/**
 * Utility functions for events, sales categorization, and statistics calculations.
 */

/**
 * Formats a date/timestamp to display date string (Czech or English).
 *
 * @param {string|number|Date} dateVal
 * @param {'cs'|'en'} [lang='cs']
 * @returns {string}
 */
export function formatDisplayDate(dateVal, lang = 'cs') {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  const locale = lang === 'en' ? 'en-US' : 'cs-CZ'
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

/**
 * Formats a date/timestamp to local time string (e.g. '14:30').
 *
 * @param {string|number|Date} dateVal
 * @param {'cs'|'en'} [lang='cs']
 * @returns {string}
 */
export function formatDisplayTime(dateVal, lang = 'cs') {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  const locale = lang === 'en' ? 'en-US' : 'cs-CZ'
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Formats a date/timestamp to local date and time string (e.g. '12. 11. 2026 14:30').
 *
 * @param {string|number|Date} dateVal
 * @param {'cs'|'en'} [lang='cs']
 * @returns {string}
 */
export function formatDisplayDateTime(dateVal, lang = 'cs') {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  return `${formatDisplayDate(d, lang)} ${formatDisplayTime(d, lang)}`
}

/**
 * Converts a date/timestamp to 'YYYY-MM-DDTHH:mm' format for <input type="datetime-local" />.
 * Uses local timezone values.
 *
 * @param {string|number|Date} [dateVal]
 * @returns {string}
 */
export function toDatetimeLocalValue(dateVal) {
  const d = dateVal ? new Date(dateVal) : new Date()
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Returns 'YYYY-MM-DD' representing local calendar day.
 *
 * @param {string|number|Date} dateVal
 * @returns {string}
 */
export function getLocalDateKey(dateVal) {
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return 'unknown-date'
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Computes event lifecycle status: 'active' | 'upcoming' | 'ended'.
 *
 * @param {{ startDateTime: string, endDateTime: string }} event
 * @param {number} [now]
 * @returns {'active'|'upcoming'|'ended'}
 */
export function getEventStatus(event, now = Date.now()) {
  const start = new Date(event.startDateTime).getTime()
  const end = new Date(event.endDateTime).getTime()
  if (now < start) return 'upcoming'
  if (now > end) return 'ended'
  return 'active'
}

/**
 * Computes the total sum of expenses for an event.
 *
 * @param {Array<object>} expenses
 * @returns {number}
 */
export function calculateEventExpenses(expenses = []) {
  if (!Array.isArray(expenses)) return 0
  const sum = expenses.reduce(
    (total, exp) => total + (Number(exp.amount) || 0),
    0
  )
  return Math.round(sum * 100) / 100
}

/**
 * Computes summary aggregations for a list of sales.
 *
 * @param {Array<object>} sales
 * @param {'cs'|'en'} [lang='cs']
 * @returns {{
 *   totalRevenue: number,
 *   salesCount: number,
 *   cashTotal: number,
 *   cashCount: number,
 *   qrTotal: number,
 *   qrCount: number,
 *   itemBreakdown: Array<{ name: string, quantity: number, total: number }>
 * }}
 */
export function calculateSalesSummary(sales = [], lang = 'cs') {
  let totalRevenue = 0
  let cashTotal = 0
  let cashCount = 0
  let qrTotal = 0
  let qrCount = 0
  const itemMap = new Map()

  for (const sale of sales) {
    const amount = Number(sale.totalAmount) || 0
    totalRevenue += amount

    if (sale.paymentType === 'qr') {
      qrTotal += amount
      qrCount += 1
    } else {
      cashTotal += amount
      cashCount += 1
    }

    if (Array.isArray(sale.items)) {
      for (const it of sale.items) {
        const name =
          it.name || (lang === 'en' ? 'Unknown item' : 'Neznámá položka')
        const qty = Number(it.quantity) || 1
        const total =
          typeof it.total === 'number'
            ? it.total
            : (Number(it.price) || 0) * qty

        const existing = itemMap.get(name) || { name, quantity: 0, total: 0 }
        existing.quantity += qty
        existing.total += total
        itemMap.set(name, existing)
      }
    }
  }

  const itemBreakdown = Array.from(itemMap.values()).sort(
    (a, b) => b.quantity - a.quantity
  )

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    salesCount: sales.length,
    cashTotal: Math.round(cashTotal * 100) / 100,
    cashCount,
    qrTotal: Math.round(qrTotal * 100) / 100,
    qrCount,
    itemBreakdown,
  }
}

/**
 * Groups and categorizes all sales into events and uncategorized day categories.
 * Dynamically computes revenue, expenses, and net profit for each event and overall.
 *
 * @param {Array<object>} sales
 * @param {Array<object>} events
 * @param {'cs'|'en'|number} [langOrNow='cs']
 * @param {number|'cs'|'en'} [optionalParam]
 * @returns {{
 *   overall: {
 *     totalRevenue: number,
 *     totalExpenses: number,
 *     netProfit: number,
 *     profitMargin: number,
 *     salesCount: number,
 *     cashTotal: number,
 *     cashCount: number,
 *     qrTotal: number,
 *     qrCount: number,
 *     itemBreakdown: Array<object>
 *   },
 *   events: Array<{
 *     event: object,
 *     status: 'active'|'upcoming'|'ended',
 *     sales: Array<object>,
 *     summary: {
 *       totalRevenue: number,
 *       totalExpenses: number,
 *       netProfit: number,
 *       profitMargin: number,
 *       expenses: Array<object>,
 *       salesCount: number,
 *       cashTotal: number,
 *       cashCount: number,
 *       qrTotal: number,
 *       qrCount: number,
 *       itemBreakdown: Array<object>
 *     }
 *   }>,
 *   uncategorizedDays: Array<{
 *     dateKey: string,
 *     displayDate: string,
 *     sales: Array<object>,
 *     summary: object
 *   }>,
 *   allSalesSorted: Array<object>
 * }}
 */
export function categorizeSales(
  sales = [],
  events = [],
  langOrNow = 'cs',
  optionalParam
) {
  let lang = 'cs'
  let now = Date.now()

  if (typeof langOrNow === 'string') {
    lang = langOrNow
    if (typeof optionalParam === 'number') {
      now = optionalParam
    }
  } else if (typeof langOrNow === 'number') {
    now = langOrNow
    if (typeof optionalParam === 'string') {
      lang = optionalParam
    }
  }

  const allSalesSorted = [...sales].sort((a, b) => {
    const timeA = new Date(a.timestamp || a.date).getTime()
    const timeB = new Date(b.timestamp || b.date).getTime()
    return timeB - timeA
  })

  // Prepare events map and sorted event list
  const parsedEvents = events.map((event) => {
    const startTime = new Date(event.startDateTime).getTime()
    const endTime = new Date(event.endDateTime).getTime()
    return {
      event,
      startTime,
      endTime,
      status: getEventStatus(event, now),
      sales: [],
    }
  })

  const uncategorizedSales = []

  for (const sale of allSalesSorted) {
    const saleTime = new Date(sale.timestamp || sale.date).getTime()
    let matchedEvent = null

    for (const evt of parsedEvents) {
      if (saleTime >= evt.startTime && saleTime <= evt.endTime) {
        matchedEvent = evt
        break
      }
    }

    if (matchedEvent) {
      matchedEvent.sales.push(sale)
    } else {
      uncategorizedSales.push(sale)
    }
  }

  // Calculate summaries and dynamic profits for events
  const categorizedEvents = parsedEvents.map((evt) => {
    const salesSummary = calculateSalesSummary(evt.sales, lang)
    const expenses = Array.isArray(evt.event.expenses) ? evt.event.expenses : []
    const totalExpenses = calculateEventExpenses(expenses)
    const netProfit =
      Math.round((salesSummary.totalRevenue - totalExpenses) * 100) / 100
    const profitMargin =
      salesSummary.totalRevenue > 0
        ? Math.round((netProfit / salesSummary.totalRevenue) * 1000) / 10
        : 0

    return {
      event: evt.event,
      status: evt.status,
      sales: evt.sales,
      summary: {
        ...salesSummary,
        expenses,
        totalExpenses,
        netProfit,
        profitMargin,
      },
    }
  })

  // Group uncategorized sales by local date
  const dayMap = new Map()
  for (const sale of uncategorizedSales) {
    const saleTime = new Date(sale.timestamp || sale.date).getTime()
    const dateKey = getLocalDateKey(saleTime)
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        dateKey,
        displayDate: formatDisplayDate(saleTime, lang),
        sales: [],
      })
    }
    dayMap.get(dateKey).sales.push(sale)
  }

  // Sort uncategorized days by date descending
  const uncategorizedDays = Array.from(dayMap.values())
    .sort((a, b) => (a.dateKey > b.dateKey ? -1 : 1))
    .map((day) => ({
      ...day,
      summary: calculateSalesSummary(day.sales, lang),
    }))

  const overallSales = calculateSalesSummary(allSalesSorted, lang)
  const overallExpenses = categorizedEvents.reduce(
    (sum, evt) => sum + evt.summary.totalExpenses,
    0
  )
  const overallNetProfit =
    Math.round((overallSales.totalRevenue - overallExpenses) * 100) / 100
  const overallProfitMargin =
    overallSales.totalRevenue > 0
      ? Math.round((overallNetProfit / overallSales.totalRevenue) * 1000) / 10
      : 0

  const overall = {
    ...overallSales,
    totalExpenses: Math.round(overallExpenses * 100) / 100,
    netProfit: overallNetProfit,
    profitMargin: overallProfitMargin,
  }

  return {
    overall,
    events: categorizedEvents,
    uncategorizedDays,
    allSalesSorted,
  }
}
