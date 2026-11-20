import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useOutletContext } from 'react-router-dom'
import type { ShellOutletContext } from '../components/AppShell'
import { EmptyState } from '../components/EmptyState'
import { MoneyInput } from '../components/MoneyInput'
import { PageChrome } from '../components/PageChrome'
import {
  amountLeft,
  formatTerm,
  monthlyPayment,
  paymentsLeftFromBalance,
  progressByAmount,
  progressByTime,
  projectedRemainingInterest,
  totalScheduledInterest,
} from '../lib/debtMath'
import {
  compactAxis,
  formatDate,
  formatDateTime,
  formatMoney,
  formatMonthLabel,
  monthsBetween,
  todayISO,
} from '../lib/format'
import { uid } from '../lib/storage'
import type { Debt, ProgressMode } from '../types'


interface DebtDraft {
  name: string
  principal: number
  annualRatePct: number
  startDate: string
  termYears: number
  termMonthsExtra: number
  notes: string
}

const emptyDraft = (): DebtDraft => ({
  name: '',
  principal: 0,
  annualRatePct: 5.9,
  startDate: todayISO(),
  termYears: 3,
  termMonthsExtra: 0,
  notes: '',
})

function debtMetrics(debt: Debt, totalPaid: number) {
  const left = amountLeft(debt.principal, totalPaid)
  const contractual = monthlyPayment(debt.principal, debt.annualRate, debt.termMonths)
  const elapsed = monthsBetween(debt.startDate)
  const scheduledRemaining = Math.max(0, debt.termMonths - elapsed)
  const payLeft = paymentsLeftFromBalance(left, contractual, scheduledRemaining)
  const interestFull = totalScheduledInterest(debt.principal, debt.annualRate, debt.termMonths)
  const interestRemaining = projectedRemainingInterest(left, debt.annualRate, payLeft)
  const amtProgress = progressByAmount(debt.principal, left)
  const timeProgress = progressByTime(debt.termMonths, elapsed)
  return {
    left,
    contractual,
    elapsed,
    payLeft,
    interestFull,
    interestRemaining,
    amtProgress,
    timeProgress,
    totalPaid,
  }
}

export function DebtPage() {
  const { store, monthKey, onMonth, period, onPeriod, onCurrency, onRate, update } =
    useOutletContext<ShellOutletContext>()
  const { currency, gbpToKes, debtProgressMode } = store.settings
  const money = (n: number) => formatMoney(n, currency, gbpToKes)
  const [showArchived, setShowArchived] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DebtDraft>(emptyDraft())
  const [payOpen, setPayOpen] = useState<Record<string, boolean>>({})
  const [payDraft, setPayDraft] = useState<
    Record<string, { amount: number; date: string; note: string }>
  >({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const debts = store.debts.filter((d) => (showArchived ? !!d.archivedAt : !d.archivedAt))
  const periodLabel =
    period === 'all' ? 'All time' : period === 'year' ? monthKey.slice(0, 4) : formatMonthLabel(monthKey)

  const paymentsFor = (debtId: string) =>
    store.debtPayments.filter((p) => p.debtId === debtId)

  const totalPaid = (debtId: string) =>
    paymentsFor(debtId).reduce((s, p) => s + p.amount, 0)

  const periodPaid = (debtId: string) =>
    paymentsFor(debtId)
      .filter((p) => {
        if (period === 'all') return true
        if (period === 'month') return p.date.startsWith(monthKey)
        return p.date.startsWith(monthKey.slice(0, 4))
      })
      .reduce((s, p) => s + p.amount, 0)

  const summary = useMemo(() => {
    const active = store.debts.filter((d) => !d.archivedAt)
    let principal = 0
    let left = 0
    let interest = 0
    let paidPeriod = 0
    for (const d of active) {
      const paid = totalPaid(d.id)
      const m = debtMetrics(d, paid)
      principal += d.principal
      left += m.left
      interest += m.interestRemaining
      paidPeriod += periodPaid(d.id)
    }
    return { principal, left, interest, paidPeriod, count: active.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.debts, store.debtPayments, period, monthKey])

  const chartData = debts.map((d) => {
    const m = debtMetrics(d, totalPaid(d.id))
    return {
      name: d.name,
      remaining: m.left,
      paid: m.totalPaid,
      interest: m.interestRemaining,
    }
  })

  const openCreate = () => {
    setEditingId(null)
    setDraft(emptyDraft())
    setCreating(true)
  }

  const openEdit = (debt: Debt) => {
    setEditingId(debt.id)
    setDraft({
      name: debt.name,
      principal: debt.principal,
      annualRatePct: Number((debt.annualRate * 100).toFixed(3)),
      startDate: debt.startDate,
      termYears: Math.floor(debt.termMonths / 12),
      termMonthsExtra: debt.termMonths % 12,
      notes: debt.notes,
    })
    setCreating(true)
  }

  const saveDebt = () => {
    const termMonths = draft.termYears * 12 + draft.termMonthsExtra
    if (!draft.name.trim() || draft.principal <= 0 || termMonths <= 0) return
    update((s) => {
      if (editingId) {
        const d = s.debts.find((x) => x.id === editingId)
        if (d) {
          d.name = draft.name.trim()
          d.principal = draft.principal
          d.annualRate = draft.annualRatePct / 100
          d.startDate = draft.startDate
          d.termMonths = termMonths
          d.notes = draft.notes
        }
      } else {
        s.debts.unshift({
          id: uid('debt'),
          name: draft.name.trim(),
          principal: draft.principal,
          annualRate: draft.annualRatePct / 100,
          startDate: draft.startDate,
          termMonths,
          notes: draft.notes,
          createdAt: new Date().toISOString(),
          archivedAt: null,
        })
      }
    })
    setCreating(false)
    setEditingId(null)
    setDraft(emptyDraft())
  }

  const setProgressMode = (mode: ProgressMode) => {
    update((s) => {
      s.settings.debtProgressMode = mode
    })
  }

  const ledger = store.debtPayments
    .slice()
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
    .slice(0, 40)

  return (
    <main className="page">
      <PageChrome
        title="Debt"
        store={store}
        monthKey={monthKey}
        onMonth={onMonth}
        period={period}
        onPeriod={onPeriod}
        showPeriod
        onCurrency={onCurrency}
        onRate={onRate}
        actions={
          <div className="page-actions">
            <button type="button" className="btn subtle" onClick={() => setShowArchived((v) => !v)}>
              {showArchived
                ? 'Show active'
                : `Archived (${store.debts.filter((d) => d.archivedAt).length})`}
            </button>
            <button type="button" className="btn primary" onClick={openCreate}>
              + New debt
            </button>
          </div>
        }
        filters={
          <div className="filters" style={{ marginTop: '0.55rem' }}>
            <span className="filter-chip on">
              {showArchived ? 'Archived' : 'Active'} ({debts.length})
            </span>
            <div className="mini-seg" aria-label="Progress mode">
              <button
                type="button"
                className={debtProgressMode === 'amount' ? 'on' : ''}
                onClick={() => setProgressMode('amount')}
              >
                By amount
              </button>
              <button
                type="button"
                className={debtProgressMode === 'time' ? 'on' : ''}
                onClick={() => setProgressMode('time')}
              >
                By time
              </button>
            </div>
          </div>
        }
      />

      {creating && (
        <section className="card">
          <h2>{editingId ? 'Edit debt' : 'New debt'}</h2>
          <div className="form-grid two">
            <label>
              Name
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Car loan"
              />
            </label>
            <label>
              Principal
              <MoneyInput
                value={draft.principal}
                currency={currency}
                gbpToKes={gbpToKes}
                onChange={(n) => setDraft({ ...draft, principal: n })}
              />
            </label>
            <label>
              Interest rate (% APR)
              <input
                type="number"
                step={0.01}
                value={draft.annualRatePct}
                onChange={(e) =>
                  setDraft({ ...draft, annualRatePct: Number(e.target.value) || 0 })
                }
              />
            </label>
            <label>
              Start date
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
              />
            </label>
            <label>
              Loan period (years)
              <input
                type="number"
                min={0}
                value={draft.termYears}
                onChange={(e) =>
                  setDraft({ ...draft, termYears: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </label>
            <label>
              Extra months
              <input
                type="number"
                min={0}
                max={11}
                value={draft.termMonthsExtra}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    termMonthsExtra: Math.min(11, Math.max(0, Number(e.target.value) || 0)),
                  })
                }
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
            <button
              type="button"
              className="btn"
              onClick={() => {
                setCreating(false)
                setEditingId(null)
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn primary" onClick={saveDebt}>
              {editingId ? 'Save changes' : 'Add debt'}
            </button>
          </div>
        </section>
      )}

      {debts.length === 0 ? (
        <EmptyState
          title="Nothing to see here"
          hint={
            showArchived
              ? 'No archived debts. Archive a debt to tuck it away without deleting.'
              : 'Add a loan or balance to track payments, interest, and payoff progress.'
          }
          action={
            !showArchived ? (
              <button type="button" className="btn primary" onClick={openCreate}>
                + New debt
              </button>
            ) : null
          }
        />
      ) : (
        <div className="debt-grid">
          {debts.map((debt) => {
            const m = debtMetrics(debt, totalPaid(debt.id))
            const progress = debtProgressMode === 'amount' ? m.amtProgress : m.timeProgress
            const open = !!payOpen[debt.id]
            const pd = payDraft[debt.id] ?? { amount: 0, date: todayISO(), note: '' }
            const recent = paymentsFor(debt.id)
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date) || b.loggedAt.localeCompare(a.loggedAt))
              .slice(0, 5)

            return (
              <article
                key={debt.id}
                className={`entity-card ${debt.archivedAt ? 'archived' : ''}`}
              >
                <div className="card-head" style={{ marginBottom: 0 }}>
                  <h3 className="entity-title">{debt.name}</h3>
                  <button type="button" className="linkish" onClick={() => openEdit(debt)}>
                    Edit
                  </button>
                </div>
                <div className="balance-block">
                  <div className="label">Amount left</div>
                  <div className="amount">{money(m.left)}</div>
                </div>
                <div className="stat-grid">
                  <div className="stat">
                    <span className="label">Principal</span>
                    <strong>{money(debt.principal)}</strong>
                  </div>
                  <div className="stat">
                    <span className="label">Interest rate</span>
                    <strong>{(debt.annualRate * 100).toFixed(2)}%</strong>
                  </div>
                  <div className="stat">
                    <span className="label">Projected interest left</span>
                    <strong>{money(m.interestRemaining)}</strong>
                  </div>
                  <div className="stat">
                    <span className="label">Payments left</span>
                    <strong>{m.payLeft}</strong>
                  </div>
                  <div className="stat">
                    <span className="label">Scheduled payment</span>
                    <strong>{money(m.contractual)}/mo</strong>
                  </div>
                  <div className="stat">
                    <span className="label">Loan period</span>
                    <strong>{formatTerm(debt.termMonths)}</strong>
                  </div>
                  <div className="stat">
                    <span className="label">Started</span>
                    <strong>{formatDate(debt.startDate)}</strong>
                  </div>
                  <div className="stat">
                    <span className="label">Paid so far</span>
                    <strong>{money(m.totalPaid)}</strong>
                  </div>
                </div>

                <div>
                  <div className="card-head" style={{ marginBottom: '0.35rem' }}>
                    <span className="label">
                      Progress ({debtProgressMode === 'amount' ? 'by amount' : 'by time'})
                    </span>
                    <strong>{progress.toFixed(1)}%</strong>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <p className="footnote">
                    {debtProgressMode === 'amount'
                      ? `${money(debt.principal - m.left)} of ${money(debt.principal)} paid`
                      : `${m.elapsed} of ${debt.termMonths} months elapsed`}
                  </p>
                </div>

                <div className="notes-field">
                  <label>Notes</label>
                  <textarea
                    value={debt.notes}
                    onChange={(e) =>
                      update((s) => {
                        const d = s.debts.find((x) => x.id === debt.id)
                        if (d) d.notes = e.target.value
                      })
                    }
                  />
                </div>

                <button
                  type="button"
                  className="linkish"
                  onClick={() => {
                    setPayOpen((prev) => ({ ...prev, [debt.id]: !prev[debt.id] }))
                    setPayDraft((prev) => ({
                      ...prev,
                      [debt.id]: prev[debt.id] ?? { amount: 0, date: todayISO(), note: '' },
                    }))
                  }}
                >
                  {open ? 'Hide payment form' : 'Log payment'}
                </button>

                {open && (
                  <div className="txn-panel">
                    <div className="form-grid two">
                      <label>
                        Amount
                        <MoneyInput
                          value={pd.amount}
                          currency={currency}
                          gbpToKes={gbpToKes}
                          onChange={(n) =>
                            setPayDraft((prev) => ({
                              ...prev,
                              [debt.id]: { ...pd, amount: n },
                            }))
                          }
                        />
                      </label>
                      <label>
                        Date
                        <input
                          type="date"
                          value={pd.date}
                          onChange={(e) =>
                            setPayDraft((prev) => ({
                              ...prev,
                              [debt.id]: { ...pd, date: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label style={{ gridColumn: '1 / -1' }}>
                        Note (optional)
                        <input
                          type="text"
                          value={pd.note}
                          onChange={(e) =>
                            setPayDraft((prev) => ({
                              ...prev,
                              [debt.id]: { ...pd, note: e.target.value },
                            }))
                          }
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => {
                        if (pd.amount <= 0) return
                        update((s) => {
                          s.debtPayments.unshift({
                            id: uid('dp'),
                            debtId: debt.id,
                            amount: pd.amount,
                            date: pd.date,
                            note: pd.note,
                            loggedAt: new Date().toISOString(),
                          })
                        })
                        setPayOpen((prev) => ({ ...prev, [debt.id]: false }))
                        setPayDraft((prev) => ({
                          ...prev,
                          [debt.id]: { amount: 0, date: todayISO(), note: '' },
                        }))
                      }}
                    >
                      Add payment
                    </button>
                  </div>
                )}

                {recent.length > 0 && (
                  <div>
                    <p className="label" style={{ marginBottom: '0.35rem' }}>
                      Recent payments
                    </p>
                    <div className="log-list">
                      {recent.map((p) => (
                        <div className="ledger-row" key={p.id}>
                          <div>
                            <div className="title">{money(p.amount)}</div>
                            {p.note ? <div className="note">{p.note}</div> : null}
                            <div className="ledger-meta">
                              {formatDate(p.date)} · logged {formatDateTime(p.loggedAt)}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="linkish danger"
                            onClick={() =>
                              update((s) => {
                                s.debtPayments = s.debtPayments.filter((x) => x.id !== p.id)
                              })
                            }
                          >
                            Undo
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="card-footer-actions">
                  {debt.archivedAt ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        update((s) => {
                          const d = s.debts.find((x) => x.id === debt.id)
                          if (d) d.archivedAt = null
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
                          const d = s.debts.find((x) => x.id === debt.id)
                          if (d) d.archivedAt = new Date().toISOString()
                        })
                      }
                    >
                      Archive
                    </button>
                  )}
                  <button type="button" className="btn danger" onClick={() => setDeleteId(debt.id)}>
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <p className="footnote">
        Debt cards use all-time principal and payments. Summary metrics for paid amounts follow the
        period filter ({periodLabel}).
      </p>

      <div className="summary-grid">
        <article className="metric-card">
          <p className="eyebrow">Principal</p>
          <p className="value">{money(summary.principal)}</p>
          <p className="hint">Sum of active loan principals</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Amount left</p>
          <p className="value">{money(summary.left)}</p>
          <p className="hint">Principal − payments logged</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Projected interest left</p>
          <p className="value">{money(summary.interest)}</p>
          <p className="hint">If remaining balance is amortised at each loan’s rate</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Paid ({periodLabel})</p>
          <p className="value">{money(summary.paidPeriod)}</p>
          <p className="hint">Payments logged in the selected period</p>
        </article>
      </div>

      {debts.length > 0 && (
        <section className="card chart-card">
          <h2>Debt mix — remaining vs paid</h2>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e5ef" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => compactAxis(Number(v), currency, gbpToKes)} width={52} />
                <Tooltip formatter={(v) => money(Number(v ?? 0))} />
                <Bar dataKey="remaining" name="Amount left" stackId="a" fill="#5b5ce2" />
                <Bar dataKey="paid" name="Paid" stackId="a" fill="#a5b4fc" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Payment ledger</h2>
            <p className="footnote">{ledger.length} recent payments, newest first</p>
          </div>
        </div>
        {ledger.length === 0 ? (
          <p className="footnote">No payments logged yet.</p>
        ) : (
          <div className="log-list">
            {ledger.map((p) => {
              const debt = store.debts.find((d) => d.id === p.debtId)
              return (
                <div className="ledger-row" key={p.id}>
                  <div>
                    <div className="title">
                      Payment {money(p.amount)}
                      <span className="pill">{debt?.name ?? 'Deleted debt'}</span>
                    </div>
                    {p.note ? <div className="note">{p.note}</div> : null}
                    <div className="ledger-meta">
                      {formatDate(p.date)} · logged {formatDateTime(p.loggedAt)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {deleteId && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Delete this debt?</h3>
            <p>This permanently removes the debt and its payment history. This cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  update((s) => {
                    s.debts = s.debts.filter((d) => d.id !== deleteId)
                    s.debtPayments = s.debtPayments.filter((p) => p.debtId !== deleteId)
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
