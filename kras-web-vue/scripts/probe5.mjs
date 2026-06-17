import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()

const errs = []
const apis = []
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
page.on('response', r => { if (r.url().includes('/api/')) apis.push(`${r.status()} ${r.request().method()} ${r.url().replace('http://localhost:5173', '')}`) })

await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
const inputs = await page.locator('input').all()
await inputs[0].fill('admin'); await inputs[1].fill('admin')
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard')
await page.waitForTimeout(2000)

console.log('--- 登录后到 dashboard ---')
console.log('  API 调用:', apis.length, '个')
apis.length = 0

console.log('--- 直接访问 /item-types/Part ---')
await page.goto('http://localhost:5173/item-types/Part', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const rows = await page.locator('.kras-grid-row').count()
console.log('  行数:', rows)
console.log('  API 调用:')
apis.forEach(a => console.log('    ', a))
console.log('  console errors:', errs)

await page.screenshot({ path: '/tmp/list-direct.png' })
await browser.close()
