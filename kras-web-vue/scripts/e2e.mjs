import { chromium } from 'playwright'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const errors = []
const networkFails = []
const apiCalls = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGE_ERROR: ' + e.message))
page.on('requestfailed', (r) => {
  if (r.url().endsWith('favicon.ico')) return
  networkFails.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`)
})
page.on('response', (resp) => {
  if (!resp.url().includes('/api/')) return
  const url = resp.url().replace('http://localhost:5173', '')
  const status = resp.status()
  apiCalls.push({ status, method: resp.request().method(), url, body: resp.request().postData() })
  if (status >= 400) {
    resp.text().then(t => {
      networkFails.push(`HTTP ${status} ${resp.request().method()} ${url} BODY=${resp.request().postData()} RESP=${t.slice(0, 200)}`)
    })
  }
})

async function step(name, fn) {
  const before = apiCalls.length
  console.log(`\n--- ${name} ---`)
  try {
    await fn()
    const after = apiCalls.length
    console.log(`   OK (${after - before} 个 API 调用)`)
  } catch (e) {
    console.log(`   FAIL: ${e.message.slice(0, 200)}`)
    throw e
  }
}

await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

await step('1. 登录', async () => {
  const inputs = await page.locator('input').all()
  await inputs[0].fill('admin')
  await inputs[1].fill('admin')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  await page.waitForTimeout(2000)
})

await step('2. 进入物料列表', async () => {
  // 直接进列表页，避免菜单展开/选择器冲突
  await page.goto('http://localhost:5173/item-types/Part', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.querySelectorAll('.kras-grid-row').length > 0, { timeout: 15000 })
  await page.waitForTimeout(800)
  const cnt = await page.locator('.kras-grid-row').count()
  console.log(`   列表行数: ${cnt}`)
})

await step('3. 筛选 name=*轴承*', async () => {
  // 取表头列名找索引（用文本匹配，含"称"字而非精确"名称"）
  const headerTexts = await page.locator('thead tr').first().locator('th').allInnerTexts()
  console.log('   表头列:', headerTexts.map(s => s.trim()).filter(Boolean).join(' | '))
  let nameIdx = -1
  for (let i = 0; i < headerTexts.length; i++) {
    const t = headerTexts[i].trim()
    if (t === '名称' || t === '标题') { nameIdx = i; break }
  }
  console.log(`   名称列索引: ${nameIdx}`)
  if (nameIdx < 0) nameIdx = 2 // 兜底
  const filterCell = page.locator('thead .kras-filter-row th').nth(nameIdx)
  await filterCell.locator('input').click({ force: true })
  await filterCell.locator('input').fill('*轴承*', { force: true })
  await filterCell.locator('input').press('Enter')
  await page.waitForTimeout(800)
  const cnt = await page.locator('.kras-grid-row').count()
  console.log(`   过滤后行数: ${cnt}`)
})

await step('4. 重置筛选', async () => {
  await page.click('button:has-text("重置")')
  await page.waitForTimeout(800)
  const cnt = await page.locator('.kras-grid-row').count()
  console.log(`   重置后行数: ${cnt}`)
})

await step('5. 数值过滤 qty_on_hand >100', async () => {
  const filterInputs = page.locator('thead .kras-filter-row th').locator('input')
  // 找"库存"列：表头第7列（索引 6）
  const allHeaders = await page.locator('thead tr').first().locator('th').allInnerTexts()
  let qtyIdx = -1
  for (let i = 0; i < allHeaders.length; i++) {
    if (allHeaders[i].includes('库存')) { qtyIdx = i; break }
  }
  console.log(`   库存列索引: ${qtyIdx}`)
  if (qtyIdx >= 0) {
    const input = page.locator('thead .kras-filter-row th').nth(qtyIdx).locator('input')
    await input.fill('>100')
    await input.press('Enter')
    await page.waitForTimeout(800)
    const cnt = await page.locator('.kras-grid-row').count()
    console.log(`   过滤后行数: ${cnt}`)
  }
})

await step('6. 重置并点击"查看"按钮打开详情', async () => {
  await page.click('button:has-text("重置")')
  await page.waitForTimeout(500)
  // 点击第一行的"查看"按钮（type=text 的小按钮）
  await page.locator('.kras-grid-row').first().locator('button:has(svg)').first().click()
  await page.waitForFunction(() => document.querySelectorAll('.detail-page').length > 0, { timeout: 10000 })
  await page.waitForTimeout(1500)
})

await step('7. 进入编辑', async () => {
  await page.locator('.detail-toolbar:visible button:has-text("编辑")').click()
  await page.waitForTimeout(500)
})

await step('8. 直接保存（验证后端 update 链路）', async () => {
  await page.locator('.detail-toolbar:visible button:has-text("保存")').click()
  await page.waitForTimeout(1500)
})

await step('9. 锁定', async () => {
  const lockBtn = page.locator('.detail-toolbar:visible button:has-text("锁定")')
  if (await lockBtn.count() > 0) {
    await lockBtn.click()
    await page.waitForTimeout(1000)
    console.log('   已锁定')
  } else {
    console.log('   无锁定按钮（可能已锁定）')
  }
})

await step('10. 解锁', async () => {
  const unlockBtn = page.locator('.detail-toolbar:visible button:has-text("解锁")')
  if (await unlockBtn.count() > 0) {
    await unlockBtn.click()
    await page.waitForTimeout(1000)
    console.log('   已解锁')
  }
})

await step('11. 换版', async () => {
  const btn = page.locator('.detail-toolbar:visible button:has-text("换版")')
  if (await btn.count() > 0) {
    await btn.click()
    await page.waitForTimeout(1500)
    console.log('   已换版，当前 URL:', page.url())
  }
})

await step('12. 进入新建', async () => {
  // 切回列表 tab
  const tabs = page.locator('.ant-tabs-tab')
  const cnt = await tabs.count()
  for (let i = 0; i < cnt; i++) {
    const text = await tabs.nth(i).innerText()
    if (text.includes('物料') && text.length <= 4) {
      await tabs.nth(i).click()
      break
    }
  }
  await page.waitForTimeout(500)
  await page.locator('button:has-text("新建")').first().click()
  await page.waitForTimeout(1500)
  console.log('   当前 URL:', page.url())
})

await step('13. 新建物料并保存', async () => {
  const inputs = page.locator('.form-renderer input:visible')
  const cnt = await inputs.count()
  console.log(`   可见 input 数: ${cnt}`)
  if (cnt >= 2) {
    await inputs.nth(0).fill('P-TEST-' + Date.now())
    await inputs.nth(1).fill('自动化新建测试件')
  }
  await page.locator('.detail-toolbar:visible button:has-text("保存")').click()
  await page.waitForTimeout(2000)
  console.log('   保存后 URL:', page.url())
})

await page.screenshot({ path: '/tmp/kras-final.png', fullPage: false })

console.log('\n========== 联调结果 ==========')
console.log(`API 请求总数: ${apiCalls.length}`)
console.log(`Console 错误: ${errors.length}`)
console.log(`Network 失败: ${networkFails.length}`)
console.log('\n--- API 调用清单 ---')
const byStatus = {}
for (const c of apiCalls) {
  const k = `${c.status}`
  byStatus[k] = (byStatus[k] || 0) + 1
}
console.log('按状态码:', byStatus)

const byEndpoint = {}
for (const c of apiCalls) {
  const u = c.url.split('?')[0].replace(/\/[A-F0-9]{32}/, '/{id}')
  const k = `${c.method} ${u}`
  byEndpoint[k] = (byEndpoint[k] || 0) + 1
}
console.log('按端点:', byEndpoint)

if (errors.length) {
  console.log('\n--- Console Errors ---')
  errors.forEach(e => console.log('  •', e.slice(0, 200)))
}
if (networkFails.length) {
  console.log('\n--- Network Failures ---')
  networkFails.forEach(e => console.log('  •', e))
}

const allGood = errors.length === 0 && networkFails.length === 0
console.log(`\n>>> ${allGood ? '✓ 全部通过，无报错' : '✗ 有报错需修复'} <<<`)

await browser.close()
process.exitCode = allGood ? 0 : 1
