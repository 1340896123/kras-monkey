// seed/users.ts —— 用户 / 身份 / 团队 / 权限种子
// 对应需求 §3.1.2 / §10

import type { User, Identity, Team, Permission, Access, KrasId } from '@/types'
import { id } from './id'
import { itemTypes, itemTypeBy } from './itemtypes'

// === 身份 ===
export const identities: Identity[] = [
  { id: id('identity:admin'), name: 'admin', type: 'user' },
  { id: id('identity:pmlin'), name: 'pmlin', type: 'user' },
  { id: id('identity:engineer'), name: 'engineer', type: 'user' },
  { id: id('identity:viewer'), name: 'viewer', type: 'user' },
]

// === 团队 ===
export const teams: Team[] = [
  { id: id('team:plm'), name: 'plm', label: 'PLM 团队', identity_ids: [id('identity:admin'), id('identity:pmlin')] },
  { id: id('team:rd'), name: 'rd', label: '研发团队', identity_ids: [id('identity:engineer')] },
]

// === 用户（含密码种子，明文仅 demo，真实环境用 PasswordHasher）===
export const users: (User & { password: string })[] = [
  {
    id: id('user:admin'),
    login_name: 'admin',
    name: '系统管理员',
    email: 'admin@kras.demo',
    is_active: 1,
    is_login_allowed: 1,
    company: 'Kras',
    identity_ids: [id('identity:admin')],
    password: 'admin',
  },
  {
    id: id('user:pmlin'),
    login_name: 'pmlin',
    name: '张文清',
    email: 'pmlin@kras.demo',
    is_active: 1,
    is_login_allowed: 1,
    company: 'Kras',
    identity_ids: [id('identity:pmlin')],
    password: 'pmlin',
  },
  {
    id: id('user:engineer'),
    login_name: 'engineer',
    name: '李工',
    email: 'engineer@kras.demo',
    is_active: 1,
    is_login_allowed: 1,
    company: 'Kras',
    identity_ids: [id('identity:engineer')],
    password: 'engineer',
  },
  {
    id: id('user:viewer'),
    login_name: 'viewer',
    name: '王查阅',
    email: 'viewer@kras.demo',
    is_active: 1,
    is_login_allowed: 1,
    company: 'Kras',
    identity_ids: [id('identity:viewer')],
    password: 'viewer',
  },
]

// === 权限 ===
// 给每个业务 ItemType 创建默认 Permission（admin 全权）
export const permissions: Permission[] = itemTypes
  .filter((t) => !t.is_system)
  .map((t) => ({
    id: id('permission:' + t.name),
    name: `${t.name}:default`,
    source_id: t.id,
    is_private: 0,
  }))

// === Access（admin 全权，pmlin 读+写，viewer 只读）===
function makeAccess(permissionId: KrasId, identityId: KrasId, allow: Partial<Access>): Access {
  return {
    id: id(`access:${permissionId}:${identityId}`),
    source_id: permissionId,
    related_id: identityId,
    can_get: 1,
    can_add: 0,
    can_update: 0,
    can_delete: 0,
    can_discover: 1,
    can_change_access: 0,
    show_permissions_warning: 0,
    ...allow,
  } as Access
}

export const accesses: Access[] = permissions.flatMap((p) => [
  makeAccess(p.id, id('identity:admin'), { can_add: 1, can_update: 1, can_delete: 1, can_change_access: 1 }),
  makeAccess(p.id, id('identity:pmlin'), { can_add: 1, can_update: 1 }),
  makeAccess(p.id, id('identity:engineer'), { can_add: 1, can_update: 1 }),
  makeAccess(p.id, id('identity:viewer'), {}),
])

export const PART_TYPE_ID = itemTypeBy('Part').id
