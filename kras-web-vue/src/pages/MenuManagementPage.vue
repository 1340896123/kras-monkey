<script setup lang="ts">
// 菜单管理：CRUD + 排序
import { ref, computed, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import {
  Card, Button, Input, InputNumber, Space, Table, Tag, Form, FormItem,
  Modal, message, Empty, Tooltip, Popconfirm, Select,
} from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined,
  CloseOutlined, ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons-vue'
import { getJson, postRaw } from '@/data/kras.item'
import { krasCache } from '@/data/kras.cache'

interface MenuItem {
  id: string
  parent_id?: string | null
  name: string
  label: string
  path?: string
  icon?: string
  item_type_id?: string
  sort_order: number
  is_hidden: 0 | 1
}

const router = useRouter()
const rows = ref<MenuItem[]>([])
const loading = ref(false)
const editing = ref(false)
const form = ref<MenuItem>(blankForm())

const allItemTypes = computed(() => krasCache.getMetadata().itemTypes)

function blankForm(): MenuItem {
  return {
    id: '', name: '', label: '', path: '', icon: '', item_type_id: '',
    parent_id: null, sort_order: 99, is_hidden: 0,
  }
}

async function fetchList() {
  loading.value = true
  try {
    const data = await getJson<MenuItem[]>('/menus')
    rows.value = data ?? []
  } finally {
    loading.value = false
  }
}

function onNew() {
  form.value = blankForm()
  editing.value = true
}

function onEdit(row: MenuItem) {
  form.value = { ...row }
  editing.value = true
}

async function onSave() {
  if (!form.value.name || !form.value.label) {
    message.warning('菜单名 / 显示标签必填')
    return
  }
  try {
    if (form.value.id) {
      await fetch(`/api/menus/${form.value.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kras.token') ?? ''}`,
        },
        body: JSON.stringify(form.value),
      })
    } else {
      await postRaw('/menus', form.value as unknown as Record<string, unknown>)
    }
    message.success('保存成功')
    await fetchList()
    editing.value = false
  } catch (e: unknown) {
    message.error((e as Error).message ?? '保存失败')
  }
}

async function onDelete(row: MenuItem) {
  try {
    await fetch(`/api/menus/${row.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('kras.token') ?? ''}` },
    })
    message.success('已删除')
    await fetchList()
  } catch (e: unknown) {
    message.error((e as Error).message ?? '删除失败')
  }
}

async function move(row: MenuItem, dir: -1 | 1) {
  const sorted = [...rows.value].sort((a, b) => a.sort_order - b.sort_order)
  const i = sorted.findIndex(r => r.id === row.id)
  const j = i + dir
  if (j < 0 || j >= sorted.length) return
  const other = sorted[j]
  // 交换 sort_order
  await fetch('/api/menus/reorder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('kras.token') ?? ''}`,
    },
    body: JSON.stringify({
      orders: [
        { id: row.id, sort_order: other.sort_order },
        { id: other.id, sort_order: row.sort_order },
      ],
    }),
  })
  await fetchList()
}

const columns = computed(() => [
  { title: '排序', dataIndex: 'sort_order', width: 80 },
  { title: '菜单名', dataIndex: 'name', width: 160 },
  { title: '显示标签', dataIndex: 'label', width: 160 },
  { title: '路径', dataIndex: 'path', width: 220 },
  { title: '关联 ItemType', dataIndex: 'item_type_id', width: 160 },
  { title: '隐藏', dataIndex: 'is_hidden', width: 80 },
  { title: '操作', key: '_actions', width: 200, fixed: 'right' as const },
])

onMounted(fetchList)
</script>

<template>
  <div class="menu-mgmt kras-page-padding">
    <div class="kras-toolbar">
      <h2>菜单管理</h2>
      <Space>
        <Button type="primary" :icon="h(PlusOutlined)" @click="onNew">新建菜单</Button>
      </Space>
    </div>

    <Card class="kras-surface" :bordered="false">
      <Table
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        row-key="id"
        size="small"
        :pagination="false"
        :scroll="{ x: 'max-content' }"
      >
        <template #emptyText><Empty description="暂无菜单" /></template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'item_type_id'">
            <span v-if="record.item_type_id">
              {{ allItemTypes.find(t => t.id === record.item_type_id)?.name ?? record.item_type_id }}
            </span>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.dataIndex === 'is_hidden'">
            <Tag v-if="record.is_hidden === 1" color="warning">隐藏</Tag>
            <Tag v-else color="success">显示</Tag>
          </template>
          <template v-else-if="column.key === '_actions'">
            <Space :size="4">
              <Tooltip title="上移"><Button size="small" type="text" @click="move(record as MenuItem, -1)"><ArrowUpOutlined /></Button></Tooltip>
              <Tooltip title="下移"><Button size="small" type="text" @click="move(record as MenuItem, 1)"><ArrowDownOutlined /></Button></Tooltip>
              <Tooltip title="编辑"><Button size="small" type="text" @click="onEdit(record as MenuItem)"><EditOutlined /></Button></Tooltip>
              <Popconfirm title="确定删除？" @confirm="onDelete(record as MenuItem)">
                <Tooltip title="删除"><Button size="small" type="text" danger><DeleteOutlined /></Button></Tooltip>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="editing"
      :title="form.id ? '编辑菜单' : '新建菜单'"
      width="600px"
      @ok="onSave"
    >
      <Form layout="vertical">
        <FormItem label="菜单名（英文）" required>
          <Input v-model:value="form.name" />
        </FormItem>
        <FormItem label="显示标签" required>
          <Input v-model:value="form.label" />
        </FormItem>
        <FormItem label="路径">
          <Input v-model:value="form.path" placeholder="/custom-page" />
        </FormItem>
        <FormItem label="关联对象类">
          <Select
            v-model:value="form.item_type_id"
            :options="allItemTypes.map(t => ({ label: `${t.name} (${t.label})`, value: t.id }))"
            allow-clear
            show-search
          />
        </FormItem>
        <FormItem label="图标">
          <Input v-model:value="form.icon" placeholder="AppstoreOutlined" />
        </FormItem>
        <FormItem label="排序">
          <InputNumber v-model:value="form.sort_order" style="width: 100%" />
        </FormItem>
        <FormItem label="隐藏">
          <Select
            v-model:value="form.is_hidden"
            :options="[{ label: '显示', value: 0 }, { label: '隐藏', value: 1 }]"
          />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.menu-mgmt { height: 100%; display: flex; flex-direction: column; }
.menu-mgmt h2 { margin: 0; font-size: 18px; color: #e6edf7; font-weight: 600; }
</style>
