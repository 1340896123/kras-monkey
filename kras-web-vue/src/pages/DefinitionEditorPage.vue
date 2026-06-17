<script setup lang="ts">
// 定义编辑器：生命周期 / 工作流 / Method 共用骨架
import { computed } from 'vue'
import { Card } from 'ant-design-vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const kind = computed(() => route.params.kind as 'lifecycle' | 'workflow' | 'method')

const titles = {
  lifecycle: '生命周期定义编辑器',
  workflow: '工作流定义编辑器',
  method: '方法编辑器',
}
</script>

<template>
  <div class="kras-page-padding">
    <Card class="kras-surface" :bordered="false">
      <template #title>{{ titles[kind] }}</template>
      <div class="editor-placeholder">
        <p class="kras-text-secondary">
          {{ titles[kind] }}已注册独立路由。在 X6 / Monaco / Roslyn 集成后会提供可视化图编辑、代码编辑、编译检查能力。
        </p>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.editor-placeholder { padding: 32px; }
</style>
