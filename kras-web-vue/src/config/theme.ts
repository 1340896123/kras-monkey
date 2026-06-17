// Kras 设计系统 / Design Tokens
// 参考 Ant Design Vue 4.x 的 theme token + 自定义品牌层
// 主基调：深色专业型（Linear / GitHub Dark 观感）

import type { ConfigProviderProps } from 'ant-design-vue'

type ThemeConfig = NonNullable<ConfigProviderProps['theme']>

export const brandTokens = {
  brandPrimary: '#1668DC',
  brandPrimaryHover: '#3A8AFF',
  brandPrimaryActive: '#0E55B8',
  accentCyan: '#13C2C2',
  accentCyanHover: '#36CFC9',
  danger: '#F5222D',
  success: '#52C41A',
  warning: '#FAAD14',
  gradientHero: 'linear-gradient(135deg, #0B1E3F 0%, #0E2A5C 40%, #1668DC 100%)',
  gradientAccent: 'linear-gradient(135deg, #1668DC 0%, #13C2C2 100%)',
  gradientGlow: 'radial-gradient(circle at 30% 20%, rgba(22, 104, 220, 0.25), transparent 60%)',
} as const

// Antd v4 token 集合（只放 AliasToken 已知字段；组件层细节由 global.css 与组件 scoped 样式覆盖）
export const darkTheme: ThemeConfig = {
  algorithm: undefined,
  token: {
    colorPrimary: brandTokens.brandPrimary,
    colorInfo: brandTokens.brandPrimary,
    colorSuccess: brandTokens.success,
    colorWarning: brandTokens.warning,
    colorError: brandTokens.danger,

    colorBgBase: '#0B1220',
    colorBgContainer: '#111B2E',
    colorBgElevated: '#152238',
    colorBgLayout: '#070C17',
    colorBgSpotlight: '#1B2A45',

    colorTextBase: '#E6EDF7',
    colorText: '#DDE5F0',
    colorTextSecondary: '#9BA8BE',
    colorTextTertiary: '#6B7785',
    colorTextQuaternary: '#44505F',

    colorBorder: '#1F2D44',
    colorBorderSecondary: '#172238',
    colorSplit: '#1F2D44',

    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    fontFamily:
      "'Inter', 'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,

    wireframe: false,
    motionUnit: 0.1,
  },
}

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: brandTokens.brandPrimary,
    colorInfo: brandTokens.brandPrimary,
  },
}
