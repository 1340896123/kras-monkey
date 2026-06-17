// store/auth.ts —— 鉴权状态

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { postRaw, setToken } from '@/data/kras.item'
import { getMetadata } from '@/data/kras.metadata'
import { krasCache } from '@/data/kras.cache'
import type { KrasId } from '@/types'

export interface AuthUser {
  id: KrasId
  login_name: string
  name: string
  email?: string
  identity_ids: KrasId[]
}

const AUTH_KEY = 'kras.auth.user'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(restoreUser())
  const loading = ref(false)

  const isAuthed = computed(() => !!user.value)

  function restoreUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  }

  async function login(loginName: string, password: string): Promise<void> {
    loading.value = true
    try {
      const resp = await postRaw<{ token: string; user: AuthUser }>('/login', {
        login_name: loginName,
        password,
      })
      setToken(resp.token)
      user.value = resp.user
      localStorage.setItem(AUTH_KEY, JSON.stringify(resp.user))
      krasCache.restore()
      await getMetadata()
    } finally {
      loading.value = false
    }
  }

  function logout(): void {
    setToken(null)
    user.value = null
    localStorage.removeItem(AUTH_KEY)
    krasCache.clearItemType()
  }

  return { user, loading, isAuthed, login, logout }
})
