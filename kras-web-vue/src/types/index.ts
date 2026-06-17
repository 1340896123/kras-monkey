// Kras 核心类型定义
// 对应 design.md §3.1 元数据 ER 与 §4 Item 协议

/** 32 位无连字符大写 ID */
export type KrasId = string

/** Item 系统属性前缀 */
export const SYS_PREFIX = '@' as const

/** @action 标准动作 */
export type StandardAction =
  | 'get'
  | 'new'
  | 'add'
  | 'edit'
  | 'update'
  | 'copy'
  | 'lock'
  | 'unlock'
  | 'version'
  | 'promote'
  | 'delete'

/** 内置动作白名单 */
export type DirectBuiltInAction =
  | 'quickSearch'
  | 'startWorkflow'
  | 'advanceWorkflow'
  | 'submitApproval'
  | 'approveWorkflow'
  | 'rejectWorkflow'
  | 'addSign'
  | 'removeSign'
  | 'delegate'
  | 'transfer'
  | 'reassign'
  | 'takeOver'
  | 'getWorkflowNodeForm'
  | 'getWorkflowProcessForm'

/** 字段数据类型 */
export type PropertyDataType =
  | 'string'
  | 'text'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'list'
  | 'item'
  | 'foreign'
  | 'image'
  | 'file'
  | 'color'
  | 'classification'

/** Item 协议载荷（AML 兼容） */
export interface KrasItem {
  [key: string]: unknown
  '@type'?: string
  '@id'?: KrasId
  '@action'?: string
  '@keyed_name'?: string
  '@relationships'?: string
  '@Relationships'?: KrasItem[]
  '@dirty'?: boolean
  '@error'?: KrasError
}

/** 错误码封闭集合 */
export type KrasErrorCode =
  | 'VALIDATION_ERROR'
  | 'ITEM_NOT_FOUND'
  | 'ITEMTYPE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'CONFLICT'
  | 'METHOD_EXECUTION_FAILED'
  | 'DELETE_FAILED'
  | 'INTERNAL_ERROR'
  | 'DATABASE_ERROR'
  | 'INVALID_JSON'

export interface KrasError {
  '@type': 'Error'
  '@is_error': '1'
  code: KrasErrorCode
  message: string
  details?: unknown
}

/** 统一响应 envelope */
export interface KrasEnvelope<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: KrasError
}

/** ItemType 元数据 */
export interface ItemType {
  id: KrasId
  name: string
  label: string
  label_zh?: string
  is_relationship: 0 | 1
  is_versionable: 0 | 1
  implementation_type: string
  class_structure?: string
  default_page_size: number
  icon?: string
  is_es_index: 0 | 1
  is_hidden: 0 | 1
  is_system: 0 | 1
  sort_order?: number
  description?: string
  /** seed 内部用 */
  _seedKey?: string
}

/** 字段定义 */
export interface Property {
  id: KrasId
  source_id: KrasId
  name: string
  label: string
  label_zh?: string
  data_type: PropertyDataType
  data_length?: number
  data_precision?: number
  data_scale?: number
  data_source?: KrasId
  foreign_property?: KrasId
  is_required: 0 | 1
  is_unique: 0 | 1
  is_hidden: 0 | 1
  is_hidden2: 0 | 1
  is_readonly: 0 | 1
  default_value?: string
  sort_order: number
  column_width?: number
  column_align?: 'left' | 'center' | 'right'
  field_permission_id?: KrasId
  pattern?: string
  description?: string
  /** 前端 JS Method 运行时附加：变化时执行的方法 ID 数组 */
  on_change_methods?: KrasId[]
}

/** 关系类型 */
export interface RelationshipType {
  id: KrasId
  name: string
  label: string
  label_zh?: string
  source_id: KrasId
  related_id: KrasId
  relationship_id: KrasId
  sort_order?: number
  is_hidden?: 0 | 1
}

/** 列表 */
export interface KrasList {
  id: KrasId
  name: string
  label: string
  values: KrasListValue[]
}

export interface KrasListValue {
  id: KrasId
  value: string
  label: string
  sort_order: number
  filter?: string
}

/** View + Form */
export interface View {
  id: KrasId
  name: string
  label: string
  source_id: KrasId
  view_type: 'list' | 'detail' | 'relationship'
  form_scheme?: FormScheme
  is_default: 0 | 1
  sort_order: number
}

export interface FormScheme {
  sections: FormSection[]
}

export interface FormSection {
  id: string
  type: 'group' | 'divider' | 'title' | 'layout'
  label?: string
  /** 栅格列数 */
  columns?: number
  fields: FormField[]
}

export interface FormField {
  id: string
  property_id?: KrasId
  name: string
  label?: string
  component:
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'switch'
    | 'select'
    | 'item'
    | 'file'
    | 'image'
    | 'button'
    | 'classification'
    | 'color'
  /** 容器类组件的子字段 */
  children?: FormField[]
  required?: boolean
  readonly?: boolean
  /** schema 配置 */
  config?: Record<string, unknown>
  /** 绑定前端 JS Method */
  methods?: Array<{
    event: 'click' | 'change'
    method_id: KrasId
    sort_order: number
  }>
  span?: number
}

/** 用户与权限 */
export interface User {
  id: KrasId
  login_name: string
  name: string
  email?: string
  phone?: string
  is_active: 0 | 1
  is_login_allowed: 0 | 1
  avatar?: string
  default_vault_id?: KrasId
  company?: string
  identity_ids: KrasId[]
}

export interface Identity {
  id: KrasId
  name: string
  type: 'user' | 'alias'
}

export interface Team {
  id: KrasId
  name: string
  label: string
  identity_ids: KrasId[]
}

export interface Permission {
  id: KrasId
  name: string
  source_id: KrasId
  is_private: 0 | 1
}

export interface Access {
  id: KrasId
  source_id: KrasId // Permission id
  related_id: KrasId // Identity id
  can_get: 0 | 1
  can_add: 0 | 1
  can_update: 0 | 1
  can_delete: 0 | 1
  can_discover: 0 | 1
  can_change_access: 0 | 1
  show_permissions_warning: 0 | 1
}

/** 菜单 */
export interface MenuItem {
  id: KrasId
  parent_id: KrasId | null
  name: string
  label: string
  path?: string
  icon?: string
  item_type_id?: KrasId
  sort_order: number
  is_hidden: 0 | 1
  /** 按当前用户 identityIds 过滤后是否可见 */
  visible?: boolean
}

/** 元数据缓存快照 */
export interface MetadataSnapshot {
  itemTypes: ItemType[]
  properties: Property[]
  relationshipTypes: RelationshipType[]
  lists: KrasList[]
  views: View[]
  permissions: Permission[]
}

/** 通用查询参数 */
export interface QueryParams {
  page: number
  page_size: number
  /** 后端过滤表达式：`name=*abc*`、`qty>100`、`<2025/01/11` */
  filters?: string[]
  order_by?: string
  /** 引用展开 */
  relationships?: string
  search_key?: string
}

export interface QueryResult<T = KrasItem> {
  items: T[]
  total: number
  page: number
  page_size: number
}
