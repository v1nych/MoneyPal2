import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const OUT = '/tmp/align-verify'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  headless: false,
  env: { ...process.env, DISPLAY: ':1' },
})
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: { dir: path.join(OUT, 'video'), size: { width: 1280, height: 900 } },
})
const page = await context.newPage()
const shot = async (name) => {
  const p = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: p, fullPage: true })
  console.log('SHOT', p)
}
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(ok ? 'PASS' : 'FAIL', name, detail)
}

try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })

  // Cashflow header layout
  check('cashflow title', await page.getByRole('heading', { name: 'Cashflow', exact: true }).isVisible())
  check('month nav', await page.locator('.month-nav .month-label').isVisible())
  check('gbp', await page.getByRole('button', { name: 'GBP' }).isVisible())

  const income = page.locator('section.card', { hasText: 'Monthly pay' })
  await income.locator('.money-input input').nth(0).fill('4200')
  await income.locator('.money-input input').nth(1).fill('3200')

  // Add expense
  await page.locator('section.card', { hasText: 'Income Expenses' }).getByRole('button', { name: '+ Add field' }).click()
  const expRow = page.locator('section.card', { hasText: 'Income Expenses' }).locator('.named-row').last()
  await expRow.locator('input[type="text"]').fill('Rent')
  await expRow.locator('.money-input input').fill('5000') // force negative free cash
  await page.waitForTimeout(300)

  const freeCash = await page.locator('.metric-card.wide .value').innerText()
  check('free cash negative', freeCash.includes('-'), freeCash)
  await shot('align-cashflow-01-negative')

  // Log note
  await page.locator('.notes-log-card textarea').fill('Alignment log')
  await page.locator('.notes-log-card').getByRole('button', { name: 'Log' }).click()
  await page.waitForTimeout(200)
  check('log saved', await page.getByText('Alignment log').isVisible())
  check('chart title dash', await page.getByRole('heading', { name: /Cashflow - / }).isVisible())
  await shot('align-cashflow-02-logged')

  // Savings
  await page.getByRole('link', { name: 'Savings/Investments' }).click()
  await page.waitForURL('**/savings**')
  check('savings title', await page.getByRole('heading', { name: 'Savings', exact: true }).isVisible())
  check('period month', await page.locator('.period-seg').getByRole('button', { name: 'Month' }).isVisible())
  check('no category presets in filters', (await page.getByRole('button', { name: 'ETF portfolio' }).count()) === 0)

  await page.getByRole('button', { name: '+ New pot' }).first().click()
  check('create form name+rate only', await page.getByText('Name it and set the expected annual rate').isVisible())
  check('no category select', (await page.locator('section.card', { hasText: 'New pot' }).locator('select').count()) === 0)
  await page.getByPlaceholder('e.g. Emergency fund').fill('Emergency fund')
  await page.locator('label', { hasText: 'Expected rate' }).locator('input').fill('4')
  await page.getByRole('button', { name: 'Create pot' }).click()
  await page.waitForTimeout(300)

  // Deposit
  const pot = page.locator('.entity-card', { hasText: 'Emergency fund' })
  await pot.getByRole('button', { name: 'Log payment' }).click()
  await pot.locator('.txn-panel label', { hasText: 'Amount' }).locator('input').fill('1000')
  await pot.getByRole('button', { name: 'Add deposit' }).click()
  await page.waitForTimeout(200)

  // Performance as %
  await pot.getByRole('button', { name: 'Log actual performance' }).click()
  await pot.locator('.txn-panel').getByRole('button', { name: '%' }).click()
  await pot.locator('.txn-panel label', { hasText: '% of principal' }).locator('input').fill('3')
  await pot.getByRole('button', { name: 'Add performance' }).click()
  await page.waitForTimeout(300)
  check('wording next 12', await page.getByText('Projected performance, next 12 months').first().isVisible())
  await shot('align-savings-01-pot')

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(200)
  await shot('align-savings-02-charts')

  // KES
  await page.getByRole('button', { name: 'KES' }).click()
  await page.waitForTimeout(200)
  check('kes', (await page.locator('.balance-block .amount').first().innerText()).includes('KSh'))
  await shot('align-savings-03-kes')
  await page.getByRole('button', { name: 'GBP' }).click()

  // Debt shell still works
  await page.getByRole('link', { name: 'Debt' }).click()
  check('debt chrome', await page.getByRole('heading', { name: 'Debt', exact: true }).isVisible())
  await shot('align-debt-shell')
} catch (err) {
  console.error('ERROR', err)
  await shot('error')
  results.push({ name: 'script', ok: false, detail: String(err) })
}

const videoPath = await page.video()?.path()
await context.close()
await browser.close()
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ results, videoPath }, null, 2))
console.log(JSON.stringify(results, null, 2))
console.log('VIDEO', videoPath)
process.exit(results.some((r) => !r.ok) ? 1 : 0)
