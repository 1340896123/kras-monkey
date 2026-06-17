// 字段值格式化 / 引用字段解析（共享工具，复用方：表单组件、列表、关系表）
// 对应需求 §18 共享独立文件职责

import dayjs from 'dayjs'
import type { Property, KrasItem } from '@/types'

/** 引用字段值与显示分离解析 */
export function resolveReference(value: unknown, fieldName: string): { id: string | null; label: string } {
  if (!value) return { id: null, label: '' }
  if (typeof value === 'string') return { id: value, label: value }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const id = (obj['@id'] ?? obj[`${fieldName}@id`] ?? null) as string | null
    const label =
      (obj['@keyed_name'] as string) ??
      (obj[`${fieldName}@keyed_name`] as string) ??
      (obj['label'] as string) ??
      (obj['name'] as string) ??
      id ??
      ''
    return { id, label }
  }
  return { id: null, label: String(value) }
}

/** 按字段类型格式化显示值 */
export function formatFieldValue(value: unknown, prop: Property | null): string {
  if (value === null || value === undefined || value === '') return '-'
  if (!prop) return String(value)
  switch (prop.data_type) {
    case 'boolean':
      return value === 1 || value === true || value === '1' ? '是' : '否'
    case 'date':
      return dayjs(value as string).isValid() ? dayjs(value as string).format('YYYY-MM-DD') : String(value)
    case 'decimal':
    case 'integer':
      return typeof value === 'number' ? value.toLocaleString() : String(value)
    case 'item':
    case 'foreign': {
      const r = resolveReference(value, prop.name)
      return r.label || r.id || '-'
    }
    case 'list':
      return String(value)
    default:
      return String(value)
  }
}

/** 把表单输入值规范化为可提交的值 */
export function normalizeFieldValue(input: unknown, prop: Property): unknown {
  if (input === null || input === undefined || input === '') return null
  switch (prop.data_type) {
    case 'integer':
      return typeof input === 'number' ? input : parseInt(input as string, 10)
    case 'decimal':
      return typeof input === 'number' ? input : parseFloat(input as string)
    case 'boolean':
      return input === true || input === 1 || input === '1' ? 1 : 0
    case 'date':
      return typeof input === 'string' ? input : dayjs(input as dayjs.Dayjs).format('YYYY-MM-DD')
    case 'item':
    case 'foreign': {
      if (input && typeof input === 'object') {
        const obj = input as KrasItem
        return obj['@id'] ?? null
      }
      return input
    }
    default:
      return input
  }
}

/** 把后端返回字段解析为表单可用值 */
export function parseFieldValue(raw: unknown, prop: Property): unknown {
  if (raw === null || raw === undefined) return null
  switch (prop.data_type) {
    case 'boolean':
      return raw === 1 || raw === true || raw === '1'
    case 'date':
      return typeof raw === 'string' ? raw : dayjs(raw as dayjs.Dayjs).format('YYYY-MM-DD')
    case 'item':
    case 'foreign': {
      const r = resolveReference(raw, prop.name)
      if (r.id) {
        return { '@id': r.id, '@keyed_name': r.label, label: r.label, name: r.label }
      }
      return null
    }
    default:
      return raw
  }
}
