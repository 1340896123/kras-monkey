import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.on('console', m => console.log('[BROWSER ' + m.type() + ']', m.text()))
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
const inputs = await page.locator('input').all()
await inputs[0].fill('admin'); await inputs[1].fill('admin')
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard')
await page.waitForTimeout(2000)

console.log('--- 进 Part 列表 ---')
await page.goto('http://localhost:5173/item-types/Part', { waitUntil: 'networkidle' })
await page.waitForTimeout(6000)

// 看 rows.length 的值
const rowsCount = await page.evaluate(() => {
  // 通过 vue devtools 拿不到，但可以看 .kras-grid-row 数
  return document.querySelectorAll('.kras-grid-row').length
})
console.log('grid-row DOM 数:', rowsCount)
const tbodyHtml = await page.locator('table.kras-grid tbody').innerHTML().catch(() => 'N/A')
console.log('tbody HTML 长度:', tbodyHtml.length)
console.log('tbody 内容前 400:', tbodyHtml.slice(0, 400))

// 查 DOM
const tableHtml = await page.locator('table.kras-grid').innerHTML().catch(() => 'N/A')
console.log('table html length:', tableHtml.length)
console.log('tbody html (前 800):')
console.log(tableHtml.split('<tbody>')[1]?.slice(0, 800) || tableHtml.slice(0, 800))

const rows = await page.locator('.kras-grid-row').count()
console.log('rows:', rows)

// 是否有 loading
const loading = await page.evaluate(() => {
  const el = document.querySelector('.kras-skeleton-block')
  return el ? 'skeleton visible' : 'no skeleton'
})
console.log('loading:', loading)

await page.screenshot({ path: '/tmp/part-list.png' })
await browser.close()
