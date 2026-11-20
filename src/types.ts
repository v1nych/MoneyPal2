export type Currency = 'GBP' | 'KES'
export type ProgressMode = 'amount' | 'time'
export type SavingsPeriod = 'month' | 'year' | 'all'
export interface NamedAmount {
  id: string
  label: string
  amount: number
}

export interface CashflowMonth {
  monthKey: string // YYYY-MM
  grossIncome: number
  netIncome: number
  incomeExpenses: NamedAmount[]
  extras: NamedAmount[]
  grossPropertyIncome: number
  netPropertyIncome: number
  propertyExpenses: NamedAmount[]
  savingsMode: 'percent' | 'amount'
  savingsValue: number
  rentalSavingsMode: 'percent' | 'amount'
  rentalSavingsValue: number
  notesDraft?: string
}

export interface CashflowLog {
  id: string
  monthKey: string
  createdAt: string
  note: string
  snapshot: {
    netIncome: number
    incomeExpenses: number
    netBreakdown: number
    extras: number
    savingsAllocation: number
    netRentalIncome: number
    rentalSavings: number
    freeCash: number
    balanceInclCarry: number
  }
}

export interface SavingsPot {
  id: string
  name: string
  expectedAnnualRate: number
  notes: string
  createdAt: string
  archivedAt: string | null
}

export type SavingsEntryType = 'deposit' | 'withdrawal' | 'performance' | 'created'

export interface SavingsEntry {
  id: string
  potId: string
  type: SavingsEntryType
  amount: number
  effectiveDate: string // YYYY-MM-DD
  note: string
  loggedAt: string
}

export interface Debt {
  id: string
  name: string
  principal: number
  annualRate: number // decimal e.g. 0.059
  startDate: string // YYYY-MM-DD
  termMonths: number
  notes: string
  createdAt: string
  archivedAt: string | null
}

export interface DebtPayment {
  id: string
  debtId: string
  amount: number
  date: string // YYYY-MM-DD
  note: string
  loggedAt: string
}

export interface AppSettings {
  currency: Currency
  gbpToKes: number
  debtProgressMode: ProgressMode
}

export interface MoneyPalStore {
  version: 1
  settings: AppSettings
  cashflow: Record<string, CashflowMonth>
  cashflowLogs: CashflowLog[]
  pots: SavingsPot[]
  savingsEntries: SavingsEntry[]
  debts: Debt[]
  debtPayments: DebtPayment[]
}
