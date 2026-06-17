<script setup lang="ts">
// 用户管理
import { ref, onMounted } from 'vue'
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Select, message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { applyItem } from '@/data/kras.item'
import { krasCache } from '@/data/kras.cache'
import { buildColumns } from '@/utils/metadataTable'
import { formatFieldValue } from '@/utils/fieldValue'
import type { KrasItem, Property } from '@/types'

const props2 = krasCache.getItemTypeProperties('User')
const cols = buildColumns(props2, krasCache.getMetadata().lists)

const rows = ref<KrasItem[]>([])
const loading = ref(false)

async function fetch() {
  loading.value = true
  try {
    rows.value = (await applyItem<KrasItem[]>({ '@type': 'User', '@action': 'get' })) ?? []
  } finally {
    loading.value = false
  }
}
onMounted(fetch)
</script>

<template>
  <div class="kras-page-padding">
    <Card class="kras-surface" :bordered="false">
      <template #title>
        <span>用户管理</span>
      </template>
      <template #extra>
        <Space>
          <Button :icon="h(ReloadOutlined)" @click="fetch">刷新</Button>
          <Button type="primary" :icon="h(PlusOutlined)">新增用户</Button>
        </Space>
      </template>
      <Table
        :columns="cols.map((c) => ({ title: c.label, dataIndex: c.fieldName, width: c.width, key: c.fieldName }))"
        :data-source="rows"
        :loading="loading"
        :row-key="(r: any) => r['@id']"
        :pagination="{ pageSize: 20, size: 'small' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'is_active'">
            <Tag :color="record.is_active === 1 ? 'success' : 'default'">{{ record.is_active === 1 ? '启用' : '禁用' }}</Tag>
          </template>
          <template v-else>
            {{ formatFieldValue(record[String(column.dataIndex)], props2.find((p: Property) => p.name === column.dataIndex) ?? null) }}
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>

<script lang="ts">
import { h } from 'vue'
</script>

<style scoped>
:deep(.ant-card) { background: #111b2e !important; }
</style>
