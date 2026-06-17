import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.on('request', async r => {
  if (r.url().includes('/api/applyItem') && r.method() === 'POST') {
    const data = r.postData()
    console.log('REQ:', r.method(), r.url().replace('http://localhost:5173', ''), 'BODY:', data?.slice(0, 200))
  }
})
page.on('response', async r => {
  if (r.url().includes('/api/applyItem') && r.request().method() === 'POST') {
    const body = await r.text()
    console.log('RESP', r.status(), ':', body.slice(0, 250))
  }
})
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
const inputs = await page.locator('input').all()
await inputs[0].fill('admin'); await inputs[1].fill('admin')
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard')
await page.waitForTimeout(2500)
console.log('--- 进 Part 列表 ---')
await page.goto('http://localhost:5173/item-types/Part', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
await browser.close()
