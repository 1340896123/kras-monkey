// store/tabs.ts —— 多 Tab 状态管理（保状态、关闭互不影响）

import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface TabItem {
  key: string // 唯一 key（如路由路径 + 参数）
  title: string
  path: string
  icon?: string
  closable: boolean
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<TabItem[]>([])
  const activeKey = ref<string>('')
  /** 每个 tab 的 keep-alive 缓存 key 列表 */
  const cachedKeys = ref<string[]>([])

  function openTab(tab: TabItem): void {
    const existed = tabs.value.find((t) => t.key === tab.key)
    if (!existed) {
      tabs.value.push(tab)
      cachedKeys.value.push(tab.key)
    }
    activeKey.value = tab.key
  }

  function closeTab(key: string): void {
    const idx = tabs.value.findIndex((t) => t.key === key)
    if (idx === -1) return
    tabs.value.splice(idx, 1)
    cachedKeys.value = cachedKeys.value.filter((k) => k !== key)
    if (activeKey.value === key) {
      const next = tabs.value[idx] ?? tabs.value[idx - 1]
      activeKey.value = next?.key ?? ''
    }
  }

  function closeOther(key: string): void {
    tabs.value = tabs.value.filter((t) => t.key === key || !t.closable)
    cachedKeys.value = cachedKeys.value.filter((k) => k === key)
    activeKey.value = key
  }

  function closeAll(): void {
    tabs.value = tabs.value.filter((t) => !t.closable)
    cachedKeys.value = tabs.value.map((t) => t.key)
    activeKey.value = tabs.value[0]?.key ?? ''
  }

  function setActive(key: string): void {
    activeKey.value = key
  }

  return { tabs, activeKey, cachedKeys, openTab, closeTab, closeOther, closeAll, setActive }
})
