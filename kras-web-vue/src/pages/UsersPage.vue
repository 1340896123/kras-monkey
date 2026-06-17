<script setup lang="ts">
// 用户管理：CRUD
import { ref, computed, onMounted, h } from 'vue'
import {
  Card, Table, Tag, Button, Space, Modal, Form, FormItem, Input, Switch,
  Select, message, Empty, Tooltip, Popconfirm,
} from 'ant-design-vue'
import {
  PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined,
} from '@ant-design/icons-vue'
import { applyItem } from '@/data/kras.item'
import { krasCache } from '@/data/kras.cache'
import type { KrasItem } from '@/types'

const rows = ref<KrasItem[]>([])
const loading = ref(false)
const editing = ref(false)
const form = ref<KrasItem>({})

const columns = computed(() => [
  { title: '#', dataIndex: '_idx', width: 60, customRender: ({ index }: { index: number }) => index + 1 },
  { title: '登录名', dataIndex: 'login_name', width: 140 },
  { title: '姓名', dataIndex: 'name', width: 140 },
  { title: '邮箱', dataIndex: 'email', width: 200 },
  { title: '电话', dataIndex: 'phone', width: 140 },
  { title: '公司', dataIndex: 'company', width: 160 },
  { title: '状态', dataIndex: 'is_active', width: 100 },
  { title: '操作', key: '_actions', width: 140, fixed: 'right' as const },
])

async function fetch() {
  loading.value = true
  try {
    rows.value = (await applyItem<KrasItem[]>({ '@type': 'User', '@action': 'get' })) ?? []
  } finally {
    loading.value = false
  }
}

function blankForm(): KrasItem {
  return {
    '@type': 'User',
    '@action': 'add',
    login_name: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    is_active: 1,
    is_login_allowed: 1,
  }
}

function onNew() {
  form.value = blankForm()
  editing.value = true
}

function onEdit(row: KrasItem) {
  form.value = { ...row, '@type': 'User', '@action': 'update' }
  editing.value = true
}

async function onSave() {
  if (!form.value.login_name || !form.value.name) {
    message.warning('登录名 / 姓名必填')
    return
  }
  try {
    await applyItem(form.value)
    message.success('保存成功')
    editing.value = false
    await fetch()
  } catch (e: unknown) {
    message.error((e as Error).message ?? '保存失败')
  }
}

async function onDelete(row: KrasItem) {
  try {
    await applyItem({ '@type': 'User', '@id': row['@id'], '@action': 'delete' })
    message.success('已删除')
    await fetch()
  } catch (e: unknown) {
    message.error((e as Error).message ?? '删除失败')
  }
}

onMounted(async () => {
  if (krasCache.getMetadata().itemTypes.length === 0) {
    // 等元数据加载
  }
  await fetch()
})
</script>

<template>
  <div class="kras-page-padding">
    <Card class="kras-surface" :bordered="false">
      <template #title><h2>用户管理</h2></template>
      <template #extra>
        <Space>
          <Button :icon="h(ReloadOutlined)" @click="fetch">刷新</Button>
          <Button type="primary" :icon="h(PlusOutlined)" @click="onNew">新增用户</Button>
        </Space>
      </template>
      <Table
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        row-key="@id"
        size="small"
        :pagination="{ pageSize: 20, size: 'small' }"
        :scroll="{ x: 'max-content' }"
      >
        <template #emptyText><Empty description="暂无用户" /></template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'is_active'">
            <Tag :color="record.is_active === 1 ? 'success' : 'default'">
              {{ record.is_active === 1 ? '启用' : '禁用' }}
            </Tag>
          </template>
          <template v-else-if="column.key === '_actions'">
            <Space :size="4">
              <Tooltip title="编辑"><Button size="small" type="text" @click="onEdit(record)"><EditOutlined /></Button></Tooltip>
              <Popconfirm title="确定删除？" @confirm="onDelete(record)">
                <Tooltip title="删除"><Button size="small" type="text" danger><DeleteOutlined /></Button></Tooltip>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="editing"
      :title="form['@action'] === 'add' ? '新增用户' : '编辑用户'"
      width="600px"
      @ok="onSave"
    >
      <Form layout="vertical">
        <FormItem label="登录名" required>
          <Input v-model:value="(form as Record<string, unknown>).login_name as string | undefined" />
        </FormItem>
        <FormItem label="姓名" required>
          <Input v-model:value="(form as Record<string, unknown>).name as string | undefined" />
        </FormItem>
        <FormItem label="邮箱">
          <Input v-model:value="(form as Record<string, unknown>).email as string | undefined" />
        </FormItem>
        <FormItem label="电话">
          <Input v-model:value="(form as Record<string, unknown>).phone as string | undefined" />
        </FormItem>
        <FormItem label="公司">
          <Input v-model:value="(form as Record<string, unknown>).company as string | undefined" />
        </FormItem>
        <FormItem label="密码（演示用，留空则不改）">
          <Input.Password v-model:value="(form as Record<string, unknown>).password as string | undefined" />
        </FormItem>
        <FormItem label="启用">
          <Switch
            :checked="((form as Record<string, unknown>).is_active as unknown) === 1"
            @update:checked="(v: boolean) => ((form as Record<string, unknown>).is_active = v ? 1 : 0)"
          />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
:deep(.ant-card) { background: #111b2e !important; }
h2 { margin: 0; font-size: 18px; color: #e6edf7; }
</style>
