import type { CashflowMonth, NamedAmount } from '../types'

export function sumNamed(items: NamedAmount[]): number {
  return items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
}

export function cashflowDerived(m: CashflowMonth) {
  const incomeExpenses = sumNamed(m.incomeExpenses)
  const extras = sumNamed(m.extras)
  const propertyExpenses = sumNamed(m.propertyExpenses)
  const netBreakdown = m.netIncome - incomeExpenses
  const baseForSavings = netBreakdown + extras
  const savingsAllocation =
    m.savingsMode === 'percent'
      ? baseForSavings * (m.savingsValue / 100)
      : m.savingsValue
  const netRentalIncome = m.netPropertyIncome - propertyExpenses
  const rentalSavings =
    m.rentalSavingsMode === 'percent'
      ? netRentalIncome * (m.rentalSavingsValue / 100)
      : m.rentalSavingsValue
  const freeCash =
    netBreakdown + extras + netRentalIncome - savingsAllocation - rentalSavings
  const deductions = Math.max(0, m.grossIncome - m.netIncome)
  const deductionPct = m.grossIncome > 0 ? (deductions / m.grossIncome) * 100 : 0
  const propDeductions = Math.max(0, m.grossPropertyIncome - m.netPropertyIncome)
  const propDeductionPct =
    m.grossPropertyIncome > 0 ? (propDeductions / m.grossPropertyIncome) * 100 : 0

  return {
    incomeExpenses,
    extras,
    propertyExpenses,
    netBreakdown,
    savingsAllocation,
    netRentalIncome,
    rentalSavings,
    freeCash,
    deductions,
    deductionPct,
    propDeductions,
    propDeductionPct,
  }
}
