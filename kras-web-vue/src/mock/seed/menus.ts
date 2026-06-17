// seed/menus.ts —— 菜单种子
// 对应需求 §12：ItemType 分组自动生成 + 自定义菜单

import type { MenuItem } from '@/types'
import { id } from './id'

const topMenus: Array<{ key: string; label: string; icon: string; path?: string }> = [
  { key: 'dashboard', label: '仪表盘', icon: 'DashboardOutlined', path: '/dashboard' },
]

const systemMenus: Array<{ key: string; label: string; icon: string; path?: string }> = [
  { key: 'users', label: '用户管理', icon: 'UserOutlined', path: '/users' },
  { key: 'menu-management', label: '菜单管理', icon: 'MenuOutlined', path: '/menu-management' },
  { key: 'ai-management', label: 'AI 管理', icon: 'RobotOutlined', path: '/ai-management' },
  { key: 'settings', label: '系统设置', icon: 'SettingOutlined', path: '/settings' },
  { key: 'debug-panel', label: '调试面板', icon: 'BugOutlined', path: '/debug-panel' },
]

export function buildSeedMenus(businessItemTypeNames: string[]): MenuItem[] {
  const menus: MenuItem[] = []
  let order = 0

  // 顶部入口
  for (const m of topMenus) {
    menus.push({
      id: id('menu:' + m.key),
      parent_id: null,
      name: m.key,
      label: m.label,
      path: m.path,
      icon: m.icon,
      sort_order: order++,
      is_hidden: 0,
    })
  }

  // 业务分组：自动从 ItemType 生成（label ?? name）
  menus.push({
    id: id('menu:group-business'),
    parent_id: null,
    name: 'business',
    label: '业务对象',
    icon: 'AppstoreOutlined',
    sort_order: order++,
    is_hidden: 0,
  })

  for (const itName of businessItemTypeNames) {
    menus.push({
      id: id(`menu:it:${itName}`),
      parent_id: id('menu:group-business'),
      name: itName,
      label: itName,
      path: `/item-types/${itName}`,
      icon: 'BlockOutlined',
      sort_order: order++,
      is_hidden: 0,
    })
  }

  // 系统分组
  menus.push({
    id: id('menu:group-system'),
    parent_id: null,
    name: 'system',
    label: '系统管理',
    icon: 'ToolOutlined',
    sort_order: order++,
    is_hidden: 0,
  })
  for (const m of systemMenus) {
    menus.push({
      id: id('menu:' + m.key),
      parent_id: id('menu:group-system'),
      name: m.key,
      label: m.label,
      path: m.path,
      icon: m.icon,
      sort_order: order++,
      is_hidden: 0,
    })
  }

  return menus
}
