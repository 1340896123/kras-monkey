// seed/itemtypes.ts —— 内置 ItemType 元数据（系统 + 业务示例）
// 对应需求 §3.1、design.md §3.1

import type { ItemType } from '@/types'
import { id } from './id'

const I = (key: string, p: Partial<ItemType> & Pick<ItemType, 'name' | 'label'>): ItemType => ({
  id: id('itemtype:' + key),
  _seedKey: key,
  is_relationship: 0,
  is_versionable: 0,
  implementation_type: 'Table',
  default_page_size: 20,
  is_es_index: 0,
  is_hidden: 0,
  is_system: 0,
  sort_order: 0,
  ...p,
})

export const itemTypes: ItemType[] = [
  // —— 系统元数据类型（不进菜单）——
  I('itemtype', { name: 'ItemType', label: '业务对象类型', label_zh: '业务对象类型', is_hidden: 1, is_system: 1, icon: 'AppstoreOutlined' }),
  I('property', { name: 'Property', label: '字段定义', is_hidden: 1, is_system: 1, is_relationship: 1, icon: 'ColumnHeightOutlined' }),
  I('relationshiptype', { name: 'RelationshipType', label: '关系类型', is_hidden: 1, is_system: 1, icon: 'ApartmentOutlined' }),
  I('list', { name: 'List', label: '列表', is_hidden: 1, is_system: 1, icon: 'UnorderedListOutlined' }),
  I('listvalue', { name: 'ListValue', label: '列表值', is_hidden: 1, is_system: 1, is_relationship: 1 }),
  I('view', { name: 'View', label: '视图', is_hidden: 1, is_system: 1, icon: 'LayoutOutlined' }),
  I('form', { name: 'Form', label: '表单方案', is_hidden: 1, is_system: 1 }),

  // —— 权限与身份 ——
  I('user', { name: 'User', label: '用户', icon: 'UserOutlined', sort_order: 1 }),
  I('identity', { name: 'Identity', label: '身份', is_hidden: 1, is_system: 1 }),
  I('alias', { name: 'Alias', label: '别名身份', is_hidden: 1, is_system: 1 }),
  I('team', { name: 'Team', label: '团队', icon: 'TeamOutlined', sort_order: 2 }),
  I('teamidentity', { name: 'TeamIdentity', label: '团队成员', is_hidden: 1, is_system: 1, is_relationship: 1 }),
  I('permission', { name: 'Permission', label: '权限', is_hidden: 1, is_system: 1 }),
  I('access', { name: 'Access', label: '访问规则', is_hidden: 1, is_system: 1, is_relationship: 1 }),
  I('vault', { name: 'Vault', label: '文件库', is_hidden: 1, is_system: 1, icon: 'DatabaseOutlined' }),

  // —— 生命周期 ——
  I('lifecycle', { name: 'LifeCycleDefinition', label: '生命周期定义', icon: 'NodeIndexOutlined', sort_order: 3 }),
  I('lifecyclestate', { name: 'LifeCycle State', label: '生命周期状态', is_hidden: 1, is_system: 1 }),
  I('lifecycletransition', { name: 'LifeCycle Transition', label: '生命周期转换', is_hidden: 1, is_system: 1 }),

  // —— 工作流 ——
  I('workflow', { name: 'WorkflowDefinition', label: '工作流定义', icon: 'DeploymentUnitOutlined', sort_order: 4 }),
  I('workflowactivity', { name: 'WorkflowActivity', label: '工作流活动', is_hidden: 1, is_system: 1 }),

  // —— 方法 ——
  I('method', { name: 'Method', label: '方法', icon: 'CodeOutlined', sort_order: 5 }),

  // —— AI ——
  I('aiscenario', { name: 'AiScenario', label: 'AI 场景', icon: 'RobotOutlined', sort_order: 6 }),

  // —— 文件 ——
  I('file', { name: 'File', label: '文件', is_hidden: 1, is_system: 1, icon: 'FileOutlined' }),
  I('image', { name: 'Image', label: '图片', is_hidden: 1, is_system: 1, icon: 'PictureOutlined' }),

  // —— 菜单 ——
  I('menu', { name: 'Menu', label: '菜单', is_hidden: 1, is_system: 1, icon: 'MenuOutlined' }),

  // —— 业务示例（PLM 导向）——
  I('part', { name: 'Part', label: '物料', label_zh: '物料', icon: 'BlockOutlined', sort_order: 10, is_versionable: 1, is_es_index: 1, class_structure: '{"roots":["Mechanical","Electrical","Consumable"]}' }),
  I('document', { name: 'Document', label: '文档', label_zh: '文档', icon: 'FileTextOutlined', sort_order: 11, is_versionable: 1, is_es_index: 1 }),
  I('bom', { name: 'BOM', label: '物料清单', icon: 'PartitionOutlined', sort_order: 12, is_relationship: 1 }),
  I('bomitem', { name: 'BomItem', label: 'BOM 行', is_hidden: 1, is_relationship: 1 }),
  I('eco', { name: 'ECO', label: '工程变更单', icon: 'SyncOutlined', sort_order: 13, is_es_index: 1 }),
  I('cad', { name: 'CAD', label: 'CAD 模型', icon: 'BoxPlotOutlined', sort_order: 14, is_versionable: 1 }),
]

/** 通过 ItemType.name 或 seed key（如 'lifecycle'）查找 */
export const itemTypeBy = (nameOrKey: string): ItemType => {
  // 1. 精确匹配 name
  let t = itemTypes.find((it) => it.name === nameOrKey)
  // 2. 匹配 I(key) 调用时的 seed key（保留在 _seedKey 字段）
  if (!t) t = itemTypes.find((it) => (it as any)._seedKey === nameOrKey)
  // 3. 大小写不敏感 + 去空格的 name 兜底
  if (!t) {
    t = itemTypes.find(
      (it) => it.name.toLowerCase().replace(/\s+/g, '') === nameOrKey.toLowerCase().replace(/\s+/g, ''),
    )
  }
  if (!t) throw new Error(`ItemType not found: ${nameOrKey}`)
  return t
}
