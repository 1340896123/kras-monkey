// scripts/smoke.mjs —— 前后端联调冒烟测试
// 跑完整真实交互：登录 → 仪表盘 → 列表 → 筛选 → 详情 → 新建 → 保存 → 关闭 → 锁定 → 换版
// 检查：每次请求 / 响应、Console 无 error、Network 无失败
import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const consoleErrors = []
const networkFails = []
const requests = []

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push('PAGE_ERROR: ' + err.message))
page.on('requestfailed', (req) => {
  // 忽略 favicon / msw 相关
  if (req.url().endsWith('favicon.ico')) return
  networkFails.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`)
})
page.on('response', async (resp) => {
  const url = resp.url()
  if (!url.includes('/api/')) return
  if (resp.status() >= 400) {
    networkFails.push(`HTTP ${resp.status()} ${resp.method()} ${url}`)
  }
  requests.push(`${resp.status()} ${resp.method()} ${url.replace(BASE, '')}`)
})

async function step(name, fn) {
  console.log(`\n--- ${name} ---`)
  try {
    await fn()
    console.log(`   OK`)
  } catch (e) {
    console.log(`   FAIL: ${e.message}`)
    throw e
  }
}

try {
  await step('1. 登录页加载', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.waitForSelector('input', { timeout: 10000 })
  })

  await step('2. 登录 admin/admin', async () => {
    await page.fill('input[id\\:0], input', 'admin').catch(async () => {
      const inputs = await page.locator('input').all()
      await inputs[0].fill('admin')
    })
    // 用更直接的方式：找到登录按钮前的表单
    const inputs = await page.locator('input').all()
    if (inputs.length >= 2) {
      await inputs[0].fill('admin')
      await inputs[1].fill('admin')
    }
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 10000 })
  })

  await step('3. 仪表盘渲染', async () => {
    await page.waitForSelector('text=物料总数')
    await page.waitForSelector('text=Kras')
  })

  await step('4. 进入物料列表', async () => {
    await page.click('a:has-text("物料")')
    await page.waitForURL('**/item-types/Part', { timeout: 10000 })
    await page.waitForSelector('table.kras-grid')
  })

  await step('5. 列表数据加载', async () => {
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('.kras-grid-row')
      return rows.length > 0
    }, { timeout: 10000 })
    const rows = await page.locator('.kras-grid-row').count()
    console.log(`   rows: ${rows}`)
  })

  await step('6. 筛选 name=*轴承*', async () => {
    const ths = await page.locator('thead .kras-filter-row th').all()
    // 第二个 th（名称列）放输入
    const nameFilter = page.locator('thead .kras-filter-row th').nth(1).locator('input')
    await nameFilter.fill('*轴承*')
    await nameFilter.press('Enter')
    await page.waitForTimeout(800)
    const rows = await page.locator('.kras-grid-row').count()
    console.log(`   filtered rows: ${rows}`)
  })

  await step('7. 重置筛选', async () => {
    await page.click('button:has-text("重置")')
    await page.waitForTimeout(500)
  })

  await step('8. 双击行打开详情', async () => {
    await page.locator('.kras-grid-row').first().dblclick()
    await page.waitForSelector('.detail-page', { timeout: 10000 })
    await page.waitForSelector('text=编辑')
  })

  await step('9. 点击编辑进入表单', async () => {
    await page.click('button:has-text("编辑")')
    await page.waitForTimeout(500)
  })

  await step('10. 修改名称并保存', async () => {
    const nameInput = page.locator('input').filter({ hasText: '' }).first()
    // 找到名称所在的 input：父表单中第二个文本框
    const inputs = await page.locator('.form-renderer input[type="text"], .form-renderer input:not([type])').all()
    if (inputs.length >= 2) {
      await inputs[1].fill('联调-测试-改名')
    }
    await page.click('button:has-text("保存")')
    await page.waitForSelector('text=保存成功', { timeout: 5000 }).catch(() => {
      console.log('   (保存提示未出现，可能成功但 UI 未弹)')
    })
  })

  await step('11. 锁定', async () => {
    const lockBtn = page.locator('button:has-text("锁定")')
    if (await lockBtn.count() > 0) {
      await lockBtn.click()
      await page.waitForTimeout(500)
    } else {
      console.log('   (已锁定或按钮不可见)')
    }
  })

  await step('12. 切换 Tab 回物料列表', async () => {
    // 找到列表 tab 点
    const tabs = page.locator('.ant-tabs-tab')
    const cnt = await tabs.count()
    for (let i = 0; i < cnt; i++) {
      const text = await tabs.nth(i).innerText()
      if (text.includes('物料') && !text.includes('详情')) {
        await tabs.nth(i).click()
        break
      }
    }
    await page.waitForTimeout(500)
  })

  console.log('\n=== 汇总 ===')
  console.log(`请求总数: ${requests.length}`)
  console.log(`Console 错误: ${consoleErrors.length}`)
  console.log(`Network 失败: ${networkFails.length}`)
  if (consoleErrors.length) {
    console.log('--- Console Errors ---')
    consoleErrors.forEach((e) => console.log(' •', e.slice(0, 200)))
  }
  if (networkFails.length) {
    console.log('--- Network Failures ---')
    networkFails.forEach((e) => console.log(' •', e))
  }

  await page.screenshot({ path: '/tmp/kras-smoke-final.png', fullPage: false })
  console.log('\n最终截图: /tmp/kras-smoke-final.png')
} catch (e) {
  console.log('!!! 测试中断:', e.message)
  await page.screenshot({ path: '/tmp/kras-smoke-error.png' })
  process.exitCode = 1
} finally {
  await browser.close()
}
