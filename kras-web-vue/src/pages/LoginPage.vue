<script setup lang="ts">
// 登录页 —— 高质感视觉
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive({
  login_name: 'admin',
  password: 'admin',
})
const formRef = ref()

const rules = {
  login_name: [{ required: true, message: '请输入登录名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const presets = [
  { login_name: 'admin', password: 'admin', role: '系统管理员' },
  { login_name: 'pmlin', password: 'pmlin', role: 'PLM 协调员' },
  { login_name: 'engineer', password: 'engineer', role: '研发工程师' },
  { login_name: 'viewer', password: 'viewer', role: '只读用户' },
]

function applyPreset(p: typeof presets[number]) {
  form.login_name = p.login_name
  form.password = p.password
}

async function onSubmit() {
  await formRef.value?.validate()
  try {
    await auth.login(form.login_name, form.password)
    message.success(`欢迎回来，${auth.user?.name}`)
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.replace(redirect)
  } catch (e: unknown) {
    const err = e as Error
    message.error(err.message ?? '登录失败')
  }
}
</script>

<template>
  <div class="login-root">
    <!-- 背景渐变 + 网格 -->
    <div class="login-bg">
      <div class="login-glow login-glow-1"></div>
      <div class="login-glow login-glow-2"></div>
      <div class="login-grid"></div>
    </div>

    <div class="login-shell">
      <!-- 左：品牌区 -->
      <aside class="login-brand">
        <div class="brand-logo">
          <span class="brand-mark">K</span>
          <span class="brand-text">Kras</span>
        </div>
        <h1 class="brand-title">元数据驱动的<br />企业级 PLM 平台</h1>
        <p class="brand-sub">统一建模 · 统一协议 · 统一治理</p>
        <ul class="brand-points">
          <li><span class="dot dot-primary"></span>物料 / 文档 / BOM 全生命周期</li>
          <li><span class="dot dot-cyan"></span>工作流审批 + 生命周期联动</li>
          <li><span class="dot dot-success"></span>字段级权限 + 审计可追溯</li>
          <li><span class="dot dot-warning"></span>双轨方法扩展（C# + JS）</li>
        </ul>
        <div class="brand-footer">
          <span>Kras PLM Platform</span>
          <span class="brand-ver">v2.x · AML Protocol</span>
        </div>
      </aside>

      <!-- 右：表单区 -->
      <main class="login-form-wrap">
        <div class="login-card kras-surface">
          <header class="login-card-head">
            <h2>欢迎登录</h2>
            <p>请输入您的账号信息</p>
          </header>

          <a-form
            ref="formRef"
            :model="form"
            :rules="rules"
            layout="vertical"
            size="large"
            @finish="onSubmit"
          >
            <a-form-item name="login_name">
              <a-input v-model:value="form.login_name" placeholder="登录名">
                <template #prefix><UserOutlined /></template>
              </a-input>
            </a-form-item>
            <a-form-item name="password">
              <a-input-password v-model:value="form.password" placeholder="密码" @press-enter="onSubmit">
                <template #prefix><LockOutlined /></template>
              </a-input-password>
            </a-form-item>
            <a-button
              type="primary"
              html-type="submit"
              :loading="auth.loading"
              block
              size="large"
              class="login-submit"
            >
              登录
            </a-button>
          </a-form>

          <div class="login-divider"><span>快速体验（演示账号）</span></div>
          <div class="login-presets">
            <button
              v-for="p in presets"
              :key="p.login_name"
              class="preset-chip"
              :class="{ active: form.login_name === p.login_name }"
              @click="applyPreset(p)"
            >
              <SafetyOutlined />
              <span class="preset-role">{{ p.role }}</span>
              <span class="preset-account">{{ p.login_name }} / {{ p.password }}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.login-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #070c17;
}

.login-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0a1a3a 0%, #0b1e3f 50%, #102b5a 100%);
}
.login-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}
.login-glow-1 {
  width: 480px;
  height: 480px;
  top: -120px;
  right: -120px;
  background: radial-gradient(circle, rgba(22, 104, 220, 0.5), transparent 70%);
}
.login-glow-2 {
  width: 380px;
  height: 380px;
  bottom: -80px;
  left: -80px;
  background: radial-gradient(circle, rgba(19, 194, 194, 0.35), transparent 70%);
}
.login-grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at 50% 50%, #000 30%, transparent 75%);
}

.login-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 40px;
}

.login-brand {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 32px 48px 16px;
  color: #e6edf7;
}
.brand-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 56px;
}
.brand-mark {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #1668dc 0%, #13c2c2 100%);
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 20px;
  color: #fff;
  box-shadow: 0 8px 24px rgba(22, 104, 220, 0.4);
}
.brand-text {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.brand-title {
  font-size: 38px;
  line-height: 1.25;
  font-weight: 700;
  margin: 0 0 16px;
  background: linear-gradient(135deg, #ffffff 0%, #9bd0ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.brand-sub {
  font-size: 16px;
  color: #9ba8be;
  margin: 0 0 36px;
  letter-spacing: 1px;
}
.brand-points {
  list-style: none;
  padding: 0;
  margin: 0 0 48px;
}
.brand-points li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  font-size: 14px;
  color: #cfd8e6;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-primary { background: #1668dc; box-shadow: 0 0 12px rgba(22, 104, 220, 0.6); }
.dot-cyan { background: #13c2c2; box-shadow: 0 0 12px rgba(19, 194, 194, 0.6); }
.dot-success { background: #52c41a; box-shadow: 0 0 12px rgba(82, 196, 26, 0.5); }
.dot-warning { background: #faad14; box-shadow: 0 0 12px rgba(250, 173, 20, 0.5); }

.brand-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #5b6677;
  font-size: 12px;
}
.brand-ver { color: #4d5a6d; }

.login-form-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-card {
  width: 420px;
  padding: 36px 32px;
  background: rgba(17, 27, 46, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(31, 45, 68, 0.8);
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}
.login-card-head h2 {
  font-size: 22px;
  margin: 0 0 6px;
  color: #e6edf7;
}
.login-card-head p {
  margin: 0 0 28px;
  color: #9ba8be;
  font-size: 13px;
}
.login-submit {
  height: 44px;
  font-weight: 600;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #1668dc 0%, #0e55b8 100%);
  border: none;
  box-shadow: 0 8px 24px rgba(14, 85, 184, 0.4);
}
.login-submit:hover {
  background: linear-gradient(135deg, #3a8aff 0%, #1668dc 100%) !important;
}

.login-divider {
  position: relative;
  text-align: center;
  margin: 24px 0 16px;
  color: #6b7785;
  font-size: 12px;
}
.login-divider::before,
.login-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 32%;
  height: 1px;
  background: #1f2d44;
}
.login-divider::before { left: 0; }
.login-divider::after { right: 0; }

.login-presets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.preset-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #1f2d44;
  border-radius: 10px;
  cursor: pointer;
  color: #cfd8e6;
  text-align: left;
  transition: all 160ms cubic-bezier(0.4, 0, 0.2, 1);
}
.preset-chip:hover {
  border-color: #1668dc;
  background: rgba(22, 104, 220, 0.08);
}
.preset-chip.active {
  border-color: #1668dc;
  background: rgba(22, 104, 220, 0.16);
  box-shadow: 0 0 0 3px rgba(22, 104, 220, 0.12);
}
.preset-chip :deep(.anticon) { color: #13c2c2; font-size: 12px; }
.preset-role { font-size: 13px; font-weight: 600; }
.preset-account { font-size: 11px; color: #6b7785; font-family: 'JetBrains Mono', monospace; }

@media (max-width: 960px) {
  .login-shell { grid-template-columns: 1fr; padding: 0 16px; }
  .login-brand { display: none; }
}
</style>
