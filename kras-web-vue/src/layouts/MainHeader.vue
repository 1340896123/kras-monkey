<script setup lang="ts">
// 顶部操作区
import { useRouter } from 'vue-router'
import { Modal } from 'ant-design-vue'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/store/auth'

defineProps<{ collapsed: boolean }>()
const emit = defineEmits<{ 'update:collapsed': [boolean] }>()

const router = useRouter()
const auth = useAuthStore()

function toggleCollapsed() {
  emit('update:collapsed', !propsCollapsed())
}
function propsCollapsed() {
  return false
}

function onReload() {
  window.location.reload()
}

function onFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

function onLogout() {
  Modal.confirm({
    title: '确认退出登录？',
    icon: undefined,
    okText: '退出',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      auth.logout()
      router.replace('/login')
    },
  })
}
</script>

<template>
  <a-layout-header class="kras-header">
    <div class="header-left">
      <a-button type="text" class="header-btn" @click="emit('update:collapsed', !$props.collapsed)">
        <MenuUnfoldOutlined v-if="$props.collapsed" />
        <MenuFoldOutlined v-else />
      </a-button>
      <a-divider type="vertical" class="header-divider" />
      <span class="header-env">
        <span class="env-dot"></span>
        演示环境 · MSW Mock
      </span>
    </div>

    <div class="header-right">
      <a-tooltip title="刷新">
        <a-button type="text" class="header-btn" @click="onReload"><ReloadOutlined /></a-button>
      </a-tooltip>
      <a-tooltip title="全屏">
        <a-button type="text" class="header-btn" @click="onFullscreen"><FullscreenOutlined /></a-button>
      </a-tooltip>
      <a-tooltip title="帮助">
        <a-button type="text" class="header-btn"><QuestionCircleOutlined /></a-button>
      </a-tooltip>
      <a-dropdown>
        <a class="header-user" @click.prevent>
          <a-avatar :size="30" class="header-avatar">
            <template #icon><UserOutlined /></template>
          </a-avatar>
          <span class="user-name">{{ auth.user?.name ?? '未登录' }}</span>
        </a>
        <template #overlay>
          <a-menu>
            <a-menu-item key="profile">
              <UserOutlined />
              <span style="margin-left: 8px">个人资料</span>
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="logout" @click="onLogout">
              <LogoutOutlined />
              <span style="margin-left: 8px">退出登录</span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </a-layout-header>
</template>

<style scoped>
.kras-header {
  background: #0f1a2e !important;
  border-bottom: 1px solid #1f2d44;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px !important;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 16px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 16px;
}
.header-btn { color: #9ba8be !important; }
.header-btn:hover { color: #e6edf7 !important; background: rgba(255, 255, 255, 0.06) !important; }
.header-divider { background: #1f2d44 !important; height: 20px !important; }

.header-env {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7785;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
}
.env-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #52c41a;
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.6);
}

.header-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  color: #cfd8e6;
  cursor: pointer;
}
.header-user:hover { background: rgba(255, 255, 255, 0.06); }
.header-avatar {
  background: linear-gradient(135deg, #1668dc 0%, #13c2c2 100%) !important;
  color: #fff !important;
}
.user-name { font-size: 13px; }
</style>
