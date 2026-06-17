<script setup lang="ts">
// View 编辑器（简化版骨架）：左侧组件 + 中间预览 + 右侧 JSON
import { ref, computed } from 'vue'
import { Card, Tabs, TabPane, Button, Space, message } from 'ant-design-vue'
import { SaveOutlined, EyeOutlined, UndoOutlined } from '@ant-design/icons-vue'
import { useRoute } from 'vue-router'
import { krasCache } from '@/data/kras.cache'
import { postRaw } from '@/data/kras.item'

const route = useRoute()
const viewId = computed(() => route.params.viewId as string)
const view = computed(() => krasCache.getMetadata().views.find((v) => v.id === viewId.value))

const schemeText = ref(JSON.stringify(view.value?.form_scheme ?? { sections: [] }, null, 2))

const components = [
  { name: 'text', label: '文本框' },
  { name: 'textarea', label: '多行文本' },
  { name: 'number', label: '数字' },
  { name: 'date', label: '日期' },
  { name: 'switch', label: '开关' },
  { name: 'select', label: '下拉' },
  { name: 'item', label: '引用字段' },
  { name: 'file', label: '文件' },
  { name: 'image', label: '图片' },
  { name: 'button', label: '按钮' },
  { name: 'classification', label: '分类' },
]

async function onSave() {
  let parsed: unknown
  try {
    parsed = JSON.parse(schemeText.value)
  } catch (e) {
    message.error('JSON 解析失败：' + (e as Error).message)
    return
  }
  await postRaw(`/views/${viewId.value}/form`, { scheme: parsed })
  message.success('已保存')
}
</script>

<template>
  <div class="kras-page-padding view-editor">
    <div class="kras-toolbar">
      <h2>视图编辑器 · {{ view?.label ?? viewId }}</h2>
      <Space>
        <Button :icon="h(UndoOutlined)">重置</Button>
        <Button :icon="h(EyeOutlined)">预览</Button>
        <Button type="primary" :icon="h(SaveOutlined)" @click="onSave">保存</Button>
      </Space>
    </div>

    <div class="editor-grid">
      <!-- 左侧：组件库 / 对象属性 -->
      <Card class="kras-surface editor-side" :bordered="false">
        <Tabs size="small">
          <TabPane key="components" tab="组件库">
            <div class="component-list">
              <div v-for="c in components" :key="c.name" class="component-item">
                <span>{{ c.label }}</span>
                <span class="comp-name kras-text-mono kras-text-tertiary">{{ c.name }}</span>
              </div>
            </div>
          </TabPane>
          <TabPane key="fields" tab="对象属性">
            <p class="kras-text-tertiary">已绑定字段会在此显示</p>
          </TabPane>
        </Tabs>
      </Card>

      <!-- 中间：预览区 -->
      <Card class="kras-surface editor-preview" :bordered="false">
        <template #title>设计区</template>
        <div class="design-canvas">
          <p class="kras-text-tertiary">拖拽左侧组件到此处构造表单</p>
        </div>
      </Card>

      <!-- 右侧：JSON 源码 -->
      <Card class="kras-surface editor-json" :bordered="false">
        <template #title>JSON 源码</template>
        <textarea v-model="schemeText" class="json-textarea" spellcheck="false"></textarea>
      </Card>
    </div>
  </div>
</template>

<script lang="ts">
import { h } from 'vue'
</script>

<style scoped>
.view-editor { height: 100%; display: flex; flex-direction: column; }
.editor-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 260px 1fr 360px;
  gap: 12px;
  min-height: 0;
}
.editor-side, .editor-preview, .editor-json {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
:deep(.editor-side .ant-card-body),
:deep(.editor-preview .ant-card-body),
:deep(.editor-json .ant-card-body) {
  flex: 1;
  overflow: auto;
}
.component-list { display: grid; gap: 6px; }
.component-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #1f2d44;
  border-radius: 6px;
  font-size: 13px;
  cursor: grab;
  color: #cfd8e6;
}
.component-item:hover { border-color: #1668dc; }
.comp-name { font-size: 11px; }
.design-canvas {
  min-height: 400px;
  border: 2px dashed #1f2d44;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
}
.json-textarea {
  width: 100%;
  height: 100%;
  background: #0c1424;
  color: #c3cfe0;
  border: 1px solid #1f2d44;
  border-radius: 6px;
  padding: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  resize: none;
  outline: none;
}
</style>
