import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { Currency, MoneyPalStore, SavingsPeriod } from '../types'
import { formatMonthLabel, shiftMonth } from '../lib/format'

interface Props {
  store: MoneyPalStore
  onCurrency: (c: Currency) => void
  onRate: (n: number) => void
  monthKey: string
  onMonth: (key: string) => void
  period?: SavingsPeriod
  onPeriod?: (p: SavingsPeriod) => void
  showPeriod?: boolean
}

export function AppShell({
  store,
  onCurrency,
  onRate,
  monthKey,
  onMonth,
  period = 'month',
  onPeriod,
  showPeriod = false,
}: Props) {
  const location = useLocation()
  const isDebt = location.pathname.startsWith('/debt')
  const isSavings = location.pathname.startsWith('/savings')

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
        <div className="topbar-controls">
          <div className="month-nav">
            <button type="button" className="icon-btn" onClick={() => onMonth(shiftMonth(monthKey, -1))} aria-label="Previous month">
              ‹
            </button>
            <span className="month-label">{formatMonthLabel(monthKey)}</span>
            <button type="button" className="icon-btn" onClick={() => onMonth(shiftMonth(monthKey, 1))} aria-label="Next month">
              ›
            </button>
          </div>
          {showPeriod && onPeriod && (isSavings || isDebt) && (
            <div className="seg period-seg">
              {(['month', 'year', 'all'] as SavingsPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={period === p ? 'on' : ''}
                  onClick={() => onPeriod(p)}
                >
                  {p === 'all' ? 'All time' : p === 'year' ? 'Year' : 'Month'}
                </button>
              ))}
            </div>
          )}
          <div className="currency-block">
            <div className="seg">
              {(['GBP', 'KES'] as Currency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={store.settings.currency === c ? 'on' : ''}
                  onClick={() => onCurrency(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <label className="rate-label">
              Exchange rate: 1 GBP =
              <input
                type="number"
                min={1}
                step={1}
                value={store.settings.gbpToKes}
                onChange={(e) => onRate(Number(e.target.value) || 0)}
              />
              KES
            </label>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
