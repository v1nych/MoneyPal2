import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useOutletContext } from 'react-router-dom'
import type { ShellOutletContext } from '../components/AppShell'
import { PageChrome } from '../components/PageChrome'
import { MoneyInput } from '../components/MoneyInput'
import type { CashflowMonth, NamedAmount } from '../types'
import { cashflowDerived } from '../lib/cashflowMath'
import { compactAxis, formatDateTime, formatMoney, formatMonthLabel } from '../lib/format'
import { ensureCashflowMonth, uid } from '../lib/storage'

function NamedList({
  items,
  currency,
  gbpToKes,
  onChange,
  onAdd,
  onRemove,
}: {
  items: NamedAmount[]
  currency: 'GBP' | 'KES'
  gbpToKes: number
  onChange: (id: string, patch: Partial<NamedAmount>) => void
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  return (
    <div>
      {items.map((item) => (
        <div className="named-row" key={item.id}>
          <input
            type="text"
            value={item.label}
            placeholder="Description"
            onChange={(e) => onChange(item.id, { label: e.target.value })}
          />
          <MoneyInput
            value={item.amount}
            currency={currency}
            gbpToKes={gbpToKes}
            onChange={(n) => onChange(item.id, { amount: n })}
          />
          <button
            type="button"
            className="icon-trash"
            aria-label="Remove"
            onClick={() => onRemove(item.id)}
          >
            ⌫
          </button>
        </div>
      ))}
      <button type="button" className="linkish" onClick={onAdd}>
        + Add field
      </button>
    </div>
  )
}

export function CashflowPage() {
  const { store, monthKey, onMonth, onCurrency, onRate, update } =
    useOutletContext<ShellOutletContext>()
  const { currency, gbpToKes } = store.settings
  const month = store.cashflow[monthKey] ?? ensureCashflowMonth(structuredClone(store), monthKey)
  const d = cashflowDerived(month)
  const money = (n: number) => formatMoney(n, currency, gbpToKes)

  const priorKeys = Object.keys(store.cashflow)
    .filter((k) => k < monthKey)
    .sort()
  const carryIn = priorKeys.reduce((sum, key) => {
    const m = store.cashflow[key]
    return sum + (m ? cashflowDerived(m).freeCash : 0)
  }, 0)
  const balanceInclCarry = d.freeCash + carryIn

  const patchMonth = (fn: (m: CashflowMonth) => void) => {
    update((draft) => {
      const m = ensureCashflowMonth(draft, monthKey)
      fn(m)
    })
  }

  const chartData = [
    { name: 'Net Income', value: month.netIncome, fill: '#5b5ce2' },
    { name: 'Income Expenses', value: d.incomeExpenses, fill: '#e11d48' },
    { name: 'Extras', value: d.extras, fill: '#ea580c' },
    { name: 'Net Rental Income', value: d.netRentalIncome, fill: '#0ea5e9' },
    { name: 'Rental Savings', value: d.rentalSavings, fill: '#059669' },
    { name: 'Free Cash', value: d.freeCash, fill: d.freeCash < 0 ? '#dc2626' : '#7c6cf0' },
  ]

  const logs = store.cashflowLogs
    .filter((l) => l.monthKey === monthKey)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const logSnapshot = () => {
    update((draft) => {
      const m = ensureCashflowMonth(draft, monthKey)
      const derived = cashflowDerived(m)
      const note = (m.notesDraft ?? '').trim()
      draft.cashflowLogs.unshift({
        id: uid('clog'),
        monthKey,
        createdAt: new Date().toISOString(),
        note,
        snapshot: {
          netIncome: m.netIncome,
          incomeExpenses: derived.incomeExpenses,
          netBreakdown: derived.netBreakdown,
          extras: derived.extras,
          savingsAllocation: derived.savingsAllocation,
          netRentalIncome: derived.netRentalIncome,
          rentalSavings: derived.rentalSavings,
          freeCash: derived.freeCash,
          balanceInclCarry: derived.freeCash + carryIn,
        },
      })
      m.notesDraft = ''
    })
  }

  return (
    <main className="page">
      <PageChrome
        title="Cashflow"
        store={store}
        monthKey={monthKey}
        onMonth={onMonth}
        onCurrency={onCurrency}
        onRate={onRate}
      />

      <div className="card-grid">
        <section className="card">
          <h2>Income</h2>
          <p className="card-sub">Monthly pay</p>
          <div className="field">
            <span className="label">Gross Income</span>
            <MoneyInput
              value={month.grossIncome}
              currency={currency}
              gbpToKes={gbpToKes}
              onChange={(n) =>
                patchMonth((m) => {
                  m.grossIncome = n
                })
              }
            />
          </div>
          <div className="field">
            <span className="label">Net Income</span>
            <MoneyInput
              value={month.netIncome}
              currency={currency}
              gbpToKes={gbpToKes}
              onChange={(n) =>
                patchMonth((m) => {
                  m.netIncome = n
                })
              }
            />
          </div>
          <div className="banner">
            Deductions (gross − net): {money(d.deductions)} ({d.deductionPct.toFixed(1)}%)
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Income Expenses</h2>
              <p className="card-sub">Bills &amp; regular outgoings</p>
            </div>
            <span className="total">{money(d.incomeExpenses)}</span>
          </div>
          <NamedList
            items={month.incomeExpenses}
            currency={currency}
            gbpToKes={gbpToKes}
            onAdd={() =>
              patchMonth((m) => {
                m.incomeExpenses.push({ id: uid('ne'), label: '', amount: 0 })
              })
            }
            onRemove={(id) =>
              patchMonth((m) => {
                m.incomeExpenses = m.incomeExpenses.filter((x) => x.id !== id)
              })
            }
            onChange={(id, patch) =>
              patchMonth((m) => {
                const row = m.incomeExpenses.find((x) => x.id === id)
                if (row) Object.assign(row, patch)
              })
            }
          />
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Extras</h2>
              <p className="card-sub">Gifts, tax refunds, bonuses, freelance</p>
            </div>
            <span className="total">{money(d.extras)}</span>
          </div>
          <NamedList
            items={month.extras}
            currency={currency}
            gbpToKes={gbpToKes}
            onAdd={() =>
              patchMonth((m) => {
                m.extras.push({ id: uid('ex'), label: '', amount: 0 })
              })
            }
            onRemove={(id) =>
              patchMonth((m) => {
                m.extras = m.extras.filter((x) => x.id !== id)
              })
            }
            onChange={(id, patch) =>
              patchMonth((m) => {
                const row = m.extras.find((x) => x.id === id)
                if (row) Object.assign(row, patch)
              })
            }
          />
        </section>

        <section className="card">
          <h2>Property Income</h2>
          <p className="card-sub">Rental income</p>
          <div className="field">
            <span className="label">Gross Property Income</span>
            <MoneyInput
              value={month.grossPropertyIncome}
              currency={currency}
              gbpToKes={gbpToKes}
              onChange={(n) =>
                patchMonth((m) => {
                  m.grossPropertyIncome = n
                })
              }
            />
          </div>
          <div className="field">
            <span className="label">Net Property Income</span>
            <MoneyInput
              value={month.netPropertyIncome}
              currency={currency}
              gbpToKes={gbpToKes}
              onChange={(n) =>
                patchMonth((m) => {
                  m.netPropertyIncome = n
                })
              }
            />
          </div>
          <div className="banner">
            Property deductions (gross − net): {money(d.propDeductions)} (
            {d.propDeductionPct.toFixed(1)}%)
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Property Expenses</h2>
              <p className="card-sub">Agent fees, repairs, mortgage interest</p>
            </div>
            <span className="total">{money(d.propertyExpenses)}</span>
          </div>
          <NamedList
            items={month.propertyExpenses}
            currency={currency}
            gbpToKes={gbpToKes}
            onAdd={() =>
              patchMonth((m) => {
                m.propertyExpenses.push({ id: uid('pe'), label: '', amount: 0 })
              })
            }
            onRemove={(id) =>
              patchMonth((m) => {
                m.propertyExpenses = m.propertyExpenses.filter((x) => x.id !== id)
              })
            }
            onChange={(id, patch) =>
              patchMonth((m) => {
                const row = m.propertyExpenses.find((x) => x.id === id)
                if (row) Object.assign(row, patch)
              })
            }
          />
        </section>
      </div>

      <div className="summary-grid">
        <article className="metric-card">
          <p className="eyebrow">Net Income</p>
          <p className="value">{money(month.netIncome)}</p>
          <p className="hint">From the Income card</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Net Breakdown</p>
          <p className={`value ${d.netBreakdown < 0 ? 'neg' : ''}`}>{money(d.netBreakdown)}</p>
          <p className="hint">Net Income − Income Expenses</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Extras</p>
          <p className="value">{money(d.extras)}</p>
          <p className="hint">Sum of Extras</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Savings Allocation</p>
          <p className="value">{money(d.savingsAllocation)}</p>
          <p className="hint">% of max(0, Net Breakdown + Extras)</p>
          <div className="progress-row">
            <div className="mini-seg">
              <button
                type="button"
                className={month.savingsMode === 'percent' ? 'on' : ''}
                onClick={() =>
                  patchMonth((m) => {
                    m.savingsMode = 'percent'
                  })
                }
              >
                %
              </button>
              <button
                type="button"
                className={month.savingsMode === 'amount' ? 'on' : ''}
                onClick={() =>
                  patchMonth((m) => {
                    m.savingsMode = 'amount'
                  })
                }
              >
                £
              </button>
            </div>
            {month.savingsMode === 'percent' ? (
              <input
                className="pct-input"
                type="number"
                value={month.savingsValue}
                onChange={(e) =>
                  patchMonth((m) => {
                    m.savingsValue = Number(e.target.value) || 0
                  })
                }
              />
            ) : (
              <MoneyInput
                value={month.savingsValue}
                currency={currency}
                gbpToKes={gbpToKes}
                onChange={(n) =>
                  patchMonth((m) => {
                    m.savingsValue = n
                  })
                }
              />
            )}
            <div className="progress" style={{ maxWidth: 120 }}>
              <span
                style={{
                  width: `${Math.min(100, month.savingsMode === 'percent' ? month.savingsValue : 0)}%`,
                }}
              />
            </div>
          </div>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Net Rental Income</p>
          <p className="value">{money(d.netRentalIncome)}</p>
          <p className="hint">Net Property Income − Property Expenses</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Rental Savings</p>
          <p className="value">{money(d.rentalSavings)}</p>
          <p className="hint">% of max(0, Net Rental Income)</p>
          <div className="progress-row">
            <div className="mini-seg">
              <button
                type="button"
                className={month.rentalSavingsMode === 'percent' ? 'on' : ''}
                onClick={() =>
                  patchMonth((m) => {
                    m.rentalSavingsMode = 'percent'
                  })
                }
              >
                %
              </button>
              <button
                type="button"
                className={month.rentalSavingsMode === 'amount' ? 'on' : ''}
                onClick={() =>
                  patchMonth((m) => {
                    m.rentalSavingsMode = 'amount'
                  })
                }
              >
                £
              </button>
            </div>
            {month.rentalSavingsMode === 'percent' ? (
              <input
                className="pct-input"
                type="number"
                value={month.rentalSavingsValue}
                onChange={(e) =>
                  patchMonth((m) => {
                    m.rentalSavingsValue = Number(e.target.value) || 0
                  })
                }
              />
            ) : (
              <MoneyInput
                value={month.rentalSavingsValue}
                currency={currency}
                gbpToKes={gbpToKes}
                onChange={(n) =>
                  patchMonth((m) => {
                    m.rentalSavingsValue = n
                  })
                }
              />
            )}
            <div className="progress" style={{ maxWidth: 120 }}>
              <span
                style={{
                  width: `${Math.min(
                    100,
                    month.rentalSavingsMode === 'percent' ? month.rentalSavingsValue : 0,
                  )}%`,
                }}
              />
            </div>
          </div>
        </article>
        <article className="metric-card wide">
          <p className="eyebrow">Free Cash</p>
          <p className={`value ${d.freeCash < 0 ? 'neg' : ''}`}>{money(d.freeCash)}</p>
          <p className="hint">
            Net Breakdown + Extras + Net Rental Income − Savings Allocation − Rental Savings
          </p>
          <p className="hint">
            Balance incl. carry-over{' '}
            <strong className={balanceInclCarry < 0 ? 'neg' : ''}>{money(balanceInclCarry)}</strong>{' '}
            · carried in from earlier months: {money(carryIn)}
          </p>
        </article>
      </div>

      <section className="card notes-log-card">
        <div className="log-box">
          <textarea
            placeholder="Add a note for this log (optional). Ctrl/Cmd+Enter to log"
            value={month.notesDraft ?? ''}
            onChange={(e) =>
              patchMonth((m) => {
                m.notesDraft = e.target.value
              })
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                logSnapshot()
              }
            }}
          />
          <button type="button" className="btn primary" onClick={logSnapshot}>
            Log
          </button>
        </div>
      </section>

      <section className="card chart-card">
        <h2>Cashflow - {formatMonthLabel(monthKey)}</h2>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 16, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e5ef" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-12}
                textAnchor="end"
                height={60}
              />
              <YAxis tickFormatter={(v) => compactAxis(Number(v), currency, gbpToKes)} width={56} />
              <Tooltip
                formatter={(v) => money(Number(v ?? 0))}
                contentStyle={{ borderRadius: 12, borderColor: '#e2e5ef' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((row, i) => (
                  <Cell key={i} fill={row.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Logs - {formatMonthLabel(monthKey)}</h2>
          <span className="footnote">{logs.length} saved logs, newest first</span>
        </div>
        {logs.length === 0 ? (
          <p className="footnote">No logs yet for this month.</p>
        ) : (
          <div className="log-list">
            {logs.map((log) => (
              <div className="log-item" key={log.id}>
                <div>
                  <div className="when">{formatDateTime(log.createdAt)}</div>
                  {log.note ? <p className="note">{log.note}</p> : null}
                  <div className="pills">
                    <span className="pill">Net Income {money(log.snapshot.netIncome)}</span>
                    <span className="pill">Net Breakdown {money(log.snapshot.netBreakdown)}</span>
                    <span className="pill">Extras {money(log.snapshot.extras)}</span>
                    <span className="pill">Free Cash {money(log.snapshot.freeCash)}</span>
                    <span className="pill">
                      Free Cash balance {money(log.snapshot.balanceInclCarry)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="linkish danger"
                  onClick={() =>
                    update((draft) => {
                      draft.cashflowLogs = draft.cashflowLogs.filter((x) => x.id !== log.id)
                    })
                  }
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
