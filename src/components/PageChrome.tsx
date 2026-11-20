import type { Currency, MoneyPalStore, SavingsPeriod } from '../types'
import { formatMonthLabel, shiftMonth } from '../lib/format'

interface Props {
  title: string
  store: MoneyPalStore
  monthKey: string
  onMonth: (key: string) => void
  onCurrency: (c: Currency) => void
  onRate: (n: number) => void
  period?: SavingsPeriod
  onPeriod?: (p: SavingsPeriod) => void
  showPeriod?: boolean
  actions?: React.ReactNode
  filters?: React.ReactNode
}

export function PageChrome({
  title,
  store,
  monthKey,
  onMonth,
  onCurrency,
  onRate,
  period = 'month',
  onPeriod,
  showPeriod = false,
  actions,
  filters,
}: Props) {
  return (
    <div className="page-chrome">
      <div className="page-chrome-row">
        <div className="page-chrome-left">
          <h1>{title}</h1>
          {filters}
        </div>
        <div className="page-chrome-center">
          <div className="month-nav">
            <button
              type="button"
              className="icon-btn"
              onClick={() => onMonth(shiftMonth(monthKey, -1))}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="month-label">{formatMonthLabel(monthKey)}</span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => onMonth(shiftMonth(monthKey, 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          {showPeriod && onPeriod && (
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
        </div>
        <div className="page-chrome-right">
          {actions}
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
      </div>
    </div>
  )
}
