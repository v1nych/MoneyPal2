import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useMoneyPalStore } from './hooks/useMoneyPalStore'
import { monthKeyFromDate } from './lib/format'
import { ensureCashflowMonth } from './lib/storage'
import { CashflowPage } from './pages/CashflowPage'
import { DebtPage } from './pages/DebtPage'
import { SavingsPage } from './pages/SavingsPage'
import type { Currency, SavingsPeriod } from './types'
import './App.css'

function AppRoutes() {
  const { store, update } = useMoneyPalStore()
  const [params, setParams] = useSearchParams()
  const monthKey = params.get('month') || monthKeyFromDate()
  const period = (params.get('period') as SavingsPeriod) || 'month'

  const setMonth = (key: string) => {
    const next = new URLSearchParams(params)
    next.set('month', key)
    setParams(next, { replace: true })
    update((draft) => {
      ensureCashflowMonth(draft, key)
    })
  }

  const setPeriod = (p: SavingsPeriod) => {
    const next = new URLSearchParams(params)
    next.set('period', p)
    setParams(next, { replace: true })
  }

  return (
    <Routes>
      <Route
        element={
          <AppShell
            store={store}
            monthKey={monthKey}
            onMonth={setMonth}
            period={period}
            onPeriod={setPeriod}
            update={update}
            onCurrency={(c: Currency) =>
              update((draft) => {
                draft.settings.currency = c
              })
            }
            onRate={(n: number) =>
              update((draft) => {
                draft.settings.gbpToKes = n
              })
            }
          />
        }
      >
        <Route index element={<CashflowPage />} />
        <Route path="savings" element={<SavingsPage />} />
        <Route path="debt" element={<DebtPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return <AppRoutes />
}
