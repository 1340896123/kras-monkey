// kras.metadata.ts —— 元数据加载入口
// 对应需求 §3.3 / §5：登录后并发获取 ItemType / Property / RelationshipType

import { applyItem } from './kras.item'
import { krasCache } from './kras.cache'
import type { ItemType, Property, RelationshipType, KrasList, View, Permission, MetadataSnapshot } from '@/types'

let inflight: Promise<MetadataSnapshot> | null = null

/** 登录后调用一次：并发获取元数据并写回缓存 */
export async function getMetadata(): Promise<MetadataSnapshot> {
  if (inflight) return inflight
  inflight = (async () => {
    const [itemTypes, properties, relationshipTypes, lists, views, permissions] = await Promise.all([
      applyItem<ItemType[]>({ '@type': 'ItemType', '@action': 'get' }),
      applyItem<Property[]>({ '@type': 'Property', '@action': 'get' }),
      applyItem<RelationshipType[]>({ '@type': 'RelationshipType', '@action': 'get' }),
      applyItem<KrasList[]>({ '@type': 'List', '@action': 'get' }),
      applyItem<View[]>({ '@type': 'View', '@action': 'get' }),
      applyItem<Permission[]>({ '@type': 'Permission', '@action': 'get' }),
    ])
    const snapshot: MetadataSnapshot = {
      itemTypes: itemTypes ?? [],
      properties: properties ?? [],
      relationshipTypes: relationshipTypes ?? [],
      lists: lists ?? [],
      views: views ?? [],
      permissions: permissions ?? [],
    }
    krasCache.setSnapshot(snapshot)
    return snapshot
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export { krasCache }
