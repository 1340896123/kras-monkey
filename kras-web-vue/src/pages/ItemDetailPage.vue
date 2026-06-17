<script setup lang="ts">
// 详情页（ItemDetailPage）：统一结构 + 编辑/保存 + Relationship Tabs
// 对应需求 §9.4
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Space, Tag, message, Spin } from 'ant-design-vue'
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  LockOutlined,
  UnlockOutlined,
  CopyOutlined,
  BranchesOutlined,
} from '@ant-design/icons-vue'
import { applyItem } from '@/data/kras.item'
import { krasCache } from '@/data/kras.cache'
import { governance } from '@/data/kras.governance'
import { markDirty, clearDirty, isDirty } from '@/data/kras.objects'
import { useTabsStore } from '@/store/tabs'
import FormSchemeRenderer from '@/components/form-scheme/FormSchemeRenderer.vue'
import RelationshipTab from '@/components/metadata-table/RelationshipTab.vue'
import type { KrasItem, View, RelationshipType } from '@/types'

const props = defineProps<{ itemTypeName?: string; id?: string }>()
const route = useRoute()
const router = useRouter()
const tabsStore = useTabsStore()

const itemTypeName = computed(() => (props.itemTypeName ?? route.params.itemType) as string)
const id = computed(() => (props.id ?? route.params.id) as string)
const isNew = computed(() => id.value === 'new' || !id.value)

const itemTypeMeta = computed(() => krasCache.getItemTypeMetadata(itemTypeName.value))
const properties = computed(() => krasCache.getItemTypeProperties(itemTypeName.value))
const detailView = computed<View | null>(() => krasCache.getDefaultDetailView(itemTypeName.value))
const relTypes = computed<RelationshipType[]>(() => krasCache.getItemTypeRelationshipTypes(itemTypeName.value))

const item = ref<KrasItem>({})
const originalItem = ref<KrasItem>({})
const loading = ref(false)
const editing = ref(false)
const lockedBy = ref<string | null>(null)

async function fetchData() {
  if (!itemTypeMeta.value) return
  if (isNew.value) {
    editing.value = true
    item.value = { '@type': itemTypeName.value, '@action': 'add' }
    return
  }
  loading.value = true
  try {
    const result = await applyItem<KrasItem>({
      '@type': itemTypeName.value,
      '@id': id.value,
      '@action': 'get',
    })
    item.value = result
    originalItem.value = { ...result }
    lockedBy.value = (result.locked_by_id as string) ?? null
    tabsStore.openTab({
      key: route.fullPath,
      title: String(result['@keyed_name'] ?? itemTypeName.value),
      path: route.fullPath,
      closable: true,
    })
  } finally {
    loading.value = false
  }
}

async function onSave() {
  if (!itemTypeMeta.value) return
  loading.value = true
  try {
    const payload: KrasItem = { ...item.value, '@type': itemTypeName.value }
    if (isNew.value) {
      payload['@action'] = 'add'
    } else {
      payload['@id'] = id.value
      payload['@action'] = 'update'
    }
    const result = await applyItem<KrasItem>(payload)
    item.value = result
    originalItem.value = { ...result }
    clearDirty(item.value['@id']!)
    editing.value = false
    message.success('保存成功')
    // 新建成功 → 跳转到详情路径
    if (isNew.value && result['@id']) {
      const newPath = `/item-types/${itemTypeName.value}/${result['@id']}`
      tabsStore.openTab({ key: newPath, title: String(result['@keyed_name']), path: newPath, closable: true })
      router.replace(newPath)
    }
  } catch (e: unknown) {
    message.error((e as Error).message ?? '保存失败')
  } finally {
    loading.value = false
  }
}

function onCancel() {
  item.value = { ...originalItem.value }
  editing.value = false
  if (item.value['@id']) clearDirty(item.value['@id'])
}

async function onLock() {
  if (!item.value['@id']) return
  loading.value = true
  try {
    const result = await governance.lock(itemTypeName.value, item.value['@id'])
    item.value = result
    lockedBy.value = result.locked_by_id as string
    message.success('已锁定')
  } finally {
    loading.value = false
  }
}

async function onUnlock() {
  if (!item.value['@id']) return
  loading.value = true
  try {
    const result = await governance.unlock(itemTypeName.value, item.value['@id'])
    item.value = result
    lockedBy.value = null
    message.success('已解锁')
  } finally {
    loading.value = false
  }
}

async function onVersion() {
  if (!item.value['@id']) return
  if (!itemTypeMeta.value?.is_versionable) {
    message.warning(`version_skipped=true, version_skip_reason="not_versionable"`)
    return
  }
  loading.value = true
  try {
    const result = await governance.version(itemTypeName.value, item.value['@id'])
    if (result['@id']) {
      const newPath = `/item-types/${itemTypeName.value}/${result['@id']}`
      message.success(`已换版 ${result.major_rev}.${result.minor_rev}`)
      tabsStore.openTab({ key: newPath, title: String(result['@keyed_name']), path: newPath, closable: true })
      router.push(newPath)
    }
  } finally {
    loading.value = false
  }
}

function markDirtyOnChange() {
  if (item.value['@id']) markDirty(item.value['@id'])
}

watch(
  () => [itemTypeName.value, id.value],
  () => fetchData()
)

onMounted(fetchData)
</script>

<template>
  <div class="detail-page">
    <!-- 顶部 keyed_name + 操作按钮 -->
    <div class="kras-toolbar detail-toolbar">
      <div class="detail-title-block">
        <Tag color="cyan" class="detail-type">{{ itemTypeName }}</Tag>
        <h2 class="detail-keyed-name">
          {{ item['@keyed_name'] ?? (isNew ? `新建 ${itemTypeMeta?.label}` : itemTypeName) }}
        </h2>
        <Tag v-if="item.major_rev" class="detail-rev">{{ item.major_rev }}.{{ item.minor_rev }}</Tag>
        <Tag v-if="item.is_released === 1" color="success">已发布</Tag>
        <Tag v-if="lockedBy" color="warning">已锁定</Tag>
      </div>
      <Space>
        <template v-if="editing">
          <Button type="primary" :icon="h(SaveOutlined)" :loading="loading" @click="onSave">保存</Button>
          <Button :icon="h(CloseOutlined)" @click="onCancel">取消</Button>
        </template>
        <template v-else>
          <Button type="primary" :icon="h(EditOutlined)" @click="editing = true">编辑</Button>
          <Button v-if="item['@id'] && !lockedBy" :icon="h(LockOutlined)" @click="onLock">锁定</Button>
          <Button v-else-if="lockedBy" :icon="h(UnlockOutlined)" @click="onUnlock">解锁</Button>
          <Button v-if="itemTypeMeta?.is_versionable" :icon="h(BranchesOutlined)" @click="onVersion">换版</Button>
        </template>
      </Space>
    </div>

    <!-- 主体：表单 + 关系 -->
    <Spin :spinning="loading">
      <div class="detail-body">
        <div class="kras-surface detail-form-surface">
          <FormSchemeRenderer
            v-model="item"
            :scheme="detailView?.form_scheme"
            :properties="properties"
            :readonly="!editing"
            @update:model-value="markDirtyOnChange"
          />
        </div>

        <!-- Relationship Tabs -->
        <div v-if="!isNew && relTypes.length" class="kras-surface detail-relationship">
          <a-tabs v-if="relTypes.length" class="kras-tabs-detail">
            <a-tab-pane
              v-for="rel in relTypes"
              :key="rel.id"
              :tab="rel.label_zh ?? rel.label ?? rel.name"
            >
              <RelationshipTab
                :source-item="item"
                :relationship-type="rel"
              />
            </a-tab-pane>
          </a-tabs>
          <div v-else class="empty-rel">
            <Tag>暂无关系</Tag>
          </div>
        </div>
      </div>
    </Spin>
  </div>
</template>

<script lang="ts">
import { h } from 'vue'
</script>

<style scoped>
.detail-page { height: 100%; display: flex; flex-direction: column; }
.detail-toolbar { justify-content: space-between; }
.detail-title-block { display: flex; align-items: center; gap: 12px; }
.detail-type { font-family: 'JetBrains Mono', monospace; }
.detail-keyed-name { margin: 0; font-size: 18px; font-weight: 600; color: #e6edf7; }
.detail-rev { font-family: 'JetBrains Mono', monospace; color: #13c2c2; }
.detail-body {
  flex: 1;
  padding: 12px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}
.detail-form-surface { padding: 4px 0; }
.detail-relationship { padding: 4px 12px 12px; }
.empty-rel { padding: 24px; text-align: center; }
:deep(.kras-tabs-detail .ant-tabs-nav) { padding: 0 8px; margin-bottom: 12px; }
</style>
