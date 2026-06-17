<script setup lang="ts">
// 文件字段（对应需求 §9.6 文件/图片字段统一值协议）
import { ref } from 'vue'
import { UploadOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { postRaw } from '@/data/kras.item'
import { newId } from '@/mock/seed/id'
import type { Property, KrasItem } from '@/types'

const props = defineProps<{
  property: Property
  value: unknown
  readonly?: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:value': [unknown] }>()

const fileList = ref<KrasItem[]>(parseInitial(props.value))

function parseInitial(v: unknown): KrasItem[] {
  if (!v) return []
  if (Array.isArray(v)) return v as KrasItem[]
  return [v as KrasItem]
}

async function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files) return
  const next: KrasItem[] = [...fileList.value]
  for (const f of Array.from(files)) {
    const id = newId()
    const item: KrasItem = { '@type': 'File', '@id': id, name: f.name }
    next.push(item)
  }
  fileList.value = next
  emit('update:value', next.length > 1 ? next : next[0])
  input.value = ''
}

function remove(idx: number) {
  const next = [...fileList.value]
  next.splice(idx, 1)
  fileList.value = next
  emit('update:value', next.length ? (next.length > 1 ? next : next[0]) : null)
}
</script>

<template>
  <div class="file-field">
    <div v-if="!readonly && !disabled" class="file-actions">
      <label class="file-pick">
        <input type="file" multiple hidden @change="onPick" />
        <UploadOutlined />
        <span>选择文件</span>
      </label>
    </div>
    <ul v-if="fileList.length" class="file-list">
      <li v-for="(f, idx) in fileList" :key="idx">
        <span class="file-name">{{ f.name }}</span>
        <a-button type="text" size="small" :href="`/api/files/${f['@id']}`" target="_blank">
          <DownloadOutlined />
        </a-button>
        <a-button v-if="!readonly && !disabled" type="text" size="small" danger @click="remove(idx)">
          <DeleteOutlined />
        </a-button>
      </li>
    </ul>
    <span v-else class="kras-text-tertiary">暂无文件</span>
  </div>
</template>

<style scoped>
.file-field { display: flex; flex-direction: column; gap: 8px; }
.file-pick {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(22, 104, 220, 0.1);
  border: 1px dashed #1668dc;
  border-radius: 6px;
  color: #1668dc;
  cursor: pointer;
  font-size: 13px;
  transition: all 160ms;
}
.file-pick:hover { background: rgba(22, 104, 220, 0.2); }
.file-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.file-list li {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #1f2d44;
  border-radius: 6px;
  font-size: 13px;
}
.file-name { flex: 1; color: #cfd8e6; }
</style>
