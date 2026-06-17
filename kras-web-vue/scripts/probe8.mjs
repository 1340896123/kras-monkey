import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.on('console', m => console.log('[B ' + m.type() + ']', m.text().slice(0, 200)))
page.on('response', async r => { if (r.url().includes('/api/applyItem') && r.request().method() === 'POST') {
  const d = r.request().postData()
  console.log('[REQ]', d?.slice(0, 150))
}})
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
const inputs = await page.locator('input').all()
await inputs[0].fill('admin'); await inputs[1].fill('admin')
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard')
await page.waitForTimeout(2000)
await page.goto('http://localhost:5173/item-types/Part', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
console.log('双击行...')
const result = await page.evaluate(() => {
  const rows = document.querySelectorAll('.kras-grid-row')
  if (rows.length === 0) return 'no rows'
  // 找"查看"按钮触发 click（这是 Button 的 @click）
  const btn = rows[0].querySelector('button')
  if (btn) {
    btn.click()
    return 'clicked button'
  }
  return 'no button'
})
console.log('evaluate:', result)
await page.waitForTimeout(2000)
console.log('按钮点击后 URL:', page.url())
const hasDetail = await page.locator('.detail-page').count()
console.log('detail-page 数:', hasDetail)
await page.screenshot({ path: '/tmp/detail.png' })
await browser.close()
