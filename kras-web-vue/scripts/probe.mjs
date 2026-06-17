import { chromium } from 'playwright'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) => logs.push(`[failed] ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => {
  if (r.url().includes('/api/') && r.status() >= 400) logs.push(`[resp ${r.status()}] ${r.url()}`)
})

await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 15000 }).catch(e => logs.push('GOTO FAIL: ' + e.message))
await page.waitForTimeout(3000)
await page.screenshot({ path: '/tmp/login-shot.png' })

const html = await page.content()
console.log('HTML length:', html.length)
console.log('Title:', await page.title())
console.log('URL:', page.url())
console.log('Body snippet:', (await page.locator('body').innerText().catch(() => 'N/A')).slice(0, 200))
console.log('Logs:')
logs.slice(-30).forEach(l => console.log('  ', l))

await browser.close()
