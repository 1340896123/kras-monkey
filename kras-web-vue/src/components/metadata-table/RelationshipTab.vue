<script setup lang="ts">
// 关系 Tab：按 RelationshipType 加载关系行数据
// 对应需求 §9.4 关系区加载
import { ref, watch, onMounted } from 'vue'
import { Button, Empty, Tag } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { krasCache } from '@/data/kras.cache'
import { formatFieldValue } from '@/utils/fieldValue'
import { buildColumns, getRowKey } from '@/utils/metadataTable'
import type { KrasItem, RelationshipType } from '@/types'

const props = defineProps<{
  sourceItem: KrasItem
  relationshipType: RelationshipType
}>()

const relItemType = ref(krasCache.getItemTypeMetadata('BomItem'))
const properties = ref(relItemType.value ? krasCache.getItemTypeProperties('BomItem') : [])
const columns = ref(buildColumns(properties.value, krasCache.getMetadata().lists))

const rows = ref<KrasItem[]>([])
const loading = ref(false)

async function fetchRows() {
  if (!props.sourceItem['@id']) return
  loading.value = true
  try {
    // 简化：直接从 BOM 类型查所有 source_id = 当前对象的关系行
    const result = await import('@/data/kras.item').then((m) =>
      m.applyItem<KrasItem[]>({ '@type': 'BOM', '@action': 'get', source_id: props.sourceItem['@id'] })
    )
    rows.value = (result ?? []).filter((r) => r.source_id === props.sourceItem['@id'])
  } finally {
    loading.value = false
  }
}

onMounted(fetchRows)
watch(() => props.sourceItem['@id'], fetchRows)
</script>

<template>
  <div class="rel-tab">
    <div class="rel-toolbar">
      <span class="kras-text-tertiary">共 {{ rows.length }} 条关系</span>
      <Button type="primary" size="small" :icon="h(PlusOutlined)">新增关系</Button>
    </div>
    <div v-if="loading" class="kras-skeleton-block" style="height: 40px; margin: 8px 0;"></div>
    <div v-else-if="!rows.length">
      <Empty description="暂无关系数据" />
    </div>
    <table v-else class="rel-grid">
      <thead>
        <tr>
          <th>#</th>
          <th v-for="col in columns" :key="col.fieldName">{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="getRowKey(row, i)" class="kras-grid-row">
          <td>{{ i + 1 }}</td>
          <td v-for="col in columns" :key="col.fieldName">
            {{ formatFieldValue(row[col.fieldName], properties.find((p) => p.name === col.fieldName) ?? null) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { h } from 'vue'
</script>

<style scoped>
.rel-tab { padding: 4px 8px 16px; }
.rel-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 0 0 8px; }
.rel-grid { width: 100%; border-collapse: collapse; font-size: 13px; }
.rel-grid th { background: #0f1a2e; color: #9ba8be; text-align: left; padding: 8px 12px; font-weight: 500; border-bottom: 1px solid #1f2d44; }
.rel-grid td { padding: 8px 12px; border-bottom: 1px solid #172238; color: #dde5f0; }
</style>
