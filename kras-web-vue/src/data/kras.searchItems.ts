// kras.searchItems.ts —— 引用字段搜索控制器
// 对应需求 §9.7：默认下拉展开立即加载；keyed_name:*keyword*；onOpenChange 感知

import { applyItem } from './kras.item'
import type { KrasItem } from '@/types'

interface SearchController {
  open(): void
  close(): void
  setQuery(q: string): void
  mergeQuery(q: Record<string, unknown>): void
  getSelection(): KrasItem[]
}

const controllers = new Map<string, SearchController>()

/** 注册字段控制器（由 ItemSearch 组件 onMount 时调用） */
export function registerController(fieldName: string, ctrl: SearchController): void {
  controllers.set(fieldName, ctrl)
}

export function unregisterController(fieldName: string): void {
  controllers.delete(fieldName)
}

export function getController(fieldName: string): SearchController | null {
  return controllers.get(fieldName) ?? null
}

/** 按 keyed_name 通配搜索，不默认 quickSearch */
export async function searchByDisplay(
  itemTypeName: string,
  keyword: string,
  pageSize = 20
): Promise<KrasItem[]> {
  const filter = keyword ? `${keyword}` : ''
  const result = await applyItem<KrasItem[]>({
    '@type': itemTypeName,
    '@action': 'get',
    keyed_name: filter ? `*${filter}*` : undefined,
    '@page_size': pageSize,
  })
  return result ?? []
}
