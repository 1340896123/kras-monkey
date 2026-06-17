// kras.ts —— 全局 kras 单例入口（提供给前端 JS Method 注入与组件使用）
// 对应需求 §1.1.3：业务层禁止自建平行缓存或绕过协议拼装请求

import { applyItem, applyAml, whereUsed, getJson, postRaw, getToken, setToken } from './kras.item'
import { getMetadata, krasCache } from './kras.metadata'
import * as objects from './kras.objects'
import { governance } from './kras.governance'
import * as searchItems from './kras.searchItems'

export interface KrasRuntime {
  applyItem: typeof applyItem
  applyAml: typeof applyAml
  whereUsed: typeof whereUsed
  getJson: typeof getJson
  postRaw: typeof postRaw
  getToken: typeof getToken
  setToken: typeof setToken

  getMetadata: typeof getMetadata
  cache: typeof krasCache

  objects: typeof objects
  governance: typeof governance
  searchItems: typeof searchItems
  reset(): void
}

function reset(): void {
  krasCache.clearItemType()
}

export const kras: KrasRuntime = {
  applyItem,
  applyAml,
  whereUsed,
  getJson,
  postRaw,
  getToken,
  setToken,
  getMetadata,
  cache: krasCache,
  objects,
  governance,
  searchItems,
  reset,
}

;(globalThis as unknown as { kras: KrasRuntime }).kras = kras

export default kras
