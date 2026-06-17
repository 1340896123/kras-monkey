<script setup lang="ts">
// 主布局左侧菜单
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import * as AntIcons from '@ant-design/icons-vue'
import type { MenuItem } from '@/types'
import { useTabsStore } from '@/store/tabs'

const props = defineProps<{
  collapsed: boolean
  menus: MenuItem[]
  iconComp: (name?: string) => unknown
}>()

const route = useRoute()
const router = useRouter()
const tabsStore = useTabsStore()

interface TreeNode {
  key: string
  label: string
  icon?: string
  path?: string
  children?: TreeNode[]
}

const tree = computed<TreeNode[]>(() => {
  const byParent = new Map<string | null, MenuItem[]>()
  for (const m of props.menus) {
    const arr = byParent.get(m.parent_id) ?? []
    arr.push(m)
    byParent.set(m.parent_id, arr)
  }
  function build(parentId: string | null): TreeNode[] {
    const items = (byParent.get(parentId) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
    return items.map((m) => ({
      key: m.id,
      label: m.label,
      icon: m.icon,
      path: m.path,
      children: build(m.id).length ? build(m.id) : undefined,
    }))
  }
  return build(null)
})

const selectedKeys = computed(() => {
  // 用菜单 path 匹配路由
  const matched = props.menus.find((m) => m.path && route.path.startsWith(m.path))
  return matched ? [matched.id] : []
})

const openKeys = ref<string[]>(['business', 'system'])

function onClick({ key, item }: { key: string; item: { path?: string; domEvent?: MouseEvent } }) {
  // 找到对应 path
  const node = findNode(tree.value, key)
  if (node?.path) {
    router.push(node.path)
  }
}

function findNode(nodes: TreeNode[], key: string): TreeNode | null {
  for (const n of nodes) {
    if (n.key === key) return n
    if (n.children) {
      const r = findNode(n.children, key)
      if (r) return r
    }
  }
  return null
}

const AntIconsAny = AntIcons as unknown as Record<string, { new (): unknown }>
</script>

<template>
  <a-layout-sider
    :collapsed="props.collapsed"
    :trigger="null"
    theme="dark"
    :width="232"
    class="kras-sider"
  >
    <!-- 品牌 LOGO -->
    <div class="brand-bar" :class="{ collapsed: props.collapsed }">
      <div class="brand-mark">K</div>
      <div v-show="!props.collapsed" class="brand-info">
        <div class="brand-name">Kras</div>
        <div class="brand-tag">PLM Platform</div>
      </div>
    </div>

    <a-menu
      v-model:selected-keys="selectedKeys"
      v-model:open-keys="openKeys"
      mode="inline"
      theme="dark"
      :items="tree"
      @click="onClick"
    >
    </a-menu>
  </a-layout-sider>
</template>

<script lang="ts">
import { ref } from 'vue'
</script>

<style scoped>
.kras-sider {
  background: #0b1220 !important;
  border-right: 1px solid #1f2d44;
  display: flex;
  flex-direction: column;
}
.brand-bar {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  border-bottom: 1px solid #1f2d44;
  background: linear-gradient(180deg, #0f1a2e 0%, #0b1220 100%);
}
.brand-bar.collapsed { padding: 0; justify-content: center; }
.brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #1668dc 0%, #13c2c2 100%);
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 18px;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 6px 18px rgba(22, 104, 220, 0.4);
}
.brand-info { display: flex; flex-direction: column; line-height: 1.2; }
.brand-name { font-size: 16px; font-weight: 700; color: #e6edf7; }
.brand-tag { font-size: 10px; color: #6b7785; letter-spacing: 1px; }

.kras-sider :deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
}
.kras-sider :deep(.ant-menu) {
  flex: 1;
  border-right: none;
  padding-top: 8px;
}
</style>
