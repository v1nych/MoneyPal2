import type { Currency } from '../types'
import { currencySymbol } from '../lib/format'

interface Props {
  value: number
  onChange: (n: number) => void
  currency: Currency
  /** Values are always stored in GBP; display converts for KES */
  gbpToKes: number
  className?: string
  min?: number
  step?: number
  ariaLabel?: string
}

export function MoneyInput({
  value,
  onChange,
  currency,
  gbpToKes,
  className,
  min = 0,
  step = 0.01,
  ariaLabel,
}: Props) {
  const display = currency === 'KES' ? value * gbpToKes : value
  return (
    <div className={`money-input ${className ?? ''}`}>
      <span className="money-prefix">{currencySymbol(currency)}</span>
      <input
        type="number"
        min={min}
        step={step}
        aria-label={ariaLabel}
        value={Number.isFinite(display) ? display : 0}
        onChange={(e) => {
          const raw = Number(e.target.value)
          if (!Number.isFinite(raw)) {
            onChange(0)
            return
          }
          onChange(currency === 'KES' ? raw / (gbpToKes || 1) : raw)
        }}
      />
    </div>
  )
}
