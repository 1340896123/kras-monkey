// mock/browser.ts —— 浏览器侧启动 MSW（开发模式自动启用）

import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

let started: Promise<void> | null = null

export async function startMock(): Promise<void> {
  if (started) return started
  if (import.meta.env.PROD) return
  started = worker
    .start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
      },
    })
    .then(() => undefined)
  return started
}
