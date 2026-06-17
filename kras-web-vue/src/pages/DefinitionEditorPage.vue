<script setup lang="ts">
// 定义编辑器：对象类 / 属性 / 关系 / 生命周期 / 工作流 / 方法 6 类统一编辑
// 对应需求 REQ-010 / M1.2 / M4.2 / M5.1
import { ref, computed, onMounted, watch, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Card, Button, Input, InputNumber, Select, Switch, Space, Table, Tag, Form,
  FormItem, Modal, message, Empty, Tooltip, Popconfirm,
} from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined,
  ArrowLeftOutlined, ReloadOutlined,
} from '@ant-design/icons-vue'
import { applyItem } from '@/data/kras.item'
import { krasCache } from '@/data/kras.cache'
import { getMetadata } from '@/data/kras.metadata'
import type { KrasItem, ItemType, Property } from '@/types'

const route = useRoute()
const router = useRouter()

const kind = computed(() => (route.params.kind as string) ?? 'itemtype')
const editingId = computed(() => route.params.id as string | undefined)

// 各 kind 对应的 @type
const TYPE_MAP: Record<string, { type: string; title: string; icon: string }> = {
  itemtype: { type: 'ItemType', title: '对象类', icon: 'AppstoreOutlined' },
  property: { type: 'Property', title: '属性', icon: 'ColumnHeightOutlined' },
  relationship: { type: 'RelationshipType', title: '关系', icon: 'ApartmentOutlined' },
  lifecycle: { type: 'LifeCycleDefinition', title: '生命周期', icon: 'NodeIndexOutlined' },
  workflow: { type: 'WorkflowDefinition', title: '工作流', icon: 'DeploymentUnitOutlined' },
  method: { type: 'Method', title: '方法', icon: 'CodeOutlined' },
}

const metaType = computed(() => TYPE_MAP[kind.value]?.type ?? 'ItemType')
const metaTitle = computed(() => TYPE_MAP[kind.value]?.title ?? '对象类')

// 列表数据
const rows = ref<KrasItem[]>([])
const loading = ref(false)

// 表单
const editing = ref(false)
const form = ref<KrasItem>({})
const original = ref<KrasItem>({})

// 元数据依赖（Property 编辑时需要 ItemType 列表，List 列表）
const allItemTypes = computed<ItemType[]>(() => krasCache.getMetadata().itemTypes)
const allProperties = computed<Property[]>(() => krasCache.getMetadata().properties)
const allLists = computed(() => krasCache.getMetadata().lists)

// 字段定义（每个 kind 表单字段）
interface FieldDef {
  name: string
  label: string
  type: 'string' | 'text' | 'number' | 'boolean' | 'select' | 'textarea'
  options?: { label: string; value: string }[]
  required?: boolean
  width?: number
}

const FIELDS: Record<string, FieldDef[]> = {
  itemtype: [
    { name: 'name', label: '类型名 (英文)', type: 'string', required: true, width: 200 },
    { name: 'label', label: '显示标签', type: 'string', required: true, width: 200 },
    { name: 'label_zh', label: '中文标签', type: 'string', width: 200 },
    { name: 'icon', label: '图标', type: 'string', width: 160 },
    { name: 'sort_order', label: '排序', type: 'number', width: 80 },
    { name: 'is_versionable', label: '可换版', type: 'boolean', width: 80 },
    { name: 'is_relationship', label: '关系类', type: 'boolean', width: 80 },
    { name: 'is_es_index', label: 'ES 索引', type: 'boolean', width: 80 },
    { name: 'is_hidden', label: '隐藏', type: 'boolean', width: 80 },
    { name: 'default_page_size', label: '默认页大小', type: 'number', width: 120 },
    { name: 'class_structure', label: '分类结构 (JSON)', type: 'textarea', width: 320 },
  ],
  property: [
    { name: 'name', label: '字段名', type: 'string', required: true },
    { name: 'label', label: '显示标签', type: 'string', required: true },
    { name: 'source_id', label: '所属对象类', type: 'select', required: true },
    {
      name: 'data_type', label: '数据类型', type: 'select', required: true,
      options: [
        { label: '字符串', value: 'string' }, { label: '长文本', value: 'text' },
        { label: '整数', value: 'integer' }, { label: '小数', value: 'decimal' },
        { label: '布尔', value: 'boolean' }, { label: '日期', value: 'date' },
        { label: '列表', value: 'list' }, { label: '引用', value: 'item' },
        { label: '外键', value: 'foreign' }, { label: '图片', value: 'image' },
        { label: '文件', value: 'file' }, { label: '分类', value: 'classification' },
      ],
    },
    { name: 'data_source', label: 'data_source（list→List.id, item→ItemType.id）', type: 'string' },
    { name: 'foreign_property', label: 'foreign_property（foreign 必填）', type: 'string' },
    { name: 'data_length', label: '长度', type: 'number' },
    { name: 'data_precision', label: '精度', type: 'number' },
    { name: 'data_scale', label: '小数位', type: 'number' },
    { name: 'default_value', label: '默认值', type: 'string' },
    { name: 'sort_order', label: '排序', type: 'number' },
    { name: 'is_required', label: '必填', type: 'boolean' },
    { name: 'is_unique', label: '唯一', type: 'boolean' },
    { name: 'is_readonly', label: '只读', type: 'boolean' },
    { name: 'is_hidden', label: '隐藏', type: 'boolean' },
    { name: 'column_width', label: '列宽', type: 'number' },
  ],
  relationship: [
    { name: 'name', label: '关系名', type: 'string', required: true },
    { name: 'source_id', label: '源 ItemType', type: 'select', required: true },
    { name: 'related_id', label: '相关 ItemType', type: 'select', required: true },
    { name: 'relationship_id', label: '关系对象类型 ItemType', type: 'select', required: true },
    { name: 'label', label: '显示标签', type: 'string' },
  ],
  lifecycle: [
    { name: 'name', label: '生命周期名', type: 'string', required: true },
    { name: 'label', label: '显示标签', type: 'string', required: true },
    { name: 'description', label: '描述', type: 'textarea' },
  ],
  workflow: [
    { name: 'name', label: '工作流名', type: 'string', required: true },
    { name: 'label', label: '显示标签', type: 'string', required: true },
    { name: 'description', label: '描述', type: 'textarea' },
  ],
  method: [
    { name: 'name', label: '方法名', type: 'string', required: true },
    { name: 'label', label: '显示标签', type: 'string' },
    {
      name: 'method_type', label: '方法类型', type: 'select',
      options: [
        { label: '服务端 C#', value: 'server' },
        { label: '前端 JS', value: 'client' },
        { label: 'BuiltInAction', value: 'builtin' },
      ],
    },
    { name: 'code', label: '代码', type: 'textarea' },
  ],
}

const fields = computed<FieldDef[]>(() => FIELDS[kind.value] ?? FIELDS.itemtype)

async function fetchList() {
  loading.value = true
  try {
    const result = await applyItem<KrasItem[]>({ '@type': metaType.value, '@action': 'get' })
    rows.value = result ?? []
  } finally {
    loading.value = false
  }
}

async function fetchOne(id: string) {
  try {
    const result = await applyItem<KrasItem>({ '@type': metaType.value, '@id': id, '@action': 'get' })
    form.value = result
    original.value = { ...result }
    editing.value = true
  } catch {
    // 列表中没找到 → 进入新建态
    onNew()
  }
}

function onNew() {
  editing.value = true
  form.value = { '@type': metaType.value, '@action': 'add' }
  original.value = {}
  // 不切路由，留在列表页右侧编辑
}

function onEdit(row: KrasItem) {
  const id = row['@id'] as string
  form.value = { ...row }
  original.value = { ...row }
  editing.value = true
}

async function onSave() {
  // 前端基础校验：必填
  for (const f of fields.value) {
    if (f.required) {
      const v = form.value[f.name]
      if (v === undefined || v === null || v === '') {
        message.warning(`${f.label} 必填`)
        return
      }
    }
  }

  loading.value = true
  try {
    const isNew = !form.value['@id']
    const payload: KrasItem = { ...form.value, '@type': metaType.value }
    payload['@action'] = isNew ? 'add' : 'update'
    const result = await applyItem<KrasItem>(payload)
    message.success(isNew ? '创建成功' : '保存成功')
    form.value = result
    original.value = { ...result }
    await fetchList()
    // 元数据失效后重新拉
    await getMetadata()
  } catch (e: unknown) {
    message.error((e as Error).message ?? '保存失败')
  } finally {
    loading.value = false
  }
}

function onCancel() {
  form.value = { ...original.value }
  editing.value = false
}

async function onDelete(row: KrasItem) {
  try {
    await applyItem<KrasItem>({ '@type': metaType.value, '@id': row['@id'], '@action': 'delete' })
    message.success('已删除')
    if (form.value['@id'] === row['@id']) {
      editing.value = false
      form.value = {}
    }
    await fetchList()
    await getMetadata()
  } catch (e: unknown) {
    message.error((e as Error).message ?? '删除失败')
  }
}

// 表格列
const tableColumns = computed(() => {
  const cols: Record<string, unknown>[] = [
    { title: '#', dataIndex: '_idx', width: 60, customRender: ({ index }: { index: number }) => index + 1 },
  ]
  // 取前 4 个字段作为列
  const visibleFields = fields.value.slice(0, 4)
  for (const f of visibleFields) {
    cols.push({
      title: f.label,
      dataIndex: f.name,
      width: f.width,
      customRender: ({ record }: { record: KrasItem }) => {
        const v = record[f.name]
        if (f.type === 'boolean') return v === 1 || v === '1' || v === true ? '是' : '否'
        if (f.name === 'source_id') {
          const t = allItemTypes.value.find(it => it.id === v)
          return t?.name ?? v
        }
        if (f.name === 'data_source' && form.value['data_type'] === 'list') {
          const l = allLists.value.find(l => l.id === v)
          return l?.name ?? v
        }
        return v ?? '-'
      },
    })
  }
  cols.push({ title: '操作', key: '_actions', width: 140, fixed: 'right' as const })
  return cols
})

function getSelectOptions(field: FieldDef) {
  if (field.name === 'source_id' || field.name === 'related_id' || field.name === 'relationship_id') {
    return allItemTypes.value.map(it => ({ label: `${it.name} (${it.label})`, value: it.id }))
  }
  return field.options ?? []
}

watch([kind, editingId], async () => {
  editing.value = false
  form.value = {}
  await fetchList()
  if (editingId.value && editingId.value !== 'new') {
    await fetchOne(editingId.value)
  } else if (editingId.value === 'new') {
    onNew()
  }
}, { immediate: true })

onMounted(async () => {
  // 确保元数据已加载
  if (krasCache.getMetadata().itemTypes.length === 0) {
    try { await getMetadata() } catch { /* 静默 */ }
  }
  await fetchList()
  if (editingId.value && editingId.value !== 'new') {
    await fetchOne(editingId.value)
  } else if (editingId.value === 'new') {
    onNew()
  }
})
</script>

<template>
  <div class="def-editor kras-page-padding">
    <!-- 顶部 -->
    <div class="kras-toolbar def-toolbar">
      <div class="def-title-block">
        <Button type="text" :icon="h(ArrowLeftOutlined)" @click="router.push('/definition/itemtype')" />
        <h2>{{ metaTitle }}定义</h2>
        <Tag color="cyan">{{ metaType }}</Tag>
        <span class="kras-text-tertiary">共 {{ rows.length }} 条</span>
      </div>
      <Space>
        <!-- kind 切换 -->
        <Select
          :value="kind"
          style="width: 160px"
          @update:value="(v: string) => router.push(`/definition/${v}`)"
        >
          <Select.Option value="itemtype">对象类</Select.Option>
          <Select.Option value="property">属性</Select.Option>
          <Select.Option value="relationship">关系</Select.Option>
          <Select.Option value="lifecycle">生命周期</Select.Option>
          <Select.Option value="workflow">工作流</Select.Option>
          <Select.Option value="method">方法</Select.Option>
        </Select>
        <Button :icon="h(ReloadOutlined)" @click="fetchList">刷新</Button>
        <Button type="primary" :icon="h(PlusOutlined)" @click="onNew">新建</Button>
      </Space>
    </div>

    <div class="def-body">
      <!-- 左侧列表 -->
      <Card class="kras-surface def-list" :bordered="false">
        <Table
          :columns="tableColumns"
          :data-source="rows"
          :loading="loading"
          row-key="@id"
          size="small"
          :pagination="{ pageSize: 15, size: 'small' }"
          :scroll="{ x: 'max-content' }"
        >
          <template #emptyText>
            <Empty description="暂无{{ metaTitle }}定义" />
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === '_actions'">
              <Space :size="4">
                <Tooltip title="编辑">
                  <Button size="small" type="text" @click="onEdit(record)"><EditOutlined /></Button>
                </Tooltip>
                <Popconfirm title="确定删除？" @confirm="onDelete(record)">
                  <Tooltip title="删除">
                    <Button size="small" type="text" danger><DeleteOutlined /></Button>
                  </Tooltip>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Card>

      <!-- 右侧表单 -->
      <Card
        v-if="editing"
        class="kras-surface def-form"
        :bordered="false"
        :title="form['@id'] ? `编辑 ${metaTitle}` : `新建 ${metaTitle}`"
      >
        <template #extra>
          <Space>
            <Button type="primary" :icon="h(SaveOutlined)" :loading="loading" @click="onSave">保存</Button>
            <Button :icon="h(CloseOutlined)" @click="onCancel">取消</Button>
          </Space>
        </template>

        <Form layout="vertical">
          <FormItem
            v-for="f in fields"
            :key="f.name"
            :label="f.label"
            :required="f.required"
          >
            <Input v-if="f.type === 'string'" v-model:value="(form as Record<string, unknown>)[f.name] as string | undefined" />
            <Input.TextArea
              v-else-if="f.type === 'textarea'"
              v-model:value="(form as Record<string, unknown>)[f.name] as string | undefined"
              :rows="4"
            />
            <InputNumber
              v-else-if="f.type === 'number'"
              v-model:value="(form as Record<string, unknown>)[f.name] as number | undefined"
              style="width: 100%"
            />
            <Select
              v-else-if="f.type === 'select'"
              v-model:value="(form as Record<string, unknown>)[f.name] as string | undefined"
              :options="getSelectOptions(f)"
              show-search
              :filter-option="(i: string, o: { label: string }) => o.label.toLowerCase().includes(i.toLowerCase())"
              allow-clear
            />
            <Switch
              v-else-if="f.type === 'boolean'"
              :checked="((form as Record<string, unknown>)[f.name] as unknown) === 1 || ((form as Record<string, unknown>)[f.name] as unknown) === '1' || ((form as Record<string, unknown>)[f.name] as unknown) === true"
              @update:checked="(v: boolean) => ((form as Record<string, unknown>)[f.name] = v ? 1 : 0)"
            />
          </FormItem>
        </Form>

        <div v-if="metaType === 'ItemType' && form['@id']" class="rel-link">
          <a @click="router.push(`/definition/property?source=${form['@id']}`)">
            → 在『属性』里为本对象类添加字段
          </a>
        </div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.def-editor { height: 100%; display: flex; flex-direction: column; }
.def-toolbar { justify-content: space-between; }
.def-title-block { display: flex; align-items: center; gap: 12px; }
.def-title-block h2 { margin: 0; font-size: 18px; color: #e6edf7; font-weight: 600; }
.def-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 12px;
  overflow: hidden;
  min-height: 0;
}
.def-list { overflow: auto; }
.def-form { overflow: auto; }
.rel-link { margin-top: 16px; padding-top: 12px; border-top: 1px solid #1f2d44; }
.rel-link a { color: #13c2c2; cursor: pointer; }

:deep(.def-list .ant-table-wrapper),
:deep(.def-list .ant-spin-nested-loading) { height: 100%; }
</style>
