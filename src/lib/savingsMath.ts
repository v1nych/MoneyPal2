import type { SavingsEntry, SavingsPot } from '../types'
import { todayISO } from './format'

function parseDay(iso: string): Date {
  return new Date(iso.slice(0, 10) + 'T12:00:00')
}

/** Whole calendar days from start (inclusive) to end (exclusive of end day beyond start). */
export function daysBetween(startISO: string, endISO: string): number {
  const s = parseDay(startISO)
  const e = parseDay(endISO)
  const ms = e.getTime() - s.getTime()
  return Math.max(0, Math.round(ms / 86_400_000))
}

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

/**
 * Simple daily accrual on principal: Σ runningPrincipal × rate × (days/365)
 * across deposit/withdrawal segments up to `asOf`.
 */
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
    const days = daysBetween(prevDate, ev.effectiveDate)
    accrued += running * pot.expectedAnnualRate * (days / 365)
    running += ev.type === 'deposit' ? ev.amount : -ev.amount
    prevDate = ev.effectiveDate
  }
  const daysTail = daysBetween(prevDate, asOf)
  accrued += running * pot.expectedAnnualRate * (daysTail / 365)
  return accrued
}

/** Projected performance over the next 12 months on current balance. */
export function projectedNext12Months(balance: number, annualRate: number): number {
  return balance * annualRate
}

/** Period-scoped projected accrual approximation: balance × rate × fraction of year. */
export function projectedForPeriod(
  balance: number,
  annualRate: number,
  period: 'month' | 'year' | 'all',
  pot: SavingsPot,
  entries: SavingsEntry[],
): number {
  if (period === 'all') return projectedToDate(pot, entries)
  if (period === 'year') return balance * annualRate
  return balance * annualRate * (30.4375 / 365)
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
