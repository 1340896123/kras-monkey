<script setup lang="ts">
// 通用占位页面：用于 Settings / AI / MenuManagement / DebugPanel / PermissionReport / FilePreview
import { Card } from 'ant-design-vue'
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const title = computed(() => (route.meta.title as string) ?? '页面')
</script>

<template>
  <div class="kras-page-padding placeholder-page">
    <Card class="kras-surface" :bordered="false">
      <div class="placeholder-inner">
        <div class="placeholder-icon"><InfoCircleOutlined /></div>
        <h2>{{ title }}</h2>
        <p class="kras-text-secondary">该页面已注册路由，使用元数据驱动的相同交互模式。后续可在对应业务模块中扩展完整功能。</p>
        <div class="placeholder-meta">
          <CheckCircleOutlined style="color: #52c41a" />
          <span>路由可达 · 守卫通过 · 元数据缓存命中</span>
        </div>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.placeholder-page { display: grid; place-items: center; min-height: 100%; }
.placeholder-inner {
  text-align: center;
  padding: 48px 24px;
  max-width: 520px;
}
.placeholder-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(22, 104, 220, 0.18) 0%, rgba(19, 194, 194, 0.18) 100%);
  border-radius: 16px;
  font-size: 28px;
  color: #1668dc;
}
h2 { margin: 0 0 12px; color: #e6edf7; }
.placeholder-meta { margin-top: 24px; display: flex; justify-content: center; gap: 8px; font-size: 12px; color: #9ba8be; }
</style>
