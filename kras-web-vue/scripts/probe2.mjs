import { chromium } from 'playwright'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const errors = []
const networkFails = []
const requests = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push('PAGE_ERROR: ' + e.message))
page.on('requestfailed', (r) => {
  const url = r.url()
  if (url.endsWith('favicon.ico') || url.includes('mockServiceWorker')) return
  networkFails.push(`${r.method()} ${url} ${r.failure()?.errorText}`)
})
page.on('response', (resp) => {
  if (!resp.url().includes('/api/')) return
  requests.push(`${resp.status()} ${resp.request().method()} ${resp.url().replace('http://localhost:5173', '')}`)
  if (resp.status() >= 400) {
    networkFails.push(`HTTP ${resp.status()} ${resp.request().method()} ${resp.url()}`)
  }
})

console.log('打开登录页...')
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

console.log('填写并提交登录...')
const inputs = await page.locator('input').all()
console.log(`input count: ${inputs.length}`)
if (inputs.length >= 2) {
  await inputs[0].fill('admin')
  await inputs[1].fill('admin')
}
await page.click('button[type="submit"]')
await page.waitForTimeout(2000)
console.log('当前 URL:', page.url())

await page.screenshot({ path: '/tmp/kras-01-after-login.png' })

if (page.url().includes('dashboard')) {
  console.log('进入仪表盘 OK，等数据加载...')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '/tmp/kras-02-dashboard.png' })
}

console.log('\n=== 汇总 ===')
console.log(`请求数: ${requests.length}`)
console.log(`Console errors: ${errors.length}`)
console.log(`Network 失败: ${networkFails.length}`)
errors.forEach(e => console.log('  ERR:', e.slice(0, 200)))
networkFails.forEach(e => console.log('  NET:', e))
console.log('\n所有 API 请求:')
requests.forEach(r => console.log(' ', r))

await browser.close()
