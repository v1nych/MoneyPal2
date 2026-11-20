import type { CashflowMonth, MoneyPalStore } from '../types'
import { monthKeyFromDate } from './format'
import { uid } from './ids'

const KEY = 'moneypal2.store.v1'

function emptyMonth(monthKey: string): CashflowMonth {
  return {
    monthKey,
    grossIncome: 0,
    netIncome: 0,
    incomeExpenses: [],
    extras: [],
    grossPropertyIncome: 0,
    netPropertyIncome: 0,
    propertyExpenses: [],
    savingsMode: 'percent',
    savingsValue: 10,
    rentalSavingsMode: 'percent',
    rentalSavingsValue: 25,
  }
}

export function defaultStore(): MoneyPalStore {
  const monthKey = monthKeyFromDate()
  return {
    version: 1,
    settings: {
      currency: 'GBP',
      gbpToKes: 170,
      debtProgressMode: 'amount',
    },
    cashflow: { [monthKey]: emptyMonth(monthKey) },
    cashflowLogs: [],
    pots: [],
    savingsEntries: [],
    debts: [],
    debtPayments: [],
  }
}

export function loadStore(): MoneyPalStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultStore()
    const parsed = JSON.parse(raw) as MoneyPalStore
    if (!parsed || parsed.version !== 1) return defaultStore()
    return {
      ...defaultStore(),
      ...parsed,
      settings: { ...defaultStore().settings, ...parsed.settings },
    }
  } catch {
    return defaultStore()
  }
}

export function saveStore(store: MoneyPalStore): void {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function ensureCashflowMonth(store: MoneyPalStore, monthKey: string): CashflowMonth {
  if (!store.cashflow[monthKey]) {
    store.cashflow[monthKey] = emptyMonth(monthKey)
  }
  return store.cashflow[monthKey]
}

export function seedDemoIfEmpty(store: MoneyPalStore): MoneyPalStore {
  if (store.pots.length > 0 || store.debts.length > 0) return store
  // Keep empty by default so empty states are visible; Cashflow starts blank too.
  return store
}

export { emptyMonth, uid }
