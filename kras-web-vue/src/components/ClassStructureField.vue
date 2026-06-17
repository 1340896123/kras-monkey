<script setup lang="ts">
// 类结构（classification）选择组件
import { computed } from 'vue'
import { Cascader } from 'ant-design-vue'

const props = defineProps<{
  value?: string
  classStructure?: string[]
  readonly?: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:value': [string] }>()

const options = computed(() => {
  return (props.classStructure ?? []).map((root) => {
    const parts = root.split('/')
    return buildCascader(parts, parts)
  })
})

function buildCascader(segments: string[], fullPath: string[]): any {
  const [first, ...rest] = segments
  return {
    value: first,
    label: first,
    children: rest.length
      ? [buildCascader(rest, fullPath)]
      : undefined,
  }
}

const selectedPath = computed(() => (props.value ? props.value.split('/') : []))

function onChange(v: any) {
  if (Array.isArray(v) && v.length) {
    emit('update:value', v.join('/'))
  } else {
    emit('update:value', '')
  }
}
</script>

<template>
  <a-cascader
    :value="selectedPath"
    :options="options"
    :disabled="readonly || disabled"
    change-on-select
    placeholder="选择分类"
    style="width: 100%"
    @change="onChange"
  />
</template>
