import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import 'dayjs/locale/zh-cn'

import App from './App.vue'
import router from './router'
import { startMock } from './mock/browser'
import { krasCache } from './data/kras.cache'
import './styles/global.css'

async function bootstrap() {
  // 还原元数据缓存（首帧占位用）
  krasCache.restore()

  // 开发模式且未显式禁用 mock 时，启动 MSW
  const useMock = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false'
  if (!import.meta.env.PROD && useMock) {
    await startMock().catch((e) => console.warn('[MSW] start failed:', e))
    console.info('[Kras] 已启用 MSW Mock。设 VITE_USE_MOCK=false 切换到真实后端')
  } else {
    console.info('[Kras] 走真实后端：', import.meta.env.VITE_API_BASE ?? '/api')
  }

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.use(Antd)
  app.mount('#app')
}

bootstrap()
