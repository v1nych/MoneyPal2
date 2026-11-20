import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '../components/EmptyState'
import { MoneyInput } from '../components/MoneyInput'
import {
  compactAxis,
  formatDate,
  formatDateTime,
  formatMoney,
  formatMonthLabel,
  todayISO,
} from '../lib/format'
import {
  entryInPeriod,
  potActualPerformance,
  potBalance,
  potPrincipal,
  projectedNext12Months,
  projectedToDate,
} from '../lib/savingsMath'
import { uid } from '../lib/storage'
import type { MoneyPalStore, PotCategory, SavingsPeriod } from '../types'

const CATEGORIES: PotCategory[] = ['Emergency fund', 'ETF portfolio', 'Pension', 'Other']

interface Props {
  store: MoneyPalStore
  monthKey: string
  period: SavingsPeriod
  update: (fn: (draft: MoneyPalStore) => void) => void
}

export function SavingsPage({ store, monthKey, period, update }: Props) {
  const { currency, gbpToKes } = store.settings
  const money = (n: number) => formatMoney(n, currency, gbpToKes)
  const [showArchived, setShowArchived] = useState(false)
  const [filter, setFilter] = useState<'all' | PotCategory>('all')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    category: 'Emergency fund' as PotCategory,
    rate: 4,
    notes: '',
    opening: 0,
  })
  const [openTxn, setOpenTxn] = useState<Record<string, 'payment' | 'performance' | null>>({})
  const [txnDraft, setTxnDraft] = useState<
    Record<string, { type: 'deposit' | 'withdrawal'; amount: number; date: string; note: string; perf: number }>
  >({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [ledgerFilter, setLedgerFilter] = useState<'all' | string>('all')

  const pots = store.pots.filter((p) => (showArchived ? !!p.archivedAt : !p.archivedAt))
  const visible = pots.filter((p) => (filter === 'all' ? true : p.category === filter))

  const periodLabel =
    period === 'all' ? 'All time' : period === 'year' ? monthKey.slice(0, 4) : formatMonthLabel(monthKey)

  const summary = useMemo(() => {
    const active = store.pots.filter((p) => !p.archivedAt)
    let principal = 0
    let projected = 0
    let actual = 0
    let balance = 0
    let next12 = 0
    for (const pot of active) {
      const entries = store.savingsEntries.filter((e) => e.potId === pot.id)
      const periodEntries = entries.filter((e) => entryInPeriod(e, period, monthKey))
      const scoped = period === 'all' ? entries : periodEntries
      principal += potPrincipal(scoped, pot.id)
      actual += potActualPerformance(scoped, pot.id)
      const bal = potBalance(entries, pot.id)
      balance += bal
      next12 += projectedNext12Months(bal, pot.expectedAnnualRate)
      if (period === 'all') projected += projectedToDate(pot, entries)
      else if (period === 'month') projected += bal * (pot.expectedAnnualRate / 12)
      else projected += bal * pot.expectedAnnualRate
    }
    return { principal, projected, actual, balance, next12, vs: actual - projected }
  }, [store.pots, store.savingsEntries, period, monthKey])

  const chartPrincipal = visible.map((pot) => {
    const entries = store.savingsEntries.filter((e) => e.potId === pot.id)
    return {
      name: pot.name,
      principal: potPrincipal(entries, pot.id),
    }
  })

  const chartPerf = visible.map((pot) => {
    const entries = store.savingsEntries.filter((e) => e.potId === pot.id)
    const bal = potBalance(entries, pot.id)
    const projected =
      period === 'all'
        ? projectedToDate(pot, entries)
        : bal * (pot.expectedAnnualRate / (period === 'month' ? 12 : 1))
    const actualEntries = entries.filter(
      (e) => e.type === 'performance' && entryInPeriod(e, period, monthKey),
    )
    const actual = actualEntries.reduce((s, e) => s + e.amount, 0)
    return { name: pot.name, projected, actual }
  })

  const ledger = store.savingsEntries
    .filter((e) => (ledgerFilter === 'all' ? true : e.potId === ledgerFilter))
    .slice()
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))

  const ensureTxn = (potId: string) => {
    if (!txnDraft[potId]) {
      setTxnDraft((prev) => ({
        ...prev,
        [potId]: { type: 'deposit', amount: 0, date: todayISO(), note: '', perf: 0 },
      }))
    }
  }

  const createPot = () => {
    if (!draft.name.trim()) return
    update((s) => {
      const id = uid('pot')
      const now = new Date().toISOString()
      s.pots.unshift({
        id,
        name: draft.name.trim(),
        category: draft.category,
        expectedAnnualRate: draft.rate / 100,
        notes: draft.notes,
        createdAt: now,
        archivedAt: null,
      })
      s.savingsEntries.unshift({
        id: uid('se'),
        potId: id,
        type: 'created',
        amount: 0,
        effectiveDate: todayISO(),
        note: '',
        loggedAt: now,
      })
      if (draft.opening > 0) {
        s.savingsEntries.unshift({
          id: uid('se'),
          potId: id,
          type: 'deposit',
          amount: draft.opening,
          effectiveDate: todayISO(),
          note: 'Opening balance',
          loggedAt: now,
        })
      }
    })
    setCreating(false)
    setDraft({ name: '', category: 'Emergency fund', rate: 4, notes: '', opening: 0 })
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Savings</h1>
          <div className="filters" style={{ marginTop: '0.65rem' }}>
            <button
              type="button"
              className={`filter-chip ${filter === 'all' ? 'on' : ''}`}
              onClick={() => setFilter('all')}
            >
              All active pots
            </button>
            {CATEGORIES.filter((c) => c !== 'Other').map((c) => (
              <button
                key={c}
                type="button"
                className={`filter-chip ${filter === c ? 'on' : ''}`}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn subtle" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Show active' : `Archived (${store.pots.filter((p) => p.archivedAt).length})`}
          </button>
          <button type="button" className="btn primary" onClick={() => setCreating(true)}>
            + New pot
          </button>
        </div>
      </div>

      {creating && (
        <section className="card">
          <h2>New pot</h2>
          <div className="form-grid two">
            <label>
              Name
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Emergency fund"
              />
            </label>
            <label>
              Category
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as PotCategory })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Expected annual rate (%)
              <input
                type="number"
                value={draft.rate}
                onChange={(e) => setDraft({ ...draft, rate: Number(e.target.value) || 0 })}
              />
            </label>
            <label>
              Opening deposit
              <MoneyInput
                value={draft.opening}
                currency={currency}
                gbpToKes={gbpToKes}
                onChange={(n) => setDraft({ ...draft, opening: n })}
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Notes
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </label>
          </div>
          <div className="page-actions" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="btn" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button type="button" className="btn primary" onClick={createPot}>
              Create pot
            </button>
          </div>
        </section>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing to see here"
          hint={showArchived ? 'No archived pots yet.' : 'Create a pot to start tracking savings.'}
          action={
            !showArchived ? (
              <button type="button" className="btn primary" onClick={() => setCreating(true)}>
                + New pot
              </button>
            ) : null
          }
        />
      ) : (
        <div className="pot-grid">
          {visible.map((pot) => {
            const entries = store.savingsEntries.filter((e) => e.potId === pot.id)
            const principal = potPrincipal(entries, pot.id)
            const actual = potActualPerformance(entries, pot.id)
            const balance = principal + actual
            const proj = projectedToDate(pot, entries)
            const next12 = projectedNext12Months(balance, pot.expectedAnnualRate)
            const mode = openTxn[pot.id]
            const td = txnDraft[pot.id] ?? {
              type: 'deposit' as const,
              amount: 0,
              date: todayISO(),
              note: '',
              perf: 0,
            }

            return (
              <article key={pot.id} className={`entity-card ${pot.archivedAt ? 'archived' : ''}`}>
                <h3 className="entity-title">{pot.name}</h3>
                <div className="balance-block">
                  <div className="label">Balance</div>
                  <div className="amount">{money(balance)}</div>
                </div>
                <div className="stat-grid">
                  <div className="stat">
                    <span className="label">Principal</span>
                    <strong>{money(principal)}</strong>
                  </div>
                  <div className="stat">
                    <span className="label">Actual performance</span>
                    <strong className={actual < 0 ? 'neg' : ''}>{money(actual)}</strong>
                  </div>
                  <div className="stat">
                    <span className="label">Projected to date</span>
                    <strong>{money(proj)}</strong>
                  </div>
                  <div className="stat">
                    <span className="label">Projected next 12 months</span>
                    <strong>{money(next12)}</strong>
                  </div>
                </div>
                <div className="inline-rate">
                  <span className="label">Expected annual rate</span>
                  <input
                    type="number"
                    value={Number((pot.expectedAnnualRate * 100).toFixed(2))}
                    onChange={(e) =>
                      update((s) => {
                        const p = s.pots.find((x) => x.id === pot.id)
                        if (p) p.expectedAnnualRate = (Number(e.target.value) || 0) / 100
                      })
                    }
                  />
                  <span>%</span>
                </div>
                <div className="notes-field">
                  <label>Notes</label>
                  <textarea
                    value={pot.notes}
                    onChange={(e) =>
                      update((s) => {
                        const p = s.pots.find((x) => x.id === pot.id)
                        if (p) p.notes = e.target.value
                      })
                    }
                  />
                </div>
                <div className="txn-actions">
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => {
                      ensureTxn(pot.id)
                      setOpenTxn((prev) => ({ ...prev, [pot.id]: 'payment' }))
                    }}
                  >
                    Log payment
                  </button>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => {
                      ensureTxn(pot.id)
                      setOpenTxn((prev) => ({ ...prev, [pot.id]: 'performance' }))
                    }}
                  >
                    Log actual performance
                  </button>
                </div>
                {mode === 'payment' && (
                  <div className="txn-panel">
                    <div className="mini-seg">
                      <button
                        type="button"
                        className={td.type === 'deposit' ? 'on' : ''}
                        onClick={() =>
                          setTxnDraft((prev) => ({ ...prev, [pot.id]: { ...td, type: 'deposit' } }))
                        }
                      >
                        Deposit
                      </button>
                      <button
                        type="button"
                        className={td.type === 'withdrawal' ? 'on' : ''}
                        onClick={() =>
                          setTxnDraft((prev) => ({
                            ...prev,
                            [pot.id]: { ...td, type: 'withdrawal' },
                          }))
                        }
                      >
                        Withdrawal
                      </button>
                    </div>
                    <div className="form-grid two">
                      <label>
                        Amount
                        <MoneyInput
                          value={td.amount}
                          currency={currency}
                          gbpToKes={gbpToKes}
                          onChange={(n) =>
                            setTxnDraft((prev) => ({ ...prev, [pot.id]: { ...td, amount: n } }))
                          }
                        />
                      </label>
                      <label>
                        Date
                        <input
                          type="date"
                          value={td.date}
                          onChange={(e) =>
                            setTxnDraft((prev) => ({
                              ...prev,
                              [pot.id]: { ...td, date: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label style={{ gridColumn: '1 / -1' }}>
                        Note (optional)
                        <input
                          type="text"
                          value={td.note}
                          onChange={(e) =>
                            setTxnDraft((prev) => ({
                              ...prev,
                              [pot.id]: { ...td, note: e.target.value },
                            }))
                          }
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => {
                        if (td.amount <= 0) return
                        update((s) => {
                          s.savingsEntries.unshift({
                            id: uid('se'),
                            potId: pot.id,
                            type: td.type,
                            amount: td.amount,
                            effectiveDate: td.date,
                            note: td.note,
                            loggedAt: new Date().toISOString(),
                          })
                        })
                        setOpenTxn((prev) => ({ ...prev, [pot.id]: null }))
                      }}
                    >
                      Add {td.type}
                    </button>
                  </div>
                )}
                {mode === 'performance' && (
                  <div className="txn-panel">
                    <div className="form-grid two">
                      <label>
                        Performance amount
                        <MoneyInput
                          value={td.perf}
                          currency={currency}
                          gbpToKes={gbpToKes}
                          min={-1e12}
                          onChange={(n) =>
                            setTxnDraft((prev) => ({ ...prev, [pot.id]: { ...td, perf: n } }))
                          }
                        />
                      </label>
                      <label>
                        Date
                        <input
                          type="date"
                          value={td.date}
                          onChange={(e) =>
                            setTxnDraft((prev) => ({
                              ...prev,
                              [pot.id]: { ...td, date: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label style={{ gridColumn: '1 / -1' }}>
                        Note (optional)
                        <input
                          type="text"
                          value={td.note}
                          onChange={(e) =>
                            setTxnDraft((prev) => ({
                              ...prev,
                              [pot.id]: { ...td, note: e.target.value },
                            }))
                          }
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => {
                        update((s) => {
                          s.savingsEntries.unshift({
                            id: uid('se'),
                            potId: pot.id,
                            type: 'performance',
                            amount: td.perf,
                            effectiveDate: td.date,
                            note: td.note,
                            loggedAt: new Date().toISOString(),
                          })
                        })
                        setOpenTxn((prev) => ({ ...prev, [pot.id]: null }))
                      }}
                    >
                      Add performance
                    </button>
                  </div>
                )}
                <div className="card-footer-actions">
                  {pot.archivedAt ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        update((s) => {
                          const p = s.pots.find((x) => x.id === pot.id)
                          if (p) p.archivedAt = null
                        })
                      }
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        update((s) => {
                          const p = s.pots.find((x) => x.id === pot.id)
                          if (p) p.archivedAt = new Date().toISOString()
                        })
                      }
                    >
                      Archive
                    </button>
                  )}
                  <button type="button" className="btn danger" onClick={() => setDeleteId(pot.id)}>
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <p className="footnote">
        Pot cards show all-time figures (balance now, accrued projection to today). The summary and
        chart below follow the period filter ({periodLabel}).
      </p>
      <p className="footnote">
        {showArchived ? 'Archived pots' : filter === 'all' ? 'All active pots' : filter} (
        {visible.length}) — {periodLabel}
      </p>

      <div className="summary-grid">
        <article className="metric-card">
          <p className="eyebrow">Principal</p>
          <p className="value">{money(summary.principal)}</p>
          <p className="hint">Deposits − withdrawals</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Projected performance</p>
          <p className="value">{money(summary.projected)}</p>
          <p className="hint">At expected rates. Next 12 months on balance: {money(summary.next12)}</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Actual performance</p>
          <p className={`value ${summary.actual < 0 ? 'neg' : ''}`}>{money(summary.actual)}</p>
          <p className="hint">Logged by you. vs projected: {money(summary.vs)}</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Balance</p>
          <p className="value">{money(summary.balance)}</p>
          <p className="hint">Principal + actual performance</p>
        </article>
      </div>

      <section className="card chart-card">
        <h2>Savings Flow — {periodLabel}</h2>
        <div className="dual-charts">
          <div style={{ width: '100%', height: 260 }}>
            <p className="chart-sub">Principal</p>
            <ResponsiveContainer>
              <BarChart data={chartPrincipal}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e5ef" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => compactAxis(Number(v), currency, gbpToKes)} width={52} />
                <Tooltip formatter={(v) => money(Number(v ?? 0))} />
                <Bar dataKey="principal" fill="#5b5ce2" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <p className="chart-sub">Projected vs actual performance</p>
            <ResponsiveContainer>
              <BarChart data={chartPerf}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e5ef" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => compactAxis(Number(v), currency, gbpToKes)} width={52} />
                <Tooltip formatter={(v) => money(Number(v ?? 0))} />
                <Legend />
                <Bar dataKey="projected" name="Projected" fill="#ea580c" radius={[8, 8, 0, 0]} />
                <Bar dataKey="actual" name="Actual" radius={[8, 8, 0, 0]}>
                  {chartPerf.map((row, i) => (
                    <Cell key={i} fill={row.actual >= 0 ? '#059669' : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Activity ledger</h2>
            <p className="footnote">{ledger.length} entries, newest first</p>
          </div>
          <select value={ledgerFilter} onChange={(e) => setLedgerFilter(e.target.value)}>
            <option value="all">All pots</option>
            {store.pots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="log-list">
          {ledger.map((e) => {
            const pot = store.pots.find((p) => p.id === e.potId)
            const label =
              e.type === 'created'
                ? 'Pot created'
                : e.type === 'deposit'
                  ? `Deposit ${money(e.amount)}`
                  : e.type === 'withdrawal'
                    ? `Withdrawal ${money(e.amount)}`
                    : `Performance ${money(e.amount)}`
            return (
              <div className="ledger-row" key={e.id}>
                <div>
                  <div className="title">
                    {label}
                    <span className="pill">{pot?.name ?? 'Unknown'}</span>
                  </div>
                  {e.note ? <div className="note">{e.note}</div> : null}
                  <div className="ledger-meta">
                    Effective {formatDate(e.effectiveDate)} · logged {formatDateTime(e.loggedAt)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {deleteId && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Delete pot?</h3>
            <p>This permanently removes the pot and its ledger entries.</p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  update((s) => {
                    s.pots = s.pots.filter((p) => p.id !== deleteId)
                    s.savingsEntries = s.savingsEntries.filter((e) => e.potId !== deleteId)
                  })
                  setDeleteId(null)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
