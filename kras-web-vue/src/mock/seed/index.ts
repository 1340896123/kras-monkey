// seed/index.ts —— 元数据 + 业务数据汇总入口

import { itemTypes } from './itemtypes'
import { properties } from './properties'
import { lists } from './lists'
import { users, identities, teams, permissions, accesses } from './users'
import { parts, documents, boms, ecos, cads, methods, lifecycles, workflows } from './business'
import { views } from './views'
import { buildSeedMenus } from './menus'
import type { KrasItem, MetadataSnapshot, MenuItem } from '@/types'

export interface KrasSeed {
  metadata: MetadataSnapshot
  users: Array<import('@/types').User & { password: string }>
  identities: import('@/types').Identity[]
  teams: import('@/types').Team[]
  permissions: import('@/types').Permission[]
  accesses: import('@/types').Access[]
  menus: MenuItem[]
  businessItems: KrasItem[]
}

export function buildSeed(): KrasSeed {
  const metadata: MetadataSnapshot = {
    itemTypes,
    properties,
    relationshipTypes: [],
    lists,
    views,
    permissions,
  }
  const businessItemTypeNames = itemTypes
    .filter((t) => !t.is_system && !t.is_hidden)
    .map((t) => t.name)
  const menus = buildSeedMenus(businessItemTypeNames)

  const businessItems: KrasItem[] = [
    ...parts,
    ...documents,
    ...boms,
    ...ecos,
    ...cads,
    ...methods,
    ...lifecycles,
    ...workflows,
    // users 也作为可查询对象
    ...users.map((u) => ({
      '@type': 'User',
      '@id': u.id,
      '@keyed_name': `${u.login_name} ${u.name}`,
      login_name: u.login_name,
      name: u.name,
      email: u.email,
      phone: u.phone,
      is_active: u.is_active,
      company: u.company,
    })),
  ]

  return {
    metadata,
    users,
    identities,
    teams,
    permissions,
    accesses,
    menus,
    businessItems,
  }
}

export const seed: KrasSeed = buildSeed()
