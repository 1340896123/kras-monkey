// seed/views.ts —— View + Form Scheme 种子（决定每个 ItemType 的详情布局）
// 对应需求 §9.5

import type { View, FormScheme } from '@/types'
import { id } from './id'
import { itemTypes, itemTypeBy } from './itemtypes'

function V(itemTypeKey: string, viewType: View['view_type'], formScheme: FormScheme, opts: Partial<View> = {}): View {
  const it = itemTypeBy(itemTypeKey)
  return {
    id: id(`view:${itemTypeKey}:${viewType}:${opts.name ?? 'default'}`),
    name: opts.name ?? 'default',
    label: opts.label ?? (viewType === 'detail' ? '详情视图' : '列表视图'),
    source_id: it.id,
    view_type: viewType,
    form_scheme: formScheme,
    is_default: 1,
    sort_order: 1,
    ...opts,
  }
}

const f = (propertyName: string, component: View['form_scheme'] extends never ? never : import('@/types').FormField['component'], opts: Partial<import('@/types').FormField> = {}): import('@/types').FormField => ({
  id: `f_${propertyName}_${Math.random().toString(36).slice(2, 6)}`,
  name: propertyName,
  component,
  ...opts,
})

const group = (label: string, fields: import('@/types').FormField[], columns = 2): import('@/types').FormSection => ({
  id: `g_${label}`,
  type: 'group',
  label,
  columns,
  fields,
})

export const views: View[] = [
  // Part 详情
  V('part', 'detail', {
    sections: [
      group('基本信息', [
        f('item_number', 'text', { required: true }),
        f('name', 'text', { required: true }),
        f('classification', 'classification'),
        f('make_buy', 'select'),
      ]),
      group('库存与成本', [
        f('unit', 'select'),
        f('cost', 'number'),
        f('qty_on_hand', 'number'),
        f('is_active', 'switch'),
      ]),
      group('生命周期', [
        f('lifecycle_state', 'text', { readonly: true }),
        f('thumbnail', 'image'),
      ], 1),
      {
        id: 'desc_section',
        type: 'group',
        label: '描述',
        columns: 1,
        fields: [f('description', 'textarea')],
      },
    ],
  }),

  // Part 列表（form_scheme 仅用于列定义，前端从 properties 元数据生成）
  V('part', 'list', { sections: [] }, { name: 'list' }),

  // Document
  V('document', 'detail', {
    sections: [
      group('文档信息', [
        f('document_number', 'text', { required: true }),
        f('title', 'text', { required: true }),
        f('category', 'select'),
        f('author_id', 'item'),
      ]),
      group('版本与发布', [
        f('version', 'text', { readonly: true }),
        f('release_date', 'date'),
        f('is_confidential', 'switch'),
      ], 3),
      { id: 'att', type: 'group', label: '附件', columns: 1, fields: [f('attachment', 'file')] },
    ],
  }),
  V('document', 'list', { sections: [] }, { name: 'list' }),

  // ECO
  V('eco', 'detail', {
    sections: [
      group('变更单', [
        f('eco_number', 'text', { required: true }),
        f('title', 'text', { required: true }),
        f('priority', 'select'),
        f('status', 'select', { readonly: true }),
      ]),
      { id: 'r', type: 'group', label: '变更原因', columns: 1, fields: [f('reason', 'textarea')] },
    ],
  }),
  V('eco', 'list', { sections: [] }, { name: 'list' }),

  // CAD
  V('cad', 'detail', {
    sections: [
      group('CAD 模型', [
        f('cad_number', 'text', { required: true }),
        f('name', 'text', { required: true }),
        f('material', 'select'),
        f('part_id', 'item'),
      ]),
    ],
  }),
  V('cad', 'list', { sections: [] }, { name: 'list' }),

  // User
  V('user', 'detail', {
    sections: [
      group('用户信息', [
        f('login_name', 'text', { required: true }),
        f('name', 'text', { required: true }),
        f('email', 'text'),
        f('phone', 'text'),
      ]),
      group('账户', [f('is_active', 'switch'), f('company', 'text')], 2),
    ],
  }),
  V('user', 'list', { sections: [] }, { name: 'list' }),

  // Team
  V('team', 'detail', {
    sections: [
      group('团队信息', [
        f('name', 'text', { required: true }),
        f('label', 'text', { required: true }),
      ]),
      { id: 't', type: 'group', label: '描述', columns: 1, fields: [f('description', 'textarea')] },
    ],
  }),
  V('team', 'list', { sections: [] }, { name: 'list' }),

  // Method
  V('method', 'detail', {
    sections: [
      group('方法', [
        f('name', 'text', { required: true }),
        f('method_type', 'select'),
      ]),
      { id: 'mc', type: 'group', label: '说明', columns: 1, fields: [f('comment', 'textarea')] },
      { id: 'code', type: 'group', label: '代码', columns: 1, fields: [f('method_code', 'textarea')] },
    ],
  }),
  V('method', 'list', { sections: [] }, { name: 'list' }),

  // LifeCycle
  V('lifecycle', 'detail', {
    sections: [
      group('生命周期', [
        f('name', 'text', { required: true }),
        f('key', 'text', { required: true }),
        f('is_enabled', 'switch'),
      ]),
    ],
  }),
  V('lifecycle', 'list', { sections: [] }, { name: 'list' }),

  // Workflow
  V('workflow', 'detail', {
    sections: [
      group('工作流', [
        f('name', 'text', { required: true }),
        f('key', 'text', { required: true }),
        f('is_enabled', 'switch'),
      ]),
    ],
  }),
  V('workflow', 'list', { sections: [] }, { name: 'list' }),
]
