<script setup lang="ts">
// 图片字段
import { ref } from 'vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { newId } from '@/mock/seed/id'
import type { Property, KrasItem } from '@/types'

const props = defineProps<{
  property: Property
  value: unknown
  readonly?: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:value': [unknown] }>()

const images = ref<KrasItem[]>(parseInitial(props.value))

function parseInitial(v: unknown): KrasItem[] {
  if (!v) return []
  if (Array.isArray(v)) return v as KrasItem[]
  return [v as KrasItem]
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  const next: KrasItem[] = [...images.value]
  for (const f of Array.from(input.files)) {
    const id = newId()
    const reader = new FileReader()
    reader.onload = () => {
      const arr = Array.from(new Uint8Array(reader.result as ArrayBuffer))
      next.push({ '@type': 'Image', '@id': id, name: f.name, bytes: arr })
      images.value = [...next]
      emit('update:value', images.value.length > 1 ? images.value : images.value[0])
    }
    reader.readAsArrayBuffer(f)
  }
  input.value = ''
}

function remove(idx: number) {
  images.value.splice(idx, 1)
  images.value = [...images.value]
  emit('update:value', images.value.length ? (images.value.length > 1 ? images.value : images.value[0]) : null)
}

function imgUrl(item: KrasItem): string {
  if (item.bytes && Array.isArray(item.bytes)) {
    const blob = new Blob([new Uint8Array(item.bytes as number[])], { type: 'image/png' })
    return URL.createObjectURL(blob)
  }
  const id = item['@id'] as string
  return `/api/files/${id}`
}
</script>

<template>
  <div class="image-field">
    <div class="image-grid">
      <div v-for="(img, idx) in images" :key="idx" class="image-tile">
        <img :src="imgUrl(img)" :alt="String(img.name ?? '')" />
        <div v-if="!readonly && !disabled" class="image-overlay">
          <a-button type="text" size="small" danger @click="remove(idx)">
            <DeleteOutlined />
          </a-button>
        </div>
      </div>
      <label v-if="!readonly && !disabled" class="image-pick">
        <input type="file" accept="image/*" multiple hidden @change="onPick" />
        <div class="image-pick-inner">
          <PlusOutlined />
          <span>添加图片</span>
        </div>
      </label>
    </div>
  </div>
</template>

<style scoped>
.image-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.image-tile {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 8px;
  overflow: hidden;
  background: #152238;
  border: 1px solid #1f2d44;
}
.image-tile img { width: 100%; height: 100%; object-fit: cover; }
.image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 160ms;
}
.image-tile:hover .image-overlay { opacity: 1; }
.image-pick {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  border: 1px dashed #1f2d44;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7785;
  transition: all 160ms;
}
.image-pick:hover { border-color: #1668dc; color: #1668dc; }
.image-pick-inner { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; }
</style>
