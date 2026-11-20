import type { Currency } from '../types'

export function monthKeyFromDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number)
  return { year: y, month: m }
}

export function shiftMonth(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key)
  const d = new Date(year, month - 1 + delta, 1)
  return monthKeyFromDate(d)
}

export function formatMonthLabel(key: string): string {
  const { year, month } = parseMonthKey(key)
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
}

export function formatMoney(amount: number, currency: Currency, gbpToKes: number): string {
  const value = currency === 'KES' ? amount * gbpToKes : amount
  const symbol = currency === 'KES' ? 'KSh' : '£'
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value < 0 ? '-' : ''}${symbol}${formatted}`
}

export function currencySymbol(currency: Currency): string {
  return currency === 'KES' ? 'KSh' : '£'
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate + (isoDate.includes('T') ? '' : 'T12:00:00'))
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function monthsBetween(startISO: string, endISO = todayISO()): number {
  const s = new Date(startISO + 'T12:00:00')
  const e = new Date(endISO + 'T12:00:00')
  const months =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  const dayAdj = e.getDate() >= s.getDate() ? 0 : -1
  return Math.max(0, months + dayAdj)
}

export function compactAxis(n: number, currency: Currency, gbpToKes: number): string {
  const v = currency === 'KES' ? n * gbpToKes : n
  const abs = Math.abs(v)
  const prefix = v < 0 ? '-' : ''
  const sym = currency === 'KES' ? 'KSh' : '£'
  if (abs >= 1000) return `${prefix}${sym}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  return `${prefix}${sym}${abs.toFixed(0)}`
}
