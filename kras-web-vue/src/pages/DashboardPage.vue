<script setup lang="ts">
// 仪表盘：产品门面，展示平台概览与快捷入口
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Card, Statistic, Row, Col, Tag, Progress, Timeline } from 'ant-design-vue'
import { AppstoreOutlined, FileTextOutlined, BlockOutlined, TeamOutlined, SyncOutlined, CheckCircleOutlined, ArrowRightOutlined } from '@ant-design/icons-vue'
import * as AntIcons from '@ant-design/icons-vue'
import { applyItem } from '@/data/kras.item'
import { krasCache } from '@/data/kras.cache'
import type { KrasItem } from '@/types'

const AntIconsAny = AntIcons as unknown as Record<string, { new (): unknown }>
function iconOf(name?: string) {
  return (name && AntIconsAny[name]) || AppstoreOutlined
}

const router = useRouter()

const counts = ref({ part: 0, document: 0, eco: 0, user: 0 })

const businessEntries = computed(() => {
  return krasCache
    .getMetadata()
    .itemTypes.filter((t) => !t.is_system && !t.is_hidden)
    .slice(0, 8)
})

const recentItems = ref<Array<{ type: string; name: string; time: string; id: string }>>([])

async function loadStats() {
  const [parts, docs, ecos, users] = await Promise.all([
    applyItem<KrasItem[]>({ '@type': 'Part', '@action': 'get' }).catch(() => []),
    applyItem<KrasItem[]>({ '@type': 'Document', '@action': 'get' }).catch(() => []),
    applyItem<KrasItem[]>({ '@type': 'ECO', '@action': 'get' }).catch(() => []),
    applyItem<KrasItem[]>({ '@type': 'User', '@action': 'get' }).catch(() => []),
  ])
  counts.value = {
    part: (parts ?? []).length,
    document: (docs ?? []).length,
    eco: (ecos ?? []).length,
    user: (users ?? []).length,
  }
  // 近期创建
  recentItems.value = [
    ...(parts ?? []).slice(0, 3).map((p) => ({
      type: 'Part',
      name: String(p['@keyed_name']),
      time: String(p.created_on ?? ''),
      id: p['@id'] as string,
    })),
    ...(docs ?? []).slice(0, 3).map((d) => ({
      type: 'Document',
      name: String(d['@keyed_name']),
      time: String(d.release_date ?? ''),
      id: d['@id'] as string,
    })),
  ].sort((a, b) => (a.time < b.time ? 1 : -1)).slice(0, 8)
}

function goto(path: string) {
  router.push(path)
}

onMounted(loadStats)
</script>

<template>
  <div class="dashboard kras-page-padding">
    <header class="dash-head">
      <div>
        <h1 class="dash-title">Kras <span class="kras-brand-text">PLM</span> 平台</h1>
        <p class="dash-sub">元数据驱动 · Item 协议统一 · 全生命周期治理</p>
      </div>
      <div class="dash-status">
        <Tag color="success">
          <CheckCircleOutlined /> 服务正常
        </Tag>
        <Tag color="cyan">AML 2.x</Tag>
        <Tag>MSW Mock</Tag>
      </div>
    </header>

    <!-- 关键指标 -->
    <Row :gutter="16" class="dash-stats">
      <Col :span="6">
        <Card class="dash-card kras-hoverable" hoverable @click="goto('/item-types/Part')">
          <Statistic title="物料总数" :value="counts.part" :value-style="{ color: '#1668dc' }">
            <template #prefix><BlockOutlined /></template>
          </Statistic>
          <div class="card-foot"><span>查看列表</span><ArrowRightOutlined /></div>
        </Card>
      </Col>
      <Col :span="6">
        <Card class="dash-card kras-hoverable" hoverable @click="goto('/item-types/Document')">
          <Statistic title="文档总数" :value="counts.document" :value-style="{ color: '#13c2c2' }">
            <template #prefix><FileTextOutlined /></template>
          </Statistic>
          <div class="card-foot"><span>查看列表</span><ArrowRightOutlined /></div>
        </Card>
      </Col>
      <Col :span="6">
        <Card class="dash-card kras-hoverable" hoverable @click="goto('/item-types/ECO')">
          <Statistic title="工程变更单" :value="counts.eco" :value-style="{ color: '#faad14' }">
            <template #prefix><SyncOutlined /></template>
          </Statistic>
          <div class="card-foot"><span>查看列表</span><ArrowRightOutlined /></div>
        </Card>
      </Col>
      <Col :span="6">
        <Card class="dash-card kras-hoverable" hoverable @click="goto('/users')">
          <Statistic title="用户总数" :value="counts.user" :value-style="{ color: '#52c41a' }">
            <template #prefix><TeamOutlined /></template>
          </Statistic>
          <div class="card-foot"><span>查看列表</span><ArrowRightOutlined /></div>
        </Card>
      </Col>
    </Row>

    <!-- 业务对象快捷入口 -->
    <Card class="dash-card" :bordered="false">
      <template #title>
        <span class="card-title"><AppstoreOutlined /> 业务对象入口</span>
      </template>
      <div class="entry-grid">
        <button v-for="t in businessEntries" :key="t.id" class="entry-card" @click="goto(`/item-types/${t.name}`)">
          <component :is="iconOf(t.icon)" />
          <span class="entry-label">{{ t.label_zh ?? t.label }}</span>
          <span class="entry-meta">{{ t.name }}</span>
        </button>
      </div>
    </Card>

    <Row :gutter="16" style="margin-top: 12px;">
      <!-- 近期活动 -->
      <Col :span="16">
        <Card class="dash-card">
          <template #title>近期创建</template>
          <Timeline>
            <Timeline.Item v-for="(it, idx) in recentItems" :key="idx" :color="it.type === 'Part' ? 'blue' : 'cyan'">
              <div class="recent-item" @click="goto(`/item-types/${it.type}/${it.id}`)">
                <Tag>{{ it.type }}</Tag>
                <span class="recent-name">{{ it.name }}</span>
                <span class="recent-time kras-text-tertiary">{{ it.time }}</span>
              </div>
            </Timeline.Item>
            <Timeline.Item v-if="!recentItems.length" color="gray">
              <span class="kras-text-tertiary">暂无活动</span>
            </Timeline.Item>
          </Timeline>
        </Card>
      </Col>

      <!-- 系统健康 -->
      <Col :span="8">
        <Card class="dash-card">
          <template #title>系统状态</template>
          <div class="health-list">
            <div class="health-row">
              <span>API 服务</span>
              <Progress :percent="100" :stroke-color="'#52c41a'" :show-info="false" size="small" />
              <Tag color="success">正常</Tag>
            </div>
            <div class="health-row">
              <span>数据库</span>
              <Progress :percent="100" :stroke-color="'#52c41a'" :show-info="false" size="small" />
              <Tag color="success">正常</Tag>
            </div>
            <div class="health-row">
              <span>搜索索引</span>
              <Progress :percent="85" :stroke-color="'#1668dc'" :show-info="false" size="small" />
              <Tag color="blue">85%</Tag>
            </div>
            <div class="health-row">
              <span>审计队列</span>
              <Progress :percent="12" :stroke-color="'#13c2c2'" :show-info="false" size="small" />
              <Tag color="cyan">空闲</Tag>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  </div>
</template>

<script lang="ts">
// (no extra definitions)
</script>

<style scoped>
.dashboard { height: 100%; overflow: auto; }
.dash-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.dash-title { margin: 0; font-size: 24px; font-weight: 700; color: #e6edf7; }
.dash-sub { margin: 4px 0 0; color: #9ba8be; font-size: 13px; letter-spacing: 1px; }
.dash-status { display: flex; gap: 6px; }
.dash-stats :deep(.ant-card-body) { padding: 20px 24px; }
.dash-card {
  background: #111b2e !important;
  border-color: #1f2d44 !important;
}
.card-title { display: inline-flex; align-items: center; gap: 8px; }
.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #6b7785;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.entry-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #1f2d44;
  border-radius: 10px;
  cursor: pointer;
  color: #cfd8e6;
  font-size: 18px;
  transition: all 160ms cubic-bezier(0.4, 0, 0.2, 1);
}
.entry-card:hover {
  border-color: #1668dc;
  background: rgba(22, 104, 220, 0.08);
  color: #1668dc;
  transform: translateY(-2px);
}
.entry-label { font-size: 13px; color: #e6edf7; font-weight: 500; }
.entry-meta { font-size: 11px; color: #6b7785; font-family: 'JetBrains Mono', monospace; }

.recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 160ms;
}
.recent-item:hover { background: rgba(22, 104, 220, 0.08); }
.recent-name { color: #dde5f0; }
.recent-time { margin-left: auto; font-size: 12px; }

.health-list { display: flex; flex-direction: column; gap: 14px; }
.health-row {
  display: grid;
  grid-template-columns: 80px 1fr 50px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #cfd8e6;
}
</style>
