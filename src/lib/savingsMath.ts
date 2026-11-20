import type { SavingsEntry, SavingsPot } from '../types'
import { monthsBetween, todayISO } from './format'

export function potPrincipal(entries: SavingsEntry[], potId: string): number {
  return entries
    .filter((e) => e.potId === potId && (e.type === 'deposit' || e.type === 'withdrawal'))
    .reduce((s, e) => s + (e.type === 'deposit' ? e.amount : -e.amount), 0)
}

export function potActualPerformance(entries: SavingsEntry[], potId: string): number {
  return entries
    .filter((e) => e.potId === potId && e.type === 'performance')
    .reduce((s, e) => s + e.amount, 0)
}

export function potBalance(entries: SavingsEntry[], potId: string): number {
  return potPrincipal(entries, potId) + potActualPerformance(entries, potId)
}

/** Simple accrued projection: principal * rate * (days/365) from first deposit / created. */
export function projectedToDate(
  pot: SavingsPot,
  entries: SavingsEntry[],
  asOf = todayISO(),
): number {
  const principalEvents = entries
    .filter((e) => e.potId === pot.id && (e.type === 'deposit' || e.type === 'withdrawal'))
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))

  if (principalEvents.length === 0) return 0

  let running = 0
  let accrued = 0
  let prevDate = principalEvents[0].effectiveDate

  for (const ev of principalEvents) {
    const months = monthsBetween(prevDate, ev.effectiveDate)
    accrued += running * (pot.expectedAnnualRate / 12) * months
    running += ev.type === 'deposit' ? ev.amount : -ev.amount
    prevDate = ev.effectiveDate
  }
  const monthsTail = monthsBetween(prevDate, asOf)
  accrued += running * (pot.expectedAnnualRate / 12) * monthsTail
  return accrued
}

export function projectedNext12Months(balance: number, annualRate: number): number {
  return balance * annualRate
}

export function entryInPeriod(
  entry: SavingsEntry,
  period: 'month' | 'year' | 'all',
  monthKey: string,
): boolean {
  if (period === 'all') return true
  const d = entry.effectiveDate
  if (period === 'month') return d.startsWith(monthKey)
  const year = monthKey.slice(0, 4)
  return d.startsWith(year)
}
