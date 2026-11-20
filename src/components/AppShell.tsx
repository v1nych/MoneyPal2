import { NavLink, Outlet } from 'react-router-dom'
import type { Currency, MoneyPalStore, SavingsPeriod } from '../types'

export interface ShellOutletContext {
  store: MoneyPalStore
  monthKey: string
  onMonth: (key: string) => void
  period: SavingsPeriod
  onPeriod: (p: SavingsPeriod) => void
  onCurrency: (c: Currency) => void
  onRate: (n: number) => void
  update: (fn: (draft: MoneyPalStore) => void) => void
}

interface Props {
  store: MoneyPalStore
  monthKey: string
  onMonth: (key: string) => void
  period: SavingsPeriod
  onPeriod: (p: SavingsPeriod) => void
  onCurrency: (c: Currency) => void
  onRate: (n: number) => void
  update: (fn: (draft: MoneyPalStore) => void) => void
}

export function AppShell({
  store,
  monthKey,
  onMonth,
  period,
  onPeriod,
  onCurrency,
  onRate,
  update,
}: Props) {
  const ctx: ShellOutletContext = {
    store,
    monthKey,
    onMonth,
    period,
    onPeriod,
    onCurrency,
    onRate,
    update,
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            M
          </span>
          <span className="brand-name">MoneyPal2</span>
        </div>
        <nav className="main-nav" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Cashflow
          </NavLink>
          <NavLink
            to="/savings"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Savings/Investments
          </NavLink>
          <NavLink
            to="/debt"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Debt
          </NavLink>
        </nav>
      </header>
      <Outlet context={ctx} />
    </div>
  )
}
