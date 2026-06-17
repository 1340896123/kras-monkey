<script setup lang="ts">
// 引用字段搜索组件：默认下拉立即加载；keyed_name:*keyword*
// 对应需求 §9.7
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { Select as ASelect } from 'ant-design-vue'
import { applyItem } from '@/data/kras.item'
import { krasCache } from '@/data/kras.cache'
import { registerController, unregisterController } from '@/data/kras.searchItems'
import { resolveReference } from '@/utils/fieldValue'
import type { Property, KrasItem } from '@/types'

const props = defineProps<{
  property: Property
  value: unknown
  readonly?: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:value': [unknown] }>()

const open = ref(false)
const options = ref<Array<{ value: string; label: string; raw: KrasItem }>>([])
const loading = ref(false)
const searchKey = ref('')

const itemTypeMeta = ref(krasCache.getMetadata().itemTypes.find((t) => t.id === props.property.data_source))
const itemTypeName = ref(itemTypeMeta.value?.name ?? '')

async function loadInitial() {
  if (!itemTypeName.value) return
  loading.value = true
  try {
    const result = await applyItem<KrasItem[]>({ '@type': itemTypeName.value, '@action': 'get' })
    options.value = (result ?? []).map((it) => ({
      value: it['@id'] as string,
      label: (it['@keyed_name'] as string) ?? '',
      raw: it,
    }))
  } finally {
    loading.value = false
  }
}

  async function onSearch(q: string) {
  searchKey.value = q
  if (!itemTypeName.value) return
  loading.value = true
  try {
    const payload: KrasItem = { '@type': itemTypeName.value, '@action': 'get' }
    if (q) (payload as Record<string, unknown>)['@keyed_name'] = `*${q}*`
    const result = await applyItem<KrasItem[]>(payload)
    options.value = (result ?? []).map((it) => ({
      value: it['@id'] as string,
      label: (it['@keyed_name'] as string) ?? '',
      raw: it,
    }))
  } finally {
    loading.value = false
  }
}

function onChange(value: string | undefined) {
  if (!value) {
    emit('update:value', null)
    return
  }
  const opt = options.value.find((o) => o.value === value)
  if (opt) {
    emit('update:value', { '@id': opt.value, '@keyed_name': opt.label })
  } else {
    emit('update:value', { '@id': value })
  }
}

const currentId = ref<string | undefined>(
  (props.value as any)?.['@id']
)

watch(
  () => props.value,
  (v) => {
    currentId.value = (v as any)?.['@id']
  }
)

onMounted(() => {
  registerController(props.property.name, {
    open: () => (open.value = true),
    close: () => (open.value = false),
    setQuery: (q: string) => onSearch(q),
    mergeQuery: () => {},
    getSelection: () => [],
  })
  loadInitial()
})

onBeforeUnmount(() => {
  unregisterController(props.property.name)
})
</script>

<template>
  <a-select
    v-model:value="currentId"
    :open="open"
    show-search
    :filter-option="false"
    placeholder="选择或搜索..."
    :disabled="readonly || disabled"
    :loading="loading"
    style="width: 100%"
    :options="options"
    @update:value="(v: any) => onChange(v as string)"
    @search="onSearch"
    @dropdown-visible-change="(o: boolean) => (open = o)"
  />
</template>
