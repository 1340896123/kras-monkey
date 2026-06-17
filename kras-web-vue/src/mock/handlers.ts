// mock/handlers.ts —— MSW request handlers
// 拦截 applyItem / applyAml / login / menus 等端点，模拟真实后端协议

import { http, HttpResponse } from 'msw'
import { seed } from './seed'
import { getByType, getById, put, remove, findUser, listUsers } from './db'
import { krasCache } from '../data/kras.cache'
import { getMetadata } from '../data/kras.metadata'
import type { KrasItem, KrasId } from '@/types'

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

function ok<T>(data: T) {
  return HttpResponse.json({ success: true, data })
}

function err(code: string, message: string, status = 400) {
  return HttpResponse.json(
    { success: false, error: { '@type': 'Error', '@is_error': '1', code, message } },
    { status }
  )
}

// 简易 token 签发
const tokens = new Map<string, KrasId>() // token → userId

function issueToken(userId: KrasId): string {
  const token = `mock.${btoa(userId).replace(/=/g, '')}.${Date.now().toString(36)}`
  tokens.set(token, userId)
  return token
}

function userIdFromAuth(req: Request): KrasId | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return tokens.get(auth.slice(7)) ?? null
}

// ============ 过滤表达式解析（支持 name=*abc* / qty>100 / date<2025/01/11）============
function applyFilter(items: KrasItem[], filters: string[]): KrasItem[] {
  if (!filters.length) return items
  return items.filter((item) =>
    filters.every((raw) => {
      const m = raw.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(>=|<=|<>|!=|>|<|=)(.*)$/)
      if (!m) return true
      const [, field, op, exprRaw] = m
      const value = item[field]
      const expr = exprRaw.trim().replace(/^\*|\*$/g, '')
      switch (op) {
        case '=':
          if (typeof value === 'string') {
            if (exprRaw.includes('*')) {
              return value.toLowerCase().includes(expr.toLowerCase())
            }
            return value.toLowerCase() === expr.toLowerCase()
          }
          return String(value) === expr
        case '>':
          return Number(value) > Number(expr) || String(value) > expr
        case '<':
          return Number(value) < Number(expr) || String(value) < expr
        case '>=':
          return Number(value) >= Number(expr)
        case '<=':
          return Number(value) <= Number(expr)
        case '!=':
        case '<>':
          return String(value) !== expr
      }
      return true
    })
  )
}

// ============ get / quickSearch ============
function handleGet(item: KrasItem): KrasItem[] | KrasItem {
  const itemType = item['@type']!
  // 元数据查询
  if (itemType === 'ItemType') return seed.metadata.itemTypes as unknown as KrasItem[]
  if (itemType === 'Property') return seed.metadata.properties as unknown as KrasItem[]
  if (itemType === 'RelationshipType') return seed.metadata.relationshipTypes as unknown as KrasItem[]
  if (itemType === 'List') return seed.metadata.lists as unknown as KrasItem[]
  if (itemType === 'View') return seed.metadata.views as unknown as KrasItem[]
  if (itemType === 'Permission') return seed.metadata.permissions as unknown as KrasItem[]

  // quickSearch 语义
  if (item['@action'] === 'quickSearch' || item['@searchKey']) {
    const key = String(item['@searchKey'] ?? '').toLowerCase()
    let items = getByType(itemType)
    if (key) {
      items = items.filter((it) =>
        Object.entries(it).some(([k, v]) => {
          if (k.startsWith('@')) return false
          if (typeof v !== 'string' && typeof v !== 'number') return false
          return String(v).toLowerCase().includes(key)
        })
      )
    }
    return items
  }

  // 按 id 单查
  if (item['@id']) {
    const found = getById(item['@id'])
    if (!found) throw { code: 'ITEM_NOT_FOUND', message: `Item not found: ${item['@id']}` }
    return found
  }

  // 列表查询
  let items = getByType(itemType)

  // 过滤
  const filters: string[] = []
  for (const [k, v] of Object.entries(item)) {
    if (k.startsWith('@') || v === undefined || v === null) continue
    if (typeof v === 'string' && (v.includes('*') || v.match(/^[<>]=?/) || v.match(/^>=|^<=/))) {
      filters.push(`${k}=${v}`)
    } else if (typeof v === 'string') {
      // 默认精确匹配（不区分大小写）
      filters.push(`${k}=${v}`)
    }
  }
  items = applyFilter(items, filters)

  return items
}

// ============ 标准动作分发 ============
function dispatchAction(item: KrasItem): KrasItem {
  const action = item['@action']
  switch (action) {
    case 'get':
      return handleGet(item) as KrasItem
    case 'new': {
      return {
        '@type': item['@type'],
        '@action': 'add',
        '@id': undefined,
        '@keyed_name': '新建对象',
      }
    }
    case 'add': {
      const newId = generateId()
      const cloned = { ...item, '@id': newId, '@action': undefined }
      if (!cloned['@keyed_name']) {
        const labelField = ['item_number', 'document_number', 'eco_number', 'cad_number', 'name', 'title', 'login_name']
          .find((k) => cloned[k] !== undefined)
        cloned['@keyed_name'] = labelField ? String(cloned[labelField]) : `${item['@type']}-${newId.slice(0, 6)}`
      }
      return put(cloned)
    }
    case 'edit':
    case 'update': {
      if (!item['@id']) throw { code: 'VALIDATION_ERROR', message: '更新操作必须传 @id' }
      const existed = getById(item['@id'])
      if (!existed) throw { code: 'ITEM_NOT_FOUND', message: `Item not found: ${item['@id']}` }
      const updated = { ...existed, ...item, '@action': undefined, '@dirty': undefined }
      return put(updated)
    }
    case 'delete': {
      if (!item['@id']) throw { code: 'VALIDATION_ERROR', message: '删除操作必须传 @id' }
      remove(item['@id'])
      return { '@type': item['@type'], '@id': item['@id'], '@action': 'delete' }
    }
    case 'lock':
    case 'unlock': {
      if (!item['@id']) throw { code: 'VALIDATION_ERROR', message: '操作必须传 @id' }
      const existed = getById(item['@id'])
      if (!existed) throw { code: 'ITEM_NOT_FOUND', message: `Item not found` }
      return put({ ...existed, locked_by_id: action === 'lock' ? 'mock-locked' : undefined })
    }
    case 'version': {
      if (!item['@id']) throw { code: 'VALIDATION_ERROR', message: '操作必须传 @id' }
      const existed = getById(item['@id'])
      if (!existed) throw { code: 'ITEM_NOT_FOUND', message: `Item not found` }
      const newId = generateId()
      const oldMajor = String(existed.major_rev ?? 'A')
      const oldMinor = Number(existed.minor_rev ?? 1)
      const oldReleased = existed.is_released === 1
      const newMajor = oldReleased ? String.fromCharCode(oldMajor.charCodeAt(0) + 1) : oldMajor
      const newMinor = oldReleased ? 1 : oldMinor + 1
      const versioned = {
        ...existed,
        '@id': newId,
        '@keyed_name': `${existed['@keyed_name']} (v${newMajor}.${newMinor})`,
        major_rev: newMajor,
        minor_rev: String(newMinor),
        generation: Number(existed.generation ?? 1) + 1,
        is_released: 0,
        release_date: undefined,
        is_current: 1,
      }
      put({ ...existed, is_current: 0 })
      return put(versioned)
    }
    case 'promote': {
      if (!item['@id']) throw { code: 'VALIDATION_ERROR', message: 'promote 必须传 @id' }
      const existed = getById(item['@id'])
      if (!existed) throw { code: 'ITEM_NOT_FOUND', message: `Item not found` }
      // 简化：直接置 lifecycle_state 为 '已发布'
      return put({ ...existed, lifecycle_state: '已发布', is_released: 1, release_date: new Date().toISOString().slice(0, 10) })
    }
    default:
      // 服务端 Method 或 BuiltInAction：返回原对象
      return item
  }
}

function generateId(): KrasId {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase().slice(0, 32)
}

export const handlers = [
  // ============ /api/login ============
  http.post(`${BASE}/login`, async ({ request }) => {
    const body = (await request.json()) as { login_name?: string; password?: string }
    const user = findUser(body.login_name ?? '', body.password ?? '')
    if (!user) {
      return err('PERMISSION_DENIED', '登录名或密码错误', 401)
    }
    const token = issueToken(user.id)
    // 模拟登录后服务端会下发元数据，前端调用 getMetadata 时由我们返回
    await getMetadata().catch(() => {})
    return ok({
      token,
      user: {
        id: user.id,
        login_name: user.login_name,
        name: user.name,
        email: user.email,
        identity_ids: user.identity_ids,
      },
    })
  }),

  // ============ /api/menus ============
  http.get(`${BASE}/menus`, ({ request }) => {
    const userId = userIdFromAuth(request)
    if (!userId) return err('PERMISSION_DENIED', '未登录', 401)
    return ok(seed.menus)
  }),

  // ============ /api/applyItem ============
  http.post(`${BASE}/applyItem`, async ({ request }) => {
    const userId = userIdFromAuth(request)
    if (!userId) return err('PERMISSION_DENIED', '未登录', 401)
    const item = (await request.json()) as KrasItem
    try {
      const result = dispatchAction(item)
      // 元数据相关查询同步到缓存
      if (item['@type'] && ['ItemType', 'Property', 'RelationshipType', 'List', 'View', 'Permission'].includes(item['@type']!)) {
        // 触发缓存更新
        await getMetadata().catch(() => {})
      }
      return ok(result)
    } catch (e: unknown) {
      const errObj = e as { code?: string; message?: string }
      return err(errObj.code ?? 'INTERNAL_ERROR', errObj.message ?? 'Internal error')
    }
  }),

  // ============ /api/applyAml ============
  http.post(`${BASE}/applyAml`, async ({ request }) => {
    const userId = userIdFromAuth(request)
    if (!userId) return err('PERMISSION_DENIED', '未登录', 401)
    const body = (await request.json()) as { AML: KrasItem[] }
    if (!body?.AML || !Array.isArray(body.AML)) {
      return err('INVALID_JSON', 'AML 必须是数组')
    }
    try {
      // 单事务模拟：任一失败整批回滚（内存版仅作演示）
      const results = body.AML.map((item) => dispatchAction(item))
      return ok(results)
    } catch (e: unknown) {
      const errObj = e as { code?: string; message?: string }
      return HttpResponse.json(
        {
          success: false,
          error: {
            '@type': 'Error',
            '@is_error': '1',
            code: errObj.code ?? 'INTERNAL_ERROR',
            message: `批量事务已回滚：${errObj.message ?? 'Internal error'}`,
          },
        },
        { status: 400 }
      )
    }
  }),

  // ============ /api/whereUsed ============
  http.post(`${BASE}/whereUsed`, async ({ request }) => {
    await request.json()
    return ok([])
  }),

  // ============ /api/files/:id ============
  http.get(`${BASE}/files/:id`, ({ params }) => {
    // 返回一张 1x1 占位 png
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ])
    return new HttpResponse(png, {
      headers: { 'Content-Type': 'image/png' },
    })
  }),

  // ============ /api/file/upload ============
  http.post(`${BASE}/file/upload`, async () => {
    const newId = generateId()
    return ok({ '@type': 'File', '@id': newId, name: 'uploaded.bin' })
  }),

  // ============ /api/views/:id/form ============
  http.post(`${BASE}/views/:id/form`, async ({ request, params }) => {
    const body = (await request.json()) as { scheme: unknown }
    const view = seed.metadata.views.find((v) => v.id === params.id)
    if (view) view.form_scheme = body.scheme as typeof view.form_scheme
    return ok({ ok: true })
  }),

  // ============ /health ============
  http.get(`${BASE.replace('/api', '')}/health`, () => {
    return HttpResponse.json({ status: 'ok', time: new Date().toISOString() })
  }),
  // 也允许 /api/health
  http.get(`${BASE}/health`, () => {
    return HttpResponse.json({ status: 'ok', time: new Date().toISOString() })
  }),

  // ============ AI 端点（mock）============
  http.post(`${BASE}/ai/layout`, async () => {
    await new Promise((r) => setTimeout(r, 800))
    return ok({ sections: [] })
  }),
  http.post(`${BASE}/ai/item-detail-draft`, async () => {
    await new Promise((r) => setTimeout(r, 800))
    return ok({ sections: [] })
  }),
  http.post(`${BASE}/ai/method-edit`, async ({ request }) => {
    await new Promise((r) => setTimeout(r, 800))
    const body = await request.json()
    return ok({ code: `// AI generated\nasync function execute(item, ctx) {\n  // ${JSON.stringify(body).slice(0, 40)}\n  return item;\n}` })
  }),
  http.post(`${BASE}/methods/compile-check`, async () => {
    await new Promise((r) => setTimeout(r, 400))
    return ok({ success: true, errors: [] })
  }),
]
