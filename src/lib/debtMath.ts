/** Standard amortizing loan monthly payment. `annualRate` is decimal (e.g. 0.059). */
export function monthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (termMonths <= 0 || principal <= 0) return 0
  const r = annualRate / 12
  if (r === 0) return principal / termMonths
  const factor = Math.pow(1 + r, termMonths)
  return (principal * r * factor) / (factor - 1)
}

/** Remaining balance after `monthsElapsed` scheduled payments (no extra payments). */
export function scheduledRemainingBalance(
  principal: number,
  annualRate: number,
  termMonths: number,
  monthsElapsed: number,
): number {
  const n = termMonths
  const payment = monthlyPayment(principal, annualRate, n)
  const r = annualRate / 12
  const m = Math.min(Math.max(0, monthsElapsed), n)
  if (n <= 0) return 0
  if (r === 0) return Math.max(0, principal - payment * m)
  const bal = principal * Math.pow(1 + r, m) - payment * ((Math.pow(1 + r, m) - 1) / r)
  return Math.max(0, bal)
}

/** Total interest over the full scheduled term. */
export function totalScheduledInterest(
  principal: number,
  annualRate: number,
  termMonths: number,
): number {
  if (principal <= 0 || termMonths <= 0) return 0
  const payment = monthlyPayment(principal, annualRate, termMonths)
  return Math.max(0, payment * termMonths - principal)
}

/**
 * Apply logged payments against principal (simple payoff tracking).
 * Amount left never goes below 0.
 */
export function amountLeft(principal: number, totalPaid: number): number {
  return Math.max(0, principal - Math.max(0, totalPaid))
}

/**
 * Projected remaining interest if the borrower keeps paying the contractual
 * monthly payment on the current amount left for the remaining term months.
 * Interest ≈ payment * paymentsLeft - amountLeft (amortizing approximation).
 */
export function projectedRemainingInterest(
  balance: number,
  annualRate: number,
  paymentsLeft: number,
): number {
  if (balance <= 0 || paymentsLeft <= 0) return 0
  const payment = monthlyPayment(balance, annualRate, paymentsLeft)
  return Math.max(0, payment * paymentsLeft - balance)
}

/**
 * Payments left given current balance and contractual monthly payment.
 * Falls back to remaining scheduled months when payment is zero.
 */
export function paymentsLeftFromBalance(
  balance: number,
  contractualMonthly: number,
  scheduledMonthsRemaining: number,
): number {
  if (balance <= 0) return 0
  if (contractualMonthly <= 0) return Math.max(0, scheduledMonthsRemaining)
  return Math.max(1, Math.ceil(balance / contractualMonthly - 1e-9))
}

export function progressByAmount(principal: number, left: number): number {
  if (principal <= 0) return 0
  return Math.min(100, Math.max(0, ((principal - left) / principal) * 100))
}

export function progressByTime(termMonths: number, monthsElapsed: number): number {
  if (termMonths <= 0) return 0
  return Math.min(100, Math.max(0, (monthsElapsed / termMonths) * 100))
}

export function formatTerm(termMonths: number): string {
  const y = Math.floor(termMonths / 12)
  const m = termMonths % 12
  if (y > 0 && m > 0) return `${y}y ${m}m`
  if (y > 0) return `${y} year${y === 1 ? '' : 's'}`
  return `${m} month${m === 1 ? '' : 's'}`
}
