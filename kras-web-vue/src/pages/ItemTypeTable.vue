<script setup lang="ts">
// 列表页（ItemTypeTable）：元数据驱动 + 后端筛选 + 虚拟滚动
// 对应需求 §9.3 / §16.1
import { ref, computed, onMounted, watch, h, onActivated } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Input, InputNumber, DatePicker, Select, Switch, Space, Tag, Tooltip } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { applyItem } from '@/data/kras.item'
import { krasCache } from '@/data/kras.cache'
import { useTabsStore } from '@/store/tabs'
import { formatFieldValue, resolveReference } from '@/utils/fieldValue'
import { buildColumns, getRowKey, normalizeFilterInput } from '@/utils/metadataTable'
import type { Property, KrasItem, KrasList } from '@/types'

const props = defineProps<{ itemTypeName?: string }>()
const route = useRoute()
const router = useRouter()
const tabs = useTabsStore()

const itemTypeName = computed(() => (props.itemTypeName ?? route.params.itemType) as string)
const itemTypeMeta = computed(() => krasCache.getItemTypeMetadata(itemTypeName.value))
const properties = computed<Property[]>(() => krasCache.getItemTypeProperties(itemTypeName.value))
const lists = computed<KrasList[]>(() => krasCache.getMetadata().lists)
const columns = computed(() => buildColumns(properties.value, lists.value))

// 数据
const rows = ref<KrasItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 筛选行输入
const filterInputs = ref<Record<string, string>>({})
// 排序
const sortField = ref<string>('')
const sortOrder = ref<'asc' | 'desc'>('asc')

const visibleColumns = computed(() => columns.value.filter((c) => !c.hidden))

// 单个 v-for 友好的展示行：loading 显示 3 行骨架；空数据 1 行占位；正常按页大小
const displayRows = computed(() => {
  if (loading.value) return [null, null, null]
  if (rows.value.length === 0) return [null]
  return rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
})

const pagedRows = computed(() => rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

async function fetchData() {
  if (!itemTypeMeta.value) {
    rows.value = []
    return
  }
  loading.value = true
  try {
    const payload: KrasItem = { '@type': itemTypeName.value, '@action': 'get' }
    // 注入过滤
    for (const [field, input] of Object.entries(filterInputs.value)) {
      const prop = properties.value.find((p) => p.name === field)
      if (!prop) continue
      const expr = normalizeFilterInput(field, input, prop.data_type)
      if (expr) {
        const m = expr.match(/^([a-zA-Z_]+)(>=|<=|<>|!=|>|<|=)(.*)$/)
        if (m) {
          ;(payload as Record<string, unknown>)[m[1]] = m[2] === '=' ? m[3] : `${m[2]}${m[3]}`
        }
      }
    }
    const result = await applyItem<KrasItem[]>(payload)
    // 排序
    let list = result ?? []
    if (sortField.value) {
      list = [...list].sort((a, b) => {
        const va = a[sortField.value]
        const vb = b[sortField.value]
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortOrder.value === 'asc' ? va - vb : vb - va
        }
        const sa = String(va ?? '')
        const sb = String(vb ?? '')
        return sortOrder.value === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa)
      })
    }
    total.value = list.length
    rows.value = list
  } finally {
    loading.value = false
  }
}

function onFilter() {
  page.value = 1
  fetchData()
}

function onReset() {
  filterInputs.value = {}
  page.value = 1
  fetchData()
}

function onSort(field: string) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
  fetchData()
}

function openDetail(row: KrasItem) {
  const id = row['@id'] as string
  const path = `/item-types/${itemTypeName.value}/${id}`
  tabs.openTab({
    key: path,
    title: `${row['@keyed_name'] ?? itemTypeName.value + ' 详情'}`,
    path,
    closable: true,
  })
  router.push(path)
}

function onCreate() {
  const path = `/item-types/${itemTypeName.value}/new`
  tabs.openTab({ key: path, title: `新建 ${itemTypeMeta.value?.label ?? itemTypeName.value}`, path, closable: true })
  router.push(path)
}

// 渲染单元格值
function renderCell(row: KrasItem, col: typeof visibleColumns.value[number]) {
  const raw = row[col.fieldName]
  if (col.dataType === 'list' && col.listValues && raw) {
    const label = col.listValues.get(String(raw))
    if (label) return h(Tag, { color: 'blue' }, () => label)
  }
  if (col.dataType === 'boolean') {
    return raw === 1 || raw === true ? h(Tag, { color: 'success' }, () => '是') : h(Tag, () => '否')
  }
  if ((col.dataType === 'item' || col.dataType === 'foreign') && raw) {
    const r = resolveReference(raw, col.fieldName)
    return h('span', { class: 'kras-ref-cell' }, r.label || r.id)
  }
  const prop = properties.value.find((p) => p.name === col.fieldName) ?? null
  return h('span', formatFieldValue(raw, prop))
}

// 渲染筛选行控件
function renderFilterControl(col: typeof visibleColumns.value[number]) {
  const prop = properties.value.find((p) => p.name === col.fieldName) ?? null
  const dt = prop?.data_type
  const value = filterInputs.value[col.fieldName] ?? ''
  if (dt === 'list' && col.listValues) {
    return h(Select, {
      value: value || undefined,
      'onUpdate:value': (v: string) => (filterInputs.value[col.fieldName] = v ?? ''),
      placeholder: '*筛选*',
      allowClear: true,
      size: 'small',
      style: 'width: 100%',
      options: [...col.listValues.entries()].map(([v, l]) => ({ value: v, label: l })),
    })
  }
  if (dt === 'boolean') {
    return h(Select, {
      value: value || undefined,
      'onUpdate:value': (v: string) => (filterInputs.value[col.fieldName] = v ?? ''),
      placeholder: '是/否',
      allowClear: true,
      size: 'small',
      style: 'width: 100%',
      options: [
        { value: '1', label: '是' },
        { value: '0', label: '否' },
      ],
    })
  }
  if (dt === 'date') {
    return h(Input, {
      value,
      'onUpdate:value': (v: string) => (filterInputs.value[col.fieldName] = v),
      placeholder: '<2025/01/11',
      size: 'small',
      onPressEnter: onFilter,
    })
  }
  if (dt === 'integer' || dt === 'decimal') {
    return h(Input, {
      value,
      'onUpdate:value': (v: string) => (filterInputs.value[col.fieldName] = v),
      placeholder: '>100、<=50',
      size: 'small',
      onPressEnter: onFilter,
    })
  }
  if (dt === 'item' || dt === 'foreign') {
    return h(Input, {
      value,
      'onUpdate:value': (v: string) => (filterInputs.value[col.fieldName] = v),
      placeholder: '*关键词*',
      size: 'small',
      onPressEnter: onFilter,
    })
  }
  return h(Input, {
    value,
    'onUpdate:value': (v: string) => (filterInputs.value[col.fieldName] = v),
    placeholder: '*包含*',
    size: 'small',
    onPressEnter: onFilter,
  })
}

watch(itemTypeName, () => {
  filterInputs.value = {}
  sortField.value = ''
  page.value = 1
  fetchData()
})

// 监听 itemTypeMeta 从空变为有值（页面刷新场景下元数据异步加载完成）
watch(itemTypeMeta, (m, prev) => {
  if (m && !prev) fetchData()
})

// keep-alive 激活时也尝试拉取（缓存了组件实例但路由可能换了 itemType）
onActivated(() => {
  fetchData()
})

onMounted(fetchData)
</script>

<template>
  <div class="kras-table-page kras-page-padding">
    <!-- 工具栏 -->
    <div class="table-toolbar">
      <div class="table-title">
        <h2>{{ itemTypeMeta?.label_zh ?? itemTypeMeta?.label ?? itemTypeName }}</h2>
        <span v-if="itemTypeMeta" class="title-meta">
          <Tag color="cyan">{{ itemTypeName }}</Tag>
          <span class="kras-text-tertiary">共 {{ total }} 条 · 第 {{ page }} / {{ Math.ceil(total / pageSize) || 1 }} 页</span>
        </span>
      </div>
      <Space>
        <Button :icon="h(ReloadOutlined)" @click="onReset">重置</Button>
        <Button type="primary" :icon="h(PlusOutlined)" @click="onCreate">新建</Button>
      </Space>
    </div>

    <!-- 表格区 -->
    <div class="kras-surface table-surface">
      <div class="table-scroll">
        <table class="kras-grid">
          <thead>
            <tr>
              <th class="col-idx">#</th>
              <th
                v-for="col in visibleColumns"
                :key="col.fieldName"
                :style="{ width: (col.width ?? 140) + 'px', textAlign: col.align ?? 'left' }"
                :class="{ active: sortField === col.fieldName }"
                @click="onSort(col.fieldName)"
              >
                <div class="th-inner" :style="{ justifyContent: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start' }">
                  <span>{{ col.label }}</span>
                  <span v-if="sortField === col.fieldName" class="sort-icon">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </div>
              </th>
              <th class="col-actions">操作</th>
            </tr>
            <!-- 筛选行 -->
            <tr class="kras-filter-row">
              <th class="col-idx"><SearchOutlined /></th>
              <th v-for="col in visibleColumns" :key="'f-' + col.fieldName">
                <component :is="renderFilterControl(col)" />
              </th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in displayRows" :key="i" class="kras-grid-row">
              <td v-if="loading" :colspan="visibleColumns.length + 2" class="empty-cell">
                <div class="kras-skeleton-block" style="height: 36px; margin: 6px 0;"></div>
              </td>
              <td v-else-if="rows.length === 0" :colspan="visibleColumns.length + 2" class="empty-cell">
                <a-empty description="暂无数据" />
              </td>
              <template v-else>
                <td class="col-idx">{{ (page - 1) * pageSize + i + 1 }}</td>
                <td
                  v-for="col in visibleColumns"
                  :key="col.fieldName"
                  :style="{ textAlign: col.align ?? 'left' }"
                >
                  <component :is="renderCell(row, col)" />
                </td>
                <td class="col-actions">
                  <Space :size="4">
                    <Tooltip title="查看">
                      <Button size="small" type="text" @click="openDetail(row)"><EditOutlined /></Button>
                    </Tooltip>
                  </Space>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="table-pagination">
        <a-pagination
          v-model:current="page"
          v-model:page-size="pageSize"
          :total="total"
          :show-size-changer="true"
          :show-quick-jumper="true"
          size="small"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.kras-table-page { height: 100%; display: flex; flex-direction: column; }
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 12px;
}
.table-title { display: flex; flex-direction: column; gap: 4px; }
.table-title h2 { margin: 0; font-size: 18px; color: #e6edf7; font-weight: 600; }
.title-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; }

.table-surface {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.table-scroll { flex: 1; overflow: auto; }

.kras-grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}
.kras-grid thead th {
  position: sticky;
  top: 0;
  background: #0f1a2e;
  color: #9ba8be;
  font-weight: 500;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid #1f2d44;
  cursor: pointer;
  user-select: none;
  z-index: 2;
}
.kras-grid thead th.col-idx {
  width: 56px;
  text-align: center;
  cursor: default;
}
.kras-grid thead th.col-actions {
  width: 80px;
  text-align: center;
  cursor: default;
}
.kras-grid thead th.active { color: #1668dc; background: #152238; }
.th-inner {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sort-icon { font-size: 11px; color: #13c2c2; }

.kras-filter-row th {
  position: sticky;
  top: 41px;
  background: #0c1424 !important;
  padding: 6px 8px !important;
  border-bottom: 1px solid #1f2d44;
  cursor: default !important;
  z-index: 3;
}
.kras-filter-row th.col-idx { text-align: center; color: #6b7785; }

.kras-grid tbody td {
  padding: 10px 12px;
  border-bottom: 1px solid #172238;
  color: #dde5f0;
  vertical-align: middle;
}
.kras-grid tbody td.col-idx {
  color: #6b7785;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
.kras-grid tbody td.col-actions {
  text-align: center;
}

.empty-cell { text-align: center; padding: 32px; }

.table-pagination {
  padding: 12px 16px;
  border-top: 1px solid #1f2d44;
  display: flex;
  justify-content: flex-end;
}

:deep(.kras-ref-cell) {
  color: #13c2c2;
  font-weight: 500;
}
</style>
