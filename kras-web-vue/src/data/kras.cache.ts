// kras.cache.ts —— 只读元数据缓存（内存 + localStorage）
// 对应需求 §3.3 / §5：命中失败返回空值，不在缓存层补请求

import type {
  ItemType,
  Property,
  RelationshipType,
  KrasList,
  View,
  KrasItem,
  KrasId,
  MetadataSnapshot,
} from '@/types'

const META_KEY = 'kras.meta.snapshot'
const OBJECT_KEY = 'kras.objects.cache'

interface ObjectCacheEntry {
  item: KrasItem
  at: number
}

class KrasCache {
  private snapshot: MetadataSnapshot = {
    itemTypes: [],
    properties: [],
    relationshipTypes: [],
    lists: [],
    views: [],
    permissions: [],
  }
  private objectCache = new Map<KrasId, ObjectCacheEntry>()
  private loaded = false

  /** 从 localStorage 恢复（同步），用于首帧占位 */
  restore(): void {
    if (this.loaded) return
    try {
      const raw = localStorage.getItem(META_KEY)
      if (raw) {
        this.snapshot = JSON.parse(raw) as MetadataSnapshot
      }
      const objRaw = localStorage.getItem(OBJECT_KEY)
      if (objRaw) {
        const obj = JSON.parse(objRaw) as Record<string, ObjectCacheEntry>
        Object.entries(obj).forEach(([k, v]) => this.objectCache.set(k, v))
      }
    } catch {
      // 静默忽略损坏的缓存
    }
    this.loaded = true
  }

  /** 落盘当前快照 */
  persist(): void {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(this.snapshot))
      const obj: Record<string, ObjectCacheEntry> = {}
      this.objectCache.forEach((v, k) => (obj[k] = v))
      localStorage.setItem(OBJECT_KEY, JSON.stringify(obj))
    } catch {
      // 容量超限静默忽略
    }
  }

  /** 写入新快照（由 kras.metadata.getMetadata 调用） */
  setSnapshot(snapshot: MetadataSnapshot): void {
    this.snapshot = snapshot
    this.persist()
  }

  getMetadata(): MetadataSnapshot {
    return this.snapshot
  }

  getItemTypeMetadata(name: string): ItemType | null {
    return this.snapshot.itemTypes.find((t) => t.name === name) ?? null
  }

  getItemTypeProperties(name: string): Property[] {
    const itemType = this.getItemTypeMetadata(name)
    if (!itemType) return []
    return this.snapshot.properties
      .filter((p) => p.source_id === itemType.id && p.is_hidden === 0)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  getItemTypeRelationshipTypes(name: string): RelationshipType[] {
    const itemType = this.getItemTypeMetadata(name)
    if (!itemType) return []
    return this.snapshot.relationshipTypes
      .filter((r) => r.source_id === itemType.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }

  getList(id: KrasId): KrasList | null {
    return this.snapshot.lists.find((l) => l.id === id) ?? null
  }

  getProperty(id: KrasId): Property | null {
    return this.snapshot.properties.find((p) => p.id === id) ?? null
  }

  getPropertyByName(itemTypeName: string, propertyName: string): Property | null {
    const itemType = this.getItemTypeMetadata(itemTypeName)
    if (!itemType) return null
    return this.snapshot.properties.find((p) => p.source_id === itemType.id && p.name === propertyName) ?? null
  }

  getViews(itemTypeName: string): View[] {
    const itemType = this.getItemTypeMetadata(itemTypeName)
    if (!itemType) return []
    return this.snapshot.views
      .filter((v) => v.source_id === itemType.id)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  getDefaultDetailView(itemTypeName: string): View | null {
    return this.getViews(itemTypeName).find((v) => v.view_type === 'detail' && v.is_default === 1) ?? null
  }

  getDefaultListView(itemTypeName: string): View | null {
    return this.getViews(itemTypeName).find((v) => v.view_type === 'list' && v.is_default === 1) ?? null
  }

  // 对象级缓存
  setItem(item: KrasItem): void {
    const id = item['@id']
    if (!id) return
    this.objectCache.set(id, { item, at: Date.now() })
    this.persist()
  }

  getItem(id: KrasId): KrasItem | null {
    return this.objectCache.get(id)?.item ?? null
  }

  getItemKeyedName(id: KrasId): string | null {
    const item = this.getItem(id)
    return (item?.['@keyed_name'] as string) ?? null
  }

  /** 清指定 ItemType 的元数据缓存 */
  clearItemType(itemTypeName?: string): void {
    if (!itemTypeName) {
      this.snapshot = {
        itemTypes: [],
        properties: [],
        relationshipTypes: [],
        lists: [],
        views: [],
        permissions: [],
      }
      this.objectCache.clear()
      this.persist()
      return
    }
    const itemType = this.getItemTypeMetadata(itemTypeName)
    if (!itemType) return
    this.snapshot.properties = this.snapshot.properties.filter((p) => p.source_id !== itemType.id)
    this.snapshot.relationshipTypes = this.snapshot.relationshipTypes.filter(
      (r) => r.source_id !== itemType.id && r.related_id !== itemType.id
    )
    this.snapshot.views = this.snapshot.views.filter((v) => v.source_id !== itemType.id)
    this.persist()
  }
}

export const krasCache = new KrasCache()
