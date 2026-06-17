<script setup lang="ts">
// 主布局：左侧菜单 + 顶部 + 多 Tab 内容区
// 对应需求 §9.1
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import * as AntIcons from '@ant-design/icons-vue'
import MainSider from './MainSider.vue'
import MainHeader from './MainHeader.vue'
import { useTabsStore } from '@/store/tabs'
import { getJson } from '@/data/kras.item'
import { krasCache } from '@/data/kras.cache'
import type { MenuItem } from '@/types'

const router = useRouter()
const route = useRoute()
const tabsStore = useTabsStore()
const { tabs, activeKey } = storeToRefs(tabsStore)

const collapsed = ref(false)
const menus = ref<MenuItem[]>([])

const iconName = (icon?: string) => (icon && (AntIcons as Record<string, unknown>)[icon] ? icon : 'AppstoreOutlined')
const iconComp = (name?: string) => {
  const key = iconName(name)
  return (AntIcons as Record<string, unknown>)[key] as unknown as ReturnType<typeof h>
}

onMounted(async () => {
  krasCache.restore()
  try {
    menus.value = await getJson<MenuItem[]>('/menus')
  } catch {
    // ignore
  }
})

// 同步当前路由到 tabs
watch(
  () => [route.name, route.params, route.meta.title] as const,
  () => {
    const title = (route.meta.title as string) || '页面'
    const params = route.params as Record<string, string>
    let tabTitle = title
    if (route.name === 'itemType-list') {
      tabTitle = params.itemType
      // 查 ItemType 元数据 label
      const it = krasCache.getItemTypeMetadata(params.itemType)
      if (it) tabTitle = it.label_zh ?? it.label ?? it.name
    } else if (route.name === 'itemType-detail') {
      tabTitle = `${params.itemType} 详情`
    }
    const key = route.fullPath
    tabsStore.openTab({
      key,
      title: tabTitle,
      path: route.fullPath,
      closable: route.meta.closable !== false,
    })
  },
  { immediate: true }
)

watch(activeKey, (k) => {
  if (k && k !== route.fullPath) {
    router.push(k)
  }
})

function onEdit(key: string, action: 'add' | 'remove') {
  if (action === 'remove') tabsStore.closeTab(key)
}
</script>

<template>
  <a-layout class="kras-layout">
    <MainSider :collapsed="collapsed" :menus="menus" :icon-comp="iconComp" />
    <a-layout class="kras-body">
      <MainHeader v-model:collapsed="collapsed" />
      <a-layout-content class="kras-content">
        <a-tabs
          v-model:active-key="activeKey"
          type="editable-card"
          :hide-add="true"
          class="kras-tabs"
          @edit="onEdit"
        >
          <a-tab-pane v-for="t in tabs" :key="t.key" :closable="t.closable">
            <template #tab>
              <component :is="iconComp(undefined)" v-if="false" />
              <span>{{ t.title }}</span>
            </template>
            <div class="kras-tab-panel">
              <router-view v-slot="{ Component }">
                <keep-alive :include="tabsStore.cachedKeys">
                  <component :is="Component" />
                </keep-alive>
              </router-view>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.kras-layout { height: 100vh; overflow: hidden; }
.kras-body { height: 100vh; overflow: hidden; }
.kras-content {
  height: calc(100vh - 56px);
  overflow: hidden;
  background: #070c17;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.kras-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.kras-tabs :deep(.ant-tabs-nav) {
  margin: 0;
  padding: 0 12px;
  background: linear-gradient(180deg, #0f1a2e 0%, rgba(15, 26, 46, 0) 100%);
  border-bottom: 1px solid #1f2d44;
}
.kras-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
}
.kras-tabs :deep(.ant-tabs-content) {
  height: 100%;
}
.kras-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
}
.kras-tab-panel {
  height: 100%;
  overflow: auto;
}
</style>
