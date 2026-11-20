import { useCallback, useEffect, useState } from 'react'
import type { MoneyPalStore } from '../types'
import { loadStore, saveStore } from '../lib/storage'

export function useMoneyPalStore() {
  const [store, setStore] = useState<MoneyPalStore>(() => loadStore())

  useEffect(() => {
    saveStore(store)
  }, [store])

  const update = useCallback((fn: (draft: MoneyPalStore) => void) => {
    setStore((prev) => {
      const draft = structuredClone(prev)
      fn(draft)
      return draft
    })
  }, [])

  const replace = useCallback((next: MoneyPalStore) => setStore(next), [])

  return { store, update, replace }
}
