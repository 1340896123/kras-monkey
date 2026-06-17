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

// ========== 元数据建模 + 治理场景 ==========

// 工具：仅匹配当前可见的定义编辑器内的元素
async function visibleDefToolbar() {
  return page.locator('.def-editor:visible .def-toolbar')
}

await step('14. 进入定义编辑器（对象类）', async () => {
  await page.goto('http://localhost:5173/definition/itemtype', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const cnt = await page.locator('.def-editor:visible .def-list table tbody tr.ant-table-row').count()
  console.log(`   对象类列表行数: ${cnt}`)
})

await step('15. 新建对象类 CustomItem（直连后端验证）', async () => {
  // 通过直接 API 调用绕开 UI 选择器不稳定问题，并打印后端响应
  const token = await page.evaluate(() => localStorage.getItem('kras.token'))
  const resp = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      '@type': 'ItemType', '@action': 'add',
      name: `AutoItem${Date.now().toString().slice(-6)}`,
      label: '自动化对象',
    }),
  })
  const data = await resp.json()
  console.log(`   success: ${data.success} name: ${data.data?.name}`)
  if (data.success !== true) throw new Error('新建对象类失败: ' + JSON.stringify(data))
})

await step('16. 校验：重复名称应失败', async () => {
  const token = await page.evaluate(() => localStorage.getItem('kras.token'))
  const resp = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'ItemType', '@action': 'add', name: 'Part', label: 'dup' }),
  })
  const data = await resp.json()
  console.log(`   success: ${data.success}, code: ${data.error?.code}, msg: ${data.error?.message}`)
  if (data.success === true) throw new Error('重复名称应被拒绝')
})

await step('17. 新建属性：缺 data_source 应失败', async () => {
  const token = await page.evaluate(() => localStorage.getItem('kras.token'))
  // 取一个 ItemType id
  const listResp = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'ItemType', '@action': 'get' }),
  })
  const listData = await listResp.json()
  const itemTypeId = listData.data[0]['@id']

  // data_type=list 缺 data_source
  const resp = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      '@type': 'Property', '@action': 'add',
      name: 'auto_field', source_id: itemTypeId, data_type: 'list',
    }),
  })
  const data = await resp.json()
  console.log(`   success: ${data.success}, msg: ${data.error?.message}`)
  if (data.success === true) throw new Error('list 字段缺 data_source 应被拒绝')
})

await step('18. 新建属性：data_type=string 应成功', async () => {
  const token = await page.evaluate(() => localStorage.getItem('kras.token'))
  const listResp = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'ItemType', '@action': 'get' }),
  })
  const listData = await listResp.json()
  const itemTypeId = listData.data[0]['@id']

  const resp = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      '@type': 'Property', '@action': 'add',
      name: `auto_p${Date.now().toString().slice(-6)}`,
      source_id: itemTypeId, data_type: 'string', label: '自动字段', sort_order: 999,
    }),
  })
  const data = await resp.json()
  console.log(`   success: ${data.success}, name: ${data.data?.name}`)
  if (data.success !== true) throw new Error('string 字段新建失败')
})

await step('19. 新建关系类型：缺 relationship_id 应失败', async () => {
  const token = await page.evaluate(() => localStorage.getItem('kras.token'))
  const resp = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      '@type': 'RelationshipType', '@action': 'add',
      name: 'auto_rel', source_id: 'a', related_id: 'b',
    }),
  })
  const data = await resp.json()
  console.log(`   success: ${data.success}, msg: ${data.error?.message}`)
  if (data.success === true) throw new Error('relationship_id 缺失应被拒绝')
})

await step('20. 版本规则：A.1 → A.2', async () => {
  const token = await page.evaluate(() => localStorage.getItem('kras.token'))
  // 新建 Part
  const add = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'Part', '@action': 'add', name: '版本测试' + Date.now() }),
  }).then(r => r.json())
  const id = add.data['@id']
  console.log(`   初始: ${add.data.major_rev}.${add.data.minor_rev}`)

  const v2 = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'Part', '@action': 'version', '@id': id }),
  }).then(r => r.json())
  console.log(`   换版: ${v2.data.major_rev}.${v2.data.minor_rev} gen: ${v2.data.generation}`)
  if (v2.data.major_rev !== 'A' || v2.data.minor_rev !== '2') throw new Error('版本规则 A.1→A.2 失败')
})

await step('21. 版本规则：A.x(released) → B.1', async () => {
  const token = await page.evaluate(() => localStorage.getItem('kras.token'))
  const add = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'Part', '@action': 'add', name: '发布换版' + Date.now() }),
  }).then(r => r.json())
  const id = add.data['@id']
  // promote 到已发布
  await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'Part', '@action': 'promote', '@id': id, to_state: '已发布' }),
  })
  const v2 = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'Part', '@action': 'version', '@id': id }),
  }).then(r => r.json())
  console.log(`   发布换版后: ${v2.data.major_rev}.${v2.data.minor_rev} state: ${v2.data.state}`)
  if (v2.data.major_rev !== 'B' || v2.data.minor_rev !== '1') throw new Error('版本规则 B.1 失败')
})

await step('22. promote 严格：state 缺失报错', async () => {
  const token = await page.evaluate(() => localStorage.getItem('kras.token'))
  const add = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'Part', '@action': 'add', name: '无state' + Date.now() }),
  }).then(r => r.json())
  const id = add.data['@id']
  // 不传 to_state
  const resp = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'Part', '@action': 'promote', '@id': id }),
  }).then(r => r.json())
  console.log(`   success: ${resp.success}, msg: ${resp.error?.message}`)
  if (resp.success === true) throw new Error('to_state 缺失应被拒绝')
})

await step('23. 工作流闭环：start → submit → approve', async () => {
  const token = await page.evaluate(() => localStorage.getItem('kras.token'))
  // 工作流定义
  const wf = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'WorkflowDefinition', '@action': 'add', name: 'WF' + Date.now() }),
  }).then(r => r.json())
  const wfId = wf.data['@id']

  // 业务对象
  const biz = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'Part', '@action': 'add', name: 'WFBiz' + Date.now() }),
  }).then(r => r.json())
  const bizId = biz.data['@id']

  // start
  const proc = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      '@type': 'Part', '@action': 'startWorkflow', '@id': bizId,
      workflow_definition_id: wfId, start_node_id: 'review',
    }),
  }).then(r => r.json())
  const procId = proc.data['@id']
  console.log(`   process status: ${proc.data.status}`)

  // submit
  const sub = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'WorkflowProcess', '@action': 'submitApproval', workflow_process_id: procId }),
  }).then(r => r.json())
  console.log(`   submit 后: ${sub.data.status}`)

  // approve
  const ok = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'WorkflowProcess', '@action': 'approveWorkflow', workflow_process_id: procId, next_node_id: 'end' }),
  }).then(r => r.json())
  console.log(`   approve 后: ${ok.data.status} → ${ok.data.current_node_id}`)
  if (ok.data.status !== 'approved') throw new Error('工作流审批未通过')
})

await step('24. quickSearch + whereUsed + 审计', async () => {
  const token = await page.evaluate(() => localStorage.getItem('kras.token'))
  // quickSearch
  const qs = await fetch('http://localhost:5173/api/applyItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@type': 'Part', '@action': 'quickSearch', '@searchKey': '版本' }),
  }).then(r => r.json())
  console.log(`   quickSearch "版本" 命中: ${qs.data?.length ?? 0}`)

  // 审计
  const audit = await fetch('http://localhost:5173/api/audit?limit=5', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json())
  console.log(`   审计日志条数: ${audit.data?.length ?? 0}`)
})

await step('25. UI 验证：定义编辑器可加载（截图）', async () => {
  await page.goto('http://localhost:5173/definition/itemtype', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const cnt = await page.locator('.def-editor:visible .def-list table tbody tr.ant-table-row').count()
  console.log(`   对象类列表行数: ${cnt}`)
  await page.screenshot({ path: '/tmp/kras-def-editor.png', fullPage: false })
})

await step('26. UI 验证：菜单管理页可加载', async () => {
  await page.goto('http://localhost:5173/menu-management', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const cnt = await page.locator('.ant-table-tbody tr.ant-table-row').count()
  console.log(`   菜单数: ${cnt}`)
})

await step('27. UI 验证：用户管理页可加载', async () => {
  await page.goto('http://localhost:5173/users', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const cnt = await page.locator('.ant-table-tbody tr.ant-table-row').count()
  console.log(`   用户数: ${cnt}`)
})

await step('28. Swagger UI 可访问', async () => {
  const resp = await page.goto('http://localhost:5173/swagger/v1/swagger.json', { waitUntil: 'networkidle' })
  const status = resp?.status()
  console.log(`   swagger.json 状态: ${status}`)
  if (status === 200) {
    const txt = await page.evaluate(() => document.body.innerText)
    try {
      const json = JSON.parse(txt.replace(/\n/g, ''))
      const paths = Object.keys(json.paths || {})
      console.log(`   端点数: ${paths.length}, schemas: ${Object.keys(json.components?.schemas || {}).length}`)
    } catch {
      console.log('   （JSON 解析失败但状态 200，仅断言可达）')
    }
  }
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
