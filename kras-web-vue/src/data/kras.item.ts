// kras.item.ts —— 统一 Item / AML 协议入口
// 对应需求 §4、design.md §4
// 所有数据交互必须经此模块，禁止业务层自行 fetch

import type {
  KrasItem,
  KrasEnvelope,
  KrasId,
} from '@/types'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'
const TOKEN_KEY = 'kras.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/** 解析响应：兼容裸 data 与 envelope */
function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'success' in raw) {
    const env = raw as KrasEnvelope<T>
    if (env.success === false) {
      const err = env.error
      const e = new Error(err?.message ?? 'Kras request failed') as Error & {
        code?: string
        krasError?: unknown
      }
      e.code = err?.code
      e.krasError = err
      throw e
    }
    return env.data as T
  }
  // 裸 data 兼容：若返回的是 { @is_error: '1' } 视为错误
  if (raw && typeof raw === 'object' && (raw as KrasItem)['@is_error'] === '1') {
    const e = new Error((raw as { message?: string }).message ?? 'Kras error') as Error & {
      code?: string
    }
    e.code = (raw as { code?: string }).code
    throw e
  }
  return raw as T
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (resp.status === 401) {
    setToken(null)
    throw Object.assign(new Error('未登录或会话已过期'), { code: 'PERMISSION_DENIED' })
  }
  if (resp.status === 429) {
    throw Object.assign(new Error('请求过于频繁，请稍后再试'), { code: 'RATE_LIMITED' })
  }

  let raw: unknown
  try {
    raw = await resp.json()
  } catch {
    throw Object.assign(new Error('响应解析失败'), { code: 'INVALID_JSON' })
  }
  return unwrap<T>(raw)
}

/** applyItem：单 Item 请求，单事务 */
export async function applyItem<T = KrasItem>(item: KrasItem): Promise<T> {
  const result = await postJson<T>('/applyItem', item)
  // 元数据级修改自动失效缓存（REQ-077）：add/update/delete 涉及元数据类型时清缓存
  invalidateMetadataCacheOnMutation(item)
  return result
}

/** applyAml：批量请求，共享一个批量事务 */
export async function applyAml<T = KrasItem[]>(items: KrasItem[]): Promise<T> {
  const result = await postJson<T>('/applyAml', { AML: items })
  items.forEach((it) => invalidateMetadataCacheOnMutation(it))
  return result
}

const METADATA_TYPES = new Set([
  'ItemType', 'Property', 'RelationshipType', 'List', 'ListValue', 'View', 'Form', 'Permission',
])
const MUTATION_ACTIONS = new Set(['add', 'update', 'edit', 'delete', 'copy'])

/** 命中元数据写入则清掉对应缓存条目（只清，不主动重拉，避免循环加载） */
function invalidateMetadataCacheOnMutation(item: KrasItem): void {
  const type = item['@type'] as string | undefined
  const action = item['@action'] as string | undefined
  if (!type || !action) return
  if (!METADATA_TYPES.has(type) || !MUTATION_ACTIONS.has(action)) return
  // 动态导入避免循环依赖
  import('./kras.cache')
    .then(({ krasCache }) => {
      krasCache.clearItemType()
      // 派发事件让已挂载页面知道元数据变了
      window.dispatchEvent(new CustomEvent('kras:metadata-invalidated'))
    })
    .catch(() => {
      // 静默
    })
}

/** whereUsed：反向引用 */
export async function whereUsed(itemType: string, id: KrasId): Promise<unknown> {
  return postJson('/whereUsed', { '@type': itemType, '@id': id, '@action': 'whereUsed' })
}

/** GET 通用（菜单、文件元信息等） */
export async function getJson<T>(path: string): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const resp = await fetch(`${API_BASE}${path}`, { headers })
  if (!resp.ok) throw Object.assign(new Error(`GET ${path} failed: ${resp.status}`), {
    code: 'INTERNAL_ERROR',
  })
  const raw = await resp.json()
  return unwrap<T>(raw)
}

/** POST 通用（登录、AI 端点、保存 form scheme 等） */
export async function postRaw<T>(path: string, body: unknown): Promise<T> {
  return postJson<T>(path, body)
}
