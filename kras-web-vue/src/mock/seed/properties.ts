// seed/properties.ts —— 各 ItemType 的 Property 字段定义
// 对应需求 §3.1.1 / §3.2

import type { Property } from '@/types'
import { id } from './id'
import { itemTypeBy } from './itemtypes'

interface PropSpec {
  name: string
  label: string
  data_type: Property['data_type']
  source?: string
  foreign_property?: string
  required?: boolean
  unique?: boolean
  hidden?: boolean
  readonly?: boolean
  default?: string
  length?: number
  precision?: number
  scale?: number
  sort_order?: number
  column_width?: number
  column_align?: 'left' | 'center' | 'right'
}

const order = 0

function buildProps(itemTypeKey: string, specs: PropSpec[]): Property[] {
  const itemType = itemTypeBy(itemTypeKey)
  return specs.map((s) => {
    const prop: Property = {
      id: id(`prop:${itemTypeKey}:${s.name}`),
      source_id: itemType.id,
      name: s.name,
      label: s.label,
      data_type: s.data_type,
      data_length: s.length,
      data_precision: s.precision,
      data_scale: s.scale,
      data_source:
        s.data_type === 'list'
          ? id('list:' + s.source!)
          : s.data_type === 'item'
            ? itemTypeBy(s.source!).id
            : s.data_type === 'foreign'
              ? id(`prop:${s.source}:${s.foreign_property}`)
              : undefined,
      foreign_property:
        s.data_type === 'foreign'
          ? id(`prop:${s.source}:${s.foreign_property}`)
          : undefined,
      is_required: s.required ? 1 : 0,
      is_unique: s.unique ? 1 : 0,
      is_hidden: s.hidden ? 1 : 0,
      is_hidden2: 0,
      is_readonly: s.readonly ? 1 : 0,
      default_value: s.default,
      sort_order: s.sort_order ?? 0,
      column_width: s.column_width,
      column_align: s.column_align,
    }
    return prop
  })
}

export const properties: Property[] = [
  // ===== Part =====
  ...buildProps('part', [
    { name: 'item_number', label: '物料编号', data_type: 'string', required: true, unique: true, length: 64, sort_order: 1, column_width: 160 },
    { name: 'name', label: '名称', data_type: 'string', required: true, length: 200, sort_order: 2, column_width: 200 },
    { name: 'classification', label: '分类', data_type: 'classification', sort_order: 3, column_width: 140 },
    { name: 'make_buy', label: 'Make/Buy', data_type: 'list', source: 'make_buy', sort_order: 4, column_width: 100, column_align: 'center' },
    { name: 'unit', label: '单位', data_type: 'list', source: 'uom', sort_order: 5, column_width: 80, column_align: 'center' },
    { name: 'cost', label: '成本', data_type: 'decimal', precision: 18, scale: 4, sort_order: 6, column_width: 120, column_align: 'right' },
    { name: 'qty_on_hand', label: '库存', data_type: 'integer', sort_order: 7, column_width: 100, column_align: 'right' },
    { name: 'description', label: '描述', data_type: 'text', length: 2000, sort_order: 8, hidden: true },
    { name: 'lifecycle_state', label: '生命周期', data_type: 'string', readonly: true, sort_order: 9, column_width: 120 },
    { name: 'is_active', label: '启用', data_type: 'boolean', default: '1', sort_order: 10, column_width: 80, column_align: 'center' },
    { name: 'thumbnail', label: '缩略图', data_type: 'image', sort_order: 11, hidden: true },
  ]),

  // ===== Document =====
  ...buildProps('document', [
    { name: 'document_number', label: '文档编号', data_type: 'string', required: true, unique: true, length: 64, sort_order: 1, column_width: 160 },
    { name: 'title', label: '标题', data_type: 'string', required: true, length: 200, sort_order: 2, column_width: 220 },
    { name: 'category', label: '类型', data_type: 'list', source: 'doc_category', sort_order: 3, column_width: 120 },
    { name: 'author_id', label: '作者', data_type: 'item', source: 'user', sort_order: 4, column_width: 140 },
    { name: 'version', label: '版本', data_type: 'string', readonly: true, sort_order: 5, column_width: 80, column_align: 'center' },
    { name: 'release_date', label: '发布日期', data_type: 'date', sort_order: 6, column_width: 130 },
    { name: 'is_confidential', label: '机密', data_type: 'boolean', sort_order: 7, column_width: 80, column_align: 'center' },
    { name: 'attachment', label: '附件', data_type: 'file', sort_order: 8, hidden: true },
  ]),

  // ===== BOM =====
  ...buildProps('bom', [
    { name: 'source_id', label: '父物料', data_type: 'item', source: 'part', required: true, sort_order: 1, column_width: 200 },
    { name: 'quantity', label: '数量', data_type: 'decimal', precision: 18, scale: 4, required: true, sort_order: 2, column_width: 100, column_align: 'right' },
    { name: 'sort_order', label: '排序', data_type: 'integer', sort_order: 3, column_width: 80, column_align: 'center' },
    { name: 'effective_from', label: '生效', data_type: 'date', sort_order: 4, column_width: 130 },
    { name: 'effective_to', label: '失效', data_type: 'date', sort_order: 5, column_width: 130 },
  ]),

  // ===== Bom Item =====
  ...buildProps('bomitem', [
    { name: 'related_id', label: '子物料', data_type: 'item', source: 'part', required: true, sort_order: 1, column_width: 200 },
    { name: 'quantity', label: '数量', data_type: 'decimal', precision: 18, scale: 4, required: true, sort_order: 2, column_width: 100, column_align: 'right' },
  ]),

  // ===== ECO =====
  ...buildProps('eco', [
    { name: 'eco_number', label: '变更单号', data_type: 'string', required: true, unique: true, length: 64, sort_order: 1, column_width: 160 },
    { name: 'title', label: '标题', data_type: 'string', required: true, length: 200, sort_order: 2, column_width: 240 },
    { name: 'reason', label: '变更原因', data_type: 'text', length: 2000, sort_order: 3 },
    { name: 'priority', label: '优先级', data_type: 'list', source: 'priority', sort_order: 4, column_width: 100, column_align: 'center' },
    { name: 'status', label: '状态', data_type: 'list', source: 'eco_status', readonly: true, sort_order: 5, column_width: 100, column_align: 'center' },
    { name: 'requester_id', label: '申请人', data_type: 'item', source: 'user', sort_order: 6, column_width: 140 },
  ]),

  // ===== CAD =====
  ...buildProps('cad', [
    { name: 'cad_number', label: 'CAD 编号', data_type: 'string', required: true, unique: true, length: 64, sort_order: 1, column_width: 160 },
    { name: 'name', label: '名称', data_type: 'string', required: true, length: 200, sort_order: 2, column_width: 220 },
    { name: 'material', label: '材料', data_type: 'list', source: 'material', sort_order: 3, column_width: 120 },
    { name: 'part_id', label: '关联物料', data_type: 'item', source: 'part', sort_order: 4, column_width: 200 },
  ]),

  // ===== User =====
  ...buildProps('user', [
    { name: 'login_name', label: '登录名', data_type: 'string', required: true, unique: true, length: 64, sort_order: 1, column_width: 140 },
    { name: 'name', label: '姓名', data_type: 'string', required: true, length: 64, sort_order: 2, column_width: 140 },
    { name: 'email', label: '邮箱', data_type: 'string', length: 128, sort_order: 3, column_width: 200 },
    { name: 'phone', label: '手机', data_type: 'string', length: 32, sort_order: 4, column_width: 140 },
    { name: 'is_active', label: '启用', data_type: 'boolean', default: '1', sort_order: 5, column_width: 80, column_align: 'center' },
    { name: 'company', label: '公司', data_type: 'string', length: 128, sort_order: 6, column_width: 180 },
    { name: 'avatar', label: '头像', data_type: 'image', sort_order: 7, hidden: true },
  ]),

  // ===== Team =====
  ...buildProps('team', [
    { name: 'name', label: '团队名', data_type: 'string', required: true, length: 128, sort_order: 1, column_width: 200 },
    { name: 'label', label: '显示名', data_type: 'string', length: 128, sort_order: 2, column_width: 200 },
    { name: 'description', label: '描述', data_type: 'text', length: 1000, sort_order: 3 },
  ]),

  // ===== LifeCycle Definition =====
  ...buildProps('lifecycle', [
    { name: 'name', label: '名称', data_type: 'string', required: true, length: 128, sort_order: 1, column_width: 200 },
    { name: 'key', label: 'Key', data_type: 'string', required: true, unique: true, length: 64, sort_order: 2, column_width: 160 },
    { name: 'is_enabled', label: '启用', data_type: 'boolean', default: '1', sort_order: 3, column_width: 80, column_align: 'center' },
  ]),

  // ===== Workflow Definition =====
  ...buildProps('workflow', [
    { name: 'name', label: '名称', data_type: 'string', required: true, length: 128, sort_order: 1, column_width: 200 },
    { name: 'key', label: 'Key', data_type: 'string', required: true, unique: true, length: 64, sort_order: 2, column_width: 160 },
    { name: 'is_enabled', label: '启用', data_type: 'boolean', default: '1', sort_order: 3, column_width: 80, column_align: 'center' },
  ]),

  // ===== Method =====
  ...buildProps('method', [
    { name: 'name', label: '名称', data_type: 'string', required: true, unique: true, length: 128, sort_order: 1, column_width: 200 },
    { name: 'method_type', label: '类型', data_type: 'list', source: 'method_type', sort_order: 2, column_width: 100, column_align: 'center' },
    { name: 'comment', label: '说明', data_type: 'text', length: 1000, sort_order: 3, column_width: 280 },
    { name: 'method_code', label: '代码', data_type: 'text', hidden: true, length: 65535 },
  ]),

  // ===== Ai Scenario =====
  ...buildProps('aiscenario', [
    { name: 'name', label: '场景名', data_type: 'string', required: true, length: 128, sort_order: 1, column_width: 200 },
    { name: 'description', label: '描述', data_type: 'text', length: 1000, sort_order: 2 },
    { name: 'provider', label: '供应方', data_type: 'list', source: 'ai_provider', sort_order: 3, column_width: 140 },
  ]),
]
