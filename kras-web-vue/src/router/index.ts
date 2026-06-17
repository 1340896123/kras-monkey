// 路由配置：对应需求 §9.2
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { krasCache } from '@/data/kras.cache'
import { getMetadata } from '@/data/kras.metadata'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('@/pages/DashboardPage.vue'), meta: { title: '仪表盘' } },
      { path: 'item-types/:itemType', name: 'itemType-list', component: () => import('@/pages/ItemTypeTable.vue'), meta: { title: '列表' } },
      { path: 'item-types/:itemType/:id', name: 'itemType-detail', component: () => import('@/pages/ItemDetailPage.vue'), meta: { title: '详情' } },
      { path: 'view-editor/:viewId', name: 'view-editor', component: () => import('@/pages/ViewEditorPage.vue'), meta: { title: '视图编辑器' } },
      { path: 'definition/:kind(lifecycle|workflow|method)', name: 'definition-list', component: () => import('@/pages/DefinitionEditorPage.vue'), meta: { title: '定义编辑' } },
      { path: 'definition/:kind(lifecycle|workflow|method)/:id', name: 'definition-edit', component: () => import('@/pages/DefinitionEditorPage.vue'), meta: { title: '定义编辑' } },
      { path: 'users', name: 'users', component: () => import('@/pages/UsersPage.vue'), meta: { title: '用户管理' } },
      { path: 'menu-management', name: 'menu-management', component: () => import('@/pages/PlaceholderPage.vue'), meta: { title: '菜单管理' } },
      { path: 'ai-management', name: 'ai-management', component: () => import('@/pages/PlaceholderPage.vue'), meta: { title: 'AI 管理' } },
      { path: 'settings', name: 'settings', component: () => import('@/pages/PlaceholderPage.vue'), meta: { title: '系统设置' } },
      { path: 'debug-panel', name: 'debug-panel', component: () => import('@/pages/PlaceholderPage.vue'), meta: { title: '调试面板' } },
      { path: 'permission-report/:itemType/:id', name: 'permission-report', component: () => import('@/pages/PlaceholderPage.vue'), meta: { title: '权限报表' } },
      { path: 'file-preview/:itemType/:id', name: 'file-preview', component: () => import('@/pages/PlaceholderPage.vue'), meta: { title: '文件预览' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthed) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // 已登录但元数据未加载（页面刷新场景）：补一次
  if (auth.isAuthed && krasCache.getMetadata().itemTypes.length === 0) {
    try {
      await getMetadata()
    } catch {
      // 忽略，由具体页面处理
    }
  }
})

router.afterEach((to) => {
  document.title = `${to.meta.title ?? 'Kras'} · Kras PLM`
})

export default router
