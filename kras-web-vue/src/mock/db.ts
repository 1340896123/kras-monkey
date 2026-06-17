// mock/db.ts —— 内存数据库（mock 用）
// 加载 seed 后，所有 applyItem/applyAml/get 都操作这里的内存

import { seed } from './seed'
import type { KrasItem, KrasId, User } from '@/types'

interface DbState {
  items: Map<KrasId, KrasItem>
  users: Array<User & { password: string }>
  keyedNameIndex: Map<string, KrasId> // '@type:item_number' → id，唯一键
}

const db: DbState = {
  items: new Map(),
  users: [...seed.users],
  keyedNameIndex: new Map(),
}

let initialized = false
function init() {
  if (initialized) return
  initialized = true
  for (const item of seed.businessItems) {
    if (item['@id']) db.items.set(item['@id'], structuredClone(item))
  }
}

init()

export function getByType(itemType: string): KrasItem[] {
  init()
  const result: KrasItem[] = []
  for (const item of db.items.values()) {
    if (item['@type'] === itemType) result.push(item)
  }
  return result
}

export function getById(id: KrasId): KrasItem | null {
  init()
  const item = db.items.get(id)
  return item ? structuredClone(item) : null
}

export function put(item: KrasItem): KrasItem {
  init()
  const cloned = structuredClone(item)
  if (cloned['@id']) db.items.set(cloned['@id'], cloned)
  return cloned
}

export function remove(id: KrasId): boolean {
  init()
  return db.items.delete(id)
}

export function findUser(loginName: string, password: string): (User & { password: string }) | null {
  init()
  return db.users.find((u) => u.login_name === loginName && u.password === password) ?? null
}

export function getUserById(id: KrasId): (User & { password: string }) | null {
  return db.users.find((u) => u.id === id) ?? null
}

export function listUsers(): (User & { password: string })[] {
  return [...db.users]
}

/** 重置回种子（用于 debug） */
export function resetDb(): void {
  db.items.clear()
  db.users = [...seed.users]
  initialized = false
  init()
}
