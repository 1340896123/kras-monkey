// 元数据表格通用工具（列顺序/列宽/筛选归一化/行 key/列表值映射/引用预处理/分页参数）
// 对应需求 §18

import type { Property, KrasList, QueryParams, KrasItem } from '@/types'

export interface ColumnConfig {
  fieldName: string
  label: string
  width?: number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  hidden: boolean
  dataType: Property['data_type']
  listValues?: Map<string, string>
}

/** 由 Properties 元数据生成列配置 */
export function buildColumns(
  properties: Property[],
  lists: KrasList[]
): ColumnConfig[] {
  return properties
    .filter((p) => !p.is_hidden)
    .map((p) => {
      const listMap = new Map<string, string>()
      if (p.data_type === 'list' && p.data_source) {
        const list = lists.find((l) => l.id === p.data_source)
        list?.values.forEach((v) => listMap.set(v.value, v.label))
      }
      return {
        fieldName: p.name,
        label: p.label_zh ?? p.label,
        width: p.column_width,
        align: p.column_align,
        sortable: true,
        hidden: !!p.is_hidden,
        dataType: p.data_type,
        listValues: listMap.size ? listMap : undefined,
      }
    })
}

/** 行 key：优先业务 id → 关系 id → 自定义 key */
export function getRowKey(item: KrasItem, index: number, customKeyField?: string): string {
  if (customKeyField && item[customKeyField]) return String(item[customKeyField])
  return (item['@id'] as string) ?? `row-${index}`
}

/** 把筛选行输入归一化为后端过滤表达式 */
export function normalizeFilterInput(fieldName: string, input: string, dataType: Property['data_type']): string | null {
  if (!input.trim()) return null
  const v = input.trim()
  // 已包含操作符
  const opMatch = v.match(/^(>=|<=|<>|!=|>|<|=)(.*)$/)
  if (opMatch) return `${fieldName}${opMatch[1]}${opMatch[2].trim()}`
  // 日期关键字
  if (dataType === 'date' && v.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
    return `${fieldName}<${v.replace(/\//g, '/')}`
  }
  // 数值区间
  if ((dataType === 'integer' || dataType === 'decimal') && v.match(/^[<>]/)) {
    return `${fieldName}${v}`
  }
  // 通配符
  if (v.includes('*')) return `${fieldName}=${v}`
  // 默认模糊匹配
  return `${fieldName}=*${v}*`
}

/** 把 QueryParams 转成 applyItem 载荷 */
export function buildQueryPayload(itemType: string, params: QueryParams): KrasItem {
  const payload: KrasItem = {
    '@type': itemType,
    '@action': params.search_key ? 'get' : 'get',
  }
  if (params.search_key) (payload as Record<string, unknown>)['@searchKey'] = params.search_key
  if (params.filters?.length) {
    for (const f of params.filters) {
      const [k, v] = f.split(/(>=|<=|<>|!=|>|<|=)/)
      // 后端处理多种操作符；这里只保留 = 与通配
      ;(payload as Record<string, unknown>)[k.trim()] = v.replace(/^=/, '')
    }
  }
  return payload
}
