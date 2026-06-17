// seed/lists.ts —— 列表 / 枚举值（List + ListValue）
// 用于 data_type=list 的字段引用

import type { KrasList } from '@/types'
import { id } from './id'

interface ListSpec {
  key: string
  label: string
  values: Array<{ value: string; label: string; sort_order: number }>
}

const specs: ListSpec[] = [
  { key: 'make_buy', label: 'Make/Buy', values: [
    { value: 'make', label: '制造', sort_order: 1 },
    { value: 'buy', label: '采购', sort_order: 2 },
    { value: 'phantom', label: '虚拟件', sort_order: 3 },
  ]},
  { key: 'uom', label: '单位', values: [
    { value: 'pcs', label: '件', sort_order: 1 },
    { value: 'kg', label: '千克', sort_order: 2 },
    { value: 'm', label: '米', sort_order: 3 },
    { value: 'set', label: '套', sort_order: 4 },
    { value: 'l', label: '升', sort_order: 5 },
  ]},
  { key: 'doc_category', label: '文档类型', values: [
    { value: 'spec', label: '规格书', sort_order: 1 },
    { value: 'drawing', label: '图纸', sort_order: 2 },
    { value: 'manual', label: '手册', sort_order: 3 },
    { value: 'report', label: '报告', sort_order: 4 },
    { value: 'other', label: '其他', sort_order: 5 },
  ]},
  { key: 'priority', label: '优先级', values: [
    { value: 'low', label: '低', sort_order: 1 },
    { value: 'medium', label: '中', sort_order: 2 },
    { value: 'high', label: '高', sort_order: 3 },
    { value: 'critical', label: '紧急', sort_order: 4 },
  ]},
  { key: 'eco_status', label: 'ECO 状态', values: [
    { value: 'draft', label: '草稿', sort_order: 1 },
    { value: 'submitted', label: '已提交', sort_order: 2 },
    { value: 'approved', label: '已批准', sort_order: 3 },
    { value: 'rejected', label: '已驳回', sort_order: 4 },
    { value: 'implemented', label: '已实施', sort_order: 5 },
  ]},
  { key: 'material', label: '材料', values: [
    { value: 'steel', label: '钢', sort_order: 1 },
    { value: 'aluminum', label: '铝', sort_order: 2 },
    { value: 'plastic', label: '塑料', sort_order: 3 },
    { value: 'copper', label: '铜', sort_order: 4 },
    { value: 'composite', label: '复合材料', sort_order: 5 },
  ]},
  { key: 'method_type', label: '方法类型', values: [
    { value: 'cs', label: 'C# 服务端', sort_order: 1 },
    { value: 'js', label: 'JS 前端', sort_order: 2 },
    { value: 'javascript', label: 'JavaScript 前端', sort_order: 3 },
  ]},
  { key: 'ai_provider', label: 'AI 供应方', values: [
    { value: 'openai', label: 'OpenAI', sort_order: 1 },
    { value: 'claude', label: 'Claude', sort_order: 2 },
    { value: 'gemini', label: 'Gemini', sort_order: 3 },
    { value: 'qwen', label: '通义千问', sort_order: 4 },
    { value: 'glm', label: '智谱 GLM', sort_order: 5 },
  ]},
]

export const lists: KrasList[] = specs.map((s) => ({
  id: id('list:' + s.key),
  name: s.key,
  label: s.label,
  values: s.values.map((v) => ({
    id: id(`listvalue:${s.key}:${v.value}`),
    value: v.value,
    label: v.label,
    sort_order: v.sort_order,
  })),
}))
