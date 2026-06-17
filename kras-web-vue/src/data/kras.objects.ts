// kras.objects.ts —— 业务对象级脏标记与缓存刷新
// 对应需求 §9.4：字段改动 → markDirty；保存后强制刷新主对象

import { krasCache } from './kras.cache'
import type { KrasItem, KrasId } from '@/types'

const dirtySet = new Set<KrasId>()

/** 标记对象为脏 */
export function markDirty(id: KrasId | undefined): void {
  if (!id) return
  dirtySet.add(id)
  // 同步更新缓存中的对象（带 @dirty）
  const cached = krasCache.getItem(id)
  if (cached && !cached['@dirty']) {
    krasCache.setItem({ ...cached, '@dirty': true })
  }
}

export function isDirty(id: KrasId): boolean {
  return dirtySet.has(id)
}

export function clearDirty(id: KrasId): void {
  dirtySet.delete(id)
}

/** 把新对象写入缓存（用于刚查询/保存的结果） */
export function putObject(item: KrasItem): void {
  krasCache.setItem(item)
}

export function getObject(id: KrasId): KrasItem | null {
  return krasCache.getItem(id)
}
