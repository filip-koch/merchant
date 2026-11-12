import { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { useMerchant } from '../../context/useMerchant.js'
import { useI18n } from '../../i18n/useI18n.js'
import EventModal from './EventModal.jsx'
import ExpenseModal from './ExpenseModal.jsx'
import { categorizeSales } from '../../utils/statisticsUtils.js'
import { triggerHaptic } from '../../utils/paymentUtils.js'

export default function StatisticsScreen({ onClose }) {
  const {
    events,
    sales,
    addEvent,
    updateEvent,
    deleteEvent,
    addEventExpense,
    deleteEventExpense,
  } = useMerchant()

  const {
    t,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatTime,
    language,
  } = useI18n()

  // Tab state: { type: 'overview' } | { type: 'event', id: string } | { type: 'uncategorized', dateKey: string }
  const [activeTab, setActiveTab] = useState({ type: 'overview' })

  // Modal states
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [eventToEdit, setEventToEdit] = useState(null)
  const [eventToDelete, setEventToDelete] = useState(null)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)

  // Categorize sales across all events and uncategorized days using current language
  const categorizedData = useMemo(() => {
    return categorizeSales(sales, events, language)
  }, [sales, events, language])

  const handleTabChange = (tab) => {
    triggerHaptic(10)
    setActiveTab(tab)
  }

  const handleOpenAddEvent = () => {
    triggerHaptic(15)
    setEventToEdit(null)
    setIsEventModalOpen(true)
  }

  const handleOpenEditEvent = (event) => {
    triggerHaptic(15)
    setEventToEdit(event)
    setIsEventModalOpen(true)
  }

  const handleSaveEvent = async (eventData) => {
    if (eventToEdit) {
      await updateEvent(eventToEdit.id, eventData)
    } else {
      const created = await addEvent(eventData)
      setActiveTab({ type: 'event', id: created.id })
    }
  }

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return
    triggerHaptic([60, 50, 60])
    await deleteEvent(eventToDelete.id)
    setEventToDelete(null)
    setActiveTab({ type: 'overview' })
  }

  const handleSaveExpense = async (expenseData) => {
    if (activeTab.type !== 'event') return
    await addEventExpense(activeTab.id, expenseData)
  }

  const handleDeleteExpense = async (expenseId) => {
    if (activeTab.type !== 'event') return
    triggerHaptic([30, 40, 30])
    await deleteEventExpense(activeTab.id, expenseId)
  }

  // Active view data resolution
  const activeEventData = useMemo(() => {
    if (activeTab.type !== 'event') return null
    return (
      categorizedData.events.find((e) => e.event.id === activeTab.id) || null
    )
  }, [activeTab, categorizedData])

  const activeUncategorizedData = useMemo(() => {
    if (activeTab.type !== 'uncategorized') return null
    return (
      categorizedData.uncategorizedDays.find(
        (d) => d.dateKey === activeTab.dateKey
      ) || null
    )
  }, [activeTab, categorizedData])

  const getStatusLabel = (status) => {
    if (status === 'active') return t('statistics.statusActive')
    if (status === 'upcoming') return t('statistics.statusUpcoming')
    return t('statistics.statusEnded')
  }

  return (
    <div className="fixed inset-0 bg-zinc-50 z-[100] flex flex-col overflow-hidden animate-slide-up select-none">
      {/* APP BAR / HEADER */}
      <header className="flex justify-between items-center bg-white border-b border-zinc-200/80 px-4 sm:px-6 py-3.5 safe-top shrink-0">
        <div className="flex items-center gap-2">
          {activeTab.type === 'overview' ? (
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-full transition-all active:scale-95 cursor-pointer"
              aria-label={t('statistics.backToRegister')}
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <button
              onClick={() => handleTabChange({ type: 'overview' })}
              className="p-2 -ml-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-full transition-all active:scale-95 cursor-pointer"
              aria-label={t('statistics.backToOverview')}
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
            {activeTab.type === 'overview' && t('statistics.title')}
            {activeTab.type === 'event' &&
              (activeEventData?.event?.name || t('statistics.eventDetail'))}
            {activeTab.type === 'uncategorized' &&
              (activeUncategorizedData?.displayDate ||
                t('statistics.uncategorized'))}
          </h2>
        </div>

        <button
          onClick={handleOpenAddEvent}
          className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-full py-2 px-3.5 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>{t('statistics.newEvent')}</span>
        </button>
      </header>

      {/* FILTER CHIPS / PILL BAR (Google / Banking Style) */}
      <div className="bg-white border-b border-zinc-200/80 px-4 py-2 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleTabChange({ type: 'overview' })}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
            activeTab.type === 'overview'
              ? 'bg-zinc-900 text-white font-semibold shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
          }`}
        >
          {t('statistics.tabOverview')}
        </button>

        {categorizedData.events.map(({ event, status }) => {
          const isActive =
            activeTab.type === 'event' && activeTab.id === event.id

          return (
            <button
              key={event.id}
              type="button"
              onClick={() => handleTabChange({ type: 'event', id: event.id })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200/70'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isActive
                    ? 'bg-white'
                    : status === 'active'
                      ? 'bg-emerald-500'
                      : status === 'upcoming'
                        ? 'bg-blue-500'
                        : 'bg-zinc-400'
                }`}
              />
              <span className="max-w-[130px] truncate">{event.name}</span>
            </button>
          )
        })}

        {categorizedData.uncategorizedDays.map((day) => {
          const isActive =
            activeTab.type === 'uncategorized' &&
            activeTab.dateKey === day.dateKey

          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() =>
                handleTabChange({
                  type: 'uncategorized',
                  dateKey: day.dateKey,
                })
              }
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
              }`}
            >
              <Calendar
                size={11}
                className={isActive ? 'text-white' : 'text-zinc-400'}
              />
              <span>{day.displayDate}</span>
            </button>
          )
        })}
      </div>

      {/* BODY VIEW */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 no-scrollbar max-w-2xl mx-auto w-full pb-safe">
        {/* OVERVIEW VIEW */}
        {activeTab.type === 'overview' && (
          <div className="space-y-6">
            {/* HERO BALANCE / PROFIT CARD (Banking aesthetic) */}
            <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs">
              <span className="text-xs font-medium text-zinc-500 block text-center">
                {t('statistics.overallNetProfit')}
              </span>
              <div
                className={`text-3xl sm:text-4xl font-semibold tracking-tight font-mono text-center mt-1.5 ${
                  categorizedData.overall.netProfit >= 0
                    ? 'text-zinc-900'
                    : 'text-rose-600'
                }`}
              >
                {categorizedData.overall.netProfit >= 0 ? '+' : ''}
                {formatCurrency(categorizedData.overall.netProfit)}
              </div>

              {/* Financial metrics strip */}
              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-zinc-100 text-center">
                <div>
                  <span className="text-[11px] text-zinc-400 block font-normal">
                    {t('statistics.revenue')}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold font-mono text-zinc-800 mt-0.5 block">
                    {formatCurrency(categorizedData.overall.totalRevenue)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block font-normal">
                    {t('statistics.expenses')}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold font-mono text-rose-600 mt-0.5 block">
                    {formatCurrency(categorizedData.overall.totalExpenses)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block font-normal">
                    {t('statistics.profitMargin')}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold font-mono text-zinc-800 mt-0.5 block">
                    {categorizedData.overall.profitMargin} %
                  </span>
                </div>
              </div>

              {/* Payment methods line */}
              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 px-1">
                <span>
                  {t('statistics.cash')}:{' '}
                  <strong className="font-semibold text-zinc-700 font-mono">
                    {formatCurrency(categorizedData.overall.cashTotal)}
                  </strong>
                </span>
                <span className="text-zinc-300">•</span>
                <span>
                  {t('statistics.qr')}:{' '}
                  <strong className="font-semibold text-zinc-700 font-mono">
                    {formatCurrency(categorizedData.overall.qrTotal)}
                  </strong>
                </span>
                <span className="text-zinc-300">•</span>
                <span>
                  {t('statistics.salesCountSuffix', {
                    count: categorizedData.overall.salesCount,
                  })}
                </span>
              </div>
            </div>

            {/* EVENTS SECTION (Flat grouped list) */}
            <div>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {t('statistics.eventsCount', { count: events.length })}
                </h3>
                <button
                  onClick={handleOpenAddEvent}
                  className="text-xs font-semibold text-zinc-800 hover:text-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>{t('statistics.add')}</span>
                </button>
              </div>

              {categorizedData.events.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-2xl bg-white border border-zinc-200/80">
                  <p className="text-xs font-medium text-zinc-600">
                    {t('statistics.noEvents')}
                  </p>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1">
                    {t('statistics.noEventsDesc')}
                  </p>
                  <button
                    onClick={handleOpenAddEvent}
                    className="mt-3.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all cursor-pointer"
                  >
                    {t('statistics.createEvent')}
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-zinc-200/80 divide-y divide-zinc-100 overflow-hidden shadow-xs">
                  {categorizedData.events.map(({ event, status, summary }) => (
                    <div
                      key={event.id}
                      onClick={() =>
                        handleTabChange({ type: 'event', id: event.id })
                      }
                      className="p-3.5 sm:p-4 hover:bg-zinc-50/70 active:bg-zinc-100/60 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            status === 'active'
                              ? 'bg-emerald-500'
                              : status === 'upcoming'
                                ? 'bg-blue-500'
                                : 'bg-zinc-300'
                          }`}
                          title={getStatusLabel(status)}
                        />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-zinc-900 truncate">
                            {event.name}
                          </h4>
                          <span className="text-xs text-zinc-400 block truncate">
                            {formatDate(event.startDateTime)} –{' '}
                            {formatDate(event.endDateTime)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 text-right">
                        <div>
                          <span
                            className={`text-sm font-mono font-semibold block ${
                              summary.netProfit >= 0
                                ? 'text-zinc-900'
                                : 'text-rose-600'
                            }`}
                          >
                            {summary.netProfit >= 0 ? '+' : ''}
                            {formatCurrency(summary.netProfit)}
                          </span>
                          <span className="text-[11px] text-zinc-400 block">
                            {t('statistics.salesCountSuffix', {
                              count: summary.salesCount,
                            })}
                          </span>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-zinc-300 group-hover:text-zinc-500 transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* UNCATEGORIZED DAYS SECTION (Flat grouped list) */}
            {categorizedData.uncategorizedDays.length > 0 && (
              <div>
                <div className="mb-2.5 px-1">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {t('statistics.uncategorizedDaysCount', {
                      count: categorizedData.uncategorizedDays.length,
                    })}
                  </h3>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200/80 divide-y divide-zinc-100 overflow-hidden shadow-xs">
                  {categorizedData.uncategorizedDays.map((day) => (
                    <div
                      key={day.dateKey}
                      onClick={() =>
                        handleTabChange({
                          type: 'uncategorized',
                          dateKey: day.dateKey,
                        })
                      }
                      className="p-3.5 sm:p-4 hover:bg-zinc-50/70 active:bg-zinc-100/60 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                          <Calendar size={14} />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-zinc-900 block">
                            {day.displayDate}
                          </span>
                          <span className="text-xs text-zinc-400 block">
                            {t('statistics.salesCountOutsideEvent', {
                              count: day.sales.length,
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 text-right">
                        <span className="text-sm font-mono font-semibold text-zinc-900">
                          {formatCurrency(day.summary.totalRevenue)}
                        </span>
                        <ChevronRight
                          size={16}
                          className="text-zinc-300 group-hover:text-zinc-500 transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TOP SELLING PRODUCTS */}
            {categorizedData.overall.itemBreakdown.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 px-1">
                  {t('statistics.itemsByRevenue')}
                </h3>

                <div className="bg-white rounded-2xl border border-zinc-200/80 divide-y divide-zinc-100 overflow-hidden shadow-xs">
                  {categorizedData.overall.itemBreakdown.map((item) => (
                    <div
                      key={item.name}
                      className="p-3.5 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-zinc-400 font-medium shrink-0">
                          {item.quantity}×
                        </span>
                        <span className="font-medium text-zinc-900 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-zinc-900 shrink-0">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RECENT SALES */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 px-1">
                {t('statistics.recentSalesCount', {
                  count: categorizedData.allSalesSorted.length,
                })}
              </h3>

              {categorizedData.allSalesSorted.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs bg-white rounded-2xl border border-zinc-200/80">
                  {t('statistics.noSalesCompleted')}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-zinc-200/80 divide-y divide-zinc-100 overflow-hidden shadow-xs">
                  {categorizedData.allSalesSorted.slice(0, 30).map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3.5 flex items-start justify-between text-xs gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-zinc-400 text-[11px]">
                            {formatDateTime(sale.timestamp || sale.date)}
                          </span>
                          <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {sale.paymentType === 'qr'
                              ? t('statistics.qr')
                              : t('statistics.cash')}
                          </span>
                        </div>
                        <p className="text-zinc-600 text-xs truncate">
                          {sale.items?.length > 0
                            ? sale.items
                                .map((it) => `${it.quantity}× ${it.name}`)
                                .join(', ')
                            : t('statistics.purchase')}
                        </p>
                      </div>

                      <span className="font-mono font-semibold text-sm text-zinc-900 shrink-0">
                        {formatCurrency(sale.totalAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EVENT DETAILS VIEW */}
        {activeTab.type === 'event' && activeEventData && (
          <div className="space-y-6 animate-fade-in">
            {/* Event Header Card */}
            <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 text-xs">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        activeEventData.status === 'active'
                          ? 'bg-emerald-500'
                          : activeEventData.status === 'upcoming'
                            ? 'bg-blue-500'
                            : 'bg-zinc-400'
                      }`}
                    />
                    <span className="text-zinc-500 font-medium">
                      {getStatusLabel(activeEventData.status)}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-zinc-900 tracking-tight truncate">
                    {activeEventData.event.name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                    <Clock size={12} />
                    <span>
                      {formatDateTime(activeEventData.event.startDateTime)} –{' '}
                      {formatDateTime(activeEventData.event.endDateTime)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEditEvent(activeEventData.event)}
                    className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                    title={t('statistics.editEventTooltip')}
                    aria-label={t('statistics.editEventTooltip')}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setEventToDelete(activeEventData.event)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title={t('statistics.deleteEventTooltip')}
                    aria-label={t('statistics.deleteEventTooltip')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Dynamic Financial Overview */}
              <div className="mt-5 pt-4 border-t border-zinc-100">
                <span className="text-xs font-medium text-zinc-500 block text-center">
                  {t('statistics.eventNetProfit')}
                </span>
                <div
                  className={`text-2xl sm:text-3xl font-semibold tracking-tight font-mono text-center mt-1 ${
                    activeEventData.summary.netProfit >= 0
                      ? 'text-zinc-900'
                      : 'text-rose-600'
                  }`}
                >
                  {activeEventData.summary.netProfit >= 0 ? '+' : ''}
                  {formatCurrency(activeEventData.summary.netProfit)}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-100 text-center">
                  <div>
                    <span className="text-[11px] text-zinc-400 block font-normal">
                      {t('statistics.eventRevenue')}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold font-mono text-zinc-800 mt-0.5 block">
                      {formatCurrency(activeEventData.summary.totalRevenue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 block font-normal">
                      {t('statistics.expenses')}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold font-mono text-rose-600 mt-0.5 block">
                      {formatCurrency(activeEventData.summary.totalExpenses)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 block font-normal">
                      {t('statistics.margin')}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold font-mono text-zinc-800 mt-0.5 block">
                      {activeEventData.summary.profitMargin} %
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 px-1">
                  <span>
                    {t('statistics.cash')}:{' '}
                    <strong className="font-semibold text-zinc-700 font-mono">
                      {formatCurrency(activeEventData.summary.cashTotal)}
                    </strong>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span>
                    {t('statistics.qrShort')}:{' '}
                    <strong className="font-semibold text-zinc-700 font-mono">
                      {formatCurrency(activeEventData.summary.qrTotal)}
                    </strong>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span>
                    {t('statistics.salesCountSuffix', {
                      count: activeEventData.summary.salesCount,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* EVENT EXPENSES SECTION */}
            <div>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {t('statistics.eventExpenses', {
                    count: activeEventData.summary.expenses.length,
                  })}
                </h4>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="text-xs font-semibold text-zinc-800 hover:text-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>{t('statistics.addExpense')}</span>
                </button>
              </div>

              {activeEventData.summary.expenses.length === 0 ? (
                <div className="py-6 px-4 text-center rounded-2xl bg-white border border-zinc-200/80 text-xs text-zinc-400">
                  {t('statistics.noExpenses')}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-zinc-200/80 divide-y divide-zinc-100 overflow-hidden shadow-xs">
                  {activeEventData.summary.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="p-3.5 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-zinc-900 block text-xs truncate">
                          {expense.name}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {formatDate(expense.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono font-semibold text-rose-600">
                          -{formatCurrency(expense.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={t('statistics.deleteExpenseTooltip')}
                          aria-label={t('statistics.deleteExpenseTooltip')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Event Items Breakdown */}
            {activeEventData.summary.itemBreakdown.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 px-1">
                  {t('statistics.itemsSold')}
                </h4>

                <div className="bg-white rounded-2xl border border-zinc-200/80 divide-y divide-zinc-100 overflow-hidden shadow-xs">
                  {activeEventData.summary.itemBreakdown.map((item) => (
                    <div
                      key={item.name}
                      className="p-3.5 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-zinc-400 font-medium shrink-0">
                          {item.quantity}×
                        </span>
                        <span className="font-medium text-zinc-900 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-zinc-900 shrink-0">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event Sales List */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 px-1">
                {t('statistics.salesListCount', {
                  count: activeEventData.sales.length,
                })}
              </h4>

              {activeEventData.sales.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-2xl bg-white border border-zinc-200/80 text-xs text-zinc-400">
                  {t('statistics.noEventSales')}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-zinc-200/80 divide-y divide-zinc-100 overflow-hidden shadow-xs">
                  {activeEventData.sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3.5 flex items-start justify-between text-xs gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-zinc-400 text-[11px]">
                            {formatDateTime(sale.timestamp || sale.date)}
                          </span>
                          <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {sale.paymentType === 'qr'
                              ? t('statistics.qr')
                              : t('statistics.cash')}
                          </span>
                        </div>
                        <p className="text-zinc-600 text-xs truncate">
                          {sale.items?.length > 0
                            ? sale.items
                                .map((it) => `${it.quantity}× ${it.name}`)
                                .join(', ')
                            : t('statistics.purchase')}
                        </p>
                      </div>

                      <span className="font-mono font-semibold text-sm text-zinc-900 shrink-0">
                        {formatCurrency(sale.totalAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* UNCATEGORIZED DAY DETAILS VIEW */}
        {activeTab.type === 'uncategorized' && activeUncategorizedData && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs">
              <span className="text-xs text-zinc-400 block font-medium">
                {t('statistics.uncategorizedSales')}
              </span>
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight mt-0.5">
                {activeUncategorizedData.displayDate}
              </h3>

              <div className="mt-4 pt-4 border-t border-zinc-100">
                <span className="text-xs font-medium text-zinc-500 block text-center">
                  {t('statistics.dayRevenue')}
                </span>
                <div className="text-2xl sm:text-3xl font-semibold tracking-tight font-mono text-center text-zinc-900 mt-1">
                  {formatCurrency(activeUncategorizedData.summary.totalRevenue)}
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 px-1">
                  <span>
                    {t('statistics.cash')}:{' '}
                    <strong className="font-semibold text-zinc-700 font-mono">
                      {formatCurrency(
                        activeUncategorizedData.summary.cashTotal
                      )}
                    </strong>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span>
                    {t('statistics.qrShort')}:{' '}
                    <strong className="font-semibold text-zinc-700 font-mono">
                      {formatCurrency(activeUncategorizedData.summary.qrTotal)}
                    </strong>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span>
                    {t('statistics.salesCountSuffix', {
                      count: activeUncategorizedData.summary.salesCount,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Uncategorized Day Items Breakdown */}
            {activeUncategorizedData.summary.itemBreakdown.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 px-1">
                  {t('statistics.itemsSoldDay', {
                    date: activeUncategorizedData.displayDate,
                  })}
                </h4>

                <div className="bg-white rounded-2xl border border-zinc-200/80 divide-y divide-zinc-100 overflow-hidden shadow-xs">
                  {activeUncategorizedData.summary.itemBreakdown.map((item) => (
                    <div
                      key={item.name}
                      className="p-3.5 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-zinc-400 font-medium shrink-0">
                          {item.quantity}×
                        </span>
                        <span className="font-medium text-zinc-900 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-zinc-900 shrink-0">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Uncategorized Day Sales List */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 px-1">
                {t('statistics.uncategorizedSalesListCount', {
                  count: activeUncategorizedData.sales.length,
                })}
              </h4>

              <div className="bg-white rounded-2xl border border-zinc-200/80 divide-y divide-zinc-100 overflow-hidden shadow-xs">
                {activeUncategorizedData.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 flex items-start justify-between text-xs gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-zinc-400 text-[11px]">
                          {formatTime(sale.timestamp || sale.date)}
                        </span>
                        <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                          {sale.paymentType === 'qr'
                            ? t('statistics.qr')
                            : t('statistics.cash')}
                        </span>
                      </div>
                      <p className="text-zinc-600 text-xs truncate">
                        {sale.items?.length > 0
                          ? sale.items
                              .map((it) => `${it.quantity}× ${it.name}`)
                              .join(', ')
                          : t('statistics.purchase')}
                      </p>
                    </div>

                    <span className="font-mono font-semibold text-sm text-zinc-900 shrink-0">
                      {formatCurrency(sale.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EVENT FORM MODAL */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false)
          setEventToEdit(null)
        }}
        onSave={handleSaveEvent}
        eventToEdit={eventToEdit}
      />

      {/* EXPENSE FORM MODAL */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        eventName={activeEventData?.event?.name || t('statistics.eventName')}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={handleSaveExpense}
      />

      {/* DELETE EVENT CONFIRMATION MODAL */}
      {eventToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
            onClick={() => setEventToDelete(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-zinc-200 animate-scale-in z-10 flex flex-col gap-3">
            <div>
              <h3 className="text-base font-semibold text-zinc-900">
                {t('statistics.deleteEventModalTitle', {
                  name: eventToDelete.name,
                })}
              </h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {t('statistics.deleteEventModalDesc')}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
