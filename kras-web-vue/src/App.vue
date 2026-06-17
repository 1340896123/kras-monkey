<script setup lang="ts">
import { ConfigProvider, App as AntdApp, theme } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { darkTheme } from '@/config/theme'
</script>

<template>
  <ConfigProvider :locale="zhCN" :theme="darkTheme">
    <AntdApp>
      <router-view />
    </AntdApp>
  </ConfigProvider>
</template>
