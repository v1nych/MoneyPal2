# MoneyPal2

Local-first money tracker with **Cashflow**, **Savings/Investments**, and **Debt**.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL (usually `http://127.0.0.1:5173`). Data lives in `localStorage` under `moneypal2.store.v1`.

## Sections

- **Cashflow** — monthly income, expenses, extras, property, savings allocation, free cash, chart, and logs
- **Savings/Investments** — pots with deposits/withdrawals, expected rate projections, archive/restore, charts, ledger
- **Debt** — loans with principal, APR, start date, term; payment logging; projected interest / amount left / payments left; progress by amount or by time

## Currency

GBP ↔ KES display toggle with editable exchange rate. Values are stored in GBP.
