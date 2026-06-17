<script setup lang="ts">
// FormSchemeRenderer：根据 View.form_scheme 渲染表单
// 对应需求 §9.4 / §9.5
import { computed } from 'vue'
import { Row, Col, Divider } from 'ant-design-vue'
import FormField from '../form-components/FormField'
import type { FormScheme, Property, KrasItem } from '@/types'

const props = defineProps<{
  scheme?: FormScheme | null
  properties: Property[]
  modelValue: KrasItem
  readonly?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [KrasItem] }>()

const propByName = computed(() => {
  const m = new Map<string, Property>()
  for (const p of props.properties) m.set(p.name, p)
  return m
})

function updateField(name: string, value: unknown) {
  const next = { ...props.modelValue, [name]: value }
  emit('update:modelValue', next)
}

function getFieldComponent(prop: Property) {
  // 由 FormField 内部根据 data_type 分发
  return FormField
}
</script>

<template>
  <div class="form-renderer">
    <template v-if="scheme?.sections?.length">
      <div v-for="section in scheme.sections" :key="section.id" class="form-section">
        <template v-if="section.type === 'group'">
          <div v-if="section.label" class="section-head">
            <span class="section-label">{{ section.label }}</span>
          </div>
          <Row :gutter="16">
            <Col
              v-for="field in section.fields"
              :key="field.id"
              :span="field.span ?? 24 / (section.columns ?? 2)"
            >
              <a-form-item
                v-if="propByName.get(field.name)"
                :label="propByName.get(field.name)?.label_zh ?? propByName.get(field.name)?.label"
                :required="field.required || propByName.get(field.name)?.is_required === 1"
                class="kras-form-item"
              >
                <component
                  :is="getFieldComponent(propByName.get(field.name)!)"
                  :property="propByName.get(field.name)!"
                  :value="modelValue[field.name]"
                  :readonly="readonly || field.readonly"
                  @update:value="(v: any) => updateField(field.name, v)"
                />
              </a-form-item>
            </Col>
          </Row>
        </template>
        <Divider v-else-if="section.type === 'divider'" />
        <h3 v-else-if="section.type === 'title'" class="section-title">{{ section.label }}</h3>
      </div>
    </template>
    <!-- Fallback form: 按 Properties 自动布局 -->
    <template v-else>
      <Row :gutter="16">
        <Col v-for="prop in properties" :key="prop.id" :span="12">
          <a-form-item
            :label="prop.label_zh ?? prop.label"
            :required="prop.is_required === 1"
            class="kras-form-item"
          >
            <component
              :is="FormField"
              :property="prop"
              :value="modelValue[prop.name]"
              :readonly="readonly || prop.is_readonly === 1"
              @update:value="(v: any) => updateField(prop.name, v)"
            />
          </a-form-item>
        </Col>
      </Row>
    </template>
  </div>
</template>

<style scoped>
.form-renderer { padding: 16px 20px; }
.form-section { margin-bottom: 8px; }
.section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  margin-top: 8px;
}
.section-label {
  font-size: 13px;
  color: #9ba8be;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.section-head::before {
  content: '';
  width: 3px;
  height: 14px;
  background: linear-gradient(180deg, #1668dc, #13c2c2);
  border-radius: 2px;
}
.section-title { font-size: 16px; color: #e6edf7; margin: 16px 0 8px; }
:deep(.kras-form-item) { margin-bottom: 16px; }
:deep(.kras-form-item .ant-form-item-label > label) {
  color: #9ba8be !important;
  font-size: 12px;
}
</style>
