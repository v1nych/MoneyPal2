import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const OUT = '/tmp/debt-verify'
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(path.join(OUT, 'video'), { recursive: true })

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
  return p
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

  check('cashflow loads', await page.getByRole('heading', { name: 'Cashflow', exact: true }).isVisible())
  check('nav debt', await page.getByRole('link', { name: 'Debt' }).isVisible())
  check('nav savings', await page.getByRole('link', { name: 'Savings/Investments' }).isVisible())
  check('gbp toggle', await page.getByRole('button', { name: 'GBP' }).isVisible())
  await shot('01-cashflow')

  // Fill cashflow quickly — first card Income fields
  const incomeCard = page.locator('section.card', { hasText: 'Gross Income' })
  await incomeCard.locator('.money-input input').nth(0).fill('4200')
  await incomeCard.locator('.money-input input').nth(1).fill('3200')
  await page.waitForTimeout(300)
  await shot('02-cashflow-filled')

  await page.getByRole('link', { name: 'Savings/Investments' }).click()
  await page.waitForURL('**/savings**')
  check('savings page', await page.getByRole('heading', { name: 'Savings', exact: true }).isVisible())
  const emptySav = await page.getByText('Nothing to see here').isVisible().catch(() => false)
  if (emptySav) {
    await page.getByRole('button', { name: '+ New pot' }).first().click()
    await page.getByPlaceholder('e.g. Emergency fund').fill('Emergency fund')
    await page.locator('label', { hasText: 'Opening deposit' }).locator('input').fill('1000')
    await page.getByRole('button', { name: 'Create pot' }).click()
    await page.waitForTimeout(300)
  }
  await shot('03-savings')

  await page.getByRole('link', { name: 'Debt' }).click()
  await page.waitForURL('**/debt**')
  await page.getByRole('heading', { name: 'Nothing to see here' }).waitFor({ state: 'visible' })
  check('debt empty', await page.getByRole('heading', { name: 'Nothing to see here' }).isVisible())
  await shot('04-debt-empty')

  await page.getByRole('button', { name: '+ New debt' }).first().click()
  await page.getByPlaceholder('e.g. Car loan').fill('Car loan')
  const form = page.locator('section.card', { hasText: 'New debt' })
  await form.locator('label', { hasText: 'Principal' }).locator('input').fill('8000')
  await form.locator('label', { hasText: 'Interest rate' }).locator('input').fill('5.9')
  await form.locator('label', { hasText: 'Start date' }).locator('input').fill('2026-01-01')
  await form.locator('label', { hasText: 'Loan period (years)' }).locator('input').fill('3')
  await form.locator('label', { hasText: 'Notes' }).locator('textarea').fill('Demo loan')
  await page.getByRole('button', { name: 'Add debt' }).click()
  await page.waitForTimeout(400)

  check('debt card name', await page.getByRole('heading', { name: 'Car loan' }).isVisible())
  check('amount left label', await page.getByText('Amount left', { exact: true }).first().isVisible())
  check('projected interest', await page.getByText('Projected interest left').first().isVisible())
  check('payments left', await page.getByText('Payments left').first().isVisible())
  await shot('05-debt-card')

  await page.getByRole('button', { name: 'By time' }).click()
  await page.waitForTimeout(200)
  await shot('06-debt-progress-time')
  await page.getByRole('button', { name: 'By amount' }).click()

  await page.getByRole('button', { name: 'Log payment' }).click()
  const pay = page.locator('.txn-panel')
  await pay.locator('label', { hasText: 'Amount' }).locator('input').fill('500')
  await pay.locator('label', { hasText: 'Note' }).locator('input').fill('First payment')
  await page.getByRole('button', { name: 'Add payment' }).click()
  await page.waitForTimeout(400)
  check('payment logged', (await page.getByText('First payment').count()) >= 1)
  const leftText = await page.locator('.balance-block .amount').first().innerText()
  check('amount left after pay', leftText.includes('7,500'), leftText)
  await shot('07-debt-payment')

  await page.locator('.entity-card', { hasText: 'Car loan' }).getByRole('button', { name: 'Archive' }).click()
  await page.getByRole('button', { name: /Archived \(/ }).click()
  check('archived visible', await page.getByRole('heading', { name: 'Car loan' }).isVisible())
  await page.getByRole('button', { name: 'Restore' }).click()
  await page.getByRole('button', { name: 'Show active' }).click()
  check('restored', await page.getByRole('heading', { name: 'Car loan' }).isVisible())
  await shot('08-debt-restored')

  await page.getByRole('button', { name: 'KES' }).click()
  await page.waitForTimeout(200)
  const kesText = await page.locator('.balance-block .amount').first().innerText()
  check('kes currency', kesText.includes('KSh'), kesText)
  await shot('09-debt-kes')
  await page.getByRole('button', { name: 'GBP' }).click()

  await page.getByRole('button', { name: '+ New debt' }).first().click()
  await page.getByPlaceholder('e.g. Car loan').fill('Temp')
  const form2 = page.locator('section.card', { hasText: 'New debt' })
  await form2.locator('label', { hasText: 'Principal' }).locator('input').fill('100')
  await form2.locator('label', { hasText: 'Loan period (years)' }).locator('input').fill('1')
  await page.getByRole('button', { name: 'Add debt' }).click()
  await page.waitForTimeout(300)
  const tempCard = page.locator('.entity-card', { hasText: 'Temp' })
  await tempCard.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('heading', { name: 'Delete this debt?' }).waitFor()
  await page.locator('.modal').getByRole('button', { name: 'Delete' }).click()
  await page.waitForTimeout(300)
  check(
    'temp deleted',
    (await page.getByRole('heading', { name: 'Temp' }).count()) === 0,
  )
  check('car remains', await page.getByRole('heading', { name: 'Car loan' }).isVisible())
  await shot('10-debt-final')

  await page.getByRole('link', { name: 'Savings/Investments' }).click()
  await shot('11-savings-final')
  await page.getByRole('link', { name: 'Cashflow' }).click()
  await shot('12-cashflow-final')
} catch (err) {
  console.error('ERROR', err)
  await shot('error')
  results.push({ name: 'script', ok: false, detail: String(err) })
}

const videoPath = await page.video()?.path()
await context.close()
await browser.close()

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ results, videoPath }, null, 2))
console.log('RESULTS', JSON.stringify(results, null, 2))
console.log('VIDEO', videoPath)
const failed = results.filter((r) => !r.ok)
process.exit(failed.length ? 1 : 0)
